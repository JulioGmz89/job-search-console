/**
 * fetch.js — one posting URL → the text of the job description.
 *
 * `scan.mjs` records that a posting exists, never what it says, so the skills
 * analysis has to go back for the text. Three rungs, cheapest first, and every
 * one of them is something upstream already does elsewhere:
 *
 *   1. A capture in `jds/` for an evaluated posting (`jd-capture.mjs`).
 *   2. The ATS's public JSON endpoint, resolved by upstream's `resolveAtsApi`
 *      (`liveness-api.mjs`): fixed hosts, strict path segments, no redirects —
 *      the same SSRF guard the liveness check relies on. Each ATS's payload is
 *      mapped to text by a pure function below, reusing `jdHtmlToText` from
 *      `browser-extract.mjs` so bullets and headings survive as lines (the
 *      rules extractor reads requirement bullets by line).
 *   3. Upstream's `browser-extract.mjs --mode jd` (Playwright) for everything
 *      else — corporate sites, boards without an API, JS-rendered pages.
 *
 * There is deliberately no "plain HTTP GET the page and strip tags" rung: for
 * the pages that reach rung 3 that returns navigation chrome, and a confidently
 * wrong text is worse than a recorded failure.
 *
 * Network calls go through an injectable `fetchFn` / `spawnFn` so the tests
 * never leave the process.
 */

import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { jdHtmlToText, normalizeWorkdayJob } from '../../../browser-extract.mjs';
import { findCaptureForReport } from '../../../jd-capture.mjs';
import { resolveAtsApi, throttleProviderRequest } from '../../../liveness-api.mjs';
import { DEFAULT_USER_AGENT } from '../../../user-agent.mjs';

/** Longest text kept per posting. Requirements sit well inside this on every board seen. */
export const MAX_TEXT = 20_000;

/** Fewer characters than this is a page that did not render, not a job description. */
export const MIN_TEXT = 200;

const API_TIMEOUT_MS = 15_000;
const BROWSER_TIMEOUT_MS = 60_000;

/** Ashby rate-limits repeated unauthenticated board reads; the board is also memoized per org (see `boardCache`). */
const THROTTLE_MS = { ashby: 1_500, linkedin: 3_500, greenhouse: 250, lever: 250, workday: 500 };

export class FetchError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'FetchError';
    this.code = code;
  }
}

const cap = (text) => (text.length > MAX_TEXT ? `${text.slice(0, MAX_TEXT)}\n…` : text);
const str = (v) => (typeof v === 'string' ? v.trim() : '');

// ── ATS payload → text (pure) ─────────────────────────────────────────

/**
 * Map one ATS's API response to `{ title, text }`, or null when the payload
 * does not carry a description (the caller then falls through to the browser).
 *
 * @param {string} ats - `resolveAtsApi().ats`
 * @param {any} body - Parsed JSON, or the HTML string for LinkedIn.
 * @param {Record<string, string>} parts - The path parts `resolveAtsApi` extracted.
 * @param {string} url - The posting URL (Workday's normalizer echoes it).
 * @returns {{title: string|null, text: string}|null}
 */
