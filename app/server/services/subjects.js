/**
 * subjects.js — what a run is about, in the user's terms (ia.md §2.8, F-009).
 *
 * Runs used to be named after the board host ("Evaluate job-boards.greenhouse.io"),
 * which is the same for every Greenhouse job. A run's meta carries a URL or a
 * report number; this resolves either to "Company — Role" from the inbox or the
 * report, the same names the rest of the UI uses. Null when nothing names it:
 * the UI then falls back to the kind's own label.
 */

import { readInbox } from './inbox.js';
import { listReports, readReport } from './reports.js';

const job = (company, role) => (company ? (role ? `${company} — ${role}` : company) : null);

/**
 * @param {{meta?: object}} spec - A built run spec (or run record).
 * @param {{root?: string}} [options]
 * @returns {string|null}
 */
export function subjectFor(spec, { root } = {}) {
  const meta = spec?.meta ?? {};
  const reportId = meta.reportId ?? meta.reportNum ?? null;
  if (reportId !== null && reportId !== undefined) {
    const report = readReport(reportId, { root, html: false });
    const named = job(report?.machine?.company, report?.machine?.role);
    if (named) return named;
  }
  if (typeof meta.url === 'string') {
    const inbox = readInbox({ root });
    const pending = inbox.pending.find((item) => item.url === meta.url);
    if (pending?.company) return job(pending.company, pending.title);
    const processed = inbox.processed.find((item) => item.url === meta.url);
    if (processed?.company) return job(processed.company, processed.role);
    const report = listReports({ root }).reports.find((r) => r.url === meta.url);
    const named = job(report?.machine?.company, report?.machine?.role);
    if (named) return named;
  }
  return null;
}
