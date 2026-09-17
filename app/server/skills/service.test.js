import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { buildApp } from '../app.js';
import { pendingLlm, readCv, readGapMentions, readSkillsOverview } from './service.js';
import { postingId, textHash, writeCvSkills, writeExtraction, writePosting } from './store.js';

const here = dirname(fileURLToPath(import.meta.url));
const WORKSPACE = join(here, '..', 'services', '__fixtures__', 'workspace');

const jd = (lines) => `${lines.join('\n')}\n${'Filler sentence about the role. '.repeat(10)}`;

let root;
let app;
before(async () => {
  root = mkdtempSync(join(tmpdir(), 'jsc-skills-service-'));
  cpSync(WORKSPACE, root, { recursive: true });
  writeFileSync(join(root, 'cv.md'), '# Ada\n\n## Experience\n- Wrote Python services and touched Terraform once\n\n## Skills\n- Python, PostgreSQL\n');
  mkdirSync(join(root, 'config'), { recursive: true });
  writeFileSync(join(root, 'config', 'profile.yml'), 'candidate:\n  name: Ada\nskills:\n  - Docker\n');

  // Four postings with text: two rules-only, one with a cached LLM extraction, one evaluated (report 001, score 4.2).
  writePosting({ root, url: 'https://example.com/jobs/2', source: 'greenhouse-api', title: 'Backend Engineer', text: jd(['Requirements:', '- Python and Kubernetes', '- PostgreSQL', 'Nice to have:', '- Terraform']) });
  writePosting({ root, url: 'https://example.com/jobs/3', source: 'lever-api', title: 'Staff Engineer', text: jd(['Requirements:', '- Kubernetes and Go', '- Kafka']) });
  const llmText = jd(['We want someone who knows Kubernetes and Zig.']);
  writePosting({ root, url: 'https://example.com/jobs/4', source: 'ashby-api', title: 'Data Engineer', text: llmText });
  writeExtraction({ root, textHash: textHash(llmText), engine: 'llm', model: 'fake', skills: [
    { skill: 'Kubernetes', canonical: 'Kubernetes', id: 'kubernetes', category: 'cloud-infra', level: 'required' },
    { skill: 'Zig', canonical: 'Zig', id: 'zig', category: 'language', level: 'nice-to-have' },
  ] });
  writePosting({ root, url: 'https://example.invalid/jobs/acme-backend', source: 'jds', title: 'Backend Engineer', text: jd(['Must have:', '- Kubernetes', '- Python']) });
  // One failed fetch.
  writePosting({ root, url: 'https://example.com/jobs/6', error: { code: 'browser-empty_text', message: 'login wall' } });

  app = buildApp({ root, serveUi: false, watch: false });
  await app.ready();
});
after(async () => {
  await app.close();
  rmSync(root, { recursive: true, force: true });
});

test('readCv falls back to rules and notices a stale LLM extraction', () => {
  const rules = readCv({ root });
  assert.equal(rules.engine, 'rules');
  assert.equal(rules.stale, false);
  const depth = Object.fromEntries(rules.skills.map((s) => [s.canonical, s.depth]));
  assert.deepEqual(depth, { Docker: 'solid', PostgreSQL: 'solid', Python: 'solid', Terraform: 'basic' });

  writeCvSkills({ root, cvHash: 'old-hash', engine: 'llm', skills: [{ skill: 'Python', canonical: 'Python', id: 'python', category: 'language', depth: 'expert' }] });
  const stale = readCv({ root });
  assert.equal(stale.engine, 'rules');
  assert.equal(stale.stale, true, 'cv.md changed since the LLM read it');

  writeCvSkills({ root, cvHash: rules.hash, engine: 'llm', skills: [{ skill: 'Python', canonical: 'Python', id: 'python', category: 'language', depth: 'expert' }, { skill: 'Terraform', canonical: 'Terraform', id: 'terraform', category: 'cloud-infra', depth: 'basic' }] });
  const fresh = readCv({ root });
  assert.equal(fresh.engine, 'llm');
  assert.equal(fresh.skills.length, 2);
});

