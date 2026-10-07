/**
 * ledgers.js — read-only views of three user files the UI shows but never
 * writes (M8 discoverability):
 *
 * - `status-log.tsv`, set-status.mjs's transition ledger beside the tracker:
 *   `{tracker#}\t{date}\t{from}\t{to}\t{source}\t` (Job › History);
 * - `data/blacklist.md`, the do-not-apply list scan.mjs reads, parsed by
 *   scan.mjs's own `parseBlacklist` so the two never disagree (Companies ›
 *   Companies to skip);
 * - one writing sample's text (My CV › Writing rules › Open).
 *
 * The formats stay upstream's; nothing here creates or edits these files.
 */

import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { parseBlacklist } from '../../../scan.mjs';
import { listWritingSamples } from './cvstyle.js';
import { resolveDataRoot, trackerPath } from './paths.js';

/** Bytes of a writing sample the app will show; longer ones are cut. */
const SAMPLE_LIMIT = 200 * 1024;
const TEXT_SAMPLE = /\.(md|markdown|txt|text)$/i;

export class LedgerError extends Error {
  constructor(message, { code, status = 400 } = {}) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

/**
 * Every recorded status change of one tracker row, oldest first.
 *
 * @param {{root?: string, rowId: number}} options
 * @returns {{exists: boolean, entries: {date: string, from: string, to: string, source: string}[]}}
 */
export function readStatusHistory({ root, rowId } = {}) {
  const file = join(dirname(trackerPath(root)), 'status-log.tsv');
  if (!existsSync(file)) return { exists: false, entries: [] };
  const entries = [];
  for (const line of readFileSync(file, 'utf-8').replace(/\r/g, '').split('\n')) {
    const [num, date, from, to, source] = line.split('\t');
    if (Number.parseInt(num, 10) !== rowId || !/^\d{4}-\d{2}-\d{2}/.test(date ?? '')) continue;
    entries.push({ date, from: from ?? '', to: to ?? '', source: source || 'set-status' });
  }
  // A stable sort keeps the file's order for changes on the same day.
  entries.sort((a, b) => a.date.localeCompare(b.date));
  return { exists: true, entries };
}

/**
 * The companies the user never wants to apply to.
 *
 * @param {{root?: string}} options
 * @returns {{path: string, exists: boolean, companies: {company: string, since: string, scope: string, reason: string}[]}}
 */
export function readSkipList({ root } = {}) {
  const path = join(resolveDataRoot(root), 'data', 'blacklist.md');
  if (!existsSync(path)) return { path, exists: false, companies: [] };
  return { path, exists: true, companies: [...parseBlacklist(readFileSync(path, 'utf-8')).values()] };
}

/**
 * One writing sample's text, by the name the listing gave it.
 *
 * @param {{root?: string, name: string}} options
 * @returns {{name: string, text: string, truncated: boolean}}
 */
export function readWritingSample({ root, name } = {}) {
  const { path: dir, samples } = listWritingSamples({ root });
  const sample = samples.find((s) => s.name === name);
  if (!sample) throw new LedgerError('No writing sample by that name', { code: 'sample-not-found', status: 404 });
  if (!TEXT_SAMPLE.test(name)) {
    throw new LedgerError('Only text and Markdown samples can be shown in the app; open this one from the folder.', { code: 'sample-not-text', status: 415 });
  }
  const file = join(dir, name);
  const size = statSync(file).size;
  const text = readFileSync(file, 'utf-8');
  return { name, text: size > SAMPLE_LIMIT ? text.slice(0, SAMPLE_LIMIT) : text, truncated: size > SAMPLE_LIMIT };
}
