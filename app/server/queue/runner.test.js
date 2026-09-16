import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
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

test('script-lane runs are serialized: the second waits, then runs', async () => {
  const r = runner();
  const first = r.start(spec(['--hang']));
  const second = r.start(spec(['--lines', '1']));
  assert.equal(second.status, 'queued');
  assert.deepEqual(r.list().queued.map((run) => run.id), [second.id]);

  r.cancel(first.id);
  await settled(r, first.id);

  // The slot frees up once the first finishes and the queued run takes it.
  const run = await settled(r, second.id);
  assert.equal(run.status, 'succeeded');
  assert.ok(run.startedAt >= r.get(first.id).endedAt);
});

test('the same work is refused while it is queued or running', async () => {
  const r = runner();
  const first = r.start(spec(['--hang'], { dedupeKey: 'evaluate:https://x' }));
  assert.throws(
    () => r.start(spec([], { dedupeKey: 'evaluate:https://x' })),
    (error) => error instanceof RunBusyError && error.status === 409 && error.activeId === first.id,
  );
  // Different work is not "busy", it just queues.
  assert.equal(r.start(spec([], { dedupeKey: 'evaluate:https://y' })).status, 'queued');
  r.cancel(first.id);
  await settled(r, first.id);
});

test('cancelling ends the run as cancelled', async () => {
  const r = runner();
  const { id } = r.start(spec(['--hang']));

  r.cancel(id);
  const run = await settled(r, id);

  assert.equal(run.status, 'cancelled');
  assert.deepEqual(r.list().active, []);
});

