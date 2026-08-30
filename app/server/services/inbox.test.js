import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { readInbox } from './inbox.js';

const here = dirname(fileURLToPath(import.meta.url));
const WORKSPACE = join(here, '__fixtures__', 'workspace');
const scratches = [];

/** A data root whose inbox holds exactly the given text. */
function withInbox(text) {
  const root = mkdtempSync(join(tmpdir(), 'jsc-inbox-test-'));
  scratches.push(root);
  mkdirSync(join(root, 'data'));
  writeFileSync(join(root, 'data', 'pipeline.md'), text);
  return root;
}

after(() => {
  for (const dir of scratches) rmSync(dir, { recursive: true, force: true });
});

test('every documented pending row shape parses', () => {
  const { pending } = readInbox({ root: WORKSPACE });
  assert.equal(pending.length, 6);

  // 1 cell: a bare URL, which is what a user pastes by hand.
  assert.deepEqual(
    { url: pending[0].url, company: pending[0].company, title: pending[0].title },
    { url: 'https://example.com/jobs/1', company: null, title: null },
  );

  // 3 cells.
  assert.equal(pending[1].company, 'Acme');
  assert.equal(pending[1].title, 'Backend Engineer');
  assert.equal(pending[1].location, null);

  // 4 cells plus a labeled segment.
  assert.equal(pending[2].location, 'Remote — LatAm');
  assert.equal(pending[2].posted, '2026-08-01');

  // 5 cells: a present compensation forces the (empty) location cell, so comp
  // stays in column 5 rather than being read as a location.
  assert.equal(pending[3].location, null);
  assert.equal(pending[3].compensation, '120000-160000 USD');
  assert.equal(pending[3].trust, '80/100');
  assert.equal(pending[3].note, 'curated');
});

test('a literal pipe inside a title is folded back in and reported', () => {
  const { pending, issues } = readInbox({ root: WORKSPACE });

  // pipeline.md has no escaping. scan.mjs rewrites `|` to `/` before writing, so
  // this can only come from a hand-pasted line — the whole title is kept rather
  // than truncated at the first pipe, and the row is flagged.
  assert.equal(pending[4].company, 'Oowlish');
  assert.equal(pending[4].title, 'Full Stack (Node.js | React | AI)');
  assert.equal(pending[4].location, 'Remote');
  assert.ok(issues.some((i) => i.code === 'inbox-row-extra-cells'));
});

test('an errored row keeps its reason and stays in the pending list', () => {
  const errored = readInbox({ root: WORKSPACE }).pending[5];
  assert.equal(errored.error, 'login required');
  assert.equal(errored.company, 'Umbrella');
  assert.equal(errored.title, 'Platform Engineer');
});

test('processed rows carry their report number, score and PDF flag', () => {
  const { processed } = readInbox({ root: WORKSPACE });
  assert.equal(processed.length, 2);
  assert.deepEqual(processed[0], {
    reportId: 1,
    url: 'https://example.com/jobs/9',
    company: 'Soylent',
    role: 'Senior Engineer',
    score: 3.4,
    hasPdf: true,
    line: 16,
  });
  assert.equal(processed[1].hasPdf, false);
});

test('the Spanish section headers are read the same as the English ones', () => {
  const root = withInbox('## Pendientes\n- [ ] https://example.com/a | Acme | Dev\n\n## Procesadas\n- [x] #7 | https://example.com/b | Globex | Dev | 4.0/5 | PDF ✅\n');
  const inbox = readInbox({ root });
  assert.equal(inbox.pending.length, 1);
  assert.equal(inbox.processed.length, 1);
  assert.equal(inbox.processed[0].reportId, 7);
});

test('the checkbox wins over the section it sits in', () => {
  // reconcile-pipeline.mjs exists precisely because these two drift apart, so a
  // `- [x]` left behind in Pending must not be counted as still pending.
  const root = withInbox('## Pending\n- [ ] https://example.com/a\n- [x] #4 | https://example.com/b | Acme | Dev | 3.0/5 | PDF ❌\n');
  const inbox = readInbox({ root });
  assert.equal(inbox.pending.length, 1);
  assert.equal(inbox.processed.length, 1);
});

test('a missing inbox is the first-run state, not an error', () => {
  const root = mkdtempSync(join(tmpdir(), 'jsc-inbox-test-'));
  scratches.push(root);

  const inbox = readInbox({ root });
  assert.deepEqual(inbox.pending, []);
  assert.deepEqual(inbox.processed, []);
  assert.equal(inbox.issues[0].code, 'inbox-missing');
  assert.equal(inbox.issues[0].level, 'info');
});
