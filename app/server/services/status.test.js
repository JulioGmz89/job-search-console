/**
 * These tests spawn the real `set-status.mjs`. That is the point: the console's
 * whole claim about tracker writes is that upstream's own writer does them, so a
 * mock here would test nothing that matters. Each test gets a throwaway copy of
 * the fixture workspace, so the repository's own tracker is never touched.
 */

import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { readPipeline } from './pipeline.js';
import { setStatus, statusArgs, StatusError } from './status.js';

const here = dirname(fileURLToPath(import.meta.url));
const WORKSPACE = join(here, '__fixtures__', 'workspace');
const scratches = [];

function workspace() {
  const root = mkdtempSync(join(tmpdir(), 'jsc-status-test-'));
  scratches.push(root);
  cpSync(WORKSPACE, root, { recursive: true });
  return root;
}

const tracker = (root) => readFileSync(join(root, 'data', 'applications.md'), 'utf-8');

after(() => {
  for (const dir of scratches) rmSync(dir, { recursive: true, force: true });
});

test('the selector is always --row, and the source is always web', () => {
  // Tracker row ids and report ids are separate counters that diverge
  // permanently once any row exists without a report, so a bare numeric selector
  // is ambiguous and trips set-status's own mismatch guard. `--row` states which
  // number space is meant, which is why `--force` never appears here.
  assert.deepEqual(
    statusArgs({ rowId: 2, label: 'Applied' }),
    ['--row', '2', 'Applied', '--source', 'web', '--json'],
  );
  assert.deepEqual(
    statusArgs({ rowId: 2, label: 'Applied', note: 'sent', on: '2026-08-01' }),
    ['--row', '2', 'Applied', '--source', 'web', '--json', '--note', 'sent', '--on', '2026-08-01'],
  );
  assert.ok(!statusArgs({ rowId: 2, label: 'Applied' }).includes('--force'));
});

test('a status change rewrites one cell and records the transition', async () => {
  const root = workspace();
  const before = tracker(root);

  const result = await setStatus({ rowId: 2, statusId: 'applied', root });

  assert.equal(result.changed, true);
  assert.equal(result.oldStatus, 'Evaluated');
  assert.equal(result.newStatus, 'Applied');

  const afterText = tracker(root);
  const changed = afterText.split('\n').filter((line, i) => line !== before.split('\n')[i]);
  assert.equal(changed.length, 1, 'exactly one tracker line changed');
  assert.ok(changed[0].includes('Globex'));

  // The row reads back through the same parser the dashboard uses.
  assert.equal(readPipeline({ root }).rows.find((r) => r.id === 2).statusId, 'applied');

  // set-status appends the transition to the ledger funnel-velocity.mjs reads,
  // attributed to this caller.
  const log = readFileSync(join(root, 'data', 'status-log.tsv'), 'utf-8');
  const entry = log.trim().split('\n').at(-1).split('\t');
  assert.equal(entry[0], '2');
  assert.equal(entry[2], 'Evaluated');
  assert.equal(entry[3], 'Applied');
  assert.equal(entry[4], 'web');
});

test('a test root really redirects the write, and never the repository tracker', async () => {
  // This is a regression test for a live incident, not a hypothetical.
  // set-status.mjs resolves its target as `resolveTrackerPath(CAREER_OPS)` where
  // CAREER_OPS is the *script's own directory*, so it never calls
  // getCareerOpsRoot() and CAREER_OPS_ROOT does not redirect it. Passing only
  // that variable meant this suite edited the repository's real tracker.
  // set-status echoes the file it chose, so assert on that rather than trusting
  // the environment variable to have been the right one.
  const root = workspace();
  const result = await setStatus({ rowId: 2, statusId: 'applied', root });
  assert.ok(
    result.tracker.startsWith(root),
    `set-status wrote ${result.tracker}, which is outside the test workspace`,
  );
});