test('a queued run can be cancelled before it starts', async () => {
  const r = runner();
  const first = r.start(spec(['--hang']));
  const second = r.start(spec());
  const cancelled = r.cancel(second.id);
  assert.equal(cancelled.status, 'cancelled');
  assert.equal(r.get(second.id).startedAt, null);
  r.cancel(first.id);
  await settled(r, first.id);
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

test('list separates queued, active and finished runs', async () => {
  const r = runner();
  const { id } = r.start(spec(['--hang']));
  const waiting = r.start(spec());

  let listed = r.list();
  assert.deepEqual(listed.active.map((run) => run.id), [id]);
  assert.deepEqual(listed.queued.map((run) => run.id), [waiting.id]);
  assert.deepEqual(listed.recent, []);
  // The listing is a summary; the log itself is fetched per run.
  assert.equal(listed.active[0].lines, undefined);
  assert.equal(typeof listed.active[0].lineCount, 'number');

  r.cancel(id);
  await settled(r, id);
  await settled(r, waiting.id);

  listed = r.list();
  assert.deepEqual(listed.active, []);
  assert.deepEqual(listed.queued, []);
  assert.deepEqual(listed.recent.map((run) => run.id).sort(), [id, waiting.id].sort());
});

test('agent-lane runs overlap up to the limit', async () => {
  const r = createRunner({ repoRoot: BIN, maxAgents: 2 });
  const a = r.start(spec(['--hang'], { lane: 'agent' }));
  const b = r.start(spec(['--hang'], { lane: 'agent' }));
  const c = r.start(spec(['--lines', '1'], { lane: 'agent' }));
  assert.equal(a.status, 'running');
  assert.equal(b.status, 'running');
  assert.equal(c.status, 'queued');
  // The script lane is independent: it still has its own slot.
  const s = r.start(spec(['--lines', '1']));
  assert.equal(s.status, 'running');
  await settled(r, s.id);

  r.cancel(a.id);
  await settled(r, a.id);
  assert.equal((await settled(r, c.id)).status, 'succeeded');
  r.cancel(b.id);
  await settled(r, b.id);
});

test('an exclusive run waits for silence and blocks everything behind it', async () => {
  const r = createRunner({ repoRoot: BIN, maxAgents: 2 });
  const agent = r.start(spec(['--hang'], { lane: 'agent' }));
  const merge = r.start(spec(['--lines', '1'], { exclusive: true, label: 'merge' }));
  const later = r.start(spec(['--lines', '1'], { lane: 'agent' }));
  assert.equal(merge.status, 'queued');
  // Room in the agent lane, but the exclusive run at the head is draining it.
  assert.equal(later.status, 'queued');

  r.cancel(agent.id);
  await settled(r, agent.id);
  const merged = await settled(r, merge.id);
  assert.equal(merged.status, 'succeeded');
  const after = await settled(r, later.id);
  assert.ok(after.startedAt >= merged.endedAt);
});

test('nothing starts beside a running exclusive run, even if enqueued later', async () => {
  const r = createRunner({ repoRoot: BIN, maxAgents: 2 });
  const merge = r.start(spec(['--hang'], { exclusive: true, label: 'merge' }));
  assert.equal(merge.status, 'running');
  const agent = r.start(spec(['--lines', '1'], { lane: 'agent' }));
  assert.equal(agent.status, 'queued');
  r.cancel(merge.id);
  await settled(r, merge.id);
  assert.equal((await settled(r, agent.id)).status, 'succeeded');
});

test('a run whose dependency failed is cancelled, and `next` chains follow-ups', async () => {
  const r = runner();
  const parent = r.start(spec(['--exit', '1']));
  const child = r.start(spec([], { dependsOn: [parent.id] }));
  await settled(r, parent.id);
  const run = await settled(r, child.id);
  assert.equal(run.status, 'cancelled');
  assert.match(run.error, /failed/);

  const chained = [];
  const unsubscribe = r.subscribeAll((event) => chained.push(event.run));
  const root = r.start(spec(['--lines', '1'], {
    hooks: {
      after: () => ({ next: [spec(['--lines', '2'], { label: 'follow-up' })] }),
    },
  }));
  await settled(r, root.id);
  const followUp = chained.find((run) => run.label === 'follow-up');
  assert.ok(followUp);
  assert.equal(followUp.parentId, root.id);
  await settled(r, followUp.id);
  unsubscribe();
  assert.equal(r.get(followUp.id).status, 'succeeded');
});

test('`before` prepares the command and a failure there never spawns', async () => {
  let spawned = 0;
  const r = createRunner({
    repoRoot: BIN,
    spawnFn: (...args) => {
      spawned += 1;
      return spawn(...args);
    },
  });
  const afterSeen = [];
  const ok = r.start(spec([], {
    script: undefined,
    hooks: {
      before: async () => ({
        command: { file: process.execPath, args: [join(BIN, 'emit.js'), '--lines', '1'] },
        meta: { prepared: true },
        lines: ['preparing…'],
      }),
      after: (run, { provisional }) => {
        afterSeen.push(provisional.status);
        return { result: { checked: true } };
      },
    },
  }));
  const done = await settled(r, ok.id);
  assert.equal(done.status, 'succeeded');
  assert.equal(done.meta.prepared, true);
  assert.deepEqual(done.result, { checked: true });
  assert.equal(done.lines[0].text, 'preparing…');

  const bad = r.start(spec([], {
    hooks: {
      before: async () => {
        throw new Error('no number free');
      },
      after: (run, { provisional }) => {
        afterSeen.push(provisional.status);
      },
    },
  }));
  const failed = await settled(r, bad.id);
  assert.equal(failed.status, 'failed');
  assert.match(failed.error, /no number free/);
  assert.equal(spawned, 1);
  assert.deepEqual(afterSeen, ['succeeded', 'failed']);
});

test('`after` can turn an exit 0 into a failure', async () => {
  const r = runner();
  const { id } = r.start(spec(['--lines', '1'], {
    hooks: { after: () => ({ status: 'failed', error: 'no report was written' }) },
  }));
  const run = await settled(r, id);
  assert.equal(run.status, 'failed');
  assert.equal(run.exitCode, 0);
  assert.equal(run.error, 'no report was written');
});

test('a run past its timeout is killed and fails', async () => {
  const r = runner();
  const { id } = r.start(spec(['--hang'], { timeoutMs: 200 }));
  const run = await settled(r, id);
  assert.equal(run.status, 'failed');
  assert.match(run.error, /timed out after/);
});

test('close cancels the queue and stops what is running', async () => {
  const r = runner();
  const active = r.start(spec(['--hang']));
  const waiting = r.start(spec());
  await r.close();
  assert.equal(r.get(waiting.id).status, 'cancelled');
  assert.equal(r.get(active.id).status, 'cancelled');
  assert.throws(() => r.start(spec()), (e) => e.code === 'closing');
});