export function textFromAts(ats, body, parts, url) {
  switch (ats) {
    case 'greenhouse': {
      const text = jdHtmlToText(body?.content);
      return text ? { title: str(body.title) || null, text } : null;
    }
    case 'lever': {
      // `descriptionPlain` is only the opening; the requirements are `lists`.
      const sections = [str(body?.descriptionPlain)];
      for (const list of Array.isArray(body?.lists) ? body.lists : []) {
        const heading = str(list?.text);
        const items = jdHtmlToText(list?.content);
        if (heading || items) sections.push(`${heading ? `${heading}\n` : ''}${items}`);
      }
      sections.push(str(body?.additionalPlain));
      const text = sections.filter(Boolean).join('\n\n').trim();
      return text ? { title: str(body?.text) || null, text } : null;
    }
    case 'ashby': {
      const target = String(parts.jobId ?? '').toLowerCase();
      const job = (Array.isArray(body?.jobs) ? body.jobs : []).find((j) => typeof j?.id === 'string' && j.id.toLowerCase() === target);
      if (!job) return null;
      const text = str(job.descriptionPlain) || jdHtmlToText(job.descriptionHtml);
      return text ? { title: str(job.title) || null, text } : null;
    }
    case 'workday': {
      const job = normalizeWorkdayJob(body, url, MAX_TEXT);
      return job ? { title: job.title || null, text: job.text } : null;
    }
    case 'linkedin': {
      if (typeof body !== 'string') return null;
      const markup = /<div[^>]*class="[^"]*show-more-less-html__markup[^"]*"[^>]*>([\s\S]*?)<\/div>/i.exec(body);
      const text = markup ? jdHtmlToText(markup[1]) : '';
      const title = /<h[12][^>]*class="[^"]*top-card-layout__title[^"]*"[^>]*>([\s\S]*?)<\/h[12]>/i.exec(body);
      return text ? { title: title ? jdHtmlToText(title[1]) || null : null, text } : null;
    }
    default:
      return null;
  }
}

// ── the rungs ─────────────────────────────────────────────────────────

/** Rung 1: a text capture in `jds/` for an evaluated posting. PDFs are skipped. */
export function textFromCapture({ root, reportId }) {
  if (!Number.isInteger(reportId)) return null;
  const capture = findCaptureForReport(join(root, 'jds'), reportId);
  if (!capture || !['.md', '.txt'].includes(capture.ext)) return null;
  try {
    const text = readFileSync(capture.path, 'utf-8').trim();
    return text.length >= MIN_TEXT ? { source: 'jds', title: null, text: cap(text) } : null;
  } catch {
    return null;
  }
}

/**
 * Rung 2: the ATS API.
 *
 * @returns {Promise<{source: string, title: string|null, text: string}|null>}
 *   null when the URL is not a known ATS posting or the payload had no description.
 * @throws {FetchError} on a definitive failure (404, unparsable body, timeout).
 */
export async function textFromApi(url, { fetchFn = fetch, boardCache = new Map(), timeoutMs = API_TIMEOUT_MS } = {}) {
  const resolved = resolveAtsApi(url);
  if (!resolved) return null;
  const { ats, apiUrl, parts, accept } = resolved;

  // Ashby's endpoint is the whole org board; read it once per run.
  const cacheKey = ats === 'ashby' ? apiUrl : null;
  let body = cacheKey ? boardCache.get(cacheKey) : undefined;

  if (body === undefined) {
    await throttleProviderRequest(ats, THROTTLE_MS[ats]);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), resolved.timeoutMs ?? timeoutMs);
    let res;
    try {
      res = await fetchFn(apiUrl, {
        method: 'GET',
        headers: { 'user-agent': DEFAULT_USER_AGENT, accept: accept ?? 'application/json' },
        redirect: 'error',
        signal: controller.signal,
      });
    } catch (error) {
      clearTimeout(timer);
      throw new FetchError(`${ats} API unreachable: ${error.name === 'AbortError' ? 'timed out' : error.message}`, 'api-unreachable');
    }
    try {
      if (res.status === 404 || res.status === 410) throw new FetchError(`${ats} API says the posting is gone (${res.status})`, 'gone');
      if (res.status !== 200) throw new FetchError(`${ats} API answered ${res.status}`, `http-${res.status}`);
      try {
        body = accept === 'text/html' ? await res.text() : await res.json();
      } catch {
        throw new FetchError(`${ats} API returned an unreadable body`, 'api-unparsable');
      }
    } finally {
      clearTimeout(timer);
    }
    if (cacheKey) boardCache.set(cacheKey, body);
  }

  const mapped = textFromAts(ats, body, parts, url);
  if (!mapped) return null;
  if (mapped.text.length < MIN_TEXT) throw new FetchError(`${ats} API returned only ${mapped.text.length} characters of description`, 'empty-text');
  return { source: `${ats}-api`, title: mapped.title, text: cap(mapped.text) };
}

