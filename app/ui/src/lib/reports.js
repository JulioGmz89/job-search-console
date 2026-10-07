/** reports.js — which fit reports have no home in Applications (R-reports-list). */

import { sameLink } from './labels.js';

/**
 * Reports no Applications row points at, leaving out earlier checks of a job
 * that is in Applications (a re-check points the row at the newest report).
 * Newest first.
 *
 * @param {object[]} reports - `/api/reports` entries.
 * @param {object[]} rows - pipeline rows.
 */
export function reportsNotInApplications(reports = [], rows = []) {
  const used = new Set(rows.map((r) => r.reportId));
  return reports
    .filter((rep) => !used.has(rep.id) && !rows.some((r) => sameLink(r.report?.url, rep.url)))
    .sort((a, b) => b.id - a.id);
}
