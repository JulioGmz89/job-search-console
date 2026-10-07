import { useEffect, useRef, useState } from 'react';

import { addInboxUrl } from '../api.js';
import { reload, useResource } from '../data.js';
import { fit } from '../lib/labels.js';
import { runTitle } from '../lib/runs.js';
import { useRuns } from '../runs.jsx';
import { announce } from '../shell/announce.jsx';
import { RunItem } from './RunItem.jsx';
import { HelpLink } from './ui.jsx';

/** Runs whose result is shown where they were started, so Today does not show them twice. */
export const shownInline = new Set();

/**
 * Add a job by its link (ia.md §2.1 "Check your first job", §2.2 header):
 * **Check fit now** starts the assistant; **Save for later** keeps the link in
 * To review. What each does is said under the field, and the check's progress
 * and result appear right here, where the user clicked (F-013, F-018).
 */
export function AddJob({ idPrefix = 'add', headingId = null }) {
  const { list, track } = useRuns();
  const workspace = useResource('workspace');
  const agent = useResource('agent');
  const [url, setUrl] = useState('');
  const [autoPdf, setAutoPdf] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [runId, setRunId] = useState(null);
  const [saved, setSaved] = useState(null);
  const savedRef = useRef(null);
  const resultRef = useRef(null);

  const run = runId ? list.find((r) => r.id === runId) ?? null : null;
  const threshold = agent.data?.profile?.autoPdfThreshold ?? 3;
  const setup = workspace.data?.setup;
  const blocked = !setup ? null : !setup.cv ? 'Add your CV first: the check compares the job with it.' : !setup.assistant ? 'The assistant (Claude Code) is not ready yet — see Get set up on Today or Workspace.' : null;

  // When the check finishes, focus moves to its result (ia.md §3 "Focus").
  const finished = run && ['succeeded', 'failed', 'cancelled'].includes(run.status);
  useEffect(() => {
    if (finished) resultRef.current?.querySelector('a.btn, button.btn')?.focus();
  }, [finished]);
  // The button the user pressed stays, but the news is below it: take focus there.
  useEffect(() => {
    if (runId) resultRef.current?.querySelector('.act-title a')?.focus();
  }, [runId]);

  const submit = async (evaluate) => {
    setError(null);
    setSaved(null);
    if (!url.trim()) {
      setError('Paste the link to the job posting, starting with https://');
      announce('Paste the link to the job posting, starting with https://', { assertive: true });
      return;
    }
    if (evaluate && blocked) {
      setError(blocked);
      return;
    }
    setBusy(true);
    try {
      const result = await addInboxUrl({ url: url.trim(), evaluate, autoPdf: evaluate && autoPdf });
      reload('inbox');
      if (result.run) {
        track(result.run);
        setRunId(result.run.id);
        shownInline.add(result.run.id);
        announce(`Started: ${runTitle(result.run)}. About 2 to 5 minutes.`);
      } else {
        setSaved(result.added ? 'Saved in To review. Check its fit there whenever you like.' : 'That link is already in To review.');
        setTimeout(() => savedRef.current?.focus(), 0);
      }
      setUrl('');
    } catch (e) {
      setError(e.message);
      announce(e.message, { assertive: true });
    } finally {
      setBusy(false);
    }
  };

  const fieldId = `${idPrefix}-url`;
  return (
    <div className="stack-sm">
      <form
        className="stack-sm"
        noValidate
        aria-labelledby={headingId ?? undefined}
        onSubmit={(e) => {
          e.preventDefault();
          submit(true);
        }}
      >
        <div className="field">
          <label htmlFor={fieldId}>Link to the job posting</label>
          <input
            id={fieldId}
            type="url"
            value={url}
            placeholder="https://…/jobs/123"
            onChange={(e) => {
              setUrl(e.target.value);
              setError(null);
            }}
            aria-invalid={error ? true : undefined}
            aria-describedby={`${fieldId}-hint${error ? ` ${fieldId}-err` : ''}`}
          />
          {error ? (
            <p className="error" id={`${fieldId}-err`}>
              {error}
            </p>
          ) : null}
          <p className="hint" id={`${fieldId}-hint`}>
            <b>Check fit now:</b> the assistant writes a fit report, about 2–5 min, uses your Claude plan. <b>Save for later:</b> keeps the link in To review.{' '}
            <HelpLink topic="costs">What a check costs</HelpLink>
          </p>
        </div>
        <details>
          <summary>Also make a tailored CV if the fit is {agent.data ? fit(threshold) : '…'} or more</summary>
          <label className="check">
            <input type="checkbox" checked={autoPdf} onChange={(e) => setAutoPdf(e.target.checked)} />
            Make a tailored CV right after the check when the fit is {fit(threshold)} or more (about 3 more minutes). Change the number in{' '}
            <a href="#/my-cv/profile">Profile</a>.
          </label>
        </details>
        <div className="row">
          <button type="submit" className="btn" disabled={busy}>
            Check fit now
          </button>
          <button type="button" className="btn2" disabled={busy} onClick={() => submit(false)}>
            Save for later
          </button>
        </div>
        {blocked ? <p className="small muted">{blocked}</p> : null}
      </form>
      {saved ? (
        <p className="notice ok" tabIndex={-1} ref={savedRef}>
          {saved} <a href="#/to-review">Open To review</a>
        </p>
      ) : null}
      {run ? (
        <div ref={resultRef}>
          <RunItem run={run} />
        </div>
      ) : null}
    </div>
  );
}
