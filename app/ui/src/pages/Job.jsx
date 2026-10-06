import { useEffect, useState } from 'react';

import { fetchReport, setRowStatus } from '../api.js';
import { Documents } from '../components/Documents.jsx';
import { RunItem } from '../components/RunItem.jsx';
import { StatusControl } from '../components/StatusControl.jsx';
import { ConfirmDialog, CostNote, HelpLink } from '../components/ui.jsx';
import { reload, useResource } from '../data.js';
import { fit, jobName, shortDate, statusLabel } from '../lib/labels.js';
import { needsAttention, runState, runTitle } from '../lib/runs.js';
import { latest, runsForJob, useRuns } from '../runs.jsx';
import { announce } from '../shell/announce.jsx';
import { PageHead, useAnchor } from '../shell/router.jsx';
import { offerUndo } from '../shell/undo.jsx';

const CLOSED = new Set(['rejected', 'discarded', 'skip', 'hired', 'offer']);

const FACTS = [
  ['legitimacy_tier', 'Is the posting real?'],
  ['risk_level', 'Risk'],
  ['confidence', 'Confidence'],
  ['advertised_comp', 'Advertised pay'],
  ['next_action', 'Suggested next step'],
];
const LISTS = [
  ['hard_stops', 'Hard stops'],
  ['soft_gaps', 'Gaps'],
  ['top_strengths', 'Strengths'],
];

/** The report, refetched whenever the tracker or a run for it changes. */
function useReport(reportId, version) {
  const [state, setState] = useState({ report: null, error: null });
  useEffect(() => {
    if (!reportId) return undefined;
    let live = true;
    fetchReport(reportId)
      .then((report) => live && setState({ report, error: null }))
      .catch((error) => live && setState((s) => ({ ...s, error })));
    return () => {
      live = false;
    };
  }, [reportId, version]);
  return state;
}

/**
 * One job (ia.md §2.3): a full page, never below the list. Summary, Documents,
 * Fit report and History, each a heading with its own anchor.
 */
