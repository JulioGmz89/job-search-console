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

import { appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { modelFor } from '../agents/claude-bin.js';
import { readProfile } from '../agents/profile.js';
import { assemblePrompt, writePromptFile } from '../agents/prompts/assemble.js';
import { agentLogPath, createAgentCommand, TIMEOUTS } from '../agents/runner.js';
import { createStreamParser } from '../agents/stream-json.js';
import { upsertBatchState } from '../services/batch-state.js';
import { validateInboxUrl } from '../services/inbox.js';
import { resolveDataRoot } from '../services/paths.js';
import { releaseReportNumber, removeStrayAdditions, reserveReportNumber } from '../services/report-numbers.js';
import { indexReportFiles, readReport } from '../services/reports.js';
import { internalSpec, SpecError } from './specs.js';

const today = () => new Date().toISOString().slice(0, 10);
const iso = (ms) => new Date(ms ?? Date.now()).toISOString();

/** Refuse at request time — before anything is queued — when the run cannot possibly work. */
function requireAgent(agent) {
  if (!agent?.found) {
    throw new SpecError(
      `Claude Code CLI not found (looked for "${agent?.display ?? 'claude'}") — install it or set JSC_CLAUDE_BIN`,
      { code: 'agent-missing', status: 503 },
    );
  }
}

function requireCv(root) {
  if (!existsSync(join(resolveDataRoot(root), 'cv.md'))) {
    throw new SpecError('No cv.md in the data directory — add your CV before evaluating', { code: 'cv-missing' });
  }
}

/**
 * The per-run wiring shared by every agent kind: a stream-json parser, a
 * mirror of the raw stream to `data/jsc/logs/<run>.jsonl`, and the model.
 */
function agentPlumbing({ root, model }) {
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
const agentError = (run) => (run.result?.isError ? run.result.error ?? 'Claude reported an error' : null);

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

/** Tailored CV PDF for an existing report. Arrives with the CV Studio step. */
export function buildPdfSpec() {
  throw new SpecError('PDF generation is not wired up yet', { code: 'kind-unknown', status: 501 });
}

/** Cover letter for an existing report. Arrives with the CV Studio step. */
export function buildCoverSpec() {
  throw new SpecError('Cover letters are not wired up yet', { code: 'kind-unknown', status: 501 });
}
