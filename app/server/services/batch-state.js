/**
 * batch-state.js — record a finished console evaluation in
 * `batch/batch-state.tsv`, upstream's ledger of headless evaluations.
 *
 * Two upstream scripts read this file, and the console needs both:
 *
 * - `reconcile-pipeline.mjs` moves an inbox URL from Pending to Processed when
 *   the ledger says a report was `completed` for it. Writing our row here means
 *   the inbox is updated by upstream's own script, not by a second writer.
 * - `merge-tracker.mjs` refuses to merge a tracker TSV whose report number has
 *   a `failed` row here — so a half-finished worker's TSV can never merge. That
 *   guard is exactly why the console **never writes a `failed` row**: report
 *   numbers are released on failure and reused by the next run, and a stale
 *   `failed` row would then block the retry's perfectly good TSV. Failures are
 *   handled by deleting the stray TSV instead (`report-numbers.js`).
 *
 * Format (batch/batch-runner.sh `update_state_unlocked`): tab-separated,
 * header `id url status started_at completed_at report_num score error retries`.
 */

import { existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { resolveDataRoot } from './paths.js';

export const HEADER = 'id\turl\tstatus\tstarted_at\tcompleted_at\treport_num\tscore\terror\tretries';

export class BatchStateError extends Error {
  constructor(message, { code, status = 503 } = {}) {
    super(message);
    this.name = 'BatchStateError';
    this.code = code;
    this.status = status;
  }
}

export function batchStatePath(root) {
  return join(resolveDataRoot(root), 'batch', 'batch-state.tsv');
}

/** A cell can hold neither a tab nor a line break, or the row after it is corrupt. */
const cell = (value) => String(value ?? '').replace(/[\t\r\n]+/g, ' ').trim();

/** batch-runner.sh's lock: a directory beside the file, held for the duration of a write. */
function withLock(path, fn) {
  const lockDir = `${path}.lock`;
  const deadline = Date.now() + 5_000;
  for (;;) {
    try {
      mkdirSync(lockDir);
      break;
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      if (Date.now() > deadline) {
        throw new BatchStateError('batch-state.tsv is locked by another process', { code: 'batch-state-locked' });
      }
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50);
    }
  }
  try {
    return fn();
  } finally {
    rmSync(lockDir, { recursive: true, force: true });
  }
}

/**
 * Write or replace one row, keyed by `id`.
 *
 * @param {{root?: string, row: {id: string, url: string, status: 'completed'|'skipped', startedAt: string,
 *   completedAt: string, reportNum: string, score: string|number|null, error?: string|null, retries?: number}}} input
 * @returns {{path: string, line: string}}
 */
export function upsertBatchState({ root, row }) {
  if (row.status !== 'completed' && row.status !== 'skipped') {
    // See the header: a `failed` row poisons the report number for every retry.
    throw new BatchStateError(`Refusing to record a "${row.status}" row`, { code: 'batch-state-status', status: 500 });
  }
  const path = batchStatePath(root);
  const line = [
    cell(row.id),
    cell(row.url),
    cell(row.status),
    cell(row.startedAt),
    cell(row.completedAt),
    cell(row.reportNum),
    cell(row.score ?? '-') || '-',
    cell(row.error ?? ''),
    cell(row.retries ?? 0),
  ].join('\t');

  mkdirSync(dirname(path), { recursive: true });
  withLock(path, () => {
    const existing = existsSync(path) ? readFileSync(path, 'utf-8').split(/\r?\n/) : [];
    const kept = existing.filter((l) => l.trim() && !l.startsWith('id\t') && l.split('\t')[0] !== cell(row.id));
    const body = [HEADER, ...kept, line].join('\n') + '\n';
    // Same tmp+rename dance as upstream's writers: a reader never sees a torn file.
    const tmpDir = mkdtempSync(join(dirname(path), '.batch-state-'));
    const tmp = join(tmpDir, 'batch-state.tsv');
    writeFileSync(tmp, body, 'utf-8');
    renameSync(tmp, path);
    rmSync(tmpDir, { recursive: true, force: true });
  });
  return { path, line };
}
