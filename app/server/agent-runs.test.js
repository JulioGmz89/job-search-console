/**
 * End-to-end agent runs: the routes, the queue, the prompt, the fake CLI, the
 * verification, and upstream's own post-steps (`merge-tracker.mjs`,
 * `reconcile-pipeline.mjs`, `reserve-report-num.mjs`) — all inside a temp
 * workspace copied from the fixture, so nothing touches the repository's data.
 */

import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { buildApp } from './app.js';

const here = dirname(fileURLToPath(import.meta.url));
const WORKSPACE = join(here, 'services', '__fixtures__', 'workspace');
const FAKE_CLAUDE = join(here, 'services', '__fixtures__', 'bin', 'fake-claude.js');

/** A workspace with a CV and a profile, which the fixture (read-only tests) does not need. */
function makeWorkspace() {
  const root = mkdtempSync(join(tmpdir(), 'jsc-agent-'));
  cpSync(WORKSPACE, root, { recursive: true });
  writeFileSync(join(root, 'cv.md'), '# Ada Lovelace\n\n## Experience\n- Built the engine\n');
  mkdirSync(join(root, 'config'), { recursive: true });
  writeFileSync(join(root, 'config', 'profile.yml'), 'candidate:\n  name: "Ada Lovelace"\nlanguage:\n  output: en\nspend_tier: standard\ncv:\n  auto_pdf_score_threshold: 3.5\n');
  return root;
}

/** The fake CLI, parameterised per test through the environment it inherits. */
const agent = { file: process.execPath, args: [FAKE_CLAUDE], found: true, shell: false, source: 'env', display: 'fake-claude' };

const scenario = (name, extra = {}) => {
  process.env.FAKE_CLAUDE_SCENARIO = name;
  delete process.env.FAKE_CLAUDE_SCORE;
  Object.assign(process.env, extra);
};

let root;
let app;
before(async () => {
  root = makeWorkspace();
  app = buildApp({ root, agent, serveUi: false });
  await app.ready();
});
after(async () => {
  await app.close();
  delete process.env.FAKE_CLAUDE_SCENARIO;
  delete process.env.FAKE_CLAUDE_SCORE;
  rmSync(root, { recursive: true, force: true });
});

const get = (url) => app.inject({ method: 'GET', url });
const post = (url, payload) => app.inject({ method: 'POST', url, payload });

/** Poll until a run reaches a terminal state. */
async function settled(id, { timeoutMs = 30_000 } = {}) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const run = (await get(`/api/runs/${id}`)).json();
    if (['succeeded', 'failed', 'cancelled'].includes(run.status)) return run;
    if (Date.now() > deadline) throw new Error(`run ${id} still ${run.status}: ${JSON.stringify(run.lines?.slice(-5))}`);
    await new Promise((r) => setTimeout(r, 50));
  }
}

/** Wait until nothing is queued or running — the whole chain has finished. */
async function drained({ timeoutMs = 30_000 } = {}) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const { queued, active } = (await get('/api/runs')).json();
    if (queued.length === 0 && active.length === 0) return;
    if (Date.now() > deadline) throw new Error(`queue never drained: ${JSON.stringify({ queued, active })}`);
    await new Promise((r) => setTimeout(r, 50));
  }
}

const text = (run) => run.lines.map((l) => l.text).join('\n');
const reports = () => readdirSync(join(root, 'reports'));
const tracker = () => readFileSync(join(root, 'data', 'applications.md'), 'utf-8');
const inbox = () => readFileSync(join(root, 'data', 'pipeline.md'), 'utf-8');

test('the agent status says the CLI is there and the profile was read', async () => {
  const status = (await get('/api/agent/status')).json();
  assert.equal(status.bin.found, true);
  assert.equal(status.cvPresent, true);
  assert.equal(status.profile.autoPdfThreshold, 3.5);
  assert.equal(status.profile.spendTier, 'standard');
});

