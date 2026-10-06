/**
 * runs.js — runs in the user's words (ia.md §2.8, global pattern "Run feedback").
 *
 * The queue speaks in kinds, exit codes and log lines. Every surface that shows
 * a run (Activity, Today, a job page, a document card) names it by what it is
 * about, says what happened and what to do, and only keeps the codes for
 * "Technical details". Pure functions, tested with node --test.
 */

import { fit, plural } from './labels.js';

/** What each kind does, as a short verb phrase; internal follow-ups included. */
export const RUN_NAMES = Object.freeze({
  evaluate: 'Check fit',
  pdf: 'Tailored CV',
  cover: 'Cover letter',
  scan: 'Check for new openings',
  'cv-render': 'Update design',
  'skills-extract': 'Improve the skills analysis',
  'skills-cv': "Read your CV's skills",
  'skills-fetch': 'Read new postings',
  'skills-fetch-auto': 'Read new postings',
  dedup: 'Find duplicate applications',
  reconcile: 'Remove links already in Applications',
  'reconcile-auto': 'Tidy To review',
  'verify-pipeline': 'Check my list for problems',
  'validate-portals': "Check companies' job boards",
  'verify-portals': "Check companies' job boards",
  'merge-tracker': 'Add to Applications',
  'mark-pdf-ready': 'Mark the CV as ready',
});

/** How long the assistant usually takes, said beside every button that starts it. */
export const AGENT_KINDS = new Set(['evaluate', 'pdf', 'cover', 'skills-extract', 'skills-cv']);

/** Runs nobody asked for by name: shown nested under the run that started them. */
export const FOLLOW_UP_KINDS = new Set(['merge-tracker', 'reconcile-auto', 'skills-fetch-auto', 'mark-pdf-ready']);

/**
 * A run the user started, as opposed to one the app chained after it (the
 * merge into Applications, the automatic tailored CV, laying out its PDF).
 * Only these are listed and announced; the others are told as "then: …"
 * under their parent (ia.md §2.8).
 */
export const isTopLevel = (run) => !run?.parentId && !FOLLOW_UP_KINDS.has(run?.kind);

/** "Check fit · Driftwood Analytics — Data Engineer". */
export function runTitle(run) {
  const name = RUN_NAMES[run?.kind] ?? run?.label ?? 'Activity';
  if (run?.subject) return `${name} · ${run.subject}`;
  if (run?.result?.company) return `${name} · ${[run.result.company, run.result.role].filter(Boolean).join(' — ')}`;
  if (run?.kind === 'scan') return name;
  if (run?.kind === 'cv-render' && run.meta?.documentId) return `${name} · ${run.meta.documentId}`;
  return name;
}

/** 'waiting' | 'working' | 'done' | 'failed' | 'cancelled'. */
export function runState(run) {
  switch (run?.status) {
    case 'queued':
      return 'waiting';
    case 'running':
      return 'working';
    case 'succeeded':
      return 'done';
    case 'cancelled':
      return 'cancelled';
    default:
      return 'failed';
  }
}

/**
 * What happened and what to do, in words, for a failed run.
 *
 * @returns {{what: string, todo: string, retry: boolean}} `retry`: whether Try again is offered.
 */
export function explainFailure(run) {
  const error = String(run?.error ?? '');
  const agent = AGENT_KINDS.has(run?.kind);
  const again = agent ? 'Try again. It usually works the second time and uses your Claude plan again.' : 'Try again.';

  if (/exited without writing reports|instead of report/i.test(error)) {
    return {
      what: 'The assistant opened the posting but stopped before writing the fit report. This is usually temporary — a slow page or a session that ended early.',
      todo: again,
      retry: true,
    };
  }
  if (/timed out/i.test(error)) {
    return { what: 'It took longer than the time limit and was stopped.', todo: `${again} If it times out again, open the posting to check it still loads.`, retry: true };
  }
  if (/not logged in|login|log in|auth|credit|usage limit|rate limit|quota/i.test(error)) {
    return {
      what: 'Claude Code could not start a session: it may not be signed in, or your plan has reached its limit.',
      todo: 'Open a terminal, run claude once to sign in or check your plan, then try again.',
      retry: true,
    };
  }
  if (/blacklist|skip list/i.test(error)) {
    return { what: 'This company is on your list of companies to skip, so the job was not checked.', todo: 'Remove the company from data/blacklist.md if you want to check it.', retry: false };
  }
  if (/cv-missing|no cv\.md/i.test(error)) {
    return { what: 'Your CV is missing, so there was nothing to compare the job with.', todo: 'Add your CV in My CV › Content, then try again.', retry: true };
  }
  if (/server shutting down/i.test(error)) {
    return { what: 'The app was closed while this was running.', todo: again, retry: true };
  }
  if (/payload was written but cannot be rendered/i.test(error)) {
    return { what: 'The assistant wrote the CV, but it could not be laid out as a PDF.', todo: 'Try again, or choose another design in My CV › Design.', retry: true };
  }
  if (run?.kind === 'scan') {
    return { what: 'Checking for new openings stopped with an error. Some job boards may not have been checked.', todo: 'Try again in a few minutes.', retry: true };
  }
  if (/claude exited with code|is_error|error/i.test(error) || agent) {
    return { what: 'The assistant stopped with an error before it finished.', todo: again, retry: true };
  }
  return { what: 'It stopped before it finished.', todo: again, retry: true };
}

