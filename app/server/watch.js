/**
 * watch.js — notice when reports/, output/ or data/ change on disk.
 *
 * The dashboard is a view over files that three different writers touch: the
 * console's own runs, upstream's scripts, and a Claude Code session the user
 * may have open in the same directory (PROJECT_PLAN.md §5). Instead of
 * polling, the server watches those directories and pushes a `changed` event
 * over `/api/events`; the UI refetches what it shows.
 *
 * Node's recursive `fs.watch` is enough here (Node ≥ 22 supports it on every
 * platform the console runs on) and keeps the dependency list unchanged. The
 * feed is deliberately coarse: paths are debounced into one event per burst,
 * and the noise a run makes — reservation sentinels, lock directories, backup
 * copies, the console's own scratch files — is filtered out before it reaches
 * a browser.
 */

import { existsSync, watch as fsWatchDefault } from 'node:fs';
import { join, relative, sep } from 'node:path';

export const WATCHED_DIRS = Object.freeze(['reports', 'output', 'data']);

/** Files that change constantly during a run and mean nothing to the dashboard. */
const IGNORED = [
  /-RESERVED\.md$/i,
  /\.bak(?:[-.].*)?$/i,
  /\.lock(?:[\\/]|$)/i,
  /\.tmp(?:[-.].*)?$/i,
  /^data[\\/]jsc[\\/]/i,
  /\.career-ops-render-/i,
  /\.pre-reconcile\./i,
  /[\\/]\.batch-state-/i,
  /(^|[\\/])\.[^\\/]*$/, // dotfiles and dot-directories
];

export function isIgnored(relativePath) {
  return IGNORED.some((re) => re.test(relativePath));
}

/**
 * @param {object} options
 * @param {string} options.root - The data root.
 * @param {(event: {paths: string[], at: number}) => void} options.onChange
 * @param {string[]} [options.dirs]
 * @param {number} [options.debounceMs]
 * @param {number} [options.retryMs] - How often to look for a watched directory that does not exist yet.
 * @param {Function} [options.fsWatch] - Injectable for tests.
 * @param {(message: string) => void} [options.log]
 * @returns {{close(): void, watching(): string[]}}
 */
export function createWatcher({ root, onChange, dirs = WATCHED_DIRS, debounceMs = 300, retryMs = 10_000, fsWatch = fsWatchDefault, log = () => {} }) {
  const watchers = new Map();
  const pending = new Set();
  let timer = null;
  let closed = false;

  const flush = () => {
    timer = null;
    if (pending.size === 0) return;
    const paths = [...pending].sort();
    pending.clear();
    try {
      onChange({ paths, at: Date.now() });
    } catch (error) {
      log(`watcher listener failed: ${error.message}`);
    }
  };

  const noticed = (dir, filename) => {
    if (closed || !filename) return;
    const rel = relative(root, join(root, dir, String(filename))).split(sep).join('/');
    if (isIgnored(rel)) return;
    pending.add(rel);
    if (!timer) {
      timer = setTimeout(flush, debounceMs);
      timer.unref?.();
    }
  };

  const arm = (dir) => {
    if (closed || watchers.has(dir)) return;
    const full = join(root, dir);
    if (!existsSync(full)) return;
    try {
      const w = fsWatch(full, { recursive: true }, (eventType, filename) => noticed(dir, filename));
      // Never the reason the process stays up: a server that is otherwise done
      // (or a test that built an app and forgot to close it) must still exit.
      w.unref?.();
      w.on?.('error', (error) => {
        // Windows raises EPERM when a watched directory is renamed or deleted
        // under us; drop the watcher and let the retry loop re-arm it.
        log(`watcher on ${dir}/ stopped: ${error.message}`);
        watchers.delete(dir);
        try {
          w.close();
        } catch {
          // Already gone.
        }
      });
      watchers.set(dir, w);
    } catch (error) {
      log(`could not watch ${dir}/: ${error.message}`);
    }
  };

  for (const dir of dirs) arm(dir);
  // A fresh checkout has no reports/ yet; keep looking until it appears.
  const retry = setInterval(() => dirs.forEach(arm), retryMs);
  retry.unref?.();

  return {
    close() {
      closed = true;
      clearInterval(retry);
      if (timer) clearTimeout(timer);
      for (const w of watchers.values()) {
        try {
          w.close();
        } catch {
          // Already gone.
        }
      }
      watchers.clear();
    },
    watching() {
      return [...watchers.keys()];
    },
  };
}