test('paste a URL → report on disk, tracker row merged, inbox reconciled, number released', async () => {
  scenario('evaluate-ok', { FAKE_CLAUDE_SCORE: '3.2' });
  const url = 'https://jobs.example.com/ada/1';
  const res = await post('/api/inbox/urls', { url, evaluate: true });
  assert.equal(res.statusCode, 201, res.body);
  const { added, run } = res.json();
  assert.equal(added, true);
  assert.equal(run.kind, 'evaluate');
  assert.equal(run.lane, 'agent');
  assert.match(inbox(), /- \[ \] https:\/\/jobs\.example\.com\/ada\/1/);

  const done = await settled(run.id);
  assert.equal(done.status, 'succeeded', text(done));
  // The number came from upstream's allocator: the fixture's highest tracker
  // id / report is 008, so the first free number is 009.
  const num = done.meta.reportNum;
  assert.equal(num, '009');
  assert.equal(done.result.score, 3.2);
  assert.equal(done.result.company, 'Fake Co');
  assert.match(text(done), new RegExp(`Reserved report number ${num}`));
  assert.match(text(done), /🔧 WebFetch/);
  assert.match(text(done), /■ Claude finished/);
  assert.match(text(done), /Score 3.2 < 3.5: no PDF queued/);
  assert.ok(reports().includes(`${num}-fake-co-${done.meta.date}.md`));
  assert.ok(!reports().some((f) => f.includes('RESERVED')), 'the sentinel was released');

  // The chain: merge-tracker then reconcile-auto, both server-queued.
  await drained();
  const { recent } = (await get('/api/runs')).json();
  const chain = recent.filter((r) => r.parentId === run.id || recent.some((p) => p.id === r.parentId && p.parentId === run.id));
  assert.deepEqual(chain.map((r) => r.kind).sort(), ['merge-tracker', 'reconcile-auto']);
  for (const step of chain) assert.equal(step.status, 'succeeded', `${step.kind}: ${step.error}`);

  assert.match(tracker(), /Fake Co/, 'merge-tracker.mjs added the row');
  assert.ok(tracker().includes(`[${num}](../reports/${num}-fake-co-`), 'the report link was rewritten to ../reports/');
  // reconcile-pipeline.mjs writes the processed row with a report link, and the
  // PDF flag it derives from the report header must read "not generated".
  const processed = inbox().split(/\r?\n/).find((l) => l.includes(url));
  assert.ok(processed.startsWith(`- [x] [${Number(num)}](../reports/${num}-fake-co-`), `reconcile-pipeline.mjs moved the URL: ${processed}`);
  assert.ok(processed.endsWith('PDF ❌'), `the PDF flag reads the report header: ${processed}`);
  const seen = (await get('/api/inbox')).json().processed.find((r) => r.url === url);
  assert.equal(seen.reportId, Number(num));
  assert.doesNotMatch(inbox(), /- \[ \] https:\/\/jobs\.example\.com\/ada\/1/);

  const state = readFileSync(join(root, 'batch', 'batch-state.tsv'), 'utf-8');
  assert.match(state, new RegExp(`jsc-${run.id}\t${url}\tcompleted\t.*\t${num}\t3.2\t\t0`));
  // The TSV was merged and archived, not left to merge twice.
  assert.ok(!existsSync(join(root, 'batch', 'tracker-additions', `${num}-fake-co.tsv`)));
});

test('a merge-tracker run is not reachable from a request', async () => {
  const res = await post('/api/runs', { kind: 'merge-tracker' });
  assert.equal(res.statusCode, 400);
  assert.equal(res.json().code, 'kind-unknown');
});

