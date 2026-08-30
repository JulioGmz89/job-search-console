import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { readPipeline, scoreBand } from './pipeline.js';

const here = dirname(fileURLToPath(import.meta.url));
const WORKSPACE = join(here, '__fixtures__', 'workspace');
const LEGACY = join(here, '__fixtures__', 'legacy');

const rowById = (result, id) => result.rows.find((r) => r.id === id);

test('parses a tracker that carries a Via column', () => {
  const { rows, columns } = readPipeline({ root: WORKSPACE });

  // The regression this guards: a hardcoded nine-column map reads `role` out of
  // the Via cell and shifts every later field one to the left.
  assert.equal(columns.via, 4);
  assert.equal(columns.role, 5);
  assert.equal(rows.length, 7);

  const acme = rowById({ rows }, 1);
  assert.equal(acme.company, 'Acme Corp');
  assert.equal(acme.role, 'Backend Engineer');
  assert.equal(acme.score, 4.2);
  assert.equal(acme.status, 'Applied');
  assert.equal(acme.hasPdfFlag, true);
});

test('parses the legacy nine-column tracker too', () => {
  const { rows, columns } = readPipeline({ root: LEGACY });

  assert.equal(columns.via, undefined);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].role, 'Backend Engineer');
  assert.equal(rows[0].score, 4.2);
  assert.equal(rows[0].via, null);
});

test('em-dash and N/A sentinels become null, not empty strings or zero', () => {
  const { rows } = readPipeline({ root: WORKSPACE });

  assert.equal(rowById({ rows }, 1).via, null, 'an em-dash Via is absence');
  assert.equal(rowById({ rows }, 2).via, 'LinkedIn', 'a real Via survives');

  const initech = rowById({ rows }, 3);
  assert.equal(initech.score, null, 'N/A must not read as a score');
  assert.equal(initech.scoreBand, null);
});

test('the Report cell wins over the row number when they disagree', () => {
  const { rows } = readPipeline({ root: WORKSPACE });

  // Row #4 links report 005. Trusting the row number would open the wrong report.
  const umbrella = rowById({ rows }, 4);
  assert.equal(umbrella.id, 4);
  assert.equal(umbrella.reportId, 5);
});

test('statuses are canonicalized against templates/states.yml', () => {
  const { rows, statuses } = readPipeline({ root: WORKSPACE });

  // states.yml ships nine canonical states; the UI's filter tabs come from this
  // list, not from whichever statuses happen to appear in one user's tracker.
  assert.deepEqual(
    statuses.map((s) => s.id),
    ['evaluated', 'applied', 'responded', 'interview', 'offer', 'rejected', 'discarded', 'skip', 'hired'],
  );

  assert.equal(rowById({ rows }, 4).statusId, 'skip', 'SKIP maps to the skip state');
  assert.equal(rowById({ rows }, 4).terminal, true);
  assert.equal(rowById({ rows }, 6).statusId, 'interview');
  assert.equal(rowById({ rows }, 6).terminal, false);
  assert.equal(rowById({ rows }, 1).statusGroup, 'applied');
});

test('an unknown status is reported but does not drop the row', () => {
  const { rows, issues } = readPipeline({ root: WORKSPACE });

  const hooli = rowById({ rows }, 7);
  assert.ok(hooli, 'the row still renders');
  assert.equal(hooli.status, 'Pondering', 'the raw label is preserved for display');
  assert.equal(hooli.statusId, null);

  const issue = issues.find((i) => i.code === 'status-unknown' && i.id === 7);
  assert.ok(issue, 'the drift is surfaced');
});

test('score bands follow the house rule', () => {
  assert.equal(scoreBand(4.2), 'strong');
  assert.equal(scoreBand(3.5), 'strong', '3.5 is the auto-CV boundary, inclusive');
  assert.equal(scoreBand(3.49), 'review');
  assert.equal(scoreBand(3.0), 'review');
  assert.equal(scoreBand(2.99), 'skip');
  assert.equal(scoreBand(null), null);
});

test('rawLine and sourceLine are preserved for M2 write-back', () => {
  const { rows } = readPipeline({ root: WORKSPACE });
  const acme = rowById({ rows }, 1);

  assert.ok(acme.rawLine.startsWith('| 1 |'));
  assert.equal(typeof acme.sourceLine, 'number');
});

test('a missing tracker is an empty dashboard, not a crash', () => {
  const result = readPipeline({ root: join(here, '__fixtures__', 'does-not-exist') });

  assert.deepEqual(result.rows, []);
  assert.equal(result.issues[0].code, 'tracker-missing');
  assert.equal(result.issues[0].level, 'info');
});
