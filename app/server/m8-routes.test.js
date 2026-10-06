/**
 * The routes M8 adds for the new UI (ia.md): first run on an empty workspace,
 * My CV › Content and Profile, and the rest as they land. Each test starts from
 * an empty temp folder, which is exactly what a first-time user has.
 */

import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { buildApp } from './app.js';

const FAKE_CLAUDE = join(dirname(fileURLToPath(import.meta.url)), 'services', '__fixtures__', 'bin', 'fake-claude.js');

const scratches = [];
const apps = [];
after(async () => {
  for (const app of apps) await app.close();
  for (const dir of scratches) rmSync(dir, { recursive: true, force: true });
});

async function emptyWorkspace(options = {}) {
  const root = mkdtempSync(join(tmpdir(), 'jsc-m8-'));
  scratches.push(root);
  const app = buildApp({ root, serveUi: false, watch: false, agent: { found: false, source: 'missing', display: 'claude' }, ...options });
  apps.push(app);
  await app.ready();
  const call = async (method, url, payload) => {
    const res = await app.inject({ method, url, payload });
    return { status: res.statusCode, body: res.json() };
  };
  return { root, app, call };
}

test('first run: the CV and the first company are saved from an empty folder', async () => {
  const { root, call } = await emptyWorkspace();

  const none = await call('GET', '/api/cv/content');
  assert.equal(none.body.exists, false);

  const saved = await call('PUT', '/api/cv/content', { text: '# Alex Rivera\n\n## Experience\n### Engineer — Northwind\n' });
  assert.equal(saved.status, 200);
  assert.equal(saved.body.summary.name, 'Alex Rivera');
  assert.equal((await call('GET', '/api/agent/status')).body.cvPresent, true);

  const empty = await call('PUT', '/api/cv/content', { text: ' ' });
  assert.equal(empty.status, 400);
  assert.equal(empty.body.code, 'cv-empty');

  const followed = await call('POST', '/api/portals/entries', {
    kind: 'company',
    entry: { name: 'Kestrel Media', careersUrl: 'https://job-boards.greenhouse.io/kestrelmedia' },
    etag: null,
  });
  assert.equal(followed.status, 201, JSON.stringify(followed.body));
  assert.ok(existsSync(join(root, 'portals.yml')));
  assert.equal((await call('GET', '/api/portals')).body.companies[0].name, 'Kestrel Media');
});

test('the assistant check runs --version, and Check again re-runs it', async () => {
  const fake = { file: process.execPath, args: [FAKE_CLAUDE], found: true, shell: false, source: 'env', display: 'fake-claude' };
  const { call } = await emptyWorkspace({ agent: fake });
  const ready = await call('GET', '/api/agent/status');
  assert.deepEqual([ready.body.check.ready, ready.body.check.version], [true, '2.1.0']);

  process.env.FAKE_CLAUDE_VERSION = 'fail';
  try {
    const cached = await call('GET', '/api/agent/status');
    assert.equal(cached.body.check.checkedAt, ready.body.check.checkedAt, 'not re-run on every read');
    const again = await call('GET', '/api/agent/status?refresh=1');
    assert.equal(again.body.check.ready, false);
    assert.match(again.body.check.error, /cannot start/);
  } finally {
    delete process.env.FAKE_CLAUDE_VERSION;
  }

  const missing = await emptyWorkspace();
  const none = await missing.call('GET', '/api/agent/status');
  assert.deepEqual([none.body.check.ready, none.body.check.error], [false, 'not-found']);
});

test('profile: read with defaults, saved in place, refused with the field named', async () => {
  const { root, call } = await emptyWorkspace();

  const blank = await call('GET', '/api/profile');
  assert.equal(blank.body.exists, false);
  assert.equal(blank.body.fields.autoPdfThreshold, 3);

  const saved = await call('PUT', '/api/profile', { fields: { fullName: 'Alex Rivera', autoPdfThreshold: 3.5 } });
  assert.equal(saved.status, 200);
  assert.equal(saved.body.fields.fullName, 'Alex Rivera');
  assert.match(readFileSync(join(root, 'config', 'profile.yml'), 'utf-8'), /auto_pdf_score_threshold: 3\.5/);
  assert.equal((await call('GET', '/api/agent/status')).body.profile.autoPdfThreshold, 3.5);

  const bad = await call('PUT', '/api/profile', { fields: { autoPdfThreshold: 9 } });
  assert.equal(bad.status, 400);
  assert.equal(bad.body.detail[0].field, 'autoPdfThreshold');
});