test('exit 0 without a report is a failure, and the number and TSV are cleaned up', async () => {
  scenario('evaluate-no-report');
  const { id } = (await post('/api/runs', { kind: 'evaluate', options: { url: 'https://jobs.example.com/ada/2' } })).json();
  const run = await settled(id);
  assert.equal(run.status, 'failed');
  assert.match(run.error, /without writing reports\/\d{3}-\*\.md/);
  assert.ok(!reports().some((f) => f.startsWith(run.meta.reportNum)));
  await drained();
  // No chain after a failure.
  assert.ok(!(await get('/api/runs')).json().recent.some((r) => r.parentId === id));
});

test('a CLI error result fails the run even though a report was written', async () => {
  scenario('evaluate-is-error');
  const { id } = (await post('/api/runs', { kind: 'evaluate', options: { url: 'https://jobs.example.com/ada/3' } })).json();
  const run = await settled(id);
  assert.equal(run.status, 'failed');
  assert.equal(run.error, 'error_max_turns');
  // The stray TSV would have merged a row for a report the agent never finished.
  assert.ok(!existsSync(join(root, 'batch', 'tracker-additions', `${run.meta.reportNum}-fake-co.tsv`)));
  await drained();
});

test('a report under the wrong number is named in the error', async () => {
  scenario('evaluate-wrong-number');
  const { id } = (await post('/api/runs', { kind: 'evaluate', options: { url: 'https://jobs.example.com/ada/4' } })).json();
  const run = await settled(id);
  assert.equal(run.status, 'failed');
  assert.match(run.error, /wrote reports\/01\d-fake-co-.* instead of report/);
  await drained();
});

test('the same URL cannot be evaluated twice at once, and a hung run can be cancelled', async () => {
  scenario('hang');
  const url = 'https://jobs.example.com/ada/5';
  const first = (await post('/api/runs', { kind: 'evaluate', options: { url } })).json();
  const twin = await post('/api/runs', { kind: 'evaluate', options: { url: `${url}?utm_source=x` } });
  // Not a key match (different query) — it queues; an exact match is refused.
  assert.equal(twin.statusCode, 202);
  const same = await post('/api/runs', { kind: 'evaluate', options: { url } });
  assert.equal(same.statusCode, 409);
  assert.equal(same.json().code, 'run-busy');

  await post(`/api/runs/${twin.json().id}/cancel`);
  await settled(twin.json().id);
  // Give the first run time to reserve its number before cancelling it.
  const deadline = Date.now() + 10_000;
  while (!(await get(`/api/runs/${first.id}`)).json().meta.reportNum && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 50));
  }
  await post(`/api/runs/${first.id}/cancel`);
  const run = await settled(first.id);
  assert.equal(run.status, 'cancelled');
  assert.ok(!reports().some((f) => f.includes('RESERVED')), 'a cancelled run releases its number');
  await drained();
});

test('requests that cannot work are refused before anything is queued', async () => {
  const bad = await post('/api/runs', { kind: 'evaluate', options: { url: 'not a url' } });
  assert.equal(bad.statusCode, 400);
  assert.equal(bad.json().code, 'url-invalid');

  const noCli = buildApp({ root, agent: { found: false, display: 'claude' }, serveUi: false });
  const res = await noCli.inject({ method: 'POST', url: '/api/runs', payload: { kind: 'evaluate', options: { url: 'https://x.example/1' } } });
  assert.equal(res.statusCode, 503);
  assert.equal(res.json().code, 'agent-missing');
  assert.equal((await noCli.inject({ method: 'GET', url: '/api/agent/status' })).json().bin.found, false);
  await noCli.close();

  const noCv = mkdtempSync(join(tmpdir(), 'jsc-nocv-'));
  try {
    const app2 = buildApp({ root: noCv, agent, serveUi: false });
    const r = await app2.inject({ method: 'POST', url: '/api/runs', payload: { kind: 'evaluate', options: { url: 'https://x.example/1' } } });
    assert.equal(r.json().code, 'cv-missing');
    await app2.close();
  } finally {
    rmSync(noCv, { recursive: true, force: true });
  }
});
