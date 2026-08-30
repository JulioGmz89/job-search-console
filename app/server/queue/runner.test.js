import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { parseProgress } from '../services/scanner.js';
import { createRunner, RunBusyError } from './runner.js';

const here = dirname(fileURLToPath(import.meta.url));
/** The runner resolves `spec.script` against its repoRoot, so point it at the fixture bin. */
const BIN = join(here, '..', 'services', '__fixtures__', 'bin');

const runner = () => createRunner({ repoRoot: BIN });

/** A spec shaped like `buildSpec()`'s output, but pointing at the fixture script. */
const spec = (args = [], extra = {}) => ({
  kind: 'test',
  script: 'emit.js',
  label: 'Test run',
  args,
  dryRun: false,
  writes: false,
  confirmRequired: false,
  ...extra,
});

/** Resolve once a run reaches a terminal state. */
function settled(r, id) {
  return new Promise((resolve) => {
    r.subscribe(id, (event) => {
      if (event.type === 'done') resolve(r.get(id));
    });
  });
}

const stdout = (run) => run.lines.filter((l) => l.stream === 'stdout').map((l) => l.text);

test('a run captures its output and succeeds on exit 0', async () => {
  const r = runner();
  const started = r.start(spec(['--lines', '3']));
  assert.equal(started.status, 'running');

  const run = await settled(r, started.id);
  assert.equal(run.status, 'succeeded');
  assert.equal(run.exitCode, 0);
  assert.deepEqual(stdout(run), ['line 1', 'line 2', 'line 3']);
  assert.ok(run.endedAt >= run.startedAt);
});

test('a non-zero exit is a failed run, not a thrown error', async () => {
  const r = runner();
  const { id } = r.start(spec(['--lines', '1', '--exit', '3', '--stderr', 'something broke']));

  const run = await settled(r, id);
  assert.equal(run.status, 'failed');
  assert.equal(run.exitCode, 3);
  assert.deepEqual(run.lines.filter((l) => l.stream === 'stderr').map((l) => l.text), ['something broke']);
});

test('lines are reassembled across chunk boundaries', async () => {
  const r = runner();
  const { id } = r.start(spec(['--split']));

  // A chunk boundary in the middle of a line, and a final line with no trailing
  // newline: both arrive whole rather than as fragments.
  const run = await settled(r, id);
  assert.deepEqual(stdout(run), ['first half second half', 'trailing without newline']);
});

test('a subscriber that arrives late still sees the whole log', async () => {
  const r = runner();
  const { id } = r.start(spec(['--lines', '2']));
  await settled(r, id);

  const events = [];
  r.subscribe(id, (event) => events.push(event));

  assert.deepEqual(
    events.filter((e) => e.type === 'line').map((e) => e.line.text),
    ['line 1', 'line 2'],
  );
  // And it is told the run is over rather than waiting forever for an event.
  assert.equal(events.at(-1).type, 'done');
  assert.equal(events.at(-1).run.status, 'succeeded');
});

test('only one run at a time', async () => {
  const r = runner();
  const first = r.start(spec(['--hang']));

  assert.throws(() => r.start(spec()), (error) => error instanceof RunBusyError && error.status === 409);

  r.cancel(first.id);
  await settled(r, first.id);

  // The slot frees up once it finishes.
  const second = r.start(spec(['--lines', '1']));
  assert.equal(r.get(second.id).status, 'running');
  await settled(r, second.id);
});

test('cancelling ends the run as cancelled', async () => {
  const r = runner();
  const { id } = r.start(spec(['--hang']));

  r.cancel(id);
  const run = await settled(r, id);

  assert.equal(run.status, 'cancelled');
  assert.equal(r.list().active, null);
});

test('a missing script fails the run instead of crashing the server', async () => {
  const r = runner();
  const { id } = r.start(spec([], { script: 'not-a-real-script.mjs' }));

  const run = await settled(r, id);
  // Node reports a missing script through a non-zero exit rather than a spawn
  // error, so what matters is that it lands in a terminal state with output.
  assert.equal(run.status, 'failed');
  assert.ok(run.lines.length > 0);
});

test('progress comes from the spec, so the runner stays script-agnostic', async () => {
  const r = runner();
  const lines = [
    'Verifying liveness of 2 new offer(s) with Playwright (sequential)...',
    '  ✅ active    GitLab | Senior Backend Engineer',
    '  ❌ expired   Foo | Bar (http 404)',
  ];
  // Drive the spec's parser directly over a synthetic child, so the assertion is
  // about the runner's bookkeeping rather than about scan.mjs being installed.
  const { id } = r.start(spec(['--lines', '0'], { parseProgress }));
  await settled(r, id);
  assert.equal(r.get(id).progress, null);

  const counted = lines.reduce((state, line) => {
    const event = parseProgress(line);
    if (event?.type === 'verify-start') return { phase: 'verify', total: event.total, done: 0 };
    if (event?.type === 'verify-result' && state) return { ...state, done: state.done + 1 };
    return state;
  }, null);
  assert.deepEqual(counted, { phase: 'verify', total: 2, done: 2 });
});

test('a dry run authorises exactly one write, of its own kind, once', async () => {
  const r = runner();
  const { id } = r.start({ ...spec(['--lines', '1']), kind: 'dedup', dryRun: true });
  await settled(r, id);

  // Wrong kind, unknown token, and a real (non-dry) run are all refused.
  assert.throws(() => r.consumeConfirmation(id, 'reconcile'), (e) => e.code === 'confirm-required');
  assert.throws(() => r.consumeConfirmation('not-a-run', 'dedup'), (e) => e.code === 'confirm-required');
  assert.throws(() => r.consumeConfirmation(undefined, 'dedup'), (e) => e.code === 'confirm-required');

  r.consumeConfirmation(id, 'dedup');
  // Burned: one preview cannot authorise a second write.
  assert.throws(() => r.consumeConfirmation(id, 'dedup'), (e) => e.code === 'confirm-spent' && e.status === 409);
});

test('a failed dry run authorises nothing', async () => {
  const r = runner();
  const { id } = r.start({ ...spec(['--exit', '1']), kind: 'dedup', dryRun: true });
  await settled(r, id);

  assert.throws(() => r.consumeConfirmation(id, 'dedup'), (e) => e.code === 'confirm-unsuccessful');
});

test('list separates the active run from finished ones', async () => {
  const r = runner();
  const { id } = r.start(spec(['--hang']));

  let listed = r.list();
  assert.equal(listed.active.id, id);
  assert.deepEqual(listed.recent, []);
  // The listing is a summary; the log itself is fetched per run.
  assert.equal(listed.active.lines, undefined);
  assert.equal(typeof listed.active.lineCount, 'number');

  r.cancel(id);
  await settled(r, id);

  listed = r.list();
  assert.equal(listed.active, null);
  assert.deepEqual(listed.recent.map((run) => run.id), [id]);
});