test('a failed check is named after its job, kept across restarts, and Try again links the retry', async () => {
  const { cpSync, mkdirSync, writeFileSync } = await import('node:fs');
  const root = mkdtempSync(join(tmpdir(), 'jsc-m8-retry-'));
  scratches.push(root);
  cpSync(join(dirname(FAKE_CLAUDE), '..', '..', '__fixtures__', 'workspace'), root, { recursive: true });
  writeFileSync(join(root, 'cv.md'), '# Ada Lovelace\n\n## Experience\n- Built the engine\n');
  mkdirSync(join(root, 'data', 'jsc'), { recursive: true });
  writeFileSync(join(root, 'data', 'jsc', 'fake-scenarios'), 'evaluate-is-error\n');
  process.env.FAKE_CLAUDE_SCENARIO = 'evaluate-ok';
  const fake = { file: process.execPath, args: [FAKE_CLAUDE], found: true, shell: false, source: 'env', display: 'fake-claude' };

  const app = buildApp({ root, serveUi: false, watch: false, agent: fake });
  apps.push(app);
  const call = async (method, url, payload) => {
    const res = await app.inject({ method, url, payload });
    return { status: res.statusCode, body: res.json() };
  };
  const until = async (id) => {
    for (let i = 0; i < 400; i++) {
      const run = (await call('GET', `/api/runs/${id}`)).body;
      if (['succeeded', 'failed', 'cancelled'].includes(run.status)) return run;
      await new Promise((r) => setTimeout(r, 50));
    }
    throw new Error('run did not finish');
  };

  const url = 'https://job-boards.greenhouse.io/driftwoodanalytics/jobs/4109592';
  const added = await call('POST', '/api/inbox/urls', { url, company: 'Driftwood Analytics', title: 'Data Engineer', evaluate: true });
  assert.equal(added.status, 201, JSON.stringify(added.body));
  assert.equal(added.body.run.subject, 'Driftwood Analytics — Data Engineer');
  const failed = await until(added.body.run.id);
  assert.equal(failed.status, 'failed');
  assert.deepEqual(failed.request, { kind: 'evaluate', options: { url, autoPdf: true } });

  const notFailed = await call('POST', `/api/runs/${failed.id}/retry`);
  assert.equal(notFailed.status, 202);
  const retried = await until(notFailed.body.id);
  assert.equal(retried.retryOf, failed.id);
  assert.equal(retried.status, 'succeeded', retried.error ?? '');
  assert.equal((await call('POST', `/api/runs/${retried.id}/retry`)).status, 409);

  // A new server over the same folder still knows about both.
  const again = buildApp({ root, serveUi: false, watch: false, agent: fake });
  apps.push(again);
  const recent = (await again.inject({ method: 'GET', url: '/api/runs' })).json().recent;
  assert.ok(recent.some((r) => r.id === failed.id && r.restored && r.status === 'failed'));
  delete process.env.FAKE_CLAUDE_SCENARIO;
});

test('workspace: an empty folder is day one, and set-up fills in step by step', async () => {
  const { call } = await emptyWorkspace();
  const day1 = (await call('GET', '/api/workspace')).body;
  assert.deepEqual(day1.setup, { cv: false, company: false, assistant: false, done: false });
  assert.deepEqual(day1.files, { cv: false, profile: false, portals: false, tracker: false, inbox: false, voice: false });
  assert.equal(day1.counts.applications, 0);

  await call('PUT', '/api/cv/content', { text: '# Alex Rivera\n' });
  await call('POST', '/api/portals/entries', { kind: 'company', entry: { name: 'Kestrel Media', careersUrl: 'https://job-boards.greenhouse.io/kestrelmedia' }, etag: null });
  const later = (await call('GET', '/api/workspace')).body;
  assert.deepEqual([later.setup.cv, later.setup.company, later.setup.assistant], [true, true, false]);
  assert.equal(later.counts.companies, 1);
});

test('today: last seen and dismissed cards are remembered, with Undo', async () => {
  const { call } = await emptyWorkspace();
  assert.deepEqual((await call('GET', '/api/today')).body, { lastSeen: null, dismissed: [] });
  const seen = await call('PUT', '/api/today', { lastSeen: '2026-10-06T10:00:00Z', dismiss: 'run-1' });
  assert.equal(seen.status, 200);
  assert.deepEqual([seen.body.lastSeen, seen.body.dismissed], ['2026-10-06T10:00:00.000Z', ['run-1']]);
  assert.deepEqual((await call('PUT', '/api/today', { undismiss: 'run-1' })).body.dismissed, []);
  assert.equal((await call('PUT', '/api/today', { lastSeen: 'yesterday' })).status, 400);
});