export function JobPage({ params }) {
  const pipeline = useResource('pipeline');
  const { list, start } = useRuns();
  const anchor = useAnchor();
  const [confirmAgain, setConfirmAgain] = useState(false);
  const rows = pipeline.data?.rows ?? [];
  const row = params.id ? rows.find((r) => r.id === params.id) : rows.find((r) => r.reportId === params.reportId);

  // An old link by report number lands on the job's own address.
  useEffect(() => {
    if (params.reportId && row) window.history.replaceState(null, '', `#/applications/${row.id}`);
  }, [params.reportId, row]);

  const runs = row ? runsForJob(list, { reportId: row.reportId, url: row.report?.url }) : [];
  const finishedCount = runs.filter((r) => ['done', 'failed'].includes(runState(r))).length;
  const { report, error } = useReport(row?.reportId, `${pipeline.data ? pipeline.at ?? '' : ''}-${finishedCount}-${pipeline.data?.rows?.length}`);

  useEffect(() => {
    if (anchor && report) document.getElementById(anchor === 'cover' ? 'documents' : anchor)?.scrollIntoView();
  }, [anchor, report]);

  const back = <a href="#/applications">← Applications</a>;
  if (!pipeline.data) return <PageHead title="Loading…" back={back} />;
  if (!row) {
    return (
      <>
        <PageHead title="Job not found" back={back} lead="It is not in your applications. It may have been merged into another row or removed from data/applications.md." />
      </>
    );
  }

  const name = jobName(row);
  const statusId = String(row.statusId ?? row.status).toLowerCase();
  const checking = runs.find((r) => r.kind === 'evaluate' && ['waiting', 'working'].includes(runState(r)));
  const failedCheck = runs.find((r) => r.kind === 'evaluate' && needsAttention(r, list));
  const lastCheck = latest(runs.filter((r) => runState(r) === 'done'), 'evaluate');
  // A check merged into a row that already existed (F-015): say what it changed.
  const merged = lastCheck && row.date && lastCheck.startedAt && row.date < new Date(lastCheck.startedAt).toISOString().slice(0, 10);
  const machine = report?.machine ?? {};
  const decision = machine.final_decision ?? row.report?.decision ?? null;

  const checkAgain = async () => {
    setConfirmAgain(false);
    const url = report?.url ?? row.report?.url;
    try {
      const run = await start('evaluate', { url, autoPdf: false });
      announce(`Started: ${runTitle(run)}`);
    } catch (e) {
      announce(`Could not start the check: ${e.message}`, { assertive: true });
    }
  };

  const sent = async () => {
    const before = statusId;
    const today = new Date();
    const on = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    await setRowStatus(row.id, 'applied', { on });
    await reload('pipeline');
    offerUndo(`${name} set to Applied today`, async () => {
      await setRowStatus(row.id, before);
      await reload('pipeline');
    });
  };

  return (
    <>
      <PageHead title={name} docTitle={name} back={back} lead={[report?.header?.archetype, machine.advertised_comp].filter(Boolean).join(' · ') || null} />

      {merged ? (
        <p className="notice info">
          <span className="badge new">Updated</span> Your last check of this posting was merged into this application (#{row.id}, first added {shortDate(row.date)}): fit is now {fit(row.score)}.
        </p>
      ) : null}
      {failedCheck ? (
        <div className="stack-sm" aria-label="Needs you">
          <p className="tag attn">Needs you · the last check of this job didn’t finish</p>
          <RunItem run={failedCheck} headingLevel={2} />
        </div>
      ) : null}

      <section aria-labelledby="sum-h" className="card" id="summary">
        <h2 id="sum-h" className="visually-hidden">
          Summary
        </h2>
        <div className="row between">
          <p className="big">
            <b>Fit {fit(row.score)} / 5</b>
            {decision ? (
              <>
                {' '}
                · Recommendation: <b>{decision}</b>
              </>
            ) : null}{' '}
            <HelpLink topic="fit">How the fit is worked out</HelpLink>
          </p>
          {report?.url ? (
            <a href={report.url} target="_blank" rel="noopener noreferrer">
              Open the posting ↗<span className="visually-hidden"> (opens in a new tab)</span>
            </a>
          ) : null}
        </div>
        <div className="row">
          <span className="label inline-label" id="status-label">
            Status
          </span>
          <StatusControl row={row} statuses={pipeline.data.statuses} />
        </div>
        <div className="row">
          {checking ? (
            <RunItem run={checking} headingLevel={3} />
          ) : (
            <>
              <button type="button" className="btn2 btn-sm" onClick={() => (CLOSED.has(statusId) ? setConfirmAgain(true) : checkAgain())}>
                Check fit again
              </button>
              <CostNote />
            </>
          )}
        </div>
        {row.notes ? (
          <p className="small">
            <b>Your note:</b> {row.notes}
          </p>
        ) : null}
      </section>

      <section aria-labelledby="docs-h" className="stack" id="documents">
        <h2 id="docs-h">Documents</h2>
        {report ? <Documents row={row} report={report} openCover={anchor === 'cover'} /> : <p className="muted">{error ? `Could not load the report: ${error.message}` : 'Loading…'}</p>}
        {statusId === 'evaluated' ? (
          <div className="row">
            <button type="button" className="btn2" onClick={sent}>
              I’ve sent my application
            </button>
            <span className="hint inline">Sets the status to Applied, dated today.</span>
          </div>
        ) : null}
      </section>

      <section aria-labelledby="rep-h" className="stack" id="report">
        <h2 id="rep-h">Fit report</h2>
        {report ? (
          <div className="card">
            <p>
              <b>Fit {fit(row.score)} / 5.</b> The assistant compares the posting with your CV and profile, part by part, and scores the match from 1 to 5; 4 and up is a strong fit, under 3
              usually means skip.
            </p>
            {FACTS.some(([k]) => machine[k]) ? (
              <dl className="facts">
                {FACTS.filter(([k]) => machine[k]).map(([k, label]) => (
                  <div key={k} className="contents">
                    <dt>{label}</dt>
                    <dd>{String(machine[k])}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
            {LISTS.filter(([k]) => machine[k]?.length).map(([k, label]) => (
              <p key={k}>
                <b>{label}:</b> {machine[k].map(String).join(', ')}
              </p>
            ))}
            <div className="prose">
              {report.sections.map((section) => (
                <section key={section.title} aria-label={section.title}>
                  <h3>{section.title}</h3>
                  {/* Sanitized on the server (services/reports.js), the one choke point for posting content. */}
                  <div dangerouslySetInnerHTML={{ __html: section.html }} />
                </section>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <section aria-labelledby="his-h" className="stack" id="history">
        <h2 id="his-h">History</h2>
        <ul className="small">
          {runs
            .filter((r) => !['merge-tracker', 'mark-pdf-ready', 'reconcile-auto'].includes(r.kind))
            .map((r) => (
              <li key={r.id}>
                <a href={`#/activity/${r.id}`}>{runTitle(r)}</a> — {runState(r) === 'done' ? 'done' : runState(r)}, {shortDate(r.endedAt ?? r.queuedAt)}
              </li>
            ))}
          <li>
            {shortDate(row.date)} · added to Applications · now {statusLabel(statusId)}
          </li>
        </ul>
      </section>

      <ConfirmDialog
        isOpen={confirmAgain}
        title={`Check ${name} again?`}
        confirmLabel="Check fit again"
        onConfirm={checkAgain}
        onCancel={() => setConfirmAgain(false)}
      >
        <p>This job is marked {statusLabel(statusId)}. Checking it again takes 2–5 minutes and uses your Claude plan.</p>
      </ConfirmDialog>
    </>
  );
}
