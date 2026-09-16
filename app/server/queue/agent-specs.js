/**
 * agent-specs.js — the run kinds that spawn a headless Claude Code session.
 *
 * Each builder returns a spec for `runner.start()`. The work that must happen
 * right before the process exists — reserving a report number, writing the
 * prompt file — lives in the `before` hook so a run that waits in the queue
 * for minutes does not hold a number the whole time. The `after` hook is the
 * verifier: an agent that exits 0 without writing what it was asked to write
 * is a failed run, and a chain (merge the tracker, reconcile the inbox, render
 * the PDF) only continues from a verified success.
 *
 * Nothing here trusts the agent's prose. Success is a file on disk.
 */

import { appendFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { dirname, isAbsolute, join, relative } from 'node:path';

import { loadStyle, resolveTemplatePath } from '../../cv/theme.js';
import { modelFor } from '../agents/claude-bin.js';
import { readProfile } from '../agents/profile.js';
import { assemblePrompt, writePromptFile } from '../agents/prompts/assemble.js';
import { agentLogPath, createAgentCommand, TIMEOUTS } from '../agents/runner.js';
import { createStreamParser } from '../agents/stream-json.js';
import { upsertBatchState } from '../services/batch-state.js';
import { recordCover } from '../services/covers.js';
import { validateInboxUrl } from '../services/inbox.js';
import { resolveDataRoot } from '../services/paths.js';
import { releaseReportNumber, removeStrayAdditions, reserveReportNumber } from '../services/report-numbers.js';
import { indexReportFiles, readReport, resolveReportPdf } from '../services/reports.js';
import { internalSpec, SpecError } from './specs.js';

const today = () => new Date().toISOString().slice(0, 10);
const iso = (ms) => new Date(ms ?? Date.now()).toISOString();

/** Refuse at request time — before anything is queued — when the run cannot possibly work. */
export function requireAgent(agent) {
  if (!agent?.found) {
    throw new SpecError(
      `Claude Code CLI not found (looked for "${agent?.display ?? 'claude'}") — install it or set JSC_CLAUDE_BIN`,
      { code: 'agent-missing', status: 503 },
    );
  }
}

export function requireCv(root) {
  if (!existsSync(join(resolveDataRoot(root), 'cv.md'))) {
    throw new SpecError('No cv.md in the data directory — add your CV before evaluating', { code: 'cv-missing' });
  }
}

/**
 * The per-run wiring shared by every agent kind: a stream-json parser, a
 * mirror of the raw stream to `data/jsc/logs/<run>.jsonl`, and the model.
 */
export function agentPlumbing({ root, model }) {
  const dataRoot = resolveDataRoot(root);
  const parser = createStreamParser();
  const profile = readProfile({ root: dataRoot });
  const chosenModel = modelFor({ spendTier: profile.spendTier, override: model });

  const mirror = (run, text) => {
    try {
      const path = agentLogPath(dataRoot, run.id);
      if (!run.meta.logPath) {
        mkdirSync(dirname(path), { recursive: true });
        run.meta.logPath = path;
      }
      appendFileSync(path, `${text}\n`);
    } catch {
      // A missing log is a debugging inconvenience, never a failed run.
    }
  };

  return {
    dataRoot,
    profile,
    model: chosenModel,
    parseLine(text, stream, run) {
      if (stream !== 'stdout') return null;
      mirror(run, text);
      return parser.parse(text);
    },
    flush(record) {
      const rest = parser.flush();
      if (rest) record(rest);
    },
  };
}

/** `run.result` when the CLI reported a failure of its own. */
export const agentError = (run) => (run.result?.isError ? run.result.error ?? 'Claude reported an error' : null);

// ── evaluate ─────────────────────────────────────────────────────────

/**
 * Evaluate one job URL: A–G report + tracker row (+ PDF when the score earns it).
 *
 * @param {{url: string, autoPdf?: boolean, model?: string|null}} options
 * @param {{root?: string, repoRoot: string, agent: object}} ctx
 */
export function buildEvaluateSpec({ url, autoPdf = true, model = null } = {}, { root, repoRoot, agent } = {}) {
  requireAgent(agent);
  requireCv(root);
  const clean = validateInboxUrl(url);
  if (model !== null && (typeof model !== 'string' || model.length > 80)) {
    throw new SpecError('model must be a short string', { code: 'options-invalid' });
  }
  const plumbing = agentPlumbing({ root, model });
  const { dataRoot } = plumbing;
  let before = null;

  return {
    kind: 'evaluate',
    label: `Evaluate ${new URL(clean).hostname}`,
    args: [],
    dryRun: false,
    writes: true,
    confirmRequired: false,
    reportsFindings: false,
    lane: 'agent',
    exclusive: false,
    dedupeKey: `evaluate:${clean}`,
    timeoutMs: TIMEOUTS.evaluate,
    meta: { url: clean, autoPdf: autoPdf !== false, model: plumbing.model },
    hooks: {
      async before(run) {
        before = new Set(indexReportFiles(dataRoot).keys());
        const reportNum = await reserveReportNumber({ root: dataRoot });
        const date = today();
        let prompt;
        try {
          prompt = assemblePrompt({
            mode: 'evaluate',
            repoRoot,
            root: dataRoot,
            vars: { URL: clean, REPORT_NUM: reportNum, DATE: date },
          });
        } catch (error) {
          // The number is ours until released; do not leak it on a prompt bug.
          await releaseReportNumber({ root: dataRoot, num: reportNum });
          throw error;
        }
        const promptPath = writePromptFile({ root: dataRoot, runId: run.id, text: prompt.system });
        const command = createAgentCommand({
          bin: agent,
          userPrompt: `Evaluate this job posting. URL: ${clean} — report number ${reportNum} — date ${date}. Follow the "Headless run" section of your instructions.`,
          systemPromptPath: promptPath,
          model: plumbing.model,
          cwd: repoRoot,
        });
        return {
          command,
          meta: { reportNum, date, promptPath },
          lines: [
            ...prompt.warnings.map((w) => `⚠ ${w}`),
            `Reserved report number ${reportNum}`,
            `Prompt: ${prompt.sections.join(' + ')}${plumbing.model ? ` · model ${plumbing.model}` : ''}`,
          ],
        };
      },

      parseLine: plumbing.parseLine,

      async after(run, { provisional, record }) {
        plumbing.flush(record);
        const num = run.meta.reportNum;
        if (!num) return {};

        const releaseError = await releaseReportNumber({ root: dataRoot, num });
        if (releaseError) record(`Could not release report number ${num}: ${releaseError}`, 'stderr');

        if (provisional.status === 'cancelled') {
          const removed = removeStrayAdditions({ root: dataRoot, num });
          if (removed.length) record(`Removed unmerged tracker addition: ${removed.join(', ')}`);
          return {};
        }

        const after = indexReportFiles(dataRoot);
        const written = after.get(Number.parseInt(num, 10)) ?? null;
        const strays = [...after.keys()].filter((id) => !before?.has(id) && id !== Number.parseInt(num, 10));

        let error = null;
        if (provisional.status !== 'succeeded') error = provisional.error ?? `claude exited with code ${provisional.exitCode}`;
        else if (agentError(run)) error = agentError(run);
        else if (!written) {
          error = strays.length
            ? `the agent wrote reports/${after.get(strays[0])} instead of report ${num}`
            : `the agent exited without writing reports/${num}-*.md`;
        }

        if (error) {
          const removed = removeStrayAdditions({ root: dataRoot, num });
          if (removed.length) record(`Removed unmerged tracker addition: ${removed.join(', ')}`);
          return { status: 'failed', error };
        }

        const report = readReport(num, { root: dataRoot, html: false });
        const score = typeof report?.machine?.score === 'number' ? report.machine.score : null;
        upsertBatchState({
          root: dataRoot,
          row: {
            id: `jsc-${run.id}`,
            url: clean,
            status: 'completed',
            startedAt: iso(run.startedAt),
            completedAt: iso(),
            reportNum: num,
            score: score ?? '-',
          },
        });
        record(`Report written: reports/${written}${score === null ? '' : ` · score ${score}/5`}`);

        const next = [internalSpec('merge-tracker', { root, repoRoot })];
        const threshold = plumbing.profile.autoPdfThreshold;
        if (run.meta.autoPdf && score !== null && score >= threshold) {
          try {
            next.push(buildPdfSpec({ reportId: num }, { root, repoRoot, agent }));
            record(`Score ${score} ≥ ${threshold}: queuing the tailored PDF`);
          } catch (e) {
            record(`Not queuing a PDF: ${e.message}`, 'stderr');
          }
        } else if (run.meta.autoPdf && score !== null) {
          record(`Score ${score} < ${threshold}: no PDF queued (generate one from the report if you want it)`);
        }

        return {
          result: {
            ...(run.result ?? {}),
            reportId: report?.id ?? Number.parseInt(num, 10),
            score,
            company: report?.machine?.company ?? null,
            role: report?.machine?.role ?? null,
          },
          next,
        };
      },
    },
  };
}

// ── pdf, cover ───────────────────────────────────────────────────────

/** A path for the prompt: relative to the repository when it sits inside it, else absolute. */
export function promptPath(repoRoot, path) {
  const rel = relative(repoRoot, path);
  return rel && !rel.startsWith('..') && !isAbsolute(rel) ? rel.replace(/\\/g, '/') : path;
}

/** The report an agent run works from, plus the identifiers derived from its filename. */
function requireReport(reportId, dataRoot) {
  const id = Number.parseInt(reportId, 10);
  if (!Number.isInteger(id) || id < 0) throw new SpecError('reportId must be a report number', { code: 'options-invalid' });
  const report = readReport(id, { root: dataRoot, html: false });
  if (!report) throw new SpecError(`No report ${reportId}`, { code: 'report-missing', status: 404 });
  const num = String(id).padStart(3, '0');
  const slug = /^\d+-(.+)-\d{4}-\d{2}-\d{2}\.md$/.exec(report.fileName)?.[1] ?? /^\d+-(.+)\.md$/.exec(report.fileName)?.[1] ?? `report-${num}`;
  return { report, id, num, slug, path: `reports/${report.fileName}` };
}

/** A file written (or rewritten) since the run started, i.e. by this run. */
const freshFile = (path, since) => existsSync(path) && statSync(path).mtimeMs >= since - 2_000;

/** Paper size from the profile's country, the way modes/pdf.md step 6 decides it. */
function paperFormat(profile, requested) {
  if (requested === 'letter' || requested === 'a4') return requested;
  if (requested) throw new SpecError('format must be letter or a4', { code: 'options-invalid' });
  return /united states|\busa?\b|canada/i.test(profile.country ?? '') ? 'letter' : 'a4';
}

/**
 * Tailored CV PDF for an existing report (modes/pdf.md, headless).
 *
 * @param {{reportId: number|string, format?: 'letter'|'a4', model?: string|null}} options
 * @param {{root?: string, repoRoot: string, agent: object}} ctx
 */
export function buildPdfSpec({ reportId, format = null, model = null } = {}, { root, repoRoot, agent } = {}) {
  requireAgent(agent);
  requireCv(root);
  const plumbing = agentPlumbing({ root, model });
  const { dataRoot, profile } = plumbing;
  const { report, id, num, slug, path: reportPath } = requireReport(reportId, dataRoot);
  const paper = paperFormat(profile, format);
  const candidate = profile.candidateSlug ?? 'candidate';

  return {
    kind: 'pdf',
    label: `PDF for ${report.machine?.company ?? `report ${num}`}`,
    args: [],
    dryRun: false,
    writes: true,
    confirmRequired: false,
    reportsFindings: false,
    lane: 'agent',
    exclusive: false,
    dedupeKey: `pdf:${num}`,
    timeoutMs: TIMEOUTS.pdf,
    meta: { reportId: id, reportNum: num, company: report.machine?.company ?? null, slug, format: paper, model: plumbing.model },
    hooks: {
      async before(run) {
        const date = today();
        const style = loadStyle({ root: dataRoot });
        const template = resolveTemplatePath(style.style, { root: dataRoot, repoRoot });
        const vars = {
          REPORT_PATH: reportPath,
          REPORT_NUM: num,
          URL: report.url ?? '(no URL in the report header)',
          DATE: date,
          CANDIDATE: candidate,
          COMPANY_SLUG: slug,
          FORMAT: paper,
          PAYLOAD_PATH: promptPath(repoRoot, join(dataRoot, 'data', 'jsc', 'tmp', `cv-${run.id}.json`)),
          CV_HTML_PATH: `output/cv-${candidate}-${slug}.html`,
          CV_PDF_PATH: `output/cv-${candidate}-${slug}-${date}.pdf`,
          TEMPLATE_PATH: promptPath(repoRoot, template.path),
        };
        const prompt = assemblePrompt({ mode: 'pdf', repoRoot, root: dataRoot, vars });
        const systemPromptPath = writePromptFile({ root: dataRoot, runId: run.id, text: prompt.system });
        const command = createAgentCommand({
          bin: agent,
          userPrompt: `Generate the tailored CV PDF for report ${num} (${reportPath}). Follow the "Headless run" section of your instructions.`,
          systemPromptPath,
          model: plumbing.model,
          cwd: repoRoot,
        });
        return {
          command,
          meta: { date, promptPath: systemPromptPath, template: template.name, templateSource: template.source, pdfPath: vars.CV_PDF_PATH },
          lines: [
            ...prompt.warnings.map((w) => `⚠ ${w}`),
            ...style.errors.map((e) => `⚠ config/cv/style.yml ${e.key ? `${e.key}: ` : ''}${e.message}`),
            `Template: ${template.name} (${template.source}) · paper ${paper}`,
            `Prompt: ${prompt.sections.join(' + ')}${plumbing.model ? ` · model ${plumbing.model}` : ''}`,
          ],
        };
      },

      parseLine: plumbing.parseLine,

      async after(run, { provisional, record }) {
        plumbing.flush(record);
        if (provisional.status === 'cancelled') return {};

        const pdf = resolveReportPdf(id, { root: dataRoot });
        const fresh = pdf ? freshFile(pdf.absolutePath, run.startedAt) : false;
        let error = null;
        if (provisional.status !== 'succeeded') error = provisional.error ?? `claude exited with code ${provisional.exitCode}`;
        else if (agentError(run)) error = agentError(run);
        else if (!fresh) error = pdf ? `data/pdf-index.tsv still points at the previous PDF (${pdf.fileName}) — no new one was rendered` : 'no PDF was recorded in data/pdf-index.tsv for this report';
        if (error) return { status: 'failed', error };

        record(`PDF rendered: ${pdf.fileName}`);
        return {
          result: { ...(run.result ?? {}), reportId: id, pdf: pdf.fileName },
          // The tracker's PDF flag flips through upstream's canonical writer, alone.
          next: [internalSpec('mark-pdf-ready', { root, repoRoot }, { reportNum: num })],
        };
      },
    },
  };
}

const TONES = Object.freeze({
  formal: 'Formal — structured, respectful distance, suits enterprise/corporate JDs',
  direct: 'Direct — plain sentences, no pleasantries, gets to the point immediately',
  conversational: 'Conversational — warm but professional, reads like a thoughtful person',
  mirror: 'Mirror the JD — match whatever register the company used',
});

const MAX_ANSWER = 2_000;

/** The four answers modes/cover.md Step 6 requires, checked and rendered for the prompt. */
export function renderAnswers(answers) {
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
    throw new SpecError('answers must be an object with why, problem, approach and tone', { code: 'answers-invalid' });
  }
  const text = (key, label) => {
    const value = typeof answers[key] === 'string' ? answers[key].trim() : '';
    if (!value) throw new SpecError(`Answer ${label} is required`, { code: 'answers-invalid', detail: { key } });
    if (value.length > MAX_ANSWER) throw new SpecError(`Answer ${label} is too long (max ${MAX_ANSWER} characters)`, { code: 'answers-invalid', detail: { key } });
    return value;
  };
  const why = text('why', 'A (why this role / company)');
  const problem = text('problem', 'B (what problem you would solve)');
  const approach = text('approach', 'C (how you would approach it)');
  const tone = typeof answers.tone === 'string' ? answers.tone.trim().toLowerCase() : '';
  if (!(tone in TONES)) throw new SpecError(`Answer D (tone) must be one of ${Object.keys(TONES).join(', ')}`, { code: 'answers-invalid', detail: { key: 'tone' } });

  const quote = (value) => value.split(/\r?\n/).map((l) => `  > ${l}`).join('\n');
  return {
    tone,
    markdown: [
      '- **A. Why this role / company?**',
      quote(why),
      '- **B. What problem would you solve for them?**',
      quote(problem),
      '- **C. How would you approach it?**',
      quote(approach),
      `- **D. Tone:** ${TONES[tone]}`,
    ].join('\n'),
  };
}

