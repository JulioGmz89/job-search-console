import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { HEADER, upsertBatchState } from './batch-state.js';
import { appendInboxUrl, readInbox, validateInboxUrl } from './inbox.js';

const here = dirname(fileURLToPath(import.meta.url));
const WORKSPACE = join(here, '__fixtures__', 'workspace');

let root;
before(() => {
  root = mkdtempSync(join(tmpdir(), 'jsc-inbox-write-'));
  cpSync(WORKSPACE, root, { recursive: true });
});
after(() => rmSync(root, { recursive: true, force: true }));

test('a pasted URL lands at the end of the Pending section and reads back', async () => {
  const before = readInbox({ root }).pending.length;
  const result = await appendInboxUrl({ root, url: 'https://jobs.example.com/roles/42?utm_source=x', company: 'Ex|ample', title: 'Eng [Sr]' });
  assert.equal(result.added, true);
  assert.equal(result.line, '- [ ] https://jobs.example.com/roles/42?utm_source=x | Ex/ample | Eng \\[Sr\\]');

  const inbox = readInbox({ root });
  assert.equal(inbox.pending.length, before + 1);
  const row = inbox.pending.at(-1);
  assert.equal(row.url, 'https://jobs.example.com/roles/42?utm_source=x');
  assert.equal(row.company, 'Ex/ample');
  // Still one Processed section, still after Pending, nothing else disturbed.
  const text = readFileSync(join(root, 'data', 'pipeline.md'), 'utf-8');
  assert.equal(text.match(/^## Processed$/gm).length, 1);
  assert.ok(text.indexOf(result.line) < text.indexOf('## Processed'));
});

test('duplicates are detected by URL key, against Pending and Processed', async () => {
  // Tracking params and http vs https do not make a new posting.
  const pending = await appendInboxUrl({ root, url: 'http://jobs.example.com/roles/42/' });
  assert.equal(pending.added, false);
  assert.equal(pending.existing.section, 'pending');

  const processed = await appendInboxUrl({ root, url: 'https://example.com/jobs/9#top' });
  assert.equal(processed.added, false);
  assert.equal(processed.existing.section, 'processed');
});

test('a missing inbox is created with both sections', async () => {
  const fresh = mkdtempSync(join(tmpdir(), 'jsc-inbox-fresh-'));
  try {
    const result = await appendInboxUrl({ root: fresh, url: 'https://a.example/1' });
    assert.equal(result.added, true);
    const text = readFileSync(join(fresh, 'data', 'pipeline.md'), 'utf-8');
    assert.match(text, /## Pending\n- \[ \] https:\/\/a\.example\/1\n\n## Processed/);
    assert.deepEqual(readInbox({ root: fresh }).pending.map((r) => r.url), ['https://a.example/1']);
  } finally {
    rmSync(fresh, { recursive: true, force: true });
  }
});

test('CRLF files stay CRLF', async () => {
  const crlf = mkdtempSync(join(tmpdir(), 'jsc-inbox-crlf-'));
  try {
    mkdirSync(join(crlf, 'data'));
    writeFileSync(join(crlf, 'data', 'pipeline.md'), '# Inbox\r\n\r\n## Pending\r\n\r\n- [ ] https://b.example/1\r\n\r\n## Processed\r\n');
    await appendInboxUrl({ root: crlf, url: 'https://b.example/2' });
    const text = readFileSync(join(crlf, 'data', 'pipeline.md'), 'utf-8');
    assert.ok(!/[^\r]\n/.test(text), 'every newline is preceded by a CR');
    assert.match(text, /- \[ \] https:\/\/b\.example\/1\r\n- \[ \] https:\/\/b\.example\/2\r\n/);
  } finally {
    rmSync(crlf, { recursive: true, force: true });
  }
});

test('bad URLs are refused before anything is touched', () => {
  for (const bad of ['', '   ', 'not a url', 'ftp://x/y', 'https://x/y z', 'https://x/y|z', 'javascript:alert(1)']) {
    assert.throws(() => validateInboxUrl(bad), (e) => e.code === 'url-invalid' && e.status === 400, bad);
  }
  assert.equal(validateInboxUrl('  https://x.example/a  '), 'https://x.example/a');
});

test('batch-state rows are upserted by id with the batch-runner header', () => {
  const row = (over = {}) => ({
    id: 'jsc-1',
    url: 'https://c.example/1',
    status: 'completed',
    startedAt: '2026-09-15T10:00:00Z',
    completedAt: '2026-09-15T10:05:00Z',
    reportNum: '009',
    score: 4.1,
    ...over,
  });
  const { path } = upsertBatchState({ root, row: row() });
  upsertBatchState({ root, row: row({ id: 'jsc-2', reportNum: '010', score: null, error: 'tab\there\nnewline' }) });
  upsertBatchState({ root, row: row({ score: 4.3 }) });

  const lines = readFileSync(path, 'utf-8').trimEnd().split('\n');
  assert.equal(lines[0], HEADER);
  assert.equal(lines.length, 3);
  assert.equal(lines[1], 'jsc-2\thttps://c.example/1\tcompleted\t2026-09-15T10:00:00Z\t2026-09-15T10:05:00Z\t010\t-\ttab here newline\t0');
  // Re-upserting jsc-1 replaced its row (and moved it to the end).
  assert.equal(lines[2].split('\t')[6], '4.3');

  assert.throws(() => upsertBatchState({ root, row: row({ status: 'failed' }) }), (e) => e.code === 'batch-state-status');
});