test('the writer follows the same data root the dashboard reads', async () => {
  // Every other upstream script the console runs (dedup-tracker,
  // reconcile-pipeline, verify-pipeline) calls getCareerOpsRoot() and so honours
  // CAREER_OPS_ROOT. set-status does not. Without pinning the tracker path, a
  // user pointing the console at an external data directory would get a
  // dashboard reading one tracker and a status button writing another.
  const root = workspace();
  const previous = process.env.CAREER_OPS_ROOT;
  process.env.CAREER_OPS_ROOT = root;
  try {
    // Deliberately no `root` argument: the path must come from the same
    // resolution chain the dashboard uses.
    const result = await setStatus({ rowId: 2, statusId: 'applied' });
    assert.ok(result.tracker.startsWith(root), `set-status wrote ${result.tracker}`);
  } finally {
    if (previous === undefined) delete process.env.CAREER_OPS_ROOT;
    else process.env.CAREER_OPS_ROOT = previous;
  }
});

test('an alias resolves to the canonical label before anything is spawned', async () => {
  const root = workspace();
  // `entrevista` is a Spanish alias in templates/states.yml; the tracker must end
  // up holding the canonical English label, never the alias.
  const result = await setStatus({ rowId: 2, statusId: 'entrevista', root });
  assert.equal(result.newStatus, 'Interview');
  assert.ok(tracker(root).includes('| Interview |'));
});

test('re-running the same change is a no-op, not an error', async () => {
  const root = workspace();
  await setStatus({ rowId: 2, statusId: 'applied', root });
  const afterFirst = tracker(root);

  const second = await setStatus({ rowId: 2, statusId: 'applied', root });
  assert.equal(second.changed, false);
  assert.equal(tracker(root), afterFirst);
});

test('a note is appended to the Notes cell', async () => {
  const root = workspace();
  await setStatus({ rowId: 2, statusId: 'applied', note: 'via referral', root });

  const row = readPipeline({ root }).rows.find((r) => r.id === 2);
  assert.ok(row.notes.includes('Manual-review band'), 'the existing note survives');
  assert.ok(row.notes.includes('via referral'));
});

test('an unknown status never reaches the tracker', async () => {
  const root = workspace();
  const before = tracker(root);

  await assert.rejects(
    () => setStatus({ rowId: 2, statusId: 'pondering', root }),
    (error) => error instanceof StatusError && error.code === 'status-unknown' && error.status === 400,
  );
  assert.equal(tracker(root), before);
});

test('input that would corrupt the markdown table is refused', async () => {
  const root = workspace();
  const before = tracker(root);

  // A pipe in a note would add a column to the row it lands in.
  await assert.rejects(
    () => setStatus({ rowId: 2, statusId: 'applied', note: 'a | b', root }),
    (error) => error.code === 'note-pipe',
  );
  await assert.rejects(
    () => setStatus({ rowId: 2, statusId: 'applied', note: 'line one\nline two', root }),
    (error) => error.code === 'note-invalid',
  );
  await assert.rejects(
    () => setStatus({ rowId: 2, statusId: 'applied', on: '01/08/2026', root }),
    (error) => error.code === 'date-invalid',
  );
  await assert.rejects(
    () => setStatus({ rowId: 'two', statusId: 'applied', root }),
    (error) => error.code === 'row-invalid',
  );
  assert.equal(tracker(root), before);
});

test('a row that does not exist comes back as a 404 with upstream’s own words', async () => {
  const root = workspace();

  await assert.rejects(
    () => setStatus({ rowId: 999, statusId: 'applied', root }),
    (error) => error instanceof StatusError && error.status === 404,
  );
});

test('the tracker is left untouched when a write is refused', async () => {
  const root = workspace();
  const before = tracker(root);
  await assert.rejects(() => setStatus({ rowId: 999, statusId: 'applied', root }));
  assert.equal(tracker(root), before);
  assert.equal(existsSync(join(root, 'data', 'status-log.tsv')), false);
});
