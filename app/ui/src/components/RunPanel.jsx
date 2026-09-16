import { useEffect, useRef, useState } from 'react';

/**
 * Live output for one run, plus the confirm step for anything that rewrites the
 * tracker.
 *
 * The progress indicator is deliberately honest about what each run reports.
 * `scan.mjs`'s fetch sweep runs every provider concurrently and prints nothing
 * until it is done, so there is no percentage to show — an elapsed clock and
 * the live log are the real information. Only the `--verify` phase is counted,
 * and only then does a determinate bar appear. An agent run streams what
 * Claude is doing (tool calls, text) as it happens.
 */

export const STATUS_LABEL = {
  queued: 'Queued',
  running: 'Running',
  succeeded: 'Finished',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

/**
 * What a run's outcome should be called.
 *
 * The integrity checks exit non-zero when they FIND something — `verify-pipeline`
 * returns 1 for "one error in the tracker". Calling that "Failed" says the tool
 * broke, when in fact it worked and is telling you something.
 */
export function outcome(run) {
  if (run.status === 'failed' && run.reportsFindings) {
    return { label: 'Found problems', className: 'run-findings' };
  }
  return { label: STATUS_LABEL[run.status] ?? run.status, className: `run-${run.status}` };
}

/** mm:ss since a run started (or how long it has been waiting). */
export function useElapsed(run) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!run || (run.status !== 'running' && run.status !== 'queued')) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [run]);

  if (!run) return null;
  const from = run.startedAt ?? run.queuedAt;
  const to = run.status === 'running' || run.status === 'queued' ? now : run.endedAt;
  if (!from || !to) return null;
  const seconds = Math.max(0, Math.floor((to - from) / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

/** The one-line summary of what a run was about, from its metadata. */
export function describeRun(run) {
  const m = run.meta ?? {};
  const parts = [];
  if (m.company) parts.push(m.company);
  if (m.reportNum) parts.push(`report ${m.reportNum}`);
  else if (m.url) parts.push(m.url);
  if (m.template) parts.push(`${m.template} template`);
  if (m.tone) parts.push(`${m.tone} tone`);
  return parts.join(' · ');
}

export default function RunPanel({ run, lines, progress, error, onCancel, onConfirm, onDismiss, confirmLabel }) {
  const logRef = useRef(null);
  const elapsed = useElapsed(run);

  // Follow the tail, but only while the user is already at the bottom — nobody
  // wants the view yanked away while they are reading back through a scan.
  useEffect(() => {
    const log = logRef.current;
    if (!log) return;
    const atBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 40;
    if (atBottom) log.scrollTop = log.scrollHeight;
  }, [lines]);

  if (error && !run) {
    return <div className="notice warn run-panel">{error.message}</div>;
  }
  if (!run) return null;

  const queued = run.status === 'queued';
  const running = run.status === 'running';
  const agent = run.lane === 'agent';
  const result = outcome(run);
  const detail = describeRun(run);
  // A successful dry run is what authorises the real thing.
  const awaitingConfirm = onConfirm && run.dryRun && run.status === 'succeeded';

  return (
    <div className="run-panel">
      <div className="run-head">
        <strong>{run.label}</strong>
        {run.dryRun ? <span className="badge dry">preview</span> : null}
        <span className={`badge ${result.className}`}>{result.label}</span>
        {elapsed ? <span className="muted">{elapsed}</span> : null}
        {run.exitCode !== null && run.exitCode !== 0 && !run.reportsFindings ? (
          <span className="muted">exit {run.exitCode}</span>
        ) : null}
        <span className="spacer" />
        {queued || running ? <button className="chip" onClick={onCancel}>Cancel</button> : null}
        {!queued && !running && onDismiss ? <button className="chip" onClick={onDismiss}>Close</button> : null}
      </div>

      {detail ? <div className="muted run-detail">{detail}</div> : null}

      {queued ? (
        <div className="run-progress">
          <progress />
          <span className="muted">Waiting for a free slot — another run is using the lane it needs</span>
        </div>
      ) : null}

      {running ? (
        progress?.phase === 'verify' && progress.total ? (
          <div className="run-progress">
            <progress value={progress.done} max={progress.total} />
            <span className="muted">Checking {progress.done} of {progress.total} postings are still live</span>
          </div>
        ) : (
          <div className="run-progress">
            <progress />
            <span className="muted">
              {/* Say why it looks stuck, because it will look stuck. */}
              {agent
                ? 'Claude is working — tool calls and text appear below as they stream; a full evaluation takes several minutes'
                : 'Fetching from every source at once — the scanner reports nothing until the sweep finishes'}
            </span>
          </div>
        )
      ) : null}

      <pre className="run-log" ref={logRef}>
        {lines.length === 0 && (running || queued) ? <span className="muted">Waiting for output…</span> : null}
        {lines.map((line, i) => (
          <div key={i} className={line.stream === 'stderr' ? 'err' : undefined}>{line.text}</div>
        ))}
      </pre>

      {run.truncated ? (
        <p className="muted">Output was long and has been truncated.</p>
      ) : null}

      {run.status === 'failed' && run.error && !run.reportsFindings ? (
        <div className="notice warn">{run.error}</div>
      ) : null}

      {error ? <div className="notice warn">{error.message}</div> : null}

      {awaitingConfirm ? (
        <div className="run-confirm">
          <p>Nothing has been written yet. Read the preview above, then apply it if it looks right.</p>
          <button className="chip primary" onClick={onConfirm}>{confirmLabel ?? 'Apply these changes'}</button>
          <button className="chip" onClick={onDismiss}>Discard</button>
        </div>
      ) : null}
    </div>
  );
}
