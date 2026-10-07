import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import { fetchRun } from '../api.js';
import { useResource } from '../data.js';
import { dateTime, duration } from '../lib/labels.js';
import { AGENT_KINDS, explainFailure, followUps, outcome, runState, runTitle, technicalDetails, waitingText } from '../lib/runs.js';
import { useRuns } from '../runs.jsx';
import { announce } from '../shell/announce.jsx';
import { Progress } from './ui.jsx';

/** A clock that ticks while something is running. */
export function useNow(active) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [active]);
  return now;
}

/** Looks up the tracker row for a report, so outcomes can link to the job page. */
export function useRowForReport() {
  const { data } = useResource('pipeline');
  return (reportId) => data?.rows?.find((r) => r.reportId === reportId) ?? null;
}

/** The raw log, fetched only when someone opens Technical details. */
function TechnicalDetails({ run }) {
  const [lines, setLines] = useState(null);
  return (
    <details
      onToggle={(event) => {
        if (event.currentTarget.open && lines === null) {
          fetchRun(run.id)
            .then((full) => setLines(full.lines ?? []))
            .catch(() => setLines([]));
        }
      }}
    >
      <summary>Technical details</summary>
      <p className="mono">{technicalDetails(run)}</p>
      {lines?.length ? (
        <pre className="log" tabIndex={0} aria-label={`Log of ${runTitle(run)}`}>
          {lines.slice(-80).map((l) => l.text).join('\n')}
        </pre>
      ) : null}
    </details>
  );
}

const BADGE = {
  waiting: ['neutral', 'Waiting'],
  working: ['new', 'Working'],
  done: ['ok', 'Done'],
  failed: ['fail', 'Failed'],
  cancelled: ['neutral', 'Cancelled'],
};

/**
 * One activity, in any of its states (ia.md §2.8). `heading` is the level of
 * its title; `link` makes the title a link to its own page.
 */
