import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { parseFetchArgs, parseFetchProgress, runFetch, selectToFetch } from './cli.js';
import { FetchError, fetchPostingText, textFromApi, textFromAts, textFromBrowser, textFromCapture } from './fetch.js';
import { postingId, readPostings, writePosting } from './store.js';

const here = dirname(fileURLToPath(import.meta.url));
const WORKSPACE = join(here, '..', 'services', '__fixtures__', 'workspace');

const long = (label) => `${label}. `.repeat(80);

// ── payload mappers ───────────────────────────────────────────────────

test('greenhouse: entity-escaped HTML becomes lines with bullets', () => {
  const body = { title: 'Backend Engineer', content: '&lt;h2&gt;Requirements&lt;/h2&gt;&lt;ul&gt;&lt;li&gt;5+ years of Go&lt;/li&gt;&lt;li&gt;Kubernetes &amp;amp; Terraform&lt;/li&gt;&lt;/ul&gt;' };
  const out = textFromAts('greenhouse', body, { board: 'acme', id: '1' }, 'https://boards.greenhouse.io/acme/jobs/1');
  assert.equal(out.title, 'Backend Engineer');
  assert.match(out.text, /Requirements\n\n- 5\+ years of Go\n- Kubernetes & Terraform/);
  assert.equal(textFromAts('greenhouse', { title: 'x' }, {}, ''), null, 'no content → null');
});

test('lever: the lists carry the requirements, not descriptionPlain', () => {
  const body = { text: 'Staff Engineer', descriptionPlain: 'We build things.', lists: [{ text: 'Requirements', content: '<li>Python</li><li>AWS</li>' }], additionalPlain: 'EEO statement.' };
  const out = textFromAts('lever', body, {}, '');
  assert.equal(out.title, 'Staff Engineer');
  assert.match(out.text, /We build things\.\n\nRequirements\n- Python\n- AWS\n\nEEO statement\./);
});

test('ashby: the org board is filtered to the posting id', () => {
  const board = { jobs: [{ id: 'AAA', title: 'Other' }, { id: 'bbb-1', title: 'Data Engineer', descriptionPlain: 'Needs dbt and Snowflake.' }] };
  assert.equal(textFromAts('ashby', board, { org: 'x', jobId: 'BBB-1' }, '').title, 'Data Engineer');
  assert.equal(textFromAts('ashby', board, { org: 'x', jobId: 'zzz' }, ''), null);
  const html = { jobs: [{ id: 'c', title: 'T', descriptionHtml: '<p>Kafka</p>' }] };
  assert.equal(textFromAts('ashby', html, { jobId: 'c' }, '').text, 'Kafka');
});

test('workday and linkedin map through their own shapes', () => {
  const wd = { jobPostingInfo: { title: 'SRE', jobDescription: '<p>Prometheus and Grafana</p>', location: 'Toronto' } };
  const out = textFromAts('workday', wd, {}, 'https://x.wd1.myworkdayjobs.com/en-US/site/job/Toronto/SRE_R1');
  assert.equal(out.title, 'SRE');
  assert.match(out.text, /Prometheus and Grafana/);
  assert.equal(textFromAts('workday', { nope: true }, {}, ''), null);

  const li = '<html><h1 class="top-card-layout__title">ML Engineer</h1><div class="show-more-less-html__markup relative"><ul><li>PyTorch</li></ul></div></html>';
  const out2 = textFromAts('linkedin', li, { id: '1' }, '');
  assert.equal(out2.title, 'ML Engineer');
  assert.equal(out2.text, '- PyTorch');
  assert.equal(textFromAts('linkedin', '<html>nothing</html>', {}, ''), null);
  assert.equal(textFromAts('unknown', {}, {}, ''), null);
});

// ── the API rung ──────────────────────────────────────────────────────

const jsonResponse = (status, body) => ({ status, json: async () => body, text: async () => JSON.stringify(body) });

