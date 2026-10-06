#!/usr/bin/env node

/**
 * sandbox.mjs — run the console against a fictional workspace (PROJECT_PLAN.md §12.1).
 *
 *   node app/ux/sandbox.mjs --state <empty|populated|broken> [--port 4400]
 *                           [--delay <ms>] [--scenario <name>] [--keep]
 *
 * Copies `sandbox/seeds/<state>` into a fresh temp directory and serves the
 * console on 127.0.0.1 against it. Nothing touches the repository's own
 * cv.md, tracker or reports, and nothing touches the network:
 *
 *   - the server is built with `buildApp({ root })`, which confines every
 *     child process to the temp root (queue/runner.js `confineTo`);
 *   - agent runs go to the fake CLI (`__fixtures__/bin/fake-claude.js`), so
 *     evaluate, PDF, cover letter and skills reading all finish at zero token
 *     cost; `--scenario` picks its behaviour (default `auto`: succeed at
 *     whatever was asked) and `--delay` how long each session "thinks"
 *     (default 8000 ms; real sessions take minutes);
 *   - scans and posting fetches read the fake job boards (`sandbox/fake-net.mjs`).
 *
 * State `broken` also starts one evaluation that fails, so the Runs page has a
 * failure to investigate and the retry succeeds.
 *
 * Prints `SANDBOX_READY {json}` once the server is listening. Ctrl+C stops it
 * and removes the temp directory unless `--keep` was given. The UI is rebuilt
 * first when any file under app/ui/src is newer than app/ui/dist, so the
 * sandbox always serves the code on disk.
 */

import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

const here = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(here, '..');
const STATES = ['empty', 'populated', 'broken'];
const FAKE_CLAUDE = join(appRoot, 'server', 'services', '__fixtures__', 'bin', 'fake-claude.js');
const FAKE_NET = join(here, 'sandbox', 'fake-net.mjs');
const MARKET = join(here, 'sandbox', 'net', 'greenhouse.json');

const { values: opts } = parseArgs({
  options: {
    state: { type: 'string', default: 'populated' },
    port: { type: 'string', default: '4400' },
    delay: { type: 'string', default: '8000' },
    scenario: { type: 'string', default: 'auto' },
    keep: { type: 'boolean', default: false },
    verbose: { type: 'boolean', default: false },
  },
});

if (!STATES.includes(opts.state)) {
  console.error(`--state must be one of ${STATES.join(', ')}`);
  process.exit(2);
}
const port = Number.parseInt(opts.port, 10);
const delay = Number.parseInt(opts.delay, 10);
if (!Number.isInteger(port) || !Number.isInteger(delay) || delay < 0) {
  console.error('--port and --delay must be whole numbers');
  process.exit(2);
}
const seed = join(here, 'sandbox', 'seeds', opts.state);
if (!existsSync(seed)) {
  console.error(`No seed at ${seed}. Run: node app/ux/sandbox/generate.mjs`);
  process.exit(2);
}

/** Newest mtime under a directory. */
function newest(dir) {
  let latest = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    latest = Math.max(latest, entry.isDirectory() ? newest(path) : statSync(path).mtimeMs);
  }
  return latest;
}

