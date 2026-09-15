import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';

import { buildApp } from './app.js';
import { createWatcher, isIgnored } from './watch.js';

let root;
before(() => {
  root = mkdtempSync(join(tmpdir(), 'jsc-watch-'));
  mkdirSync(join(root, 'reports'));
  mkdirSync(join(root, 'data'));
});
after(() => rmSync(root, { recursive: true, force: true }));

/** Wait for the next `onChange` call, with a deadline. */
const nextChange = (events, { timeoutMs = 3_000 } = {}) =>
  new Promise((resolve, reject) => {
    const deadline = setTimeout(() => reject(new Error('no change event')), timeoutMs);
    const check = () => {
      if (events.length) {
        clearTimeout(deadline);
        resolve(events.shift());
      } else setTimeout(check, 25);
    };
    check();
  });

test('noise from a run never reaches the browser', () => {
  for (const noisy of [
    'reports/009-RESERVED.md',
    'data/applications.md.bak',
    'data/applications.md.bak-2026-09-15T10:00:00',
    'data/pipeline.md.lock/owner',
    'data/applications.md.lock',
    'data/jsc/prompts/x.md',
    'output/.career-ops-render-abc.html',
    'data/pipeline.md.pre-reconcile.bak',
    'batch/.batch-state-x/batch-state.tsv',
    'reports/.DS_Store',
    'data/x.tmp-1234',
  ]) {
    assert.equal(isIgnored(noisy), true, noisy);
  }
  for (const real of ['reports/009-acme-2026-09-15.md', 'data/applications.md', 'output/cv-ada-acme-2026-09-15.pdf', 'data/pdf-index.tsv', 'data/pipeline.md']) {
    assert.equal(isIgnored(real), false, real);
  }
});

test('a written report becomes one debounced event with a forward-slash path; ignored files do not', async () => {
  const events = [];
  const watcher = createWatcher({ root, onChange: (e) => events.push(e), debounceMs: 100 });
  try {
    assert.deepEqual(watcher.watching().sort(), ['data', 'reports']);
    // Two writes inside the window coalesce; the sentinel is dropped.
    writeFileSync(join(root, 'reports', '009-RESERVED.md'), '');
    writeFileSync(join(root, 'reports', '009-acme-2026-09-15.md'), '# a');
    writeFileSync(join(root, 'reports', '009-acme-2026-09-15.md'), '# ab');
    writeFileSync(join(root, 'data', 'applications.md'), '| # |');
    const event = await nextChange(events);
    assert.deepEqual(event.paths, ['data/applications.md', 'reports/009-acme-2026-09-15.md']);
    assert.equal(typeof event.at, 'number');
    // Nothing else was queued.
    await new Promise((r) => setTimeout(r, 200));
    assert.equal(events.length, 0);
  } finally {
    watcher.close();
  }
});

test('a directory that appears later gets watched on the retry', async () => {
  const events = [];
  const watcher = createWatcher({ root, onChange: (e) => events.push(e), debounceMs: 50, retryMs: 50 });
  try {
    assert.ok(!watcher.watching().includes('output'));
    mkdirSync(join(root, 'output'));
    await new Promise((r) => setTimeout(r, 200));
    assert.ok(watcher.watching().includes('output'));
    writeFileSync(join(root, 'output', 'cv.pdf'), '%PDF');
    const event = await nextChange(events);
    assert.deepEqual(event.paths, ['output/cv.pdf']);
  } finally {
    watcher.close();
  }
});

test('/api/events greets with the queue and streams run transitions', async () => {
  const app = buildApp({ root, serveUi: false, watch: false, agent: { found: false, display: 'none' } });
  await app.ready();
  try {
    const stream = app.inject({ method: 'GET', url: '/api/events' });
    // Fastify's inject resolves once the response ends; the SSE never does on
    // its own, so start a run that ends and then close the app to end it.
    await new Promise((r) => setTimeout(r, 50));
    const started = await app.inject({ method: 'POST', url: '/api/runs', payload: { kind: 'validate-portals' } });
    assert.equal(started.statusCode, 202);
    const id = started.json().id;
    for (;;) {
      const run = (await app.inject({ method: 'GET', url: `/api/runs/${id}` })).json();
      if (run.status !== 'running' && run.status !== 'queued') break;
      await new Promise((r) => setTimeout(r, 50));
    }
    const closing = app.close();
    const res = await stream;
    await closing;
    assert.equal(res.headers['content-type'], 'text/event-stream');
    const frames = res.body.split('\n\n').filter((f) => f.startsWith('event:'));
    assert.equal(frames[0].split('\n')[0], 'event: hello');
    const hello = JSON.parse(frames[0].split('\n')[1].slice(6));
    assert.deepEqual(Object.keys(hello.runs).sort(), ['active', 'queued', 'recent']);
    const runs = frames.filter((f) => f.startsWith('event: run')).map((f) => JSON.parse(f.split('\n')[1].slice(6)).run);
    assert.ok(runs.some((r) => r.id === id && r.status === 'running'));
    assert.ok(runs.some((r) => r.id === id && ['succeeded', 'failed'].includes(r.status)));
  } finally {
    await app.close();
  }
});