test('gap mentions come out of the reports through upstream\'s parser', () => {
  const mentions = readGapMentions({ root });
  assert.deepEqual([...mentions.get('kubernetes')], [1], 'fixture report 001 lists "No Kubernetes experience evidenced" as a soft gap');
});

test('GET /api/skills joins the cache, the CV, the reports and the corpus', async () => {
  const res = await app.inject({ method: 'GET', url: '/api/skills' });
  assert.equal(res.statusCode, 200);
  const body = res.json();

  assert.equal(body.coverage.postings, 14);
  assert.equal(body.coverage.withText, 4);
  assert.equal(body.coverage.fetchFailed, 1);
  assert.equal(body.coverage.unfetched, 9);
  assert.equal(body.coverage.extractedLlm, 1);
  assert.equal(body.coverage.rulesOnly, 3);
  assert.equal(body.coverage.pendingLlm, 3);
  assert.equal(body.coverage.sessionsNeeded, 1);
  assert.equal(body.coverage.evaluated, 8);
  assert.equal(body.cv.engine, 'llm');
  assert.equal(body.cv.present, true);

  const by = Object.fromEntries(body.skills.map((s) => [s.id, s]));
  assert.equal(by.kubernetes.demand, 4);
  assert.equal(by.kubernetes.status, 'missing');
  assert.equal(by.kubernetes.gapMentions, 1);
  assert.equal(by.kubernetes.strong, 1, 'the Acme posting scores 4.2');
  assert.equal(by.python.status, 'have', 'LLM depth expert');
  assert.equal(by.terraform.status, 'partial');
  assert.equal(by.terraform.nice, 1);
  assert.equal(by.zig.category, 'language', 'LLM-only skill keeps the LLM category');

  assert.equal(body.lists.learn[0], 'kubernetes');
  assert.ok(!body.lists.learn.includes('zig'), 'demand 1 is below the recommendation floor');

  const acmeId = postingId('https://example.invalid/jobs/acme-backend');
  assert.ok(by.kubernetes.postings.some((p) => p.id === acmeId && p.level === 'required'));
  assert.equal(body.postings[acmeId].reportId, 1);
  assert.equal(body.postings[acmeId].score, 4.2);
  assert.equal(body.postings[acmeId].engine, 'rules');
  const failedId = postingId('https://example.com/jobs/6');
  assert.equal(body.postings[failedId].error.code, 'browser-empty_text');
  assert.equal(body.postings[failedId].hasText, false);
});

test('pendingLlm puts evaluated and high-scoring postings first', () => {
  const overview = readSkillsOverview({ root });
  const pending = pendingLlm(Object.values(overview.postings).map((p) => ({ ...p, hasText: p.hasText, engine: p.engine })));
  assert.equal(pending.length, 3);
  assert.equal(pending[0].reportId, 1);
});

test('PUT /api/skills/overrides changes the classification and validates its input', async () => {
  const put = (payload) => app.inject({ method: 'PUT', url: '/api/skills/overrides', payload });
  assert.equal((await put({ id: 'kubernetes', status: 'partial' })).statusCode, 200);
  let body = (await app.inject({ method: 'GET', url: '/api/skills' })).json();
  assert.equal(body.skills.find((s) => s.id === 'kubernetes').status, 'partial');
  assert.equal(body.skills.find((s) => s.id === 'kubernetes').statusSource, 'override');
  assert.ok(body.lists.deepen.includes('kubernetes'));
  assert.deepEqual(body.overrides, { kubernetes: 'partial' });

  assert.equal((await put({ id: 'kubernetes', status: null })).statusCode, 200);
  body = (await app.inject({ method: 'GET', url: '/api/skills' })).json();
  assert.equal(body.skills.find((s) => s.id === 'kubernetes').status, 'missing');

  assert.equal((await put({ id: 'kubernetes', status: 'expert' })).statusCode, 400);
  assert.equal((await put({ status: 'have' })).statusCode, 400);
  assert.equal((await put([])).statusCode, 400);
});
