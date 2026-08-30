/**
 * runner.js — spawns one upstream script at a time and streams its output.
 *
 * PROJECT_PLAN.md §5 puts the job queue here, and §8 gives M2 exactly one
 * long-running action ("Scan now"). So this is a queue with a single slot: it
 * already has the shape M3 needs — start, status, captured logs, cancel, live
 * streaming — and M3 replaces the slot with a concurrency limit without changing
 * this module's interface, the routes, or the UI.
 *
 * The runner knows nothing about any particular script. What to spawn comes from
 * `specs.js`, and how to read progress out of a line comes from the spec too, so
 * adding the agent runner later means adding a spec, not editing this file.
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
function confineTo(root) {
  return {
    CAREER_OPS_ROOT: root,
    CAREER_OPS_DATA_DIR: root,
    CAREER_OPS_TRACKER: join(root, 'data', 'applications.md'),
    CAREER_OPS_PIPELINE: join(root, 'data', 'pipeline.md'),
    CAREER_OPS_SCAN_HISTORY: join(root, 'data', 'scan-history.tsv'),
    CAREER_OPS_PORTALS: join(root, 'portals.yml'),
  };
}

/** Lines kept per run. A long scan prints a few hundred; this is a bound, not a target. */
const MAX_LINES = 5_000;

/** Completed runs kept in memory, newest first. */
const MAX_HISTORY = 20;

/** How long a successful dry run stays usable as confirmation for the real thing. */
const CONFIRM_TTL_MS = 10 * 60 * 1000;

/** Grace period between SIGTERM and SIGKILL on POSIX. */
const KILL_GRACE_MS = 5_000;

/** A start request refused because something is already running. */
export class RunBusyError extends Error {
  constructor(active) {
    super(`"${active.label}" is still running — wait for it to finish or cancel it`);
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

/**
 * Create a runner bound to one repository.
 *
 * A factory rather than a module singleton so each `buildApp()` — including the
 * one per test file — owns its own state. Shared mutable run state across test
 * files running in parallel would be a flake generator.
 *
 * @param {{repoRoot: string, root?: string, spawnFn?: Function}} options
 *   `root` pins the data root for the child, mirroring the service seam.
 *   `spawnFn` exists for tests; nothing in production passes it.
 */
export function createRunner({ repoRoot, root, spawnFn = spawn } = {}) {
  /** @type {Map<string, object>} */
  const runs = new Map();
  /** @type {Map<string, Set<Function>>} */
  const listeners = new Map();
  /** Dry runs already spent as confirmation, so one cannot authorise two writes. */
  const consumed = new Set();
  let activeId = null;

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

  /** Public view of a run: everything except the child handle. */
  const publicRun = (run, { lines = true } = {}) => ({
    id: run.id,
    kind: run.kind,
    label: run.label,
    args: run.args,
    dryRun: run.dryRun,
    writes: run.writes,
    reportsFindings: run.reportsFindings,
    status: run.status,
    exitCode: run.exitCode,
    signal: run.signal,
    startedAt: run.startedAt,
    endedAt: run.endedAt,
    progress: run.progress,
    error: run.error,
    truncated: run.truncated,
    ...(lines ? { lines: run.lines } : { lineCount: run.lines.length }),
  });

  const record = (run, stream, text) => {
    if (run.lines.length >= MAX_LINES) {
      run.truncated = true;
      return;
    }
    const line = { stream, text, at: Date.now() };
    run.lines.push(line);
    emit(run.id, { type: 'line', line });

    const progress = run.parseProgress?.(text);
    if (!progress) return;
    if (progress.type === 'verify-start') run.progress = { phase: 'verify', total: progress.total, done: 0 };
    else if (progress.type === 'verify-result' && run.progress?.phase === 'verify') {
      run.progress = { ...run.progress, done: run.progress.done + 1 };
    } else if (progress.type === 'sweep-start') run.progress = { phase: 'sweep', total: null, done: 0 };
    else return;
    emit(run.id, { type: 'progress', progress: run.progress });
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
        for (const part of parts) record(run, stream, part);
      },
      flush() {
        if (carry !== '') record(run, stream, carry);
        carry = '';
      },
    };
  };

  const finish = (run, status, extra = {}) => {
    if (run.status !== 'running') return;
    run.status = status;
    run.endedAt = Date.now();
    Object.assign(run, extra);
    run.child = null;
    if (activeId === run.id) activeId = null;
    emit(run.id, { type: 'done', run: publicRun(run, { lines: false }) });

    // Keep the tail of history; the active run is never in this set.
    const finished = [...runs.values()].filter((r) => r.status !== 'running');
    if (finished.length > MAX_HISTORY) {
      finished
        .sort((a, b) => a.endedAt - b.endedAt)
        .slice(0, finished.length - MAX_HISTORY)
        .forEach((r) => {
          runs.delete(r.id);
          listeners.delete(r.id);
          consumed.delete(r.id);
        });
    }
  };