/**
 * Cover letter PDF for an existing report (modes/cover.md slug mode, headless).
 *
 * @param {{reportId: number|string, answers: object, model?: string|null}} options
 * @param {{root?: string, repoRoot: string, agent: object}} ctx
 */
export function buildCoverSpec({ reportId, answers, model = null } = {}, { root, repoRoot, agent } = {}) {
  requireAgent(agent);
  requireCv(root);
  const plumbing = agentPlumbing({ root, model });
  const { dataRoot } = plumbing;
  const { report, id, num, slug, path: reportPath } = requireReport(reportId, dataRoot);
  const rendered = renderAnswers(answers);
  const coverPath = `output/cover-${slug}-${num}.pdf`;

  return {
    kind: 'cover',
    label: `Cover letter for ${report.machine?.company ?? `report ${num}`}`,
    args: [],
    dryRun: false,
    writes: true,
    confirmRequired: false,
    reportsFindings: false,
    lane: 'agent',
    exclusive: false,
    dedupeKey: `cover:${num}`,
    timeoutMs: TIMEOUTS.cover,
    meta: { reportId: id, reportNum: num, company: report.machine?.company ?? null, slug, tone: rendered.tone, coverPath, model: plumbing.model },
    hooks: {
      async before(run) {
        const date = today();
        const vars = {
          REPORT_PATH: reportPath,
          REPORT_NUM: num,
          URL: report.url ?? '(no URL in the report header)',
          DATE: date,
          ANSWERS: rendered.markdown,
          PAYLOAD_PATH: promptPath(repoRoot, join(dataRoot, 'data', 'jsc', 'tmp', `cover-${run.id}.json`)),
          COVER_PDF_PATH: coverPath,
        };
        const prompt = assemblePrompt({ mode: 'cover', repoRoot, root: dataRoot, vars });
        const systemPromptPath = writePromptFile({ root: dataRoot, runId: run.id, text: prompt.system });
        const command = createAgentCommand({
          bin: agent,
          userPrompt: `Write and render the cover letter for report ${num} (${reportPath}) using the answers in your instructions. Follow the "Headless run" section.`,
          systemPromptPath,
          model: plumbing.model,
          cwd: repoRoot,
        });
        return {
          command,
          meta: { date, promptPath: systemPromptPath },
          lines: [
            ...prompt.warnings.map((w) => `⚠ ${w}`),
            `Tone: ${rendered.tone} · output ${coverPath}`,
            `Prompt: ${prompt.sections.join(' + ')}${plumbing.model ? ` · model ${plumbing.model}` : ''}`,
          ],
        };
      },

      parseLine: plumbing.parseLine,

      async after(run, { provisional, record }) {
        plumbing.flush(record);
        if (provisional.status === 'cancelled') return {};

        const absolute = join(dataRoot, coverPath);
        let error = null;
        if (provisional.status !== 'succeeded') error = provisional.error ?? `claude exited with code ${provisional.exitCode}`;
        else if (agentError(run)) error = agentError(run);
        else if (!freshFile(absolute, run.startedAt)) error = `no cover letter was written to ${coverPath}`;
        if (error) return { status: 'failed', error };

        const entry = recordCover({ root: dataRoot, reportId: id, path: coverPath });
        record(`Cover letter rendered: ${coverPath}`);
        return { result: { ...(run.result ?? {}), reportId: id, cover: entry } };
      },
    },
  };
}
