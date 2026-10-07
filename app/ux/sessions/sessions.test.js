import assert from 'node:assert/strict';
import { test } from 'node:test';

import { parseSession, susScore } from './sessions.mjs';

test('SUS is scored the standard way', () => {
  assert.equal(susScore([5, 1, 5, 1, 5, 1, 5, 1, 5, 1]), 100);
  assert.equal(susScore([1, 5, 1, 5, 1, 5, 1, 5, 1, 5]), 0);
  assert.equal(susScore([3, 3, 3, 3, 3, 3, 3, 3, 3, 3]), 50);
});

test('session notes are read from the template table and the SUS line', () => {
  const notes = ['| Task | Success | Time (min) | SEQ | Notes |', '|---|---|---|---|---|', '| T1 | yes | 4.5 | 6 | ok |', '| T2 | partial | 3 | 4 |  |', '| T3 |  |  |  |  |', '', 'SUS: 4,2,4,2,4,2,4,2,4,2'].join('\n');
  const { tasks, sus } = parseSession(notes);
  assert.deepEqual(tasks.T1, { success: 'yes', minutes: 4.5, seq: 6 });
  assert.equal(tasks.T2.success, 'partial');
  assert.equal(tasks.T3, undefined, 'an empty row is not a result');
  assert.equal(sus, 75);
});
