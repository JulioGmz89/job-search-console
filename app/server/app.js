/**
 * app.js — the REST surface over the service seam.
 *
 * M1 is read-only (PROJECT_PLAN.md §8): every route here is a GET, and nothing
 * in this file writes to the user's files. Status changes arrive in M2.
 *
 * The routes are deliberately thin. All format knowledge lives in services/;
 * this file only shapes responses and turns "not found" into a 404.
 */

import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';

import Fastify from 'fastify';

import { readPipeline, SCORE_BANDS } from './services/pipeline.js';
import { listReports, readReport, resolveReportPdf } from './services/reports.js';

/**
 * Build the Fastify instance.
 *
 * Exported unstarted so tests can drive it with `app.inject()` — no socket, no
 * port collisions when suites run in parallel.
 *
 * @param {{root?: string, logger?: boolean|object}} [options] - `root` pins the
 *   data directory; omit to use upstream's resolution chain.
 * @returns {import('fastify').FastifyInstance}
 */
export function buildApp({ root, logger = false } = {}) {
  const app = Fastify({ logger });

  /**
   * Join the tracker to the reports once per request.
   *
   * Deliberately not cached: the whole point of M1 is that a Claude Code session
   * in the same directory can write a report and the dashboard shows it on
   * reload. Parsing 33 markdown files takes a few milliseconds; a cache here
   * would buy nothing and go stale exactly when it matters. (M3 adds file
   * watching for push updates.)
   */
  const load = () => {
    const pipeline = readPipeline({ root });
    const { reports, issues: reportIssues } = listReports({ root });
    const byId = new Map(reports.map((r) => [r.id, r]));

    const rows = pipeline.rows.map((row) => {
      const report = byId.get(row.reportId) ?? null;
      return {
        ...row,
        // rawLine is an implementation detail for M2's write-back path; it has
        // no business crossing the wire.
        rawLine: undefined,
        report: report
          ? {
              id: report.id,
              url: report.url,
              decision: report.machine?.decision ?? null,
              legitimacy: report.machine?.legitimacy ?? null,
              risk: report.machine?.risk ?? null,
              confidence: report.machine?.confidence ?? null,
              advertisedComp: report.machine?.advertisedComp ?? null,
              hardStopCount: report.machine?.hardStops.length ?? 0,
              softGapCount: report.machine?.softGaps.length ?? 0,
            }
          : null,
        hasReport: report !== null,
        pdf: report?.pdf?.exists ? { format: report.pdf.format } : null,
      };
    });

    const issues = [...pipeline.issues, ...reportIssues];
    // A tracker row pointing at a report that was never written is drift worth
    // showing, not a silent null in the table.
    for (const row of pipeline.rows) {
      if (!byId.has(row.reportId)) {
        issues.push({
          level: 'warn',
          code: 'report-missing',
          id: row.id,
          message: `Row ${row.id} references report ${row.reportId}, which is not on disk`,
        });
      }
    }

    return { pipeline, reports, rows, issues };
  };

  app.get('/api/health', async () => {
    const { pipeline, reports, rows, issues } = load();
    return {
      ok: issues.filter((i) => i.level === 'error').length === 0,
      dataRoot: pipeline.trackerPath.replace(/[/\\]data[/\\]applications\.md$/, ''),
      trackerPath: pipeline.trackerPath,
      counts: {
        rows: rows.length,
        reports: reports.length,
        pdfs: reports.filter((r) => r.pdf?.exists).length,
        issues: issues.length,
      },
      issues,
    };
  });

  app.get('/api/pipeline', async () => {
    const { pipeline, rows, issues } = load();
    return {
      rows,
      issues,
      statuses: pipeline.statuses.map((s) => ({
        id: s.id,
        label: s.label,
        group: s.dashboard_group ?? null,
        terminal: s.terminal === true,
      })),
      scoreBands: SCORE_BANDS.map((b) => ({ id: b.id, label: b.label })),
    };
  });

  app.get('/api/reports', async () => {
    const { reports, issues } = load();
    return { reports, issues };
  });

  app.get('/api/reports/:id', async (request, reply) => {
    const report = readReport(request.params.id, { root });
    if (!report) return reply.code(404).send({ error: 'No such report' });

    // The row carries tracker-only facts (status, applied date in notes) that
    // the report file itself does not know about.
    const row = readPipeline({ root }).rows.find((r) => r.reportId === report.id) ?? null;
    return {
      ...report,
      tracker: row
        ? { id: row.id, status: row.status, statusId: row.statusId, date: row.date, notes: row.notes }
        : null,
    };
  });

  app.get('/api/reports/:id/pdf', async (request, reply) => {
    const pdf = resolveReportPdf(request.params.id, { root });
    if (!pdf) return reply.code(404).send({ error: 'No PDF for this report' });

    const { size } = await stat(pdf.absolutePath);
    return reply
      .header('Content-Type', 'application/pdf')
      .header('Content-Length', size)
      // `inline` so the browser's own viewer renders it in the preview pane.
      // The filename is basename()d from a path already proven to sit inside
      // output/, and quotes are stripped so it cannot break out of the header.
      .header('Content-Disposition', `inline; filename="${pdf.fileName.replace(/["\r\n]/g, '')}"`)
      .send(createReadStream(pdf.absolutePath));
  });

  return app;
}
