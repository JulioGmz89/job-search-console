#!/usr/bin/env node
/**
 * cli.js — the worker the queue spawns for the skills layer's network step.
 *
 *   node app/server/skills/cli.js fetch [--limit N] [--retry-failed] [--no-browser] [--concurrency N]
 *
 * Reads the corpus, fetches the text of every posting not yet cached, and
 * writes each outcome to `data/skills/postings/`. It is a separate process for
 * the same reason upstream's scripts are: the queue captures its lines, can
 * kill it, and the server never blocks on the network. The data root comes
 * from the environment the queue sets (`confineTo`) or upstream's resolution.
 *
 * Exit code 0 even when individual fetches fail — a failed posting is a fact
 * recorded in the cache and shown on the page, not a broken run. Non-zero only
 * when the corpus itself cannot be read or the arguments are wrong.
 */

import { pathToFileURL } from 'node:url';

import { repoRoot as defaultRepoRoot, resolveDataRoot } from '../services/paths.js';
import { readPortals } from '../services/portals.js';
import { readCorpus } from './corpus.js';
import { fetchPostingText, greenhouseBoards } from './fetch.js';
import { readPostings, writePosting } from './store.js';

/** A failed fetch is retried on its own after this long; a `gone` posting after a month. */
const RETRY_AFTER_MS = 7 * 24 * 3_600_000;
const RETRY_GONE_AFTER_MS = 30 * 24 * 3_600_000;

const DEFAULT_CONCURRENCY = 3;

export function parseFetchArgs(argv) {
  const options = { limit: null, retryFailed: false, browser: true, concurrency: DEFAULT_CONCURRENCY };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--retry-failed') options.retryFailed = true;
    else if (arg === '--no-browser') options.browser = false;
    else if (arg === '--limit' || arg === '--concurrency') {
      const value = Number(argv[i + 1]);
      if (!Number.isInteger(value) || value < 1) throw new TypeError(`${arg} needs a positive whole number`);
      options[arg === '--limit' ? 'limit' : 'concurrency'] = value;
      i += 1;
    } else throw new TypeError(`unknown argument ${arg}`);
  }
  return options;
}

/** Which corpus postings still need a fetch, given what the cache holds. */
export function selectToFetch(postings, cached, { retryFailed = false, now = Date.now() } = {}) {
  return postings.filter((posting) => {
    const entry = cached.get(posting.id);
    if (!entry) return true;
    if (entry.text) return false;
    if (retryFailed) return true;
    const at = Date.parse(entry.error?.at ?? entry.fetchedAt ?? '') || 0;
    const wait = entry.error?.code === 'gone' ? RETRY_GONE_AFTER_MS : RETRY_AFTER_MS;
    return now - at > wait;
  });
}

const kchars = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));

/**
 * Fetch every posting that needs it.
 *
 * @param {{root: string, repoRoot?: string, argv?: string[], log?: (line: string) => void,
 *   fetchFn?: Function, spawnFn?: Function, now?: number}} options
 * @returns {Promise<{fetched: number, failed: number, cached: number, total: number}>}
 */
export async function runFetch({ root, repoRoot = defaultRepoRoot, argv = [], log = console.log, fetchFn, spawnFn, now = Date.now() }) {
  const options = parseFetchArgs(argv);
  const { postings, counts } = readCorpus({ root });
  const cached = readPostings({ root });
  const withText = [...cached.values()].filter((e) => e.text).length;

  let todo = selectToFetch(postings, cached, { retryFailed: options.retryFailed, now });
  // Evaluated postings first: their score is what makes demand weighted, and
  // they may have a jds/ capture, which costs nothing.
  todo.sort((a, b) => Number(b.reportId !== null) - Number(a.reportId !== null));
  if (options.limit) todo = todo.slice(0, options.limit);

  log(`Corpus: ${postings.length} postings (${counts.scan} scanned, ${counts.inbox} in the inbox, ${counts.tracker} evaluated) · ${withText} with text cached · ${todo.length} to fetch`);
  if (todo.length === 0) {
    log('Nothing to fetch.');
    return { fetched: 0, failed: 0, cached: withText, total: postings.length };
  }

  const boardCache = new Map();
  // Greenhouse boards from portals.yml, for postings embedded in company sites.
  let boards = [];
  try {
    boards = greenhouseBoards(readPortals({ root }).companies);
  } catch {
    // No portals.yml is fine; those postings just take the browser rung.
  }
  let index = 0;
  let fetched = 0;
  let failed = 0;
  let next = 0;

  const worker = async () => {
    for (;;) {
      const posting = todo[next];
      if (!posting) return;
      next += 1;
      let line;
      try {
        const result = await fetchPostingText(posting, { root, repoRoot, fetchFn, spawnFn, boardCache, browser: options.browser, boards });
        writePosting({ root, url: posting.url, source: result.source, title: result.title ?? posting.title, text: result.text });
        fetched += 1;
        line = `ok ${result.source} ${kchars(result.text.length)} chars`;
      } catch (error) {
        writePosting({ root, url: posting.url, title: posting.title, error: { code: error.code ?? 'fetch-failed', message: error.message } });
        failed += 1;
        line = `failed ${error.code ?? 'fetch-failed'} — ${error.message}`;
      }
      index += 1;
      log(`fetch ${index}/${todo.length} ${line}  ${posting.url}`);
    }
  };

  await Promise.all(Array.from({ length: Math.min(options.concurrency, todo.length) }, worker));
  log(`Done: ${fetched} fetched, ${failed} failed, ${withText} already cached · ${withText + fetched} of ${postings.length} postings have text`);
  return { fetched, failed, cached: withText, total: postings.length };
}

/** `fetch N/M …` lines, for the queue's progress bar. */
export function parseFetchProgress(line) {
  const m = /^fetch (\d+)\/(\d+) /.exec(line);
  return m ? { phase: 'fetch', done: Number(m[1]), total: Number(m[2]) } : null;
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const [command, ...rest] = process.argv.slice(2);
  if (command !== 'fetch') {
    console.error('usage: cli.js fetch [--limit N] [--retry-failed] [--no-browser] [--concurrency N]');
    process.exit(2);
  }
  runFetch({ root: resolveDataRoot(), argv: rest })
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error.message);
      process.exit(1);
    });
}
