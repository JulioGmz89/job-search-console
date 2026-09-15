/**
 * runner.js — the job queue: spawns commands, streams their output, and
 * schedules them across lanes.
 *
 * PROJECT_PLAN.md §5 puts the job queue here. M2 shipped it with a single slot;
 * M3 turns it into a scheduler without changing what a run looks like on the
 * wire, so the M2 routes and UI keep working:
 *
 * - Every run has a `lane`. `script` runs (upstream .mjs scripts) are serialized
 *   — they all read and write the same tracker files. `agent` runs (headless
 *   Claude Code sessions) may overlap up to `maxAgents`, because each one works
 *   on its own report number and never touches the tracker directly.
 * - An `exclusive` run (merge-tracker, reconcile) waits until nothing else is
 *   running and blocks new starts while it is queued at the head: two agents
 *   may run side by side, but nothing merges while anything else runs.
 * - A run may `dependsOn` other runs and a finished run may enqueue `next`
 *   runs, which is how "evaluate → merge tracker → reconcile inbox → PDF" is
 *   one click in the UI and four runs here.
 *
 * The runner knows nothing about any particular command. What to spawn comes
 * from `specs.js` — either a `script` at the repository root, or an explicit
 * `command` — and specs may attach hooks that run at dequeue time (`before`),
 * per output line (`parseLine`) and at exit (`after`).
 */

import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';

/**
 * Confine a child to one data root.
 *
 * Every variable is set, not just `CAREER_OPS_ROOT`, because upstream's scripts
 * do not agree on how to find their files: `scan.mjs` asks
 * `path-resolver.getCareerOpsRoot()` and honours `CAREER_OPS_ROOT`, while
 * `set-status.mjs` resolves the tracker from the *script's own directory* and
 * only `CAREER_OPS_TRACKER` redirects it. Setting one and assuming the rest
 * follow is how a sandboxed run reaches the user's real tracker, so the whole
 * set is pinned and nothing is left to the resolver's defaults.
 *
 * `root` is only ever set by tests; the server runs against the repository
 * itself and passes the ambient environment through untouched.
 */
export function confineTo(root) {
  return {
    CAREER_OPS_ROOT: root,
    CAREER_OPS_DATA_DIR: root,
    CAREER_OPS_TRACKER: join(root, 'data', 'applications.md'),
    CAREER_OPS_PIPELINE: join(root, 'data', 'pipeline.md'),
    CAREER_OPS_SCAN_HISTORY: join(root, 'data', 'scan-history.tsv'),
    CAREER_OPS_PORTALS: join(root, 'portals.yml'),
    CAREER_OPS_PROFILE: join(root, 'config', 'profile.yml'),
    CAREER_OPS_REPORTS_DIR: join(root, 'reports'),
    CAREER_OPS_ADDITIONS: join(root, 'batch', 'tracker-additions'),
    CAREER_OPS_BATCH_STATE: join(root, 'batch', 'batch-state.tsv'),
  };
}

/** Lines kept per run. A long scan prints a few hundred; this is a bound, not a target. */
const MAX_LINES = 5_000;

/** Completed runs kept in memory, newest first. A chained evaluation is four runs. */
const MAX_HISTORY = 60;

/** Runs allowed to wait. Past this the client is misbehaving, not busy. */
const MAX_QUEUED = 50;

/** How long a successful dry run stays usable as confirmation for the real thing. */
const CONFIRM_TTL_MS = 10 * 60 * 1000;

/** Grace period between SIGTERM and SIGKILL on POSIX. */
const KILL_GRACE_MS = 5_000;

/** How long `close()` waits for `after` hooks before giving up on them. */
const CLOSE_GRACE_MS = 10_000;

/** Concurrent headless agent sessions unless overridden. PROJECT_PLAN.md §5. */
const DEFAULT_MAX_AGENTS = 2;

const TERMINAL = new Set(['succeeded', 'failed', 'cancelled']);

/** A start request refused because the same work is already queued or running. */
export class RunBusyError extends Error {
  constructor(active) {
    super(`"${active.label}" is already ${active.status} — wait for it to finish or cancel it`);
    this.name = 'RunBusyError';
    this.code = 'run-busy';
    this.status = 409;
    this.activeId = active.id;
  }
}

