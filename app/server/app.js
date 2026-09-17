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
 *
 * M3 adds the agent runs (evaluate, pdf, cover) behind the same `POST /api/runs`
 * — a kind plus a narrow option set — and one more write: a pasted URL into
 * the inbox, under upstream's own lock.
 *
 * M4 adds the skills gap analysis: one read joining everything the skills
 * layer knows, the extraction runs behind `POST /api/skills/extract`, and the
 * user's status overrides — all under `data/skills/`, which nothing upstream
 * reads.
 */

import { createReadStream, existsSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import fastifyStatic from '@fastify/static';
import Fastify from 'fastify';

import { resolveClaudeCommand } from './agents/claude-bin.js';
import { readProfile } from './agents/profile.js';
import { createRunner } from './queue/runner.js';
import { buildSpec, describeKinds, RUN_KINDS } from './queue/specs.js';
import { resolveReportCover } from './services/covers.js';
import { listCvTemplates, listWritingSamples, readStyle, readVoice, writeStyle, writeVoice } from './services/cvstyle.js';
import { appendInboxUrl, readInbox } from './services/inbox.js';
import { repoRoot, resolveDataRoot } from './services/paths.js';
import { readPipeline, SCORE_BANDS } from './services/pipeline.js';
import { createEntry, deleteEntry, readPortals, updateEntry } from './services/portals.js';
import { listReports, readReport, resolveReportPdf } from './services/reports.js';
import { readLastScanRun, readPortalHealth } from './services/scanner.js';
import { setStatus } from './services/status.js';
import { BATCH_SIZE, pendingLlm, readCv, readPostingsWithSkills, readSkillsOverview } from './skills/service.js';
import { writeOverride } from './skills/store.js';
import { createWatcher } from './watch.js';

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
 * @param {{root?: string, logger?: boolean|object, serveUi?: boolean, agent?: object, watch?: boolean}} [options] -
 *   `root` pins the data directory; omit to use upstream's resolution chain.
 *   `agent` overrides how the Claude Code CLI is spawned (tests point it at a
 *   fake); omit to look it up on PATH. `watch: false` skips the file watcher
 *   (tests that do not need it).
 * @returns {import('fastify').FastifyInstance}
 */
export function buildApp({ root, logger = false, serveUi = true, agent, watch = true } = {}) {
  const app = Fastify({ logger });

  // One runner per app instance, not a module singleton: each test file builds
  // its own app, and shared mutable run state across parallel test files would
  // be a flake generator.
  const runner = createRunner({ repoRoot, root });
  app.addHook('onClose', async () => runner.close());

  // The server-wide event feed: file changes under the data root and run
  // transitions from the queue, fanned out to every open `/api/events` socket.
  const subscribers = new Set();
  const broadcast = (event) => {
    for (const send of subscribers) {
      try {
        send(event);
      } catch {
        // A dead socket is cleaned up by its own close handler.
      }
    }
  };
  const unsubscribeRuns = runner.subscribeAll(broadcast);
  const watcher = watch
    ? createWatcher({
        root: resolveDataRoot(root),
        onChange: ({ paths, at }) => broadcast({ type: 'changed', paths, at }),
        log: (message) => app.log.warn(message),
      })
    : null;
  /** Open `/api/events` responses, ended on shutdown so nothing waits on a dead server. */
  const eventSockets = new Set();
  app.addHook('onClose', async () => {
    unsubscribeRuns();
    watcher?.close();
    subscribers.clear();
    for (const raw of eventSockets) {
      if (!raw.writableEnded) raw.end();
    }
    eventSockets.clear();
  });

  // Resolved once: the CLI does not move while the server runs, and an agent
  // run refused because the CLI is missing should say so at request time.
  const claude = agent ?? resolveClaudeCommand();
  const specContext = { root, repoRoot, agent: claude };

  // The built SPA is served by this same process, so M1's acceptance criterion
  // ("browse the pipeline without touching a terminal") is one command on one
  // port. In dev, Vite serves the app instead and proxies /api back here — so a
  // missing dist/ is normal, not an error.
  const spaBuilt = serveUi && existsSync(uiDist);
  if (spaBuilt) app.register(fastifyStatic, { root: uiDist });

  // Registered whichever mode we are in. An unknown /api path must be a JSON 404
  // in every configuration, not just the one where the SPA happens to be built —
  // otherwise a dev-mode client parsing Fastify's default 404 finds no `error`
  // key and reports the wrong thing. Only the SPA fallback is conditional.
  app.setNotFoundHandler((request, reply) => {
    if (!spaBuilt || request.url.startsWith('/api/')) {
      return reply.code(404).send({ error: 'Not found' });
    }
    // Client-side routes fall through to the shell so a deep link still loads.
    return reply.sendFile('index.html');
  });

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
    const cover = resolveReportCover(report.id, { root });
    return {
      ...report,
      cover: cover ? { path: cover.path, date: cover.date } : null,
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

  /** The cover letter PDF, tracked by the console rather than pdf-index.tsv (see services/covers.js). */
  app.get('/api/reports/:id/cover', async (request, reply) => {
    const cover = resolveReportCover(request.params.id, { root });
    if (!cover) return reply.code(404).send({ error: 'No cover letter for this report' });

    const { size } = await stat(cover.absolutePath);
    return reply
      .header('Content-Type', 'application/pdf')
      .header('Content-Length', size)
      .header('Content-Disposition', `inline; filename="${cover.fileName.replace(/["\r\n]/g, '')}"`)
      .send(createReadStream(cover.absolutePath));
  });

  // ── CV Studio: style tokens, voice rules, templates, samples ───────

  app.get('/api/cv/style', async () => readStyle({ root }));

  app.put('/api/cv/style', async (request, reply) => {
    try {
      const input = body(request);
      const saved = writeStyle({ root, style: input.style ?? input });
      return { ok: true, ...saved, ...readStyle({ root }) };
    } catch (error) {
      return fail(reply, error);
    }
  });

  app.get('/api/cv/voice', async () => readVoice({ root }));

  app.put('/api/cv/voice', async (request, reply) => {
    try {
      const input = body(request);
      return { ok: true, ...writeVoice({ root, text: input.text }) };
    } catch (error) {
      return fail(reply, error);
    }
  });

  app.get('/api/cv/templates', async () => listCvTemplates({ root }));

  app.get('/api/cv/writing-samples', async () => listWritingSamples({ root }));

  // ── the skills gap analysis (M4) ───────────────────────────────────

  /** Everything the Skills page shows: coverage, ranked skills with evidence, the lists. */
  app.get('/api/skills', async () => readSkillsOverview({ root }));

  /**
   * Queue the Claude extraction: one run per batch of postings the LLM has not
   * seen, plus the CV when its cached extraction is missing or stale. The
   * server picks the batches; the client only caps how many sessions to spend.
   */
  app.post('/api/skills/extract', async (request, reply) => {
    try {
      const input = body(request);
      const max = input.max === undefined ? 5 : Number(input.max);
      if (!Number.isInteger(max) || max < 0 || max > 50) {
        return reply.code(400).send({ error: 'max must be a whole number between 0 and 50', code: 'options-invalid' });
      }
      const pending = pendingLlm(readPostingsWithSkills({ root }));
      const batches = [];
      for (let i = 0; i < pending.length && batches.length < max; i += BATCH_SIZE) {
        batches.push(pending.slice(i, i + BATCH_SIZE).map((p) => p.id));
      }
      const runs = [];
      const skipped = [];
      for (const postingIds of batches) {
        try {
          runs.push(runner.start(buildSpec('skills-extract', { postingIds }, specContext)));
        } catch (error) {
          // The same batch already queued (a double click) is not a failure of the request.
          if (error.code !== 'run-busy') throw error;
          skipped.push(error.activeId);
        }
      }
      const cv = readCv({ root });
      let cvRun = null;
      if (input.cv !== false && cv.present && cv.engine !== 'llm') {
        try {
          cvRun = runner.start(buildSpec('skills-cv', {}, specContext));
        } catch (error) {
          if (error.code !== 'run-busy') throw error;
        }
      }
      return reply.code(202).send({
        ok: true,
        pending: pending.length,
        batches: batches.length,
        remaining: Math.max(0, pending.length - batches.length * BATCH_SIZE),
        runs,
        skipped,
        cv: cvRun,
      });
    } catch (error) {
      return fail(reply, error);
    }
  });

  /** `{ id, status }` with status have | partial | missing | ignore, or null to clear. */
  app.put('/api/skills/overrides', async (request, reply) => {
    try {
      const input = body(request);
      if (typeof input.id !== 'string' || !input.id) {
        return reply.code(400).send({ error: 'id must be a skill id', code: 'options-invalid' });
      }
      const status = input.status === null || input.status === undefined ? null : input.status;
      let overrides;
      try {
        overrides = writeOverride({ root: resolveDataRoot(root), id: input.id, status });
      } catch (error) {
        if (error instanceof TypeError) return reply.code(400).send({ error: error.message, code: 'options-invalid' });
        throw error;
      }
      return { ok: true, overrides };
    } catch (error) {
      return fail(reply, error);
    }
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

  /**
   * Paste a URL. With `evaluate: true` the evaluation is queued in the same
   * request, which is the milestone's headline path: one paste, one click.
   * A URL that is already in the inbox is not an error — the run still starts.
   */
  app.post('/api/inbox/urls', async (request, reply) => {
    try {
      const input = body(request);
      const added = await appendInboxUrl({
        root,
        url: input.url,
        company: input.company,
        title: input.title,
        note: input.note,
      });
      let run = null;
      if (input.evaluate === true) {
        const spec = buildSpec('evaluate', { url: input.url, autoPdf: input.autoPdf !== false }, specContext);
        run = runner.start(spec);
      }
      return reply.code(201).send({ ok: true, ...added, run });
    } catch (error) {
      return fail(reply, error);
    }
  });

  // ── the agent ──────────────────────────────────────────────────────

  /** Whether agent runs can work at all, for the UI to enable its buttons honestly. */
  app.get('/api/agent/status', async () => {
    const dataRoot = resolveDataRoot(root);
    const profile = readProfile({ root: dataRoot });
    return {
      bin: { display: claude.display, source: claude.source, found: claude.found, shell: claude.shell },
      maxAgents: Number.parseInt(process.env.JSC_MAX_AGENTS ?? '', 10) || 2,
      profile: {
        exists: profile.exists,
        error: profile.error,
        spendTier: profile.spendTier,
        autoPdfThreshold: profile.autoPdfThreshold,
        language: profile.language,
        hasStyle: profile.hasStyle,
        hasCvSections: profile.hasCvSections,
      },
      cvPresent: existsSync(join(dataRoot, 'cv.md')),
      voiceDnaPresent: existsSync(join(dataRoot, 'voice-dna.md')),
    };
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
      const spec = buildSpec(input.kind, input.options ?? {}, specContext);
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

  /**
   * Everything the UI needs to stay current without polling: `changed` when a
   * file under reports/, output/ or data/ was written (by a run here, an
   * upstream script, or a Claude Code session in the same directory), and
   * `run` on every queue transition.
   */
  app.get('/api/events', (request, reply) => {
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    const send = (event) => {
      if (reply.raw.writableEnded) return;
      reply.raw.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
    };
    subscribers.add(send);
    eventSockets.add(reply.raw);
    // The current queue, so a client that connects late does not wait for the
    // next transition to learn what is running.
    send({ type: 'hello', runs: runner.list(), watching: watcher?.watching() ?? [], at: Date.now() });

    const heartbeat = setInterval(() => {
      if (!reply.raw.writableEnded) reply.raw.write(': ping\n\n');
    }, 15_000);
    const gone = () => {
      clearInterval(heartbeat);
      subscribers.delete(send);
      eventSockets.delete(reply.raw);
    };
    request.raw.on('close', gone);
    reply.raw.on('finish', gone);

    reply.hijack();
    return reply;
  });

  /** The structured result of the last scan, from `data/scan-runs.tsv`. */
  app.get('/api/scan/summary', async () => ({ lastRun: readLastScanRun({ root }) }));

  return app;
}

export { RUN_KINDS };