function buildUiIfStale() {
  const dist = join(appRoot, 'ui', 'dist', 'index.html');
  const src = join(appRoot, 'ui', 'src');
  if (existsSync(dist) && statSync(dist).mtimeMs >= newest(src)) return;
  console.log('Building the UI (app/ui/src changed since the last build)…');
  const result = spawnSync('npm', ['--prefix', join(appRoot, 'ui'), 'run', 'build'], { stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.status !== 0) {
    console.error('UI build failed');
    process.exit(1);
  }
}

buildUiIfStale();

// ── the workspace ─────────────────────────────────────────────────────

/**
 * A sandbox killed outright (a task runner's stop, a closed terminal) never
 * runs its exit handler, so each start removes the copies whose owner is gone.
 * Each copy records its process id; one whose process still runs is in use.
 */
function sweepOrphans() {
  for (const name of readdirSync(tmpdir())) {
    if (!name.startsWith('jsc-ux-')) continue;
    const dir = join(tmpdir(), name);
    let pid = null;
    try {
      pid = Number.parseInt(readFileSync(join(dir, '.sandbox-pid'), 'utf-8'), 10);
    } catch {
      // No pid file: a copy from before this existed, or a half-made one.
    }
    let alive = false;
    if (Number.isInteger(pid)) {
      try {
        process.kill(pid, 0);
        alive = true;
      } catch {
        alive = false;
      }
    }
    // A copy younger than a minute without a pid file may be another sandbox still starting.
    let young;
    try {
      young = Date.now() - statSync(dir).mtimeMs < 60_000;
    } catch {
      // Another sandbox starting at the same moment removed it first.
      continue;
    }
    if (alive || (pid === null && young)) continue;
    try {
      rmSync(dir, { recursive: true, force: true, maxRetries: 3 });
    } catch {
      // Best effort: a copy we cannot remove now is retried at the next start.
    }
  }
}

sweepOrphans();
const root = mkdtempSync(join(tmpdir(), `jsc-ux-${opts.state}-`));
// Claimed before the copy, so a sandbox starting alongside never sweeps it.
writeFileSync(join(root, '.sandbox-pid'), String(process.pid), 'utf-8');
cpSync(seed, root, { recursive: true });
for (const dir of ['prompts', 'logs', 'tmp']) mkdirSync(join(root, 'data', 'jsc', dir), { recursive: true });

// Read when the server builds its runner and on every spawn: set them first.
process.env.JSC_CLAUDE_BIN = FAKE_CLAUDE;
process.env.FAKE_CLAUDE_SCENARIO = opts.scenario;
process.env.FAKE_CLAUDE_MARKET = MARKET;
// The startup failure in `broken` should not wait; the delay applies after it.
process.env.FAKE_CLAUDE_DELAY_MS = '0';
process.env.NODE_OPTIONS = [process.env.NODE_OPTIONS, `--import=${pathToFileURL(FAKE_NET).href}`].filter(Boolean).join(' ');
// This process makes no board requests itself, but anything it imports must not either.
await import(pathToFileURL(FAKE_NET).href);

const { buildApp } = await import('../server/app.js');
const app = buildApp({ root, serveUi: true, logger: opts.verbose ? { level: 'info' } : false });

let cleaned = false;
function cleanUp() {
  if (cleaned) return;
  cleaned = true;
  if (!opts.keep) rmSync(root, { recursive: true, force: true, maxRetries: 3 });
}
for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(signal, () => {
    app.close().finally(() => {
      cleanUp();
      process.exit(0);
    });
  });
}
process.on('exit', cleanUp);

await app.listen({ host: '127.0.0.1', port });

// ── state-specific setup ──────────────────────────────────────────────

async function waitForRun(id) {
  for (let i = 0; i < 300; i += 1) {
    const run = (await app.inject({ method: 'GET', url: `/api/runs/${id}` })).json();
    if (['succeeded', 'failed', 'cancelled'].includes(run.status)) return run;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`run ${id} did not finish`);
}

let startupRun = null;
if (opts.state === 'broken') {
  // An evaluation of an inbox posting whose session writes no report: the
  // console marks it failed. The next session falls back to `auto` and works.
  writeFileSync(join(root, 'data', 'jsc', 'fake-scenarios'), 'evaluate-no-report\n', 'utf-8');
  // A posting whose company and role are not already tracked: upstream's merge
  // folds an evaluation into an existing row with the same pair, and the retry
  // should add a row of its own.
  const inbox = readFileSync(join(root, 'data', 'pipeline.md'), 'utf-8');
  const tracker = readFileSync(join(root, 'data', 'applications.md'), 'utf-8');
  const tracked = new Set(tracker.split(/\r?\n/).map((l) => l.split('|').map((c) => c.trim())).filter((c) => /^\d+$/.test(c[1] ?? '')).map((c) => `${c[3]}|${c[5]}`));
  const url = [...inbox.matchAll(/^- \[ \] (\S+) \| ([^|]+) \| ([^|]+) \|/gm)].find((m) => !tracked.has(`${m[2].trim()}|${m[3].trim()}`))?.[1];
  const res = await app.inject({ method: 'POST', url: '/api/runs', payload: { kind: 'evaluate', options: { url } } });
  if (res.statusCode !== 202) throw new Error(`could not start the failing run: ${res.body}`);
  startupRun = await waitForRun(res.json().id);
}

process.env.FAKE_CLAUDE_DELAY_MS = String(delay);

const info = {
  url: `http://127.0.0.1:${port}/`,
  state: opts.state,
  startedAt: Date.now(),
  root,
  scenario: opts.scenario,
  delayMs: delay,
  ...(startupRun ? { failedRun: { id: startupRun.id, status: startupRun.status } } : {}),
};
console.log(`UX sandbox (${opts.state}) on ${info.url}`);
console.log(`  data root: ${root}${opts.keep ? ' (kept on exit)' : ' (removed on exit)'}`);
console.log(`  fake agent: ${opts.scenario}, ${delay} ms per session`);
console.log(`SANDBOX_READY ${JSON.stringify(info)}`);
