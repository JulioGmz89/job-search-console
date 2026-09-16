/**
 * report-numbers.js — reserve and release report numbers through upstream's
 * allocator, and clean up after a worker that did not finish.
 *
 * `reserve-report-num.mjs` is the one source of truth for "the next report
 * number": it scans report files, reservation sentinels, tracker ids and
 * report links under the tracker lock, and claims a number atomically. The
 * console reserves a number just before spawning a worker (never at click
 * time) and releases it as soon as the worker exits, whatever happened — a
 * number left reserved stays blocked for four hours.
 */

import { execFile as execFileCb } from 'node:child_process';
import { existsSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { confineTo } from '../queue/runner.js';
import { repoRoot, resolveDataRoot } from './paths.js';

const execFile = promisify(execFileCb);

export class ReportNumberError extends Error {
  constructor(message, { code = 'report-number', status = 503 } = {}) {
    super(message);
    this.name = 'ReportNumberError';
    this.code = code;
    this.status = status;
  }
}

function envFor(root) {
  return root ? { ...process.env, ...confineTo(root) } : process.env;
}

async function reserveCli(args, root) {
  return execFile(process.execPath, [join(repoRoot, 'reserve-report-num.mjs'), ...args], {
    cwd: repoRoot,
    env: envFor(root),
    timeout: 30_000,
    maxBuffer: 1024 * 1024,
    windowsHide: true,
  });
}

/**
 * Claim the next free report number.
 *
 * @param {{root?: string}} [options]
 * @returns {Promise<string>} Zero-padded, e.g. `"009"`.
 * @throws {ReportNumberError}
 */
export async function reserveReportNumber({ root } = {}) {
  let stdout;
  try {
    ({ stdout } = await reserveCli([], root));
  } catch (error) {
    const detail = (error.stderr || error.message || '').trim();
    throw new ReportNumberError(`Could not reserve a report number: ${detail}`);
  }
  const num = stdout.trim();
  if (!/^\d{3,}$/.test(num)) {
    throw new ReportNumberError(`reserve-report-num.mjs printed "${num}", not a report number`);
  }
  return num;
}

/**
 * Give a number back. Never throws: by the time this runs the run is over and
 * a failed release is worth a log line, not a failed run. The sentinel also
 * expires on its own.
 *
 * @param {{root?: string, num: string}} options
 * @returns {Promise<string|null>} An error message, or null.
 */
export async function releaseReportNumber({ root, num }) {
  if (!/^\d{3,}$/.test(String(num ?? ''))) return `not a report number: ${num}`;
  try {
    await reserveCli(['--release', num], root);
    return null;
  } catch (error) {
    return (error.stderr || error.message || 'unknown error').trim();
  }
}

/**
 * Remove the tracker addition a failed worker may have left behind.
 *
 * A worker that died after writing its TSV but before the console could
 * verify its report would otherwise have that TSV merged by the next
 * merge-tracker run — a tracker row pointing at a report that does not exist,
 * or at the next run's report under a reused number.
 *
 * @param {{root?: string, num: string}} options
 * @returns {string[]} The files removed.
 */
export function removeStrayAdditions({ root, num }) {
  const dir = join(resolveDataRoot(root), 'batch', 'tracker-additions');
  if (!existsSync(dir) || !/^\d+$/.test(String(num ?? ''))) return [];
  const wanted = Number.parseInt(num, 10);
  const removed = [];
  for (const name of readdirSync(dir)) {
    const match = /^(\d+)-.*\.tsv$/.exec(name);
    if (!match || Number.parseInt(match[1], 10) !== wanted) continue;
    rmSync(join(dir, name), { force: true });
    removed.push(name);
  }
  return removed;
}
