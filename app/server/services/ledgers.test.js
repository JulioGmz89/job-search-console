import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { readSkipList, readStatusHistory, readWritingSample } from './ledgers.js';

function workspace() {
  const root = mkdtempSync(join(tmpdir(), 'jsc-ledgers-'));
  mkdirSync(join(root, 'data'), { recursive: true });
  return root;
}

test('Job › History reads one row from the status ledger, oldest first', (t) => {
  const root = workspace();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  writeFileSync(join(root, 'data', 'applications.md'), '# Applications Tracker\n');
  assert.deepEqual(readStatusHistory({ root, rowId: 12 }), { exists: false, entries: [] });
  writeFileSync(
    join(root, 'data', 'status-log.tsv'),
    ['12\t2026-09-20\tEvaluated\tApplied\tset-status\t', '3\t2026-09-21\tEvaluated\tSKIP\tset-status\t', 'garbage', '12\t2026-09-02\tEvaluated\tEvaluated\tweb\t', '12\t2026-10-01\tApplied\tResponded\t\t', ''].join('\n'),
  );
  const { exists, entries } = readStatusHistory({ root, rowId: 12 });
  assert.equal(exists, true);
  assert.deepEqual(entries.map((e) => [e.date, e.to, e.source]), [
    ['2026-09-02', 'Evaluated', 'web'],
    ['2026-09-20', 'Applied', 'set-status'],
    ['2026-10-01', 'Responded', 'set-status'],
  ]);
});

test('Companies to skip is data/blacklist.md, parsed as the scanner parses it', (t) => {
  const root = workspace();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  assert.equal(readSkipList({ root }).exists, false);
  writeFileSync(join(root, 'data', 'blacklist.md'), '# Do not apply\n\n| Company | Since | Scope | Reason |\n|---|---|---|---|\n| Acme Corp. | 2026-08 | all | Bad interview |\n| acme corp | 2026-09 | all | dupe |\n');
  const list = readSkipList({ root });
  assert.equal(list.exists, true);
  assert.deepEqual(list.companies, [{ company: 'Acme Corp.', since: '2026-08', scope: 'all', reason: 'Bad interview' }]);
});

test('a writing sample opens by its listed name, and only text ones', (t) => {
  const root = workspace();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'writing-samples'));
  writeFileSync(join(root, 'writing-samples', 'blog.md'), '# A post\nWords.');
  writeFileSync(join(root, 'writing-samples', 'deck.pdf'), '%PDF');
  assert.deepEqual(readWritingSample({ root, name: 'blog.md' }), { name: 'blog.md', text: '# A post\nWords.', truncated: false });
  assert.throws(() => readWritingSample({ root, name: 'deck.pdf' }), { code: 'sample-not-text' });
  assert.throws(() => readWritingSample({ root, name: '../cv.md' }), { code: 'sample-not-found' });
});