/**
 * Rung 3: upstream's Playwright reader. Spawned rather than imported: it owns a
 * browser, prints one JSON object, and exits — a process boundary is the right
 * one for something that can hang on a page.
 */
export function textFromBrowser(url, { repoRoot, spawnFn = spawn, timeoutMs = BROWSER_TIMEOUT_MS } = {}) {
  return new Promise((resolve, reject) => {
    const script = join(repoRoot, 'browser-extract.mjs');
    let child;
    try {
      child = spawnFn(process.execPath, [script, url, '--mode', 'jd', '--max-chars', String(MAX_TEXT), '--timeout', String(Math.min(timeoutMs, 45_000))], {
        cwd: repoRoot,
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (error) {
      reject(new FetchError(`could not start browser-extract.mjs: ${error.message}`, 'browser-unavailable'));
      return;
    }
    let out = '';
    let err = '';
    child.stdout?.setEncoding('utf-8');
    child.stderr?.setEncoding('utf-8');
    child.stdout?.on('data', (chunk) => { out += chunk; });
    child.stderr?.on('data', (chunk) => { err += chunk; });
    const timer = setTimeout(() => child.kill?.(), timeoutMs);
    child.on('error', (error) => {
      clearTimeout(timer);
      reject(new FetchError(`could not start browser-extract.mjs: ${error.message}`, 'browser-unavailable'));
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) {
        try {
          const parsed = JSON.parse(out);
          const text = str(parsed.text);
          if (text.length < MIN_TEXT) throw new Error('short');
          resolve({ source: 'browser', title: str(parsed.title) || null, text: cap(text) });
          return;
        } catch {
          reject(new FetchError('browser-extract.mjs printed no usable JD text', 'empty-text'));
          return;
        }
      }
      // A hard error is one JSON object on stderr: { error, code }.
      let detail = null;
      for (const line of err.split(/\r?\n/).reverse()) {
        try {
          detail = JSON.parse(line);
          break;
        } catch {
          // not the JSON line
        }
      }
      reject(new FetchError(detail?.error ?? `browser-extract.mjs exited with code ${code}`, detail?.code ? `browser-${detail.code}` : 'browser-failed'));
    });
  });
}

/**
 * Fetch one posting's text through the rungs.
 *
 * @param {{url: string, reportId?: number|null}} posting
 * @param {{root: string, repoRoot: string, fetchFn?: Function, spawnFn?: Function, boardCache?: Map, browser?: boolean}} ctx
 *   `browser: false` skips rung 3 (tests, or a machine without Playwright's browser).
 * @returns {Promise<{source: string, title: string|null, text: string}>}
 * @throws {FetchError}
 */
export async function fetchPostingText(posting, { root, repoRoot, fetchFn, spawnFn, boardCache, browser = true } = {}) {
  const captured = textFromCapture({ root, reportId: posting.reportId ?? null });
  if (captured) return captured;

  let apiError = null;
  try {
    const fromApi = await textFromApi(posting.url, { fetchFn, boardCache });
    if (fromApi) return fromApi;
  } catch (error) {
    if (!(error instanceof FetchError)) throw error;
    // A gone posting is gone; the browser would only confirm it more slowly.
    if (error.code === 'gone') throw error;
    apiError = error;
  }

  if (!browser) throw apiError ?? new FetchError('no ATS API for this URL and the browser rung is off', 'no-api');
  try {
    return await textFromBrowser(posting.url, { repoRoot, spawnFn });
  } catch (error) {
    // Report the more specific failure when the API rung also tried.
    if (apiError && error.code === 'browser-unavailable') throw apiError;
    throw error;
  }
}
