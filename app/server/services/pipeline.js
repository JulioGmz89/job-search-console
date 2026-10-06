/**
 * pipeline.js — parses the application tracker into the dashboard's row shape.
 *
 * Part of the service seam (PROJECT_PLAN.md §4): all knowledge of upstream's
 * tracker format is concentrated here and in reports.js.
 *
 * The tracker is `data/applications.md`, a markdown table whose column *order*
 * is not fixed — #946/#954 upstream made it customizable, and this repo's own
 * tracker carries a `Via` column the original nine-column layout never had. So
 * we do not split on `|` and index by position; we delegate to upstream's
 * header-aware `tracker-parse.mjs`, which is the module several upstream
 * readers already share for exactly this reason.
 *
 * Read-only. Nothing here writes, and M2's inline status edits did not change
 * that: they go through upstream's `set-status.mjs` (see services/status.js),
 * which already owns the lock, the state validation and the transition ledger.
 * `rawLine`/`sourceLine` were preserved here against a hand-editing write-back
 * that deliberately never happened; they stay because they cost nothing and
 * locating a row's source line is genuinely useful, but nothing depends on them
 * and `app.js` still strips `rawLine` before it can cross the wire.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import {
  extractTrackerReportNumbers,
  parseTrackerRow,
  resolveColumns,
} from '../../../tracker-parse.mjs';

import { resolveTrackerPathForWrite } from '../../../path-resolver.mjs';
import { loadStates, resolveDataRoot, trackerPath } from './paths.js';

/** Tracker "no data" sentinels. Upstream uses an em dash; hyphen appears too. */
const EMPTY_CELLS = new Set(['—', '-', '', 'n/a', 'N/A']);

/** A score cell that carries a real number, e.g. `3.5/5`. Bold is stripped first. */
const SCORE_RE = /^(\d+(?:\.\d+)?)\/5$/;

/**
 * Score bands, from the house rule visible throughout this tracker's notes:
 * >= 3.5 auto-generates a CV, 3.0-3.49 is manual review, below 3.0 is a skip.
 * The dashboard filters on these, so they are named once here rather than
 * re-derived in the UI.
 */
export const SCORE_BANDS = Object.freeze([
  { id: 'strong', label: 'Auto-CV (≥ 3.5)', min: 3.5, max: Infinity },
  { id: 'review', label: 'Manual review (3.0–3.49)', min: 3.0, max: 3.5 },
  { id: 'skip', label: 'Below threshold (< 3.0)', min: -Infinity, max: 3.0 },
]);

/** @param {number|null} score @returns {string|null} The band id, or null. */
export function scoreBand(score) {
  if (typeof score !== 'number' || Number.isNaN(score)) return null;
  return SCORE_BANDS.find((b) => score >= b.min && score < b.max)?.id ?? null;
}

/** @param {string} value @returns {string|null} Trimmed cell, or null if a sentinel. */
function cellOrNull(value) {
  const trimmed = String(value ?? '').trim();
  return EMPTY_CELLS.has(trimmed) ? null : trimmed;
}

/**
 * Parse a tracker score cell.
 *
 * Returns null for the `N/A` / `DUP` / `—` sentinels upstream documents on
 * SCORE_CELL_RE — a backfilled entry (a rejection for a role never evaluated)
 * legitimately has no score, and must not read as 0.
 *
 * @param {string} value - Raw score cell.
 * @returns {number|null}
 */
function parseScore(value) {
  const match = SCORE_RE.exec(String(value ?? '').replace(/\*/g, '').trim());
  return match ? Number.parseFloat(match[1]) : null;
}

/**
 * A row the parser could not read, in words a person can act on (F-021): which
 * application it seems to be and what is wrong with it. Best effort — the row
 * is malformed by definition — so every field may be null.
 *
 * @param {string} line - The raw tracker line.
 * @param {string[]} lines - The whole file, for the header's column count.
 * @returns {{number: number|null, company: string|null, problem: string, message: string}}
 */
