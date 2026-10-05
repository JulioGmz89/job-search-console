/**
 * fake-net.mjs — the UX sandbox's offline internet.
 *
 * `sandbox.mjs` preloads this into every process the sandbox server spawns
 * (`NODE_OPTIONS=--import=…`), so scan.mjs and the skills fetch worker read
 * job boards from `net/greenhouse.json` instead of the real Greenhouse API.
 * That keeps sandbox runs reproducible, costs no traffic to anyone's careers
 * site (PROJECT_PLAN.md §9.3), and means the fictional companies in the seed
 * actually return postings.
 *
 * Only `globalThis.fetch` is replaced. Loopback still goes to the real fetch
 * (the server talks to itself in a few places); every other host fails the
 * way an unreachable network does, so a provider the seed does not model shows
 * up as an error in the scan log rather than as real traffic.
 *
 * Not covered: anything that opens a real browser (the scan's `--verify`
 * liveness pass, the skills fetch's browser rung). Those fall back to their
 * own error handling; the seed's postings are all reachable through the API
 * rung, so the browser rung is never needed.
 */

import { readFileSync } from 'node:fs';

/** `{ [slug]: { name, jobs: [greenhouse job] } }`, written by generate.mjs. */
const market = JSON.parse(readFileSync(new URL('./net/greenhouse.json', import.meta.url), 'utf-8'));

const realFetch = globalThis.fetch;
const LOOPBACK = new Set(['127.0.0.1', 'localhost', '[::1]']);

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const escapeHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Greenhouse's public boards API: the list, one job, and /offices (absent, as on most boards). */
function greenhouseApi(url) {
  const m = /^\/v1\/boards\/([^/]+)\/(jobs|offices)(?:\/(\d+))?\/?$/.exec(url.pathname);
  const board = m ? market[m[1]] : null;
  if (!board || m[2] === 'offices') return json({ status: 404, error: 'Job not found' }, 404);
  if (m[3]) {
    const job = board.jobs.find((j) => String(j.id) === m[3]);
    return job ? json(job) : json({ status: 404, error: 'Job not found' }, 404);
  }
  // The list carries `content` only when asked, like the real endpoint.
  const withContent = url.searchParams.get('content') === 'true';
  const jobs = board.jobs.map(({ content, ...rest }) => (withContent ? { ...rest, content } : rest));
  return json({ jobs, meta: { total: jobs.length } });
}

/** A posting page, for anything that reads the HTML rather than the API. */
function greenhousePage(url) {
  const m = /^\/([^/]+)\/jobs\/(\d+)\/?$/.exec(url.pathname);
  const job = m ? market[m[1]]?.jobs.find((j) => String(j.id) === m[2]) : null;
  if (!job) return new Response('Not found', { status: 404 });
  // The API's content is entity-escaped markup; the page carries it decoded.
  const body = job.content.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
  return new Response(`<!doctype html><title>${escapeHtml(job.title)}</title><h1>${escapeHtml(job.title)}</h1><div id="content">${body}</div>`, {
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}

globalThis.fetch = async function sandboxFetch(input, init) {
  const href = typeof input === 'string' ? input : input instanceof URL ? input.href : input?.url;
  let url;
  try {
    url = new URL(href);
  } catch {
    return realFetch(input, init);
  }
  if (LOOPBACK.has(url.hostname)) return realFetch(input, init);
  if (/^boards-api(\.eu)?\.greenhouse\.io$/.test(url.hostname)) return greenhouseApi(url);
  if (/^(job-boards(\.eu)?|boards)\.greenhouse\.io$/.test(url.hostname)) return greenhousePage(url);
  throw new TypeError('fetch failed', { cause: new Error(`UX sandbox: no network for ${url.hostname}`) });
};