/**
 * The outcome of a finished run in words, and where to open it.
 *
 * @param {object} run
 * @param {{rowForReport?: (reportId: number) => object|null}} [ctx]
 * @returns {{text: string, open: {href: string, label: string}|null}}
 */
export function outcome(run, { rowForReport = () => null, all = [] } = {}) {
  const result = run?.result ?? {};
  const reportId = result.reportId ?? run?.meta?.reportId ?? null;
  const row = reportId !== null ? rowForReport(Number(reportId)) : null;
  const jobHref = row ? `#/applications/${row.id}` : reportId !== null ? `#/applications/report/${reportId}` : null;
  switch (run?.kind) {
    case 'evaluate':
      return {
        text: typeof result.score === 'number' ? `Fit ${fit(result.score)} / 5. The fit report is ready.` : 'The fit report is ready.',
        open: jobHref ? { href: jobHref, label: 'Open the job' } : null,
      };
    case 'pdf': {
      // Its PDF is laid out by a chained render, which carries the screening verdict.
      const render = all.find((r) => r.parentId === run.id && r.kind === 'cv-render');
      const verdict = render?.result?.ats?.verdict;
      const text =
        verdict === 'fail'
          ? 'Your tailored CV is ready, but it fails the screening check: an applicant-tracking system would lose part of it. Choose a design that passes in My CV › Design, then make it again.'
          : 'Your tailored CV is ready.';
      return { text, open: jobHref ? { href: `${jobHref}#documents`, label: 'Open the CV' } : null };
    }
    case 'cover':
      return { text: 'Your cover letter is ready.', open: jobHref ? { href: `${jobHref}#documents`, label: 'Open the letter' } : null };
    case 'cv-render': {
      const verdict = result.ats?.verdict;
      const words = verdict === 'fail' ? ' It fails the screening check.' : verdict === 'warn' ? ' Readable, with small issues.' : verdict === 'pass' ? ' Readable by screening systems.' : '';
      return { text: `The CV was laid out again.${words}`, open: jobHref ? { href: `${jobHref}#documents`, label: 'Open the CV' } : null };
    }
    case 'scan':
      return { text: 'Finished checking for new openings.', open: { href: '#/to-review', label: 'See what came back' } };
    case 'skills-extract':
    case 'skills-cv':
    case 'skills-fetch':
      return { text: 'The skills analysis is up to date.', open: { href: '#/skills/learn', label: 'Open Skills' } };
    default:
      return { text: 'Done.', open: null };
  }
}

/** A failure the user still has to act on: not retried, not dismissed. */
export function needsAttention(run, all, dismissed = []) {
  if (runState(run) !== 'failed' || dismissed.includes(run.id) || !isTopLevel(run)) return false;
  return !all.some((r) => r.retryOf === run.id);
}

/** The Activity button's state and label (ia.md §1). */
export function activitySummary(all, { dismissed = [], lastOpened = 0 } = {}) {
  const top = all.filter(isTopLevel);
  const working = top.filter((r) => ['waiting', 'working'].includes(runState(r))).length;
  const failed = top.filter((r) => needsAttention(r, all, dismissed)).length;
  const done = top.filter((r) => runState(r) === 'done' && (r.endedAt ?? 0) > lastOpened).length;
  if (failed) return { state: 'failed', label: `Activity · ${failed} failed`, failed, working, done };
  if (working) return { state: 'working', label: `Activity · ${working} working`, failed, working, done };
  if (done) return { state: 'done', label: `Activity · ${done} done`, failed, working, done };
  return { state: 'quiet', label: 'Activity', failed, working, done };
}

/** "then: added to Applications, made tailored CV". */
/** What a chained run did, in a few words; null for bookkeeping not worth saying. */
const FOLLOW_UP_WORDS = {
  'merge-tracker': 'added to Applications',
  pdf: 'made the tailored CV',
  cover: 'wrote the cover letter',
  'cv-render': 'laid out the PDF',
  'reconcile-auto': null,
  'mark-pdf-ready': null,
  'skills-fetch-auto': 'read the new postings for Skills',
};

export function followUps(run, all) {
  const children = all.filter((r) => r.parentId === run.id && FOLLOW_UP_WORDS[r.kind] !== null);
  if (!children.length) return '';
  const words = children.map((c) => {
    const verb = FOLLOW_UP_WORDS[c.kind] ?? (RUN_NAMES[c.kind] ?? c.label ?? c.kind).toLowerCase();
    if (c.kind === 'cv-render' && runState(c) === 'done' && c.result?.ats?.verdict === 'fail') return `${verb} (it fails the screening check)`;
    return runState(c) === 'failed' ? `${verb} (failed)` : runState(c) === 'working' || runState(c) === 'waiting' ? `${verb} (working)` : verb;
  });
  return `then: ${words.join(', ')}`;
}

/** "lane agent · exit 0 · log data/jsc/logs/<id>.jsonl" for Technical details. */
export function technicalDetails(run) {
  const parts = [run.kind, `lane ${run.lane ?? 'script'}`];
  if (run.exitCode !== null && run.exitCode !== undefined) parts.push(`exit ${run.exitCode}`);
  if (run.error) parts.push(run.error);
  if (AGENT_KINDS.has(run.kind)) parts.push(`log data/jsc/logs/${run.id}.jsonl`);
  return parts.join(' · ');
}

/** "Waiting — 2 others are running". */
export function waitingText(active) {
  return active > 0 ? `Waiting — ${plural(active, 'other is', 'others are')} running` : 'Waiting to start';
}