export function describeUnparseable(line, lines) {
  const cellsOf = (text) => text.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
  const cells = cellsOf(line);
  const header = lines.find((l) => /^\|\s*#\s*\|/.test(l));
  const expected = header ? cellsOf(header).length : null;
  const number = /^\d+$/.test(cells[0] ?? '') ? Number(cells[0]) : null;
  const company = cells.slice(1).find((c) => c && !EMPTY_CELLS.has(c) && !/^\d{4}-\d{2}-\d{2}$/.test(c) && !/^[\d.,/]+$/.test(c)) ?? null;
  const problem = expected !== null && cells.length !== expected
    ? `it has ${cells.length} columns instead of ${expected}, so the score and status are in the wrong places`
    : 'the score or the status could not be read';
  const who = [company, number !== null ? `#${number}` : null].filter(Boolean).join(' ');
  return { number, company, problem, message: `${who || 'An application'}: ${problem}.` };
}

/**
 * Read and normalize the whole tracker.
 *
 * Never throws on bad data. A single malformed row must not blank the whole
 * dashboard, so parse failures and drift land in `issues[]` and the remaining
 * rows still render. A missing tracker file is likewise an issue, not a crash:
 * a first-run user has no tracker yet and should see an empty dashboard that
 * tells them so.
 *
 * @param {{root?: string}} [options] - `root` overrides the data root.
 * @returns {{trackerPath: string, columns: object|null, rows: object[],
 *            issues: object[], statuses: object[]}}
 */
export function readPipeline({ root } = {}) {
  const path = trackerPath(root);
  const issues = [];
  const { states, byAlias } = loadStates();

  let source;
  try {
    source = readFileSync(path, 'utf-8');
  } catch (error) {
    issues.push({
      level: error.code === 'ENOENT' ? 'info' : 'error',
      code: error.code === 'ENOENT' ? 'tracker-missing' : 'tracker-unreadable',
      message:
        error.code === 'ENOENT'
          ? 'No applications tracker yet — run an evaluation to create one.'
          : `Could not read the tracker: ${error.message}`,
    });
    return { trackerPath: path, columns: null, rows: [], issues, statuses: states };
  }

  const lines = source.split(/\r?\n/);
  const columns = resolveColumns(lines);
  const rows = [];
  const seenIds = new Map();

  lines.forEach((line, index) => {
    if (!line.startsWith('|')) return;
    const parsed = parseTrackerRow(line, columns);
    if (!parsed) {
      // Header and separator rows return null by design; only flag lines that
      // look like they were meant to be data.
      if (!/^\|\s*(#|-{3,}|:?-)/.test(line) && line.replace(/[|\s]/g, '') !== '') {
        issues.push({ level: 'warn', code: 'row-unparseable', line: index + 1, ...describeUnparseable(line, lines) });
      }
      return;
    }

    const status = cellOrNull(parsed.status);
    const state = status ? byAlias.get(status.toLowerCase()) : undefined;
    if (status && !state) {
      issues.push({
        level: 'warn',
        code: 'status-unknown',
        id: parsed.num,
        line: index + 1,
        message: `"${status}" is not in templates/states.yml`,
      });
    }

    const reportIds = extractTrackerReportNumbers(parsed.report, parsed.notes);
    const score = parseScore(parsed.score);

    if (seenIds.has(parsed.num)) {
      issues.push({
        level: 'warn',
        code: 'duplicate-id',
        id: parsed.num,
        line: index + 1,
        message: `Tracker id ${parsed.num} also appears on line ${seenIds.get(parsed.num)}`,
      });
    } else {
      seenIds.set(parsed.num, index + 1);
    }

    rows.push({
      id: parsed.num,
      date: cellOrNull(parsed.date),
      company: cellOrNull(parsed.company),
      role: cellOrNull(parsed.role),
      via: cellOrNull(parsed.via),
      location: parsed.location !== undefined ? cellOrNull(parsed.location) : null,
      score,
      scoreBand: scoreBand(score),
      status,
      statusId: state?.id ?? null,
      statusGroup: state?.dashboard_group ?? null,
      terminal: state?.terminal === true,
      hasPdfFlag: String(parsed.pdf ?? '').includes('✅'),
      // The Report cell's own link is authoritative; the row number is only a
      // fallback. They diverge in practice when a row is renumbered by a merge.
      reportId: reportIds[0] ?? parsed.num,
      reportIds,
      notes: cellOrNull(parsed.notes),
      sourceLine: index + 1,
      rawLine: line,
    });
  });

  return { trackerPath: path, columns, rows, issues, statuses: states };
}

/** Upstream's own empty tracker (AGENTS.md: "If data/applications.md doesn't exist, create it"). */
export const EMPTY_TRACKER = '# Applications Tracker\n\n| # | Date | Company | Role | Score | Status | PDF | Report | Notes |\n|---|------|---------|------|-------|--------|-----|--------|-------|\n';

/**
 * Create the tracker when there is none, exactly as upstream's instructions
 * do. `merge-tracker.mjs` never creates it ("Nothing to merge into"), so on a
 * first run the first evaluation would never reach Applications.
 *
 * @param {{root?: string}} [options]
 * @returns {boolean} true when the file was created.
 */
export function ensureTracker({ root } = {}) {
  // The read resolver falls back to the legacy root applications.md when there
  // is none; a new tracker goes where upstream's writers put it.
  if (existsSync(trackerPath(root))) return false;
  const path = resolveTrackerPathForWrite(resolveDataRoot(root));
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, EMPTY_TRACKER, { encoding: 'utf-8', flag: 'wx' });
  return true;
}
