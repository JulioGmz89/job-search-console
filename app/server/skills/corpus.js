/**
 * corpus.js — which postings the skills analysis is about.
 *
 * Nothing upstream keeps a single list of "every posting the scanner found".
 * Three files each hold part of it, and this module joins them into one
 * URL-keyed universe (PROJECT_PLAN.md §6 step 1 needs a posting to extract from,
 * step 3 needs its score and when it was first seen):
 *
 *   - `data/scan-history.tsv` — every URL the scanner ever recorded, with
 *     `first_seen`, which is the only time axis there is for the trend.
 *     Rows the scanner filtered out (`skipped_title`, `skipped_expired`) are not
 *     jobs the user is looking at and are left out.
 *   - `data/pipeline.md` — the inbox: pasted URLs (never scanned) and the
 *     processed section's report numbers.
 *   - the tracker + `reports/` — evaluated postings carry a report id and a
 *     score, which is what turns raw demand into "demand among jobs I'd take".
 *
 * Upstream's `normalizeUrl` is the join key, as it is for upstream's own dedup.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { normalizeUrl } from '../../../url-key.mjs';
import { readInbox } from '../services/inbox.js';
import { resolveDataRoot } from '../services/paths.js';
import { readPipeline } from '../services/pipeline.js';
import { listReports } from '../services/reports.js';
import { postingId } from './store.js';

/** Scan-history statuses that mean "this posting reached the inbox". */
const KEPT_STATUSES = new Set(['added', 'dupe', 'duplicate']);

/** Where `scan.mjs` writes the history: an env override, else under the data root (scan.mjs:85). */
export function scanHistoryPath(root) {
  if (!root && process.env.CAREER_OPS_SCAN_HISTORY) return process.env.CAREER_OPS_SCAN_HISTORY;
  return join(resolveDataRoot(root), 'data', 'scan-history.tsv');
}

/**
 * Read `scan-history.tsv` by header name. The header has grown over upstream's
 * releases (a file started by an older scanner has seven columns while rows
 * appended by a newer one carry twelve), so cells past the header are ignored
 * and missing ones read as null rather than shifting their neighbours.
 */
export function readScanHistory({ root } = {}) {
  let text;
  try {
    text = readFileSync(scanHistoryPath(root), 'utf-8');
  } catch {
    return [];
  }
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '');
  if (lines.length < 2) return [];
  const header = lines[0].split('\t').map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = line.split('\t');
    return Object.fromEntries(header.map((key, i) => [key, cells[i] === undefined || cells[i] === '' ? null : cells[i]]));
  });
}

const dateOnly = (value) => (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : null);

/**
 * @typedef {object} CorpusPosting
 * @property {string} id - `postingId(url)`.
 * @property {string} url - The first spelling of the URL seen.
 * @property {string|null} company
 * @property {string|null} title
 * @property {string|null} location
 * @property {string|null} firstSeen - YYYY-MM-DD; from scan history, else the tracker date.
 * @property {string|null} portal - Scanner source label.
 * @property {number|null} reportId
 * @property {number|null} score
 * @property {string[]} sources - Which files mention it: `scan`, `inbox`, `tracker`.
 */

/**
 * The posting universe.
 *
 * @param {{root?: string}} [options]
 * @returns {{postings: CorpusPosting[], byId: Map<string, CorpusPosting>, counts: {scan: number, inbox: number, tracker: number}}}
 */
export function readCorpus({ root } = {}) {
  /** @type {Map<string, CorpusPosting>} */
  const byId = new Map();
  const counts = { scan: 0, inbox: 0, tracker: 0 };

  const upsert = (url, fields, source) => {
    const id = postingId(url);
    if (!id) return null;
    let entry = byId.get(id);
    if (!entry) {
      entry = { id, url: normalizeUrl(url), company: null, title: null, location: null, firstSeen: null, portal: null, reportId: null, score: null, sources: [] };
      byId.set(id, entry);
    }
    for (const [key, value] of Object.entries(fields)) {
      if (value === null || value === undefined || value === '') continue;
      // First value wins for descriptive fields; the tracker's report id and
      // score are authoritative wherever they come from.
      if (entry[key] === null || key === 'reportId' || key === 'score') entry[key] = value;
    }
    if (!entry.sources.includes(source)) {
      entry.sources.push(source);
      counts[source] += 1;
    }
    return entry;
  };

  for (const row of readScanHistory({ root })) {
    if (!row.url) continue;
    if (row.status && !KEPT_STATUSES.has(row.status)) continue;
    upsert(row.url, { company: row.company, title: row.title, location: row.location, firstSeen: dateOnly(row.first_seen), portal: row.portal }, 'scan');
  }

  const inbox = readInbox({ root });
  for (const row of inbox.pending) {
    upsert(row.url, { company: row.company, title: row.title, location: row.location }, 'inbox');
  }
  for (const row of inbox.processed) {
    if (!row.url) continue;
    upsert(row.url, { company: row.company, title: row.role, reportId: row.reportId, score: row.score }, 'inbox');
  }

  // Reports carry the URL; the tracker carries the score and the date. Join
  // them through the report id the way the dashboard does.
  const { reports } = listReports({ root });
  const rows = readPipeline({ root }).rows;
  const rowByReport = new Map(rows.map((r) => [r.reportId, r]));
  for (const report of reports) {
    if (!report.url) continue;
    const row = rowByReport.get(report.id) ?? null;
    const score = row?.score ?? report.machine?.score ?? null;
    upsert(
      report.url,
      {
        company: report.machine?.company ?? row?.company ?? null,
        title: report.machine?.role ?? row?.role ?? null,
        location: row?.location ?? null,
        firstSeen: dateOnly(row?.date) ?? dateOnly(report.date),
        reportId: report.id,
        score: typeof score === 'number' ? score : null,
      },
      'tracker',
    );
  }

  const postings = [...byId.values()].sort((a, b) => (b.firstSeen ?? '').localeCompare(a.firstSeen ?? '') || a.url.localeCompare(b.url));
  return { postings, byId, counts };
}
