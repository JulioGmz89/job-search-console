/**
 * app.js — the REST surface over the service seam.
 *
 * The routes are deliberately thin. All format knowledge lives in services/;
 * this file only shapes responses, turns "not found" into a 404, and maps the
 * services' typed refusals onto status codes.
 *
 * M2 adds the first writes (PROJECT_PLAN.md §8). Three rules hold for all of
 * them, and each is enforced a layer down rather than here:
 *   - Nothing this server writes is written by hand. Tracker edits go through
 *     upstream's `set-status.mjs`; portals.yml is edited surgically and then
 *     re-validated by upstream's own `validate-portals.mjs`.
 *   - The client never names a command. It names a run *kind* from
 *     `queue/specs.js`, which rebuilds every argument from constants.
 *   - Anything that rewrites the tracker needs a successful dry run first.
 */

import { createReadStream, existsSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import fastifyStatic from '@fastify/static';
import Fastify from 'fastify';

import { createRunner } from './queue/runner.js';
import { buildSpec, describeKinds, RUN_KINDS } from './queue/specs.js';
import { readInbox } from './services/inbox.js';
import { repoRoot } from './services/paths.js';
import { readPipeline, SCORE_BANDS } from './services/pipeline.js';
import { createEntry, deleteEntry, readPortals, updateEntry } from './services/portals.js';
import { listReports, readReport, resolveReportPdf } from './services/reports.js';
import { readLastScanRun, readPortalHealth } from './services/scanner.js';
import { setStatus } from './services/status.js';

const uiDist = join(dirname(fileURLToPath(import.meta.url)), '..', 'ui', 'dist');

/**
 * Turn a service's typed refusal into a response.
 *
 * The services carry their own `status`/`code` because they are the layer that
 * knows *why* something was refused — a stale etag is a 409, an unscannable
 * entry is a 400, a held tracker lock is a 503. Anything without a status is a
 * genuine fault and is rethrown for Fastify to log and turn into a 500.
 */
function fail(reply, error) {
  if (typeof error?.status !== 'number') throw error;
  return reply.code(error.status).send({
    error: error.message,
    code: error.code,
    ...(error.detail === undefined ? {} : { detail: error.detail }),
  });
}

/** Request bodies are user input from a browser; treat a non-object as a 400, not a crash. */
function body(request) {
  const value = request.body;
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    const error = new Error('Expected a JSON object body');
    error.status = 400;
    error.code = 'body-invalid';
    throw error;
  }
  return value;
}

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
export function buildApp({ root, logger = false, serveUi = true } = {}) {
  const app = Fastify({ logger });

  // One runner per app instance, not a module singleton: each test file builds
  // its own app, and shared mutable run state across parallel test files would
  // be a flake generator.
  const runner = createRunner({ repoRoot, root });
  app.addHook('onClose', async () => runner.close());

  // The built SPA is served by this same process, so M1's acceptance criterion
  // ("browse the pipeline without touching a terminal") is one command on one
  // port. In dev, Vite serves the app instead and proxies /api back here — so a
  // missing dist/ is normal, not an error.
  if (serveUi && existsSync(uiDist)) {
    app.register(fastifyStatic, { root: uiDist });
    // Client-side routes must fall through to index.html, but a mistyped /api
    // path has to stay a JSON 404 rather than silently returning the SPA shell.
    app.setNotFoundHandler((request, reply) => {
      if (request.url.startsWith('/api/')) return reply.code(404).send({ error: 'Not found' });
      return reply.sendFile('index.html');
    });
  }

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

  // ── inline status changes ──────────────────────────────────────────

  app.patch('/api/pipeline/rows/:id/status', async (request, reply) => {
    try {
      const input = body(request);
      const result = await setStatus({
        rowId: request.params.id,
        statusId: input.statusId,
        note: input.note,
        on: input.on,
        root,
      });
      return { ok: true, result };
    } catch (error) {
      return fail(reply, error);
    }
  });

  // ── the URL inbox ──────────────────────────────────────────────────

  app.get('/api/inbox', async () => {
    const inbox = readInbox({ root });
    return { ...inbox, lastScan: readLastScanRun({ root }) };
  });

  // ── portals ────────────────────────────────────────────────────────

  app.get('/api/portals', async () => ({
    ...readPortals({ root }),
    health: readPortalHealth({ root }),
  }));

  app.post('/api/portals/entries', async (request, reply) => {
    try {
      const input = body(request);
      const result = createEntry({ root, kind: input.kind, entry: input.entry, etag: input.etag });
      return reply.code(201).send({ ok: true, ...result });
    } catch (error) {
      return fail(reply, error);
    }
  });

  app.patch('/api/portals/entries/:kind/:index', async (request, reply) => {
    try {
      const input = body(request);
      return {
        ok: true,
        ...updateEntry({
          root,
          kind: request.params.kind,
          index: Number(request.params.index),
          // The name is the client's checksum on the index: indices shift when
          // an entry is deleted, and a stale one must fail rather than edit the
          // neighbouring company.
          name: input.name,
          entry: input.entry,
          etag: input.etag,
        }),
      };
    } catch (error) {
      return fail(reply, error);
    }
  });

  app.delete('/api/portals/entries/:kind/:index', async (request, reply) => {
    try {
      const input = body(request);
      return {
        ok: true,
        ...deleteEntry({
          root,
          kind: request.params.kind,
          index: Number(request.params.index),
          name: input.name,
          etag: input.etag,
        }),
      };
    } catch (error) {
      return fail(reply, error);
    }
  });

  // ── runs ───────────────────────────────────────────────────────────

  app.get('/api/runs', async () => ({ ...runner.list(), kinds: describeKinds() }));

  app.post('/api/runs', async (request, reply) => {
    try {
      const input = body(request);
      const spec = buildSpec(input.kind, input.options ?? {});
      // Burn the confirmation before spawning: if the token is bad, nothing has
      // run, and a valid token can never authorise a second write.
      if (spec.confirmRequired) runner.consumeConfirmation(input.confirmToken, spec.kind);
      return reply.code(202).send(runner.start(spec));
    } catch (error) {
      return fail(reply, error);
    }
  });

  app.get('/api/runs/:id', async (request, reply) => {
    const run = runner.get(request.params.id);
    if (!run) return reply.code(404).send({ error: 'No such run' });
    return run;
  });

  app.post('/api/runs/:id/cancel', async (request, reply) => {
    try {
      return reply.code(202).send(runner.cancel(request.params.id));
    } catch (error) {
      return fail(reply, error);
    }
  });

  /**
   * Live output for one run.
   *
   * `subscribe` replays everything captured so far before the first live event,
   * so a reconnecting browser sees the whole log rather than joining halfway
   * through — which matters most for `scan.mjs`, whose fetch sweep is silent for
   * a long stretch and then prints its entire summary at once.
   */
  app.get('/api/runs/:id/events', (request, reply) => {
    if (!runner.get(request.params.id)) {
      return reply.code(404).send({ error: 'No such run' });
    }

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      // Neither the Vite dev proxy nor any local reverse proxy may buffer this;
      // a buffered event stream is an empty log pane until the run ends.
      'X-Accel-Buffering': 'no',
    });

    const send = (event) => {
      if (reply.raw.writableEnded) return;
      reply.raw.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
      if (event.type === 'done') reply.raw.end();
    };

    const unsubscribe = runner.subscribe(request.params.id, send);
    // Comment frames keep intermediaries from timing the connection out during
    // the sweep, when a real scan can print nothing for minutes.
    const heartbeat = setInterval(() => {
      if (!reply.raw.writableEnded) reply.raw.write(': ping\n\n');
    }, 15_000);

    request.raw.on('close', () => {
      clearInterval(heartbeat);
      unsubscribe();
    });
    reply.raw.on('finish', () => clearInterval(heartbeat));

    reply.hijack();
    return reply;
  });

  /** The structured result of the last scan, from `data/scan-runs.tsv`. */
  app.get('/api/scan/summary', async () => ({ lastRun: readLastScanRun({ root }) }));

  return app;
}

export { RUN_KINDS };
