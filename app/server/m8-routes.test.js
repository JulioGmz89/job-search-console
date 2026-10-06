/**
 * The routes M8 adds for the new UI (ia.md): first run on an empty workspace,
 * My CV › Content and Profile, and the rest as they land. Each test starts from
 * an empty temp folder, which is exactly what a first-time user has.
 */

import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';

import { buildApp } from './app.js';

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
