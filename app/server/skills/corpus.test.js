import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { readCorpus, readScanHistory } from './corpus.js';
import { postingId } from './store.js';

const here = dirname(fileURLToPath(import.meta.url));
const WORKSPACE = join(here, '..', 'services', '__fixtures__', 'workspace');

test('scan history reads by header name and tolerates ragged rows', () => {
  const rows = readScanHistory({ root: WORKSPACE });
  assert.equal(rows.length, 6);
  assert.equal(rows[0].company, 'Acme');
  assert.equal(rows[0].posted_at, '2026-01-01');
  assert.equal(rows[1].location, 'Remote — LatAm');
  assert.equal(rows[1].posted_at, null);
});

test('the corpus joins scan history, the inbox and the tracker on the normalized URL', () => {
  const { postings, byId, counts } = readCorpus({ root: WORKSPACE });

  // Scanned + inbox (jobs/2..5), pasted only (jobs/1), the errored row (jobs/6),
  // processed (jobs/9, jobs/10), and the six reports' URLs.
  assert.equal(counts.scan, 4, 'skipped_title and skipped_expired rows are left out');
  assert.equal(counts.inbox, 8);
  assert.equal(counts.tracker, 6);

  const globex = byId.get(postingId('https://example.com/jobs/3'));
  assert.ok(globex, 'the utm_source spelling and the bare one are one posting');
  assert.deepEqual(globex.sources, ['scan', 'inbox']);
  assert.equal(globex.firstSeen, '2026-01-03');
  assert.equal(globex.portal, 'lever-api');
  assert.equal(globex.url, 'https://example.com/jobs/3');

  const acme = byId.get(postingId('https://example.invalid/jobs/acme-backend'));
  assert.deepEqual(acme.sources, ['scan', 'tracker']);
  assert.equal(acme.reportId, 1);
  assert.equal(acme.score, 4.2);
  assert.equal(acme.firstSeen, '2025-12-30', 'scan history wins over the tracker date');

  const umbrella = byId.get(postingId('https://example.invalid/jobs/umbrella-sre'));
  assert.equal(umbrella.reportId, 5, 'the report id comes from the report file, not the row number');
  assert.equal(umbrella.score, 2.1);
  assert.equal(umbrella.firstSeen, '2026-01-08', 'a never-scanned posting takes the tracker date');

  const processed = byId.get(postingId('https://example.com/jobs/9'));
  assert.equal(processed.reportId, 1);
  assert.equal(processed.score, 3.4);

  assert.equal(postings.length, byId.size);
  assert.equal(postings[0].firstSeen, '2026-02-10', 'newest first');
});