export function RunItem({ run, headingLevel = 3, link = true, onRetried = null, takeFocus = false }) {
  const { list, retry, cancel } = useRuns();
  const design = useResource('design');
  const rowForReport = useRowForReport();
  const pipelineRows = useResource('pipeline').data?.rows ?? [];
  const state = runState(run);
  const now = useNow(state === 'working');
  const [busy, setBusy] = useState(false);
  const articleRef = useRef(null);
  // `takeFocus`: this card replaced the button that started it, or the result
  // replaced it. While the run goes and just after, focus that fell to the
  // page body comes here instead (R-recheck-01).
  useLayoutEffect(() => {
    if (!takeFocus) return;
    const recent = state === 'waiting' || state === 'working' || Date.now() - (run.endedAt ?? 0) < 3000;
    if (recent && (!document.activeElement || document.activeElement === document.body)) {
      articleRef.current?.querySelector('.act-title a, button:not([disabled])')?.focus();
    }
  });
  // When this card leaves the page with focus inside it (its run finished and the
  // page shows the result instead), focus goes to the place it belonged to (A8-01):
  // the nearest [data-run-home], else its card, else the page heading.
  // A layout effect: its cleanup runs before React takes the card out of the
  // page, while focus is still inside it (R-final-06).
  useLayoutEffect(() => {
    const article = articleRef.current;
    return () => {
      if (!article?.contains(document.activeElement)) return;
      const home = article.parentElement?.closest('[data-run-home]') ?? article.parentElement?.closest('.card') ?? null;
      const homeId = home?.id || null;
      setTimeout(() => {
        if (document.activeElement && document.activeElement !== document.body) return;
        // The home may itself have been drawn again; find it by its id then.
        const place = home?.isConnected ? home : homeId ? document.getElementById(homeId) : null;
        const target = place?.querySelector('[data-run-focus]') ?? place?.querySelector('a[href], button:not([disabled])') ?? null;
        (target ?? document.querySelector('main h1'))?.focus();
      }, 0);
    };
  }, []);
  const [error, setError] = useState(null);
  const retried = list.find((r) => r.retryOf === run.id) ?? null;
  const retriedRef = useRef(null);
  const retriedOpenRef = useRef(null);
  const [justRetried, setJustRetried] = useState(false);
  // Try again replaces its own button; focus moves to what replaced it.
  useEffect(() => {
    if (justRetried && retried) retriedRef.current?.focus();
  }, [justRetried, retried]);
  const title = runTitle(run);
  const H = `h${headingLevel}`;
  const [tone, badge] = state === 'failed' && retried ? ['neutral', 'Failed, tried again'] : BADGE[state];
  const active = list.filter((r) => r.status === 'running').length;

  // A fit check that would make its tailored CV in a design that fails the
  // screening check doesn't, and says so before the click (R-final-07).
  const skipCv = run.kind === 'evaluate' && run.meta?.autoPdf !== false && design.data?.verdict === 'fail';

  const doRetry = async () => {
    setBusy(true);
    setError(null);
    try {
      const again = await retry(run.id, skipCv ? { autoPdf: false } : undefined);
      setJustRetried(true);
      announce(`Started again: ${title}`);
      onRetried?.(again);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const doCancel = async () => {
    setBusy(true);
    try {
      await cancel(run.id);
      announce(`Cancelled: ${title}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const why = state === 'failed' ? explainFailure(run) : null;
  const done = state === 'done' ? outcome(run, { rowForReport, all: list, rows: pipelineRows }) : null;
  const retriedDone = retried && runState(retried) === 'done';
  const retriedOutcome = retriedDone ? outcome(retried, { rowForReport, all: list, rows: pipelineRows }) : null;
  useEffect(() => {
    // The retry finished: focus its result if the user is still here.
    if (retriedDone && justRetried) retriedOpenRef.current?.focus();
  }, [retriedDone, justRetried]);
  const then = followUps(run, list, pipelineRows);
  const started = run.startedAt ?? run.queuedAt;

  return (
    <article ref={articleRef} className={`act ${state === 'failed' && !retried ? 'failed' : state}`} aria-labelledby={`act-${run.id}`}>
      <div className="row between">
        <span className="row">
          <span className={`badge ${tone}`}>{badge}</span>
          <span className="small muted">
            {started ? dateTime(started) : ''}
            {state === 'working' && run.startedAt ? ` · ${duration(now - run.startedAt)} so far` : ''}
            {['done', 'failed', 'cancelled'].includes(state) && run.startedAt && run.endedAt ? ` · took ${duration(run.endedAt - run.startedAt)}` : ''}
          </span>
        </span>
      </div>
      <H id={`act-${run.id}`} className="act-title">
        {link ? <a href={`#/activity/${run.id}`}>{title}</a> : title}
      </H>
      {run.retryOf ? <p className="small muted">Second attempt — the first one didn't finish.</p> : null}

      {state === 'waiting' ? <p className="small">{waitingText(active)}</p> : null}
      {state === 'working' ? (
        <>
          <Progress label={title} />
          <p className="small muted">{AGENT_KINDS.has(run.kind) ? 'Usually 2–5 min. You can leave this page; it carries on.' : 'Usually a few seconds to a minute.'}</p>
          <div className="row">
            <button type="button" className="btn2 btn-sm" onClick={doCancel} disabled={busy}>
              Cancel<span className="visually-hidden"> {title}</span>
            </button>
          </div>
        </>
      ) : null}

      {why && !retried ? (
        <>
          <p>
            <b>What happened:</b> {why.what}
          </p>
          <p>
            <b>What to do:</b> {why.todo}
          </p>
          {why.retry && skipCv ? (
            <p className="small">
              Your CV design fails the screening check, so this try won’t make a tailored CV by itself. Choose a design that passes in{' '}
              <a href="#/my-cv/design">My CV › Design</a>, then make the CV from the job’s page.
            </p>
          ) : null}
          <div className="row">
            {why.retry ? (
              <button type="button" className="btn btn-sm" onClick={doRetry} disabled={busy}>
                Try again<span className="visually-hidden"> {title}</span>
              </button>
            ) : null}
            {run.meta?.url ? (
              <a className="btn2 btn-sm" href={run.meta.url} target="_blank" rel="noopener noreferrer">
                Open the posting ↗<span className="visually-hidden"> (opens in a new tab)</span>
              </a>
            ) : null}
          </div>
        </>
      ) : null}
      {why && retried ? (
        <>
          {/* What happened stays in view after the retry (W8-T8-02). */}
          <p className="small">
            <b>What happened the first time:</b> {why.what}
          </p>
          <p className="small">
            Tried again:{' '}
            <a href={`#/activity/${retried.id}`} ref={retriedRef}>{runState(retried) === 'done' ? 'that worked' : runState(retried) === 'failed' ? 'that failed too' : 'still working'}</a>.
          </p>
          {/* And the retry's result shows here, where the user clicked (W8-T8-01). */}
          {retriedOutcome ? (
            <>
              <p>{retriedOutcome.text}</p>
              {retriedOutcome.open ? (
                <div className="row">
                  <a className="btn btn-sm" href={retriedOutcome.open.href} ref={retriedOpenRef}>
                    {retriedOutcome.open.label}
                  </a>
                </div>
              ) : null}
            </>
          ) : null}
        </>
      ) : null}

      {done ? <p>{done.text}</p> : null}
      {then ? <p className="nested">{then}</p> : null}
      {done?.open ? (
        <div className="row">
          <a className="btn btn-sm" href={done.open.href}>
            {done.open.label}
          </a>
        </div>
      ) : null}
      {state === 'cancelled' ? <p className="small">Cancelled{run.error ? `: ${run.error}` : ''}.</p> : null}
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
      <TechnicalDetails run={run} />
    </article>
  );
}
