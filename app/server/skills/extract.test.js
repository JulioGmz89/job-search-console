/**
 * The Claude extraction runs end to end: the route picks the batches, the
 * queue runs the fake CLI, `after` validates the output file and fills the
 * cache, and the overview reflects it — inside a temp workspace.
 */

import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { buildApp } from '../app.js';
import { dedupeSkills, normalizeSkill, trimForPrompt } from './extract-spec.js';
import { postingId, readCvSkills, readExtractions, readPosting, writeExtraction, writePosting } from './store.js';

const here = dirname(fileURLToPath(import.meta.url));
const WORKSPACE = join(here, '..', 'services', '__fixtures__', 'workspace');
const FAKE_CLAUDE = join(here, '..', 'services', '__fixtures__', 'bin', 'fake-claude.js');

const agent = { file: process.execPath, args: [FAKE_CLAUDE], found: true, shell: false, source: 'env', display: 'fake-claude' };
const scenario = (name) => {
  process.env.FAKE_CLAUDE_SCENARIO = name;
};

const jd = (lines) => `${lines.join('\n')}\n${'Filler sentence about the role. '.repeat(10)}`;
const urls = Array.from({ length: 12 }, (_, i) => `https://example.com/jobs/${i + 1}`);

let root;
let app;
before(async () => {
  root = mkdtempSync(join(tmpdir(), 'jsc-skills-extract-'));
  cpSync(WORKSPACE, root, { recursive: true });
  writeFileSync(join(root, 'cv.md'), '# Ada\n\n## Skills\n- Python\n');
  mkdirSync(join(root, 'config'), { recursive: true });
  writeFileSync(join(root, 'config', 'profile.yml'), 'candidate:\n  name: Ada\nspend_tier: standard\n');
  // Twelve postings with text (the fixture corpus has jobs/1..6, 9, 10 plus the report URLs;
  // the rest are pasted-only URLs that the corpus does not know — still cached, still extractable
  // through an explicit batch, but not pending from the route's point of view).
  urls.forEach((url, i) => writePosting({ root, url, source: 'greenhouse-api', title: `Role ${i + 1}`, text: jd([`Posting number ${i + 1}.`, 'Requirements:', i % 2 ? '- Go and Kubernetes' : '- Kubernetes only']) }));

  app = buildApp({ root, agent, serveUi: false, watch: false });
  await app.ready();
});
after(async () => {
  await app.close();
  delete process.env.FAKE_CLAUDE_SCENARIO;
  rmSync(root, { recursive: true, force: true });
});

const get = (url) => app.inject({ method: 'GET', url });
const post = (url, payload = {}) => app.inject({ method: 'POST', url, payload });

async function drained({ timeoutMs = 30_000 } = {}) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const { queued, active } = (await get('/api/runs')).json();
    if (queued.length === 0 && active.length === 0) return;
    if (Date.now() > deadline) throw new Error(`queue never drained: ${JSON.stringify({ queued, active })}`);
    await new Promise((r) => setTimeout(r, 50));
  }
}
const run = async (id) => (await get(`/api/runs/${id}`)).json();

test('trimForPrompt keeps the opening and the requirements of a long posting', () => {
  const text = `${'About us. '.repeat(400)}\nRequirements:\n- Kubernetes\n${'More. '.repeat(2000)}`;
  const trimmed = trimForPrompt(text, 5_000);
  assert.ok(trimmed.length <= 5_100);
  assert.match(trimmed, /Requirements:\n- Kubernetes/);
  assert.equal(trimForPrompt('short'), 'short');
});

test('normalizeSkill and dedupeSkills fold spellings and drop junk', () => {
  assert.deepEqual(normalizeSkill({ skill: ' k8s ', category: 'nope', level: 'nope' }), { skill: 'k8s', canonical: 'Kubernetes', id: 'kubernetes', category: 'cloud-infra', level: 'required' });
  assert.equal(normalizeSkill({ skill: 'Zig', category: 'language', level: 'nice-to-have' }).category, 'language');
  assert.equal(normalizeSkill({ skill: 'Zig', category: 'made-up', level: 'nice-to-have' }).category, 'other');
  assert.equal(normalizeSkill({ skill: '' }), null);
  assert.equal(normalizeSkill('Kubernetes'), null);
  assert.equal(normalizeSkill({ skill: 'Python', depth: 'guru' }, { withLevel: false, withDepth: true }).depth, 'basic');
  const deduped = dedupeSkills([
    normalizeSkill({ skill: 'Kubernetes', level: 'nice-to-have' }),
    normalizeSkill({ skill: 'k8s', level: 'required' }),
    null,
  ]);
  assert.equal(deduped.length, 1);
  assert.equal(deduped[0].level, 'required');
});