  return {
    /**
     * Start a run.
     *
     * @param {object} spec - From `buildSpec()`.
     * @returns {object} The public run record.
     * @throws {RunBusyError}
     */
    start(spec) {
      if (activeId) throw new RunBusyError(runs.get(activeId));

      const run = {
        id: randomUUID(),
        kind: spec.kind,
        label: spec.label,
        args: spec.args,
        dryRun: spec.dryRun,
        writes: spec.writes,
        reportsFindings: spec.reportsFindings === true,
        status: 'running',
        exitCode: null,
        signal: null,
        startedAt: Date.now(),
        endedAt: null,
        lines: [],
        truncated: false,
        progress: null,
        error: null,
        parseProgress: spec.parseProgress,
        child: null,
      };
      runs.set(run.id, run);
      activeId = run.id;

      // `process.execPath` rather than "node", and no shell: PATH lookup and
      // argument quoting are both platform-dependent minefields on Windows, and
      // a shell would also mean the arguments are re-parsed by something other
      // than Node.
      const child = spawnFn(process.execPath, [join(repoRoot, spec.script), ...spec.args], {
        cwd: repoRoot,
        env: root ? { ...process.env, ...confineTo(root) } : process.env,
        shell: false,
        windowsHide: true,
      });
      run.child = child;
      run.pid = child.pid ?? null;

      const out = makeSplitter(run, 'stdout');
      const err = makeSplitter(run, 'stderr');
      child.stdout?.setEncoding('utf-8');
      child.stderr?.setEncoding('utf-8');
      child.stdout?.on('data', (chunk) => out.push(chunk));
      child.stderr?.on('data', (chunk) => err.push(chunk));

      child.on('error', (error) => {
        out.flush();
        err.flush();
        record(run, 'stderr', `Could not run ${spec.script}: ${error.message}`);
        finish(run, 'failed', { error: error.message });
      });

      child.on('close', (code, signal) => {
        out.flush();
        err.flush();
        if (run.cancelling) finish(run, 'cancelled', { exitCode: code, signal });
        else finish(run, code === 0 ? 'succeeded' : 'failed', { exitCode: code, signal });
      });

      return publicRun(run);
    },

    /** @param {string} id @returns {object|null} */
    get(id) {
      const run = runs.get(id);
      return run ? publicRun(run) : null;
    },

    /** @returns {{active: object|null, recent: object[]}} */
    list() {
      const all = [...runs.values()].sort((a, b) => b.startedAt - a.startedAt);
      return {
        active: activeId ? publicRun(runs.get(activeId), { lines: false }) : null,
        recent: all.filter((run) => run.status !== 'running').map((run) => publicRun(run, { lines: false })),
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

      for (const line of run.lines) listener({ type: 'line', line });
      if (run.progress) listener({ type: 'progress', progress: run.progress });
      if (run.status !== 'running') {
        listener({ type: 'done', run: publicRun(run, { lines: false }) });
        return () => {};
      }

      if (!listeners.has(id)) listeners.set(id, new Set());
      listeners.get(id).add(listener);
      return () => listeners.get(id)?.delete(listener);
    },

    /**
     * Stop a running child.
     *
     * On Windows a signal does not propagate to a process tree, and `scan.mjs`
     * spawns Playwright browsers, so cancelling has to kill the tree outright
     * with `taskkill /T /F`. That is a hard kill: scan.mjs's own SIGINT handler
     * — which writes a `failed` row to `data/scan-runs.tsv` — does not get to
     * run, so a cancelled scan leaves no row behind. The run record here is the
     * only account of it.
     */
    cancel(id) {
      const run = runs.get(id);
      if (!run) throw new RunError('No such run', { code: 'run-missing', status: 404 });
      if (run.status !== 'running') throw new RunError('That run already finished', { code: 'run-finished' });

      run.cancelling = true;
      const child = run.child;
      if (!child) return publicRun(run, { lines: false });

      if (process.platform === 'win32' && child.pid) {
        spawnFn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true, shell: false });
      } else {
        child.kill('SIGTERM');
        setTimeout(() => {
          if (run.status === 'running') child.kill('SIGKILL');
        }, KILL_GRACE_MS).unref?.();
      }
      return publicRun(run, { lines: false });
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

    /** Kill anything still running, for server shutdown. */
    close() {
      if (activeId) {
        try {
          this.cancel(activeId);
        } catch {
          // Already gone; nothing to stop.
        }
      }
    },
  };
}
