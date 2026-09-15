import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { buildApp } from './app.js';

const here = dirname(fileURLToPath(import.meta.url));
const WORKSPACE = join(here, 'services', '__fixtures__', 'workspace');

const app = buildApp({ root: WORKSPACE });
const get = (url) => app.inject({ method: 'GET', url });

test('GET /api/health reports the counts and surfaces drift', async () => {
  const res = await get('/api/health');
  const body = res.json();

  assert.equal(res.statusCode, 200);
  assert.equal(body.counts.rows, 7);
  assert.equal(body.counts.reports, 6);
  assert.equal(body.counts.pdfs, 1, 'only the Acme PDF exists on disk');

  const codes = body.issues.map((i) => i.code);
  assert.ok(codes.includes('status-unknown'), 'the Pondering status is flagged');
  assert.ok(codes.includes('pdf-missing'), 'the indexed-but-absent PDF is flagged');
  assert.ok(codes.includes('report-missing'), 'row 8 has no report file');
  assert.ok(codes.includes('machine-summary-missing'));
  assert.ok(codes.includes('machine-summary-invalid'));

  // Drift is all warn-level: the dashboard is still usable.
  assert.equal(body.ok, true);
});

test('GET /api/pipeline joins each row to its report', async () => {
  const body = (await get('/api/pipeline')).json();

  assert.equal(body.rows.length, 7);
  assert.equal(body.statuses.length, 9, 'the full state vocabulary for filter tabs');
  assert.deepEqual(body.scoreBands.map((b) => b.id), ['strong', 'review', 'skip']);

  const acme = body.rows.find((r) => r.id === 1);
  assert.equal(acme.report.decision, 'Apply');
  assert.equal(acme.report.advertisedComp, '$90,000 - $110,000 a year');
  assert.equal(acme.pdf.format, 'a4');

  // Row 4's Report cell points at 005; the join must follow the cell.
  const umbrella = body.rows.find((r) => r.id === 4);
  assert.equal(umbrella.report.decision, 'Skip');

  const vehement = body.rows.find((r) => r.id === 8);
  assert.equal(vehement.hasReport, false);
  assert.equal(vehement.report, null);

  // An indexed PDF whose file is absent must not offer a preview link.
  assert.equal(body.rows.find((r) => r.id === 6).pdf, null);
});

test('the API never leaks the raw tracker line', async () => {
  const body = (await get('/api/pipeline')).json();
  for (const row of body.rows) {
    assert.equal(row.rawLine, undefined, 'rawLine is an M2 write-back detail');
  }
});

test('GET /api/reports/:id returns sanitized sections plus tracker facts', async () => {
  const body = (await get('/api/reports/1')).json();

  assert.equal(body.id, 1);
  assert.equal(body.machine.score, 4.2);
  assert.equal(body.tracker.statusId, 'applied');
  assert.ok(body.sections[1].html.includes('<li>'));
});

test('GET /api/reports/:id 404s for unknown and traversing ids', async () => {
  assert.equal((await get('/api/reports/999')).statusCode, 404);
  assert.equal((await get('/api/reports/abc')).statusCode, 404);
  assert.equal((await get('/api/reports/..%2F..%2Fetc%2Fpasswd')).statusCode, 404);
});

test('GET /api/reports/:id/pdf streams the file inline', async () => {
  const res = await get('/api/reports/1/pdf');

  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['content-type'], 'application/pdf');
  assert.match(res.headers['content-disposition'], /^inline; filename="cv-fixture-acme/);
  assert.ok(res.rawPayload.subarray(0, 5).toString() === '%PDF-');
});

test('GET /api/reports/:id/pdf 404s rather than serving an escaping path', async () => {
  assert.equal((await get('/api/reports/6/pdf')).statusCode, 404, 'indexed but absent');
  assert.equal((await get('/api/reports/9/pdf')).statusCode, 404, 'path escapes output/');
  assert.equal((await get('/api/reports/3/pdf')).statusCode, 404, 'no PDF at all');
});