test('POST /api/skills/extract batches the pending postings and the fake session fills the cache', async () => {
  scenario('skills-ok');
  const before = (await get('/api/skills')).json();
  assert.equal(before.coverage.pendingLlm, 8, 'jobs/1..6, 9 and 10 are in the corpus with text');
  assert.equal(before.cv.engine, 'rules');

  const res = await post('/api/skills/extract', { max: 1 });
  assert.equal(res.statusCode, 202, res.body);
  const body = res.json();
  assert.equal(body.pending, 8);
  assert.equal(body.batches, 1);
  assert.equal(body.remaining, 0, 'one batch of ten covers eight');
  assert.equal(body.runs.length, 1);
  assert.equal(body.runs[0].kind, 'skills-extract');
  assert.equal(body.runs[0].meta.postingIds.length, 8);
  assert.equal(body.cv?.kind, 'skills-cv', 'the CV has no LLM extraction yet, so it is queued too');

  await drained();
  const extractRun = await run(body.runs[0].id);
  assert.equal(extractRun.status, 'succeeded', extractRun.lines.map((l) => l.text).join('\n'));
  assert.equal(extractRun.result.extracted, 8);
  assert.deepEqual(extractRun.result.missing, []);

  const extractions = readExtractions({ root });
  assert.equal(extractions.size, 8);
  const one = [...extractions.values()][0];
  assert.equal(one.engine, 'llm');
  assert.equal(one.runId, extractRun.id);
  const names = one.skills.map((s) => `${s.canonical}:${s.level}`);
  assert.ok(names.includes('Kubernetes:required'), 'k8s and Kubernetes folded to one required entry');
  assert.ok(names.includes('Fake Skill:required'), 'an unknown level defaults to required');
  assert.ok(!one.skills.some((s) => s.skill === ''), 'the empty entry was dropped');
  assert.equal(one.skills.find((s) => s.canonical === 'Fake Skill').category, 'other');

  const cvRun = await run(body.cv.id);
  assert.equal(cvRun.status, 'succeeded', cvRun.lines.map((l) => l.text).join('\n'));
  const cv = readCvSkills({ root });
  assert.equal(cv.engine, 'llm');
  const depths = Object.fromEntries(cv.skills.map((s) => [s.canonical, s.depth]));
  assert.deepEqual(depths, { PostgreSQL: 'solid', Python: 'expert', Terraform: 'basic' }, 'Postgres canonicalized; the duplicate Terraform kept its first depth');

  const after = (await get('/api/skills')).json();
  assert.equal(after.coverage.extractedLlm, 8);
  assert.equal(after.coverage.pendingLlm, 0);
  assert.equal(after.cv.engine, 'llm');
  const kube = after.skills.find((s) => s.id === 'kubernetes');
  assert.equal(kube.demand, 8);
  assert.equal(after.cv.skills.find((s) => s.id === 'python').depth, 'expert');
  assert.equal(after.skills.find((s) => s.id === 'go').status, 'missing', 'Go is demanded and not on the CV');

  // Nothing pending: a second click queues nothing and spends nothing.
  const again = (await post('/api/skills/extract', {})).json();
  assert.equal(again.batches, 0);
  assert.equal(again.runs.length, 0);
  assert.equal(again.cv, null);
});

test('a partial output leaves the missing postings pending', async () => {
  scenario('skills-partial');
  // jobs/7, 8 and 11 are cached but outside the corpus, so the route never sent them.
  const postingIds = [urls[6], urls[7], urls[10]].map(postingId);
  const res = await post('/api/runs', { kind: 'skills-extract', options: { postingIds } });
  assert.equal(res.statusCode, 202, res.body);
  await drained();
  const finished = await run(res.json().id);
  assert.equal(finished.status, 'succeeded', finished.lines.map((l) => l.text).join('\n'));
  assert.equal(finished.result.extracted, 2);
  assert.deepEqual(finished.result.missing, [postingIds[2]]);
  assert.ok(finished.lines.some((l) => /1 posting not in the output/.test(l.text)));
  assert.equal(readExtractions({ root }).size, 10);
});

test('no output file, an already-extracted batch, and bad options all fail cleanly', async () => {
  scenario('skills-no-output');
  const res = await post('/api/runs', { kind: 'skills-extract', options: { postingIds: [postingId(urls[11])] } });
  assert.equal(res.statusCode, 202, res.body);
  await drained();
  const failed = await run(res.json().id);
  assert.equal(failed.status, 'failed');
  assert.match(failed.error, /exited without writing/);
  assert.equal(readExtractions({ root }).size, 10, 'nothing was cached');

  scenario('skills-ok');
  const done = await post('/api/runs', { kind: 'skills-extract', options: { postingIds: [postingId(urls[0])] } });
  await drained();
  const nothing = await run(done.json().id);
  assert.equal(nothing.status, 'failed');
  assert.match(nothing.error, /nothing left to extract/);

  assert.equal((await post('/api/runs', { kind: 'skills-extract', options: { postingIds: [] } })).statusCode, 400);
  assert.equal((await post('/api/runs', { kind: 'skills-extract', options: { postingIds: ['not-an-id'] } })).statusCode, 400);
  assert.equal((await post('/api/runs', { kind: 'skills-extract', options: { postingIds: Array(11).fill(postingId(urls[0])) } })).statusCode, 202, 'duplicates collapse below the batch size');
  await drained();
  assert.equal((await post('/api/skills/extract', { max: 99 })).statusCode, 400);
});

test('an existing LLM extraction is never sent again', async () => {
  scenario('skills-ok');
  const url = urls[10];
  const hash = readPosting({ root, id: postingId(url) }).textHash;
  writeExtraction({ root, textHash: hash, engine: 'llm', model: 'earlier', skills: [] });
  const res = await post('/api/runs', { kind: 'skills-extract', options: { postingIds: [postingId(url), postingId(urls[11])] } });
  await drained();
  const finished = await run(res.json().id);
  assert.equal(finished.status, 'succeeded', finished.lines.map((l) => l.text).join('\n'));
  assert.equal(finished.meta.sent, 1, 'only the unextracted posting went to the session');
  assert.equal(readExtractions({ root }).get(hash).model, 'earlier', 'the cached extraction was left alone');
});