test('to review: Remove takes the line out, Undo puts the same line back', async () => {
  const { root, call } = await emptyWorkspace();
  const url = 'https://job-boards.greenhouse.io/kestrelmedia/jobs/4134913';
  await call('POST', '/api/inbox/urls', { url, company: 'Kestrel Media', title: 'Senior Backend Engineer' });
  const before = readFileSync(join(root, 'data', 'pipeline.md'), 'utf-8');

  const removed = await call('DELETE', '/api/inbox/urls', { url });
  assert.equal(removed.status, 200, JSON.stringify(removed.body));
  assert.equal(removed.body.line, `- [ ] ${url} | Kestrel Media | Senior Backend Engineer`);
  assert.equal((await call('GET', '/api/inbox')).body.pending.length, 0);
  assert.equal((await call('DELETE', '/api/inbox/urls', { url })).status, 404);

  const restored = await call('POST', '/api/inbox/urls/restore', { line: removed.body.line });
  assert.equal(restored.body.restored, true);
  assert.equal(readFileSync(join(root, 'data', 'pipeline.md'), 'utf-8'), before);
  assert.equal((await call('POST', '/api/inbox/urls/restore', { line: '- [x] #1 | done' })).status, 400);
  assert.equal((await call('POST', '/api/inbox/urls/restore', { line: removed.body.line })).body.restored, false, 'not added twice');
});

test('writing rules: one word in or out, nothing else rewritten, and Undo restores', async () => {
  const { root, call } = await emptyWorkspace();
  const { writeFileSync } = await import('node:fs');
  const rules = '# Voice\n\n## Tone\nPlain.\n\n## Never write\n- spearheaded\n- leveraged\n\n## Bullets\nShort.\n';
  writeFileSync(join(root, 'voice-dna.md'), rules);

  assert.deepEqual((await call('GET', '/api/cv/voice')).body.words, ['spearheaded', 'leveraged']);
  const added = await call('POST', '/api/cv/voice/words', { word: 'seamless' });
  assert.deepEqual(added.body.words, ['spearheaded', 'leveraged', 'seamless']);
  assert.equal(readFileSync(join(root, 'voice-dna.md'), 'utf-8'), rules.replace('- leveraged\n', '- leveraged\n- seamless\n'));
  assert.equal((await call('POST', '/api/cv/voice/words', { word: 'Seamless' })).body.added, false);

  const removed = await call('DELETE', '/api/cv/voice/words', { word: 'leveraged' });
  assert.deepEqual(removed.body.words, ['spearheaded', 'seamless']);
  assert.equal((await call('POST', '/api/cv/voice/words', { word: '' })).status, 400);

  await call('PUT', '/api/cv/voice', { text: '# Example rules\n' });
  const undone = await call('POST', '/api/cv/voice/restore');
  assert.deepEqual(undone.body.words, ['spearheaded', 'seamless']);
});

test('writing rules: a file without the section gets one at the end', async () => {
  const { root, call } = await emptyWorkspace();
  const { writeFileSync } = await import('node:fs');
  writeFileSync(join(root, 'voice-dna.md'), '# Voice\n\n## Tone\nPlain.\n');
  await call('POST', '/api/cv/voice/words', { word: 'robust' });
  assert.equal(readFileSync(join(root, 'voice-dna.md'), 'utf-8'), '# Voice\n\n## Tone\nPlain.\n\n## Never write\n- robust\n');
  assert.equal((await call('POST', '/api/cv/voice/restore')).status, 200);
});

const needsChromium = !(await import('playwright').then((m) => existsSync(m.chromium.executablePath())).catch(() => false));

test('design check: the saved design is rendered once and its screening verdict kept', { skip: needsChromium && 'Chromium is not installed' }, async () => {
  const { call } = await emptyWorkspace();
  const first = await call('GET', '/api/cv/design-check');
  assert.equal(first.status, 200, JSON.stringify(first.body));
  assert.ok(['pass', 'warn', 'fail'].includes(first.body.verdict));
  const again = await call('GET', '/api/cv/design-check');
  assert.equal(again.body.checkedAt, first.body.checkedAt, 'not rendered twice for the same style');
});

test('to review: each link says the day the scanner first saw it', async () => {
  const { root, call } = await emptyWorkspace();
  const { mkdirSync, writeFileSync } = await import('node:fs');
  mkdirSync(join(root, 'data'), { recursive: true });
  const url = 'https://job-boards.greenhouse.io/kestrelmedia/jobs/1';
  writeFileSync(join(root, 'data', 'scan-history.tsv'), `url\tfirst_seen\tportal\ttitle\tcompany\tstatus\n${url}\t2026-10-05\tgreenhouse-api\tEngineer\tKestrel Media\tadded\n`);
  await call('POST', '/api/inbox/urls', { url, company: 'Kestrel Media', title: 'Engineer' });
  await call('POST', '/api/inbox/urls', { url: 'https://example.com/jobs/2' });
  const pending = (await call('GET', '/api/inbox')).body.pending;
  assert.deepEqual(pending.map((p) => p.firstSeen), ['2026-10-05', null]);
});