test('an unknown /api path is a JSON 404 whether or not the UI is built', async () => {
  // This half must hold in both configurations. It previously did not: the
  // handler was registered only when ui/dist existed, so with no build an
  // unknown /api path fell through to Fastify's default 404, whose body has no
  // `error` key — the very field ui/src/api.js unwraps. That is the dev-server
  // configuration, so the unhandled mode was the one used while developing.
  const missing = await buildApp({ root: WORKSPACE }).inject({ method: 'GET', url: '/api/nope' });
  assert.equal(missing.statusCode, 404);
  assert.equal(missing.json().error, 'Not found');
});

test('a client route falls through to the SPA shell once the UI is built', async (t) => {
  // ui/dist is gitignored, so it is absent on a fresh clone and present on a
  // developer's machine. Asserting unconditionally made this test pass locally
  // and fail in CI from M1 onward; skipping when there is nothing to serve keeps
  // `npm test` honest on a bare checkout, and CI now builds the UI first so this
  // path is still covered there.
  if (!existsSync(join(here, '..', 'ui', 'dist', 'index.html'))) {
    return t.skip('ui/dist not built — run `npm run build` to cover the SPA fallback');
  }

  const shell = await buildApp({ root: WORKSPACE }).inject({ method: 'GET', url: '/deep/link' });
  assert.equal(shell.statusCode, 200);
  assert.match(shell.headers['content-type'], /text\/html/);
});

// ── M2: writes, runs and streaming ───────────────────────────────────
//
// These tests deliberately exercise only the REFUSAL paths of the write and run
// routes. The success paths spawn real upstream scripts against real files, and
// the fixture workspace is committed to the repository — a route test that
// "succeeded" here would rewrite the fixture on every run. Those paths are
// covered in services/status.test.js and queue/runner.test.js, which each build
// a throwaway copy first.

const send = (method, url, payload) => app.inject({ method, url, payload });

test('GET /api/portals reads the sources with an etag and a provider vocabulary', async () => {
  const body = (await get('/api/portals')).json();

  assert.equal(body.exists, true);
  assert.equal(body.editable, true);
  assert.deepEqual(body.companies.map((c) => c.name), ['Acme', 'Globex', 'Initech', 'Umbrella']);
  assert.equal(typeof body.etag, 'string');
  assert.ok(body.providers.includes('greenhouse'), 'the dropdown is fed from providers/');
  assert.deepEqual(body.scanMethods, ['playwright', 'websearch', 'local_parser']);
  // Health comes from portal-health.tsv, latest row per company.
  assert.equal(body.health.Acme.status, 'slug_gone');
});

test('a portals write without a fresh etag is refused', async () => {
  const res = await send('PATCH', '/api/portals/entries/company/0', {
    name: 'Acme',
    entry: { enabled: false },
    etag: 'not-the-current-one',
  });
  assert.equal(res.statusCode, 409);
  assert.equal(res.json().code, 'stale-etag');
});

test('a portals write whose index no longer holds that name is refused', async () => {
  const { etag } = (await get('/api/portals')).json();
  const res = await send('PATCH', '/api/portals/entries/company/0', {
    name: 'Globex',
    entry: { enabled: false },
    etag,
  });
  assert.equal(res.statusCode, 409);
  assert.equal(res.json().code, 'entry-moved');
});

test('a portals entry the scanner could never reach is refused', async () => {
  const { etag } = (await get('/api/portals')).json();
  const res = await send('POST', '/api/portals/entries', {
    kind: 'company',
    entry: { name: 'Nowhere' },
    etag,
  });
  assert.equal(res.statusCode, 400);
  assert.equal(res.json().code, 'entry-unreachable');
});

test('GET /api/inbox parses pipeline.md and carries the last scan', async () => {
  const body = (await get('/api/inbox')).json();

  assert.equal(body.pending.length, 6);
  assert.equal(body.processed.length, 2);
  assert.equal(body.lastScan.new_added, 5);
});

test('an unknown status is refused before set-status.mjs is ever spawned', async () => {
  const res = await send('PATCH', '/api/pipeline/rows/2/status', { statusId: 'pondering' });
  assert.equal(res.statusCode, 400);
  assert.equal(res.json().code, 'status-unknown');
});