test('textFromApi resolves the ATS endpoint, memoizes Ashby boards, and reports failures by code', async () => {
  const calls = [];
  const fetchFn = async (url) => {
    calls.push(url);
    if (url.startsWith('https://boards-api.greenhouse.io/v1/boards/acme/jobs/1')) return jsonResponse(200, { title: 'Eng', content: long('Go') });
    if (url.startsWith('https://boards-api.greenhouse.io/v1/boards/acme/jobs/404')) return jsonResponse(404, {});
    if (url.startsWith('https://api.ashbyhq.com/posting-api/job-board/org')) return jsonResponse(200, { jobs: [{ id: 'a', title: 'A', descriptionPlain: long('dbt') }, { id: 'b', title: 'B', descriptionPlain: long('Spark') }] });
    if (url.startsWith('https://api.lever.co/v0/postings/co/short')) return jsonResponse(200, { text: 'x', descriptionPlain: 'tiny' });
    return jsonResponse(503, {});
  };

  const ok = await textFromApi('https://boards.greenhouse.io/acme/jobs/1', { fetchFn });
  assert.equal(ok.source, 'greenhouse-api');
  assert.equal(ok.title, 'Eng');

  assert.equal(await textFromApi('https://example.com/careers/1', { fetchFn }), null, 'not an ATS URL');

  await assert.rejects(textFromApi('https://boards.greenhouse.io/acme/jobs/404', { fetchFn }), (e) => e instanceof FetchError && e.code === 'gone');
  await assert.rejects(textFromApi('https://boards.greenhouse.io/acme/jobs/503', { fetchFn }), (e) => e.code === 'http-503');
  await assert.rejects(textFromApi('https://jobs.lever.co/co/short', { fetchFn }), (e) => e.code === 'empty-text');

  const boardCache = new Map();
  const a = await textFromApi('https://jobs.ashbyhq.com/org/a', { fetchFn, boardCache });
  const b = await textFromApi('https://jobs.ashbyhq.com/org/b', { fetchFn, boardCache });
  assert.equal(a.title, 'A');
  assert.equal(b.title, 'B');
  assert.equal(calls.filter((u) => u.includes('ashbyhq')).length, 1, 'the board was read once');
});

// ── the browser rung ──────────────────────────────────────────────────

/** A fake child process that prints `stdout`, `stderr`, then exits with `code`. */
function fakeSpawn({ stdout = '', stderr = '', code = 0 }) {
  return () => {
    const child = new EventEmitter();
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    child.stdout.setEncoding = () => {};
    child.stderr.setEncoding = () => {};
    child.kill = () => {};
    setImmediate(() => {
      if (stdout) child.stdout.emit('data', stdout);
      if (stderr) child.stderr.emit('data', stderr);
      child.emit('close', code);
    });
    return child;
  };
}

test('textFromBrowser parses browser-extract.mjs output and its error line', async () => {
  const ok = await textFromBrowser('https://example.com/j', { repoRoot: WORKSPACE, spawnFn: fakeSpawn({ stdout: JSON.stringify({ url: 'x', title: 'T', text: long('Rust') }) }) });
  assert.equal(ok.source, 'browser');
  assert.equal(ok.title, 'T');

  await assert.rejects(
    textFromBrowser('https://example.com/j', { repoRoot: WORKSPACE, spawnFn: fakeSpawn({ stderr: `warning\n${JSON.stringify({ error: 'renders client-side', code: 'empty_text' })}\n`, code: 1 }) }),
    (e) => e.code === 'browser-empty_text' && /client-side/.test(e.message),
  );
  await assert.rejects(
    textFromBrowser('https://example.com/j', { repoRoot: WORKSPACE, spawnFn: fakeSpawn({ stdout: '{"text":"short"}' }) }),
    (e) => e.code === 'empty-text',
  );
});

// ── the ladder and the worker ─────────────────────────────────────────

const root = mkdtempSync(join(tmpdir(), 'jsc-skills-fetch-'));
cpSync(WORKSPACE, root, { recursive: true });
after(() => rmSync(root, { recursive: true, force: true }));

test('a jds/ capture wins over the network for an evaluated posting', async () => {
  mkdirSync(join(root, 'jds'), { recursive: true });
  writeFileSync(join(root, 'jds', '001-acme-backend.md'), long('Captured Kubernetes text'));
  writeFileSync(join(root, 'jds', '002-globex.pdf'), 'not text');
  const got = textFromCapture({ root, reportId: 1 });
  assert.equal(got.source, 'jds');
  assert.equal(textFromCapture({ root, reportId: 2 }), null, 'PDF captures are skipped');
  assert.equal(textFromCapture({ root, reportId: 999 }), null);

  const fetchFn = async () => { throw new Error('network must not be touched'); };
  const viaLadder = await fetchPostingText({ url: 'https://example.invalid/jobs/acme-backend', reportId: 1 }, { root, repoRoot: root, fetchFn, browser: false });
  assert.equal(viaLadder.source, 'jds');
});

