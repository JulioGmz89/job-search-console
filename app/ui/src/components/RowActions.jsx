import { useState } from 'react';

import { startCover, startEvaluate, startPdf } from '../api.js';
import { useRuns } from '../runs.jsx';

/**
 * Evaluate / PDF / Cover letter, for one tracker row or one open report.
 *
 * Each button queues a run and hands the id back so the caller can show it
 * (the Runs page, or a panel beside the report). Buttons are disabled with a
 * reason rather than hidden when the agent cannot run: the user should learn
 * *why* rather than wonder where the button went.
 */
export default function RowActions({ row, report, onStarted, onCoverRequested, compact = false }) {
  const { agentReady, agentReason, list } = useRuns();
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null);

  const reportId = report?.id ?? row?.reportId ?? null;
  const url = report?.url ?? row?.report?.url ?? null;
  const hasReport = report ? true : row?.hasReport === true;
  const hasPdf = report ? report.pdf?.exists === true : row?.pdf != null;

  // Something already queued or running for this report/URL: say so instead of
  // letting a second click queue a duplicate (the server refuses it anyway).
  const inFlight = (kind) =>
    list.find((r) => (r.status === 'queued' || r.status === 'running') && r.kind === kind
      && (kind === 'evaluate' ? r.meta?.url === url : r.meta?.reportId === Number(reportId)));

  const go = async (kind, start) => {
    setError(null);
    setBusy(kind);
    try {
      const run = await start();
      onStarted?.(run);
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(null);
    }
  };

  const disabledTitle = (kind) => {
    if (!agentReady) return agentReason;
    if (inFlight(kind)) return `Already ${inFlight(kind).status}`;
    if (kind === 'evaluate' && !url) return 'No URL for this row';
    if (kind !== 'evaluate' && !hasReport) return 'No report yet — evaluate first';
    return null;
  };

  // A plain function, not a nested component: a component type created inside
  // render is a new type every render, and React would remount the buttons.
  const button = (kind, label, start) => {
    const why = disabledTitle(kind);
    return (
      <button
        className="chip"
        disabled={Boolean(why) || busy !== null}
        title={why ?? label}
        onClick={() => go(kind, start)}
      >
        {busy === kind ? '…' : label}
      </button>
    );
  };

  return (
    <span className="row-actions" onClick={(e) => e.stopPropagation()}>
      {button('evaluate', hasReport ? 'Re-evaluate' : 'Evaluate', () => startEvaluate({ url }))}
      {button('pdf', hasPdf ? (compact ? 'PDF ↻' : 'Regenerate PDF') : (compact ? 'PDF' : 'Generate PDF'), () => startPdf(reportId))}
      <button
        className="chip"
        disabled={Boolean(disabledTitle('cover')) || busy !== null}
        title={disabledTitle('cover') ?? 'Answer four questions, then draft and render a cover letter'}
        onClick={() => onCoverRequested?.(reportId)}
      >
        {compact ? 'Cover' : 'Cover letter'}
      </button>
      {error ? <span className="status-error" title={error}>!</span> : null}
    </span>
  );
}

/** The cover-letter flow's second half, shared by the row and the detail view. */
export async function submitCover(reportId, answers) {
  return startCover(reportId, answers);
}