test('a note that would break the tracker table is refused', async () => {
  const res = await send('PATCH', '/api/pipeline/rows/2/status', { statusId: 'applied', note: 'a | b' });
  assert.equal(res.statusCode, 400);
  assert.equal(res.json().code, 'note-pipe');
});

test('a non-object body is a 400, not a crash', async () => {
  const res = await send('PATCH', '/api/pipeline/rows/2/status', ['applied']);
  assert.equal(res.statusCode, 400);
  assert.equal(res.json().code, 'body-invalid');
});

test('GET /api/runs lists the run vocabulary without any argv builders', async () => {
  const body = (await get('/api/runs')).json();

  assert.deepEqual(body.active, []);
  assert.deepEqual(body.queued, []);
  assert.deepEqual(body.recent, []);
  const scan = body.kinds.find((k) => k.kind === 'scan');
  assert.equal(scan.label, 'Scan portals');
  assert.equal(scan.supportsDryRun, true);
  assert.equal(body.kinds.find((k) => k.kind === 'dedup').confirmRequired, true);
  // The wire vocabulary carries no way to influence what actually gets run.
  for (const kind of body.kinds) assert.equal(kind.args, undefined);
  // Every maintenance kind explains itself; the UI's help panel renders this
  // rather than restating it, so the spec that runs a script is the one place
  // that describes it.
  for (const kind of body.kinds.filter((k) => k.kind !== 'scan')) {
    assert.ok(kind.help && kind.help.length > 100, `${kind.kind} has a help paragraph`);
  }
});

test('the client cannot name a command, only a kind', async () => {
  for (const payload of [
    { kind: 'rm', options: {} },
    { kind: '../../evil', options: {} },
    { script: 'scan.mjs', args: ['--force'] },
    { kind: 'scan', options: { since: -1 } },
  ]) {
    const res = await send('POST', '/api/runs', payload);
    assert.equal(res.statusCode, 400, `refused: ${JSON.stringify(payload)}`);
  }
});

test('a tracker-rewriting run is refused without a spent dry run', async () => {
  for (const payload of [
    { kind: 'dedup' },
    { kind: 'dedup', confirmToken: 'made-up' },
    { kind: 'reconcile', confirmToken: 'made-up' },
  ]) {
    const res = await send('POST', '/api/runs', payload);
    assert.equal(res.statusCode, 409, `refused: ${JSON.stringify(payload)}`);
    assert.equal(res.json().code, 'confirm-required');
  }
});

test('an unknown run id 404s on every run route', async () => {
  assert.equal((await get('/api/runs/nope')).statusCode, 404);
  assert.equal((await get('/api/runs/nope/events')).statusCode, 404);
  assert.equal((await send('POST', '/api/runs/nope/cancel')).statusCode, 404);
});

test('a run streams its output as SSE and ends the stream when it finishes', async () => {
  // validate-portals.mjs is the one kind that is read-only, fast, and needs no
  // network — the only spawn this file can safely make.
  const started = await send('POST', '/api/runs', { kind: 'validate-portals' });
  assert.equal(started.statusCode, 202);
  const { id } = started.json();

  const stream = await app.inject({ method: 'GET', url: `/api/runs/${id}/events` });
  assert.equal(stream.statusCode, 200);
  assert.match(stream.headers['content-type'], /text\/event-stream/);
  assert.equal(stream.headers['x-accel-buffering'], 'no');

  const events = stream.payload
    .split('\n\n')
    .filter((frame) => frame.startsWith('event:'))
    .map((frame) => JSON.parse(frame.slice(frame.indexOf('data: ') + 6)));

  assert.ok(events.some((e) => e.type === 'line'), 'the log is replayed and streamed');
  const done = events.at(-1);
  assert.equal(done.type, 'done');
  assert.equal(done.run.status, 'succeeded');

  // And the finished run is retrievable afterwards, with its whole log.
  const record = (await get(`/api/runs/${id}`)).json();
  assert.equal(record.status, 'succeeded');
  assert.equal(record.exitCode, 0);
  assert.ok(record.lines.some((l) => l.text.includes('0 errors')));
});