test('the ladder falls through to the browser and prefers the most specific error', async () => {
  const fetchFn = async () => jsonResponse(500, {});
  const browserOk = fakeSpawn({ stdout: JSON.stringify({ text: long('Browser text') }) });
  const got = await fetchPostingText({ url: 'https://boards.greenhouse.io/acme/jobs/9', reportId: null }, { root, repoRoot: root, fetchFn, spawnFn: browserOk });
  assert.equal(got.source, 'browser');

  await assert.rejects(
    fetchPostingText({ url: 'https://boards.greenhouse.io/acme/jobs/9' }, { root, repoRoot: root, fetchFn, browser: false }),
    (e) => e.code === 'http-500',
  );
  await assert.rejects(
    fetchPostingText({ url: 'https://example.com/careers/1' }, { root, repoRoot: root, fetchFn, browser: false }),
    (e) => e.code === 'no-api',
  );
});

test('selectToFetch skips cached text and recent failures unless asked', () => {
  const now = Date.parse('2026-03-01T00:00:00Z');
  const postings = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }, { id: 'e' }];
  const cached = new Map([
    ['a', { text: 'have it' }],
    ['b', { text: null, error: { code: 'http-503', at: '2026-02-27T00:00:00Z' } }],
    ['c', { text: null, error: { code: 'http-503', at: '2026-01-01T00:00:00Z' } }],
    ['d', { text: null, error: { code: 'gone', at: '2026-02-01T00:00:00Z' } }],
  ]);
  assert.deepEqual(selectToFetch(postings, cached, { now }).map((p) => p.id), ['c', 'e']);
  assert.deepEqual(selectToFetch(postings, cached, { now, retryFailed: true }).map((p) => p.id), ['b', 'c', 'd', 'e']);
});

test('parseFetchArgs and parseFetchProgress', () => {
  assert.deepEqual(parseFetchArgs([]), { limit: null, retryFailed: false, browser: true, concurrency: 3 });
  assert.deepEqual(parseFetchArgs(['--limit', '5', '--retry-failed', '--no-browser']), { limit: 5, retryFailed: true, browser: false, concurrency: 3 });
  assert.throws(() => parseFetchArgs(['--limit', 'x']), /positive whole number/);
  assert.throws(() => parseFetchArgs(['--bogus']), /unknown argument/);
  assert.deepEqual(parseFetchProgress('fetch 3/12 ok greenhouse-api 4.1k chars  https://x'), { phase: 'fetch', done: 3, total: 12 });
  assert.equal(parseFetchProgress('Done: 1 fetched'), null);
});

test('runFetch fills the cache from the corpus and records failures', async () => {
  const lines = [];
  const fetchFn = async (url) => {
    // The fixture corpus has no ATS URLs; everything is example.com, so the API rung is skipped.
    throw new Error(`unexpected network call ${url}`);
  };
  let calls = 0;
  const spawnFn = (file, args) => {
    calls += 1;
    const url = args[1];
    if (url.includes('jobs/6')) return fakeSpawn({ stderr: JSON.stringify({ error: 'login wall', code: 'empty_text' }), code: 1 })();
    return fakeSpawn({ stdout: JSON.stringify({ title: 'T', text: long(`Text for ${url}`) }) })();
  };

  const first = await runFetch({ root, repoRoot: root, argv: ['--concurrency', '2'], log: (l) => lines.push(l), fetchFn, spawnFn });
  assert.equal(first.total, 14);
  assert.equal(first.failed, 1);
  assert.equal(first.fetched, 13);
  assert.ok(lines.some((l) => /^fetch \d+\/\d+ failed browser-empty_text/.test(l)), lines.join('\n'));
  assert.match(lines.at(-1), /^Done: 13 fetched, 1 failed, 0 already cached/);

  const cached = readPostings({ root });
  assert.equal(cached.get(postingId('https://example.com/jobs/6')).error.code, 'browser-empty_text');
  assert.equal(cached.get(postingId('https://example.com/jobs/6')).title, "Platform Engineer", "the corpus title is kept on a failure");

  const before = calls;
  const second = await runFetch({ root, repoRoot: root, log: () => {}, fetchFn, spawnFn });
  assert.equal(second.fetched, 0, 'everything with text is skipped');
  assert.equal(calls, before, 'a recent failure is not retried');

  writePosting({ root, url: 'https://example.com/jobs/6', error: { code: 'http-503', message: 'old' }, fetchedAt: '2020-01-01T00:00:00Z' });
  const third = await runFetch({ root, repoRoot: root, argv: ['--limit', '1'], log: () => {}, fetchFn, spawnFn: () => fakeSpawn({ stdout: JSON.stringify({ text: long('Now works') }) })() });
  assert.equal(third.fetched, 1, 'an old failure is retried');
});
