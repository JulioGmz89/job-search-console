import assert from 'node:assert/strict';
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