/** A start or cancel request that could not be honoured. */
export class RunError extends Error {
  constructor(message, { code, status = 400 } = {}) {
    super(message);
    this.name = 'RunError';
    this.code = code;
    this.status = status;
  }
}

function maxAgentsFromEnv() {
  const parsed = Number.parseInt(process.env.JSC_MAX_AGENTS ?? '', 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_AGENTS;
}

/**
 * Create a runner bound to one repository.
 *
 * A factory rather than a module singleton so each `buildApp()` — including the
 * one per test file — owns its own state. Shared mutable run state across test
 * files running in parallel would be a flake generator.
 *
 * @param {{repoRoot: string, root?: string, spawnFn?: Function, maxAgents?: number}} options
 *   `root` pins the data root for the child, mirroring the service seam.
 *   `spawnFn` exists for tests; nothing in production passes it.
 */
export function createRunner({ repoRoot, root, spawnFn = spawn, maxAgents = maxAgentsFromEnv() } = {}) {
  /** @type {Map<string, object>} */
  const runs = new Map();
  /** @type {Map<string, Set<Function>>} */
  const listeners = new Map();
  /** @type {Set<Function>} */
  const allListeners = new Set();
  /** Dry runs already spent as confirmation, so one cannot authorise two writes. */
  const consumed = new Set();
  /** Ids waiting for a slot, in arrival order. */
  const queue = [];
  /** Ids with a live child (or one about to be spawned). */
  const running = new Set();
  /** The exclusive run at the head of the queue that everything else is yielding to. */
  let drainingId = null;
  let closing = false;

  const laneLimits = { script: 1, agent: maxAgents };

  const emit = (id, event) => {
    for (const listener of listeners.get(id) ?? []) {
      try {
        listener(event);
      } catch {
        // A broken subscriber (a closed SSE socket that has not been cleaned up
        // yet) must not take down the run that is feeding it.
      }
    }
  };

  /** Public view of a run: everything except the child handle and the hooks. */
  const publicRun = (run, { lines = true } = {}) => ({
    id: run.id,
    kind: run.kind,
    label: run.label,
    args: run.args,
    dryRun: run.dryRun,
    writes: run.writes,
    reportsFindings: run.reportsFindings,
    lane: run.lane,
    exclusive: run.exclusive,
    dedupeKey: run.dedupeKey,
    status: run.status,
    exitCode: run.exitCode,
    signal: run.signal,
    queuedAt: run.queuedAt,
    startedAt: run.startedAt,
    endedAt: run.endedAt,
    timeoutMs: run.timeoutMs,
    progress: run.progress,
    error: run.error,
    truncated: run.truncated,
    meta: run.meta,
    result: run.result,
    parentId: run.parentId,
    dependsOn: run.dependsOn,
    ...(lines ? { lines: run.lines } : { lineCount: run.lines.length }),
  });

  const summary = (run) => publicRun(run, { lines: false });

  /** Tell the firehose subscribers (the server-wide event stream) about a transition. */
  const transition = (run) => {
    for (const listener of allListeners) {
      try {
        listener({ type: 'run', run: summary(run) });
      } catch {
        // Same rule as above: a subscriber cannot break the queue.
      }
    }
  };

  const record = (run, stream, text) => {
    if (run.lines.length >= MAX_LINES) {
      run.truncated = true;
      return;
    }
    const line = { stream, text, at: Date.now() };
    run.lines.push(line);
    emit(run.id, { type: 'line', line });
  };

  const applyProgress = (run, progress) => {
    if (!progress) return;
    if (progress.type === 'verify-start') run.progress = { phase: 'verify', total: progress.total, done: 0 };
    else if (progress.type === 'verify-result' && run.progress?.phase === 'verify') {
      run.progress = { ...run.progress, done: run.progress.done + 1 };
    } else if (progress.type === 'sweep-start') run.progress = { phase: 'sweep', total: null, done: 0 };
    else if (progress.phase) run.progress = progress;
    else return;
    emit(run.id, { type: 'progress', progress: run.progress });
  };

  /**
   * Route one output line through the spec's parsers.
   *
   * `parseLine` (agent specs) may rewrite what is shown, attach a structured
   * result, or drop the line; `parseProgress` (scan) only reads progress out of
   * it. A parser that throws must not kill the run: the raw line is kept.
   */
  const ingest = (run, stream, text) => {
    let parsed = null;
    try {
      parsed = run.hooks?.parseLine?.(text, stream, run) ?? null;
    } catch (error) {
      record(run, 'stderr', `(line parser failed: ${error.message})`);
    }
    if (parsed === null) {
      record(run, stream, text);
    } else {
      if (parsed.display !== null && parsed.display !== undefined) record(run, stream, parsed.display);
      if (parsed.result !== undefined) run.result = parsed.result;
      if (parsed.progress) applyProgress(run, parsed.progress);
    }
    if (run.parseProgress) applyProgress(run, run.parseProgress(text));
  };

  /**
   * Split a chunk into whole lines, holding the trailing partial until the next
   * chunk. Without this a line that straddles a chunk boundary — which a fast
   * scan produces constantly — arrives in the UI cut in half.
   */
  const makeSplitter = (run, stream) => {
    let carry = '';
    return {
      push(chunk) {
        carry += chunk;
        const parts = carry.split(/\r?\n/);
        carry = parts.pop() ?? '';
        for (const part of parts) ingest(run, stream, part);
      },
      flush() {
        if (carry !== '') ingest(run, stream, carry);
        carry = '';
      },
    };
  };

  const hookContext = (run) => ({
    repoRoot,
    root,
    env: childEnv(),
    record: (text, stream = 'stdout') => record(run, stream, text),
  });

  const childEnv = () => (root ? { ...process.env, ...confineTo(root) } : { ...process.env });

  const pruneHistory = () => {
    const finished = [...runs.values()].filter((r) => TERMINAL.has(r.status));
    if (finished.length <= MAX_HISTORY) return;
    finished
      .sort((a, b) => a.endedAt - b.endedAt)
      .slice(0, finished.length - MAX_HISTORY)
      .forEach((r) => {
        runs.delete(r.id);
        listeners.delete(r.id);
        consumed.delete(r.id);
      });
  };

  /** Move a run to a terminal state and tell everyone. Idempotent. */
  const finish = (run, status, extra = {}) => {
    if (TERMINAL.has(run.status)) return;
    run.status = status;
    run.endedAt = Date.now();
    Object.assign(run, extra);
    run.child = null;
    if (run.timer) clearTimeout(run.timer);
    run.timer = null;
    running.delete(run.id);
    if (drainingId === run.id) drainingId = null;
    emit(run.id, { type: 'done', run: summary(run) });
    transition(run);
    pruneHistory();
    schedule();
  };

  /**
   * The child has exited (or never spawned): let the spec verify the outcome,
   * enqueue follow-up runs, and only then finish.
   *
   * `after` always runs — on cancel and timeout too — because that is where an
   * agent spec releases the report number it reserved in `before`.
   */
  const settle = async (run, provisional) => {
    let outcome = {};
    if (run.hooks?.after) {
      try {
        outcome = (await run.hooks.after(run, { ...hookContext(run), provisional })) ?? {};
      } catch (error) {
        record(run, 'stderr', `Post-run check failed: ${error.message}`);
        outcome = { status: 'failed', error: error.message };
      }
    }
    // A cancelled run stays cancelled whatever the hook says; the hook may
    // still refine a success into a failure (exit 0 but no report written).
    const status = provisional.status === 'cancelled' ? 'cancelled' : (outcome.status ?? provisional.status);
    if (outcome.result !== undefined) run.result = outcome.result;
    finish(run, status, {
      exitCode: provisional.exitCode ?? null,
      signal: provisional.signal ?? null,
      error: outcome.error ?? provisional.error ?? null,
    });

    if (status === 'succeeded' && Array.isArray(outcome.next) && !closing) {
      for (const next of outcome.next) {
        try {
          api.start({ ...next, parentId: run.id });
        } catch (error) {
          // A refused follow-up (duplicate, queue full) is worth a line in the
          // parent's log, but the parent itself did succeed.
          record(run, 'stderr', `Could not queue "${next.label ?? next.kind}": ${error.message}`);
        }
      }
    }
  };

  const killTree = (run) => {
    const child = run.child;
    if (!child) return;
    // On Windows a signal does not propagate to a process tree, and both
    // `scan.mjs` and `claude` spawn children, so cancelling has to kill the
    // tree outright with `taskkill /T /F`. That is a hard kill: scan.mjs's own
    // SIGINT handler — which writes a `failed` row to `data/scan-runs.tsv` —
    // does not get to run, so a cancelled scan leaves no row behind. The run
    // record here is the only account of it.
    if (process.platform === 'win32' && child.pid) {
      spawnFn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true, shell: false });
    } else {
      child.kill('SIGTERM');
      setTimeout(() => {
        if (run.status === 'running' && run.child === child) child.kill('SIGKILL');
      }, KILL_GRACE_MS).unref?.();
    }
  };

  const spawnChild = (run) => {
    if (run.cancelling) {
      settle(run, { status: 'cancelled' });
      return;
    }
    const command = run.command;
    if (!command?.file) {
      record(run, 'stderr', 'Nothing to run: the spec produced no command');
      settle(run, { status: 'failed', error: 'no command' });
      return;
    }

    // No shell: PATH lookup and argument quoting are both platform-dependent
    // minefields on Windows, and a shell would also mean the arguments are
    // re-parsed by something other than the program itself. stdin is closed —
    // nothing here reads it, and a headless CLI waiting on it would hang.
    let child;
    try {
      child = spawnFn(command.file, command.args ?? [], {
        cwd: command.cwd ?? repoRoot,
        env: { ...childEnv(), ...(command.env ?? {}) },
        shell: false,
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (error) {
      record(run, 'stderr', `Could not run ${command.file}: ${error.message}`);
      settle(run, { status: 'failed', error: error.message });
      return;
    }
    run.child = child;
    run.pid = child.pid ?? null;

    if (run.timeoutMs) {
      run.timer = setTimeout(() => {
        if (run.status !== 'running') return;
        run.timedOut = true;
        record(run, 'stderr', `Timed out after ${Math.round(run.timeoutMs / 1000)}s — stopping it`);
        killTree(run);
      }, run.timeoutMs);
      run.timer.unref?.();
    }

    const out = makeSplitter(run, 'stdout');
    const err = makeSplitter(run, 'stderr');
    child.stdout?.setEncoding('utf-8');
    child.stderr?.setEncoding('utf-8');
    child.stdout?.on('data', (chunk) => out.push(chunk));
    child.stderr?.on('data', (chunk) => err.push(chunk));

    child.on('error', (error) => {
      out.flush();
      err.flush();
      record(run, 'stderr', `Could not run ${command.file}: ${error.message}`);
      settle(run, { status: 'failed', error: error.message });
    });

    child.on('close', (code, signal) => {
      out.flush();
      err.flush();
      if (run.cancelling) settle(run, { status: 'cancelled', exitCode: code, signal });
      else if (run.timedOut) {
        settle(run, {
          status: 'failed',
          exitCode: code,
          signal,
          error: `timed out after ${Math.round(run.timeoutMs / 1000)}s`,
        });
      } else settle(run, { status: code === 0 ? 'succeeded' : 'failed', exitCode: code, signal });
    });

    // The run was already cancelled between dequeue and spawn (the `before`
    // hook was still working). The child exists now, so stop it the normal way.
    if (run.cancelling) killTree(run);
  };

  /** Take a queued run into its lane. */
  const launch = (run) => {
    queue.splice(queue.indexOf(run.id), 1);
    running.add(run.id);
    run.status = 'running';
    run.startedAt = Date.now();
    emit(run.id, { type: 'started', run: summary(run) });
    transition(run);

    if (!run.hooks?.before) {
      spawnChild(run);
      return;
    }
    // `before` does the work that must happen just before the process exists —
    // reserving a report number, writing the prompt file — never at click time,
    // when the run may still sit in the queue for minutes.
    Promise.resolve()
      .then(() => run.hooks.before(run, hookContext(run)))
      .then((prepared) => {
        if (prepared?.command) run.command = prepared.command;
        if (prepared?.meta) run.meta = { ...run.meta, ...prepared.meta };
        for (const text of prepared?.lines ?? []) record(run, 'stdout', text);
        spawnChild(run);
      })
      .catch((error) => {
        record(run, 'stderr', `Could not prepare the run: ${error.message}`);
        settle(run, { status: 'failed', error: error.message });
      });
  };

  const laneCount = (lane) => [...running].filter((id) => runs.get(id)?.lane === lane).length;

  /** 'ready' | 'blocked' | 'broken': are this run's dependencies satisfied? */
  const dependencyState = (run) => {
    for (const depId of run.dependsOn) {
      const dep = runs.get(depId);
      if (!dep) return { state: 'broken', why: `depends on ${depId}, which is gone` };
      if (dep.status === 'succeeded') continue;
      if (TERMINAL.has(dep.status)) return { state: 'broken', why: `"${dep.label}" ${dep.status}` };
      return { state: 'blocked' };
    }
    return { state: 'ready' };
  };

  /** Start whatever the lanes have room for, in arrival order. */
  function schedule() {
    if (closing) return;
    for (const id of [...queue]) {
      const run = runs.get(id);
      if (!run || run.status !== 'queued') continue;

      const deps = dependencyState(run);
      if (deps.state === 'blocked') continue;
      if (deps.state === 'broken') {
        queue.splice(queue.indexOf(id), 1);
        record(run, 'stderr', `Not started: ${deps.why}`);
        finish(run, 'cancelled', { error: deps.why });
        continue;
      }

      // An exclusive run at the head drains the lanes: nothing new starts until
      // it has run alone. Everything behind it waits its turn.
      if (drainingId && drainingId !== id) continue;
      if (run.exclusive) {
        if (running.size === 0) launch(run);
        else drainingId = id;
        continue;
      }
      if (laneCount(run.lane) < (laneLimits[run.lane] ?? 1)) launch(run);
    }
  }

  const api = {
    /**
     * Enqueue a run. It starts at once if its lane has room.
     *
     * @param {object} spec - From `buildSpec()`.
     * @returns {object} The public run record.
     * @throws {RunBusyError} when the same work (`dedupeKey`) is already queued or running.
     */
    start(spec) {
      if (closing) throw new RunError('The server is shutting down', { code: 'closing', status: 503 });
      if (spec.dedupeKey) {
        const twin = [...runs.values()].find((r) => r.dedupeKey === spec.dedupeKey && !TERMINAL.has(r.status));
        if (twin) throw new RunBusyError(twin);
      }
      if (queue.length >= MAX_QUEUED) {
        throw new RunError('The queue is full — wait for some runs to finish', { code: 'queue-full', status: 429 });
      }

      const lane = spec.lane ?? 'script';
      if (!(lane in laneLimits)) throw new RunError(`Unknown lane "${lane}"`, { code: 'lane-unknown' });

      const run = {
        id: randomUUID(),
        kind: spec.kind,
        label: spec.label,
        args: spec.args ?? [],
        dryRun: spec.dryRun === true,
        writes: spec.writes === true,
        reportsFindings: spec.reportsFindings === true,
        lane,
        exclusive: spec.exclusive === true,
        dedupeKey: spec.dedupeKey ?? null,
        meta: { ...(spec.meta ?? {}) },
        status: 'queued',
        exitCode: null,
        signal: null,
        queuedAt: Date.now(),
        startedAt: null,
        endedAt: null,
        timeoutMs: spec.timeoutMs ?? null,
        lines: [],
        truncated: false,
        progress: null,
        error: null,
        result: null,
        parentId: spec.parentId ?? null,
        dependsOn: [...(spec.dependsOn ?? [])],
        parseProgress: spec.parseProgress,
        hooks: spec.hooks ?? null,
        // A `script` spec is the M2 shape: a Node script at the repository root.
        command: spec.command
          ?? (spec.script ? { file: process.execPath, args: [join(repoRoot, spec.script), ...(spec.args ?? [])] } : null),
        child: null,
        pid: null,
        cancelling: false,
        timedOut: false,
        timer: null,
      };
      runs.set(run.id, run);
      queue.push(run.id);
      emit(run.id, { type: 'queued', run: summary(run) });
      transition(run);
      schedule();
      return publicRun(run);
    },

    /** @param {string} id @returns {object|null} */
    get(id) {
      const run = runs.get(id);
      return run ? publicRun(run) : null;
    },

    /** @returns {{queued: object[], active: object[], recent: object[]}} */
    list() {
      const all = [...runs.values()];
      return {
        queued: queue.map((id) => runs.get(id)).filter(Boolean).map(summary),
        active: all.filter((r) => r.status === 'running').sort((a, b) => a.startedAt - b.startedAt).map(summary),
        recent: all
          .filter((r) => TERMINAL.has(r.status))
          .sort((a, b) => b.endedAt - a.endedAt)
          .map(summary),
      };
    },

    /**
     * Listen to a run's events.
     *
     * The buffer is replayed before any live event, so a subscriber that
     * connects late — or reconnects after a dropped SSE socket — sees the whole
     * log rather than joining halfway through.
     *
     * @param {string} id
     * @param {(event: object) => void} listener
     * @returns {() => void} Unsubscribe.
     */
    subscribe(id, listener) {
      const run = runs.get(id);
      if (!run) throw new RunError('No such run', { code: 'run-missing', status: 404 });

      if (run.status === 'queued') listener({ type: 'queued', run: summary(run) });
      for (const line of run.lines) listener({ type: 'line', line });
      if (run.progress) listener({ type: 'progress', progress: run.progress });
      if (TERMINAL.has(run.status)) {
        listener({ type: 'done', run: summary(run) });
        return () => {};
      }

      if (!listeners.has(id)) listeners.set(id, new Set());
      listeners.get(id).add(listener);
      return () => listeners.get(id)?.delete(listener);
    },

    /**
     * Listen to every run's status transitions (queued, started, done).
     *
     * @param {(event: {type: 'run', run: object}) => void} listener
     * @returns {() => void} Unsubscribe.
     */
    subscribeAll(listener) {
      allListeners.add(listener);
      return () => allListeners.delete(listener);
    },

    /**
     * Stop a run: drop it from the queue, or kill its process tree.
     */
    cancel(id) {
      const run = runs.get(id);
      if (!run) throw new RunError('No such run', { code: 'run-missing', status: 404 });
      if (TERMINAL.has(run.status)) throw new RunError('That run already finished', { code: 'run-finished' });

      if (run.status === 'queued') {
        queue.splice(queue.indexOf(id), 1);
        record(run, 'stderr', 'Cancelled before it started');
        finish(run, 'cancelled');
        return summary(run);
      }

      run.cancelling = true;
      // No child yet means `before` is still preparing; spawnChild sees the flag.
      if (run.child) killTree(run);
      return summary(run);
    },

    /**
     * Spend a completed dry run as authorisation for the real thing.
     *
     * The token is the dry run's own id, so it can only exist if a dry run
     * actually happened, and it is burned on use — one preview authorises one
     * write, of the same kind, within a few minutes of the user reading it.
     *
     * @param {string} token @param {string} kind
     * @throws {RunError}
     */
    consumeConfirmation(token, kind) {
      const run = typeof token === 'string' ? runs.get(token) : null;
      if (!run || !run.dryRun || run.kind !== kind) {
        throw new RunError(`Run a preview of "${kind}" first, then confirm it`, { code: 'confirm-required', status: 409 });
      }
      if (run.status !== 'succeeded') {
        throw new RunError('That preview did not finish successfully', { code: 'confirm-unsuccessful', status: 409 });
      }
      if (consumed.has(token)) {
        throw new RunError('That preview has already been used', { code: 'confirm-spent', status: 409 });
      }
      if (Date.now() - run.endedAt > CONFIRM_TTL_MS) {
        throw new RunError('That preview is too old — run it again', { code: 'confirm-expired', status: 409 });
      }
      consumed.add(token);
    },

    /**
     * Stop everything, for server shutdown: queued runs are cancelled without
     * starting, running ones are killed, and their `after` hooks get a moment
     * to clean up (release report numbers) before the process goes away.
     */
    async close() {
      closing = true;
      for (const id of [...queue]) {
        const run = runs.get(id);
        if (run && run.status === 'queued') {
          queue.splice(queue.indexOf(id), 1);
          finish(run, 'cancelled', { error: 'server shutting down' });
        }
      }
      for (const id of [...running]) {
        const run = runs.get(id);
        if (!run) continue;
        run.cancelling = true;
        if (run.child) killTree(run);
      }
      const deadline = Date.now() + CLOSE_GRACE_MS;
      while (running.size > 0 && Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
    },
  };

  return api;
}
