import { useEffect, useRef, useState } from 'react';

import { removeInboxUrl, restoreInboxLine } from '../api.js';
import { RunItem } from '../components/RunItem.jsx';
import { ActionMenu, ConfirmDialog, CostNote, EmptyState } from '../components/ui.jsx';
import { reload, useResource } from '../data.js';
import { dateTime, fit, jobName, plural, shortDate } from '../lib/labels.js';
import { explainFailure, needsAttention, runState, runTitle } from '../lib/runs.js';
import { brokenBoards, newFromChecks } from '../lib/today.js';
import { latest, useRuns } from '../runs.jsx';
import { announce } from '../shell/announce.jsx';
import { navigate, PageHead } from '../shell/router.jsx';
import { offerUndo } from '../shell/undo.jsx';

/** The last check for new openings, in words (ia.md §2.4). */
function ScanSummary({ inbox, portals, scanRun, lastReal }) {
  const ref = useRef(null);
  const last = inbox.lastScan;
  const finished = scanRun && runState(scanRun) === 'done';
  useEffect(() => {
    if (finished) ref.current?.focus();
  }, [finished]);
  if (!last) return null;
  // The check's own list of what it added (never dates, which drift across midnight).
  const found = lastReal?.result?.added ?? [];
  const broken = brokenBoards(portals?.companies ?? [], portals?.health ?? {});
  const failed = last.status && last.status !== 'completed';
  return (
    <section className={`card ${broken.length || failed ? 'attn' : 'ok'}`} aria-labelledby="scan-sum-h" id="scan-summary" tabIndex={-1} ref={ref}>
      <h2 id="scan-sum-h" className="card-title">
        Last check, {dateTime(last.timestamp)}: {plural(last.new_added ?? found.length, 'new opening')}
      </h2>
      {found.length ? (
        <ul>
          {found.slice(0, 10).map((p) => (
            <li key={`${p.company}|${p.title}`}>
              {p.company} — {p.title}
              {p.location ? <span className="small muted"> · {p.location}</span> : null}
            </li>
          ))}
        </ul>
      ) : null}
      <p>
        {plural(last.companies ?? 0, 'company', 'companies')} checked.
        {broken.length ? (
          <>
            {' '}
            <b>{broken.map((c) => c.name).join(', ')} couldn’t be reached</b> (board not found) — <a href="#/companies">Fix in Companies</a>.
          </>
        ) : null}
        {failed ? ' The check stopped before it finished; some boards may not have been checked.' : ''}
      </p>
      <details>
        <summary>Technical details</summary>
        <p className="mono">
          scan.mjs · {last.found ?? 0} jobs found · {last.filtered_title ?? 0} filtered by title · {last.dupes ?? 0} already seen · {last.new_added ?? 0} added to data/pipeline.md · {last.errors ?? 0} errors · status {last.status}
        </p>
      </details>
    </section>
  );
}

function ScanButton({ portals }) {
  const { list, start } = useRuns();
  const [company, setCompany] = useState('');
  const [since, setSince] = useState('');
  const [preview, setPreview] = useState(false);
  const [verify, setVerify] = useState(false);
  const [error, setError] = useState(null);
  const scanning = list.find((r) => r.kind === 'scan' && ['waiting', 'working'].includes(runState(r)));
  const companies = (portals?.companies ?? []).filter((c) => c.enabled);

  const go = async () => {
    setError(null);
    try {
      const options = { ...(company ? { company } : {}), ...(since ? { since: Number(since) } : {}), ...(preview ? { dryRun: true } : {}), ...(verify ? { verify: true } : {}) };
      const run = await start('scan', options);
      announce(`Started: ${runTitle(run)}`);
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="stack-sm">
      {scanning ? (
        <RunItem run={scanning} />
      ) : (
        <div className="row">
          <button type="button" className="btn" onClick={go} disabled={!companies.length}>
            Check for new openings
          </button>
          <span className="hint inline">{companies.length ? `${plural(companies.length, 'company', 'companies')} · a few seconds · no AI` : 'Follow a company first, in Companies.'}</span>
        </div>
      )}
      <details>
        <summary>Options</summary>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="scan-company">Only this company</label>
            <select id="scan-company" value={company} onChange={(e) => setCompany(e.target.value)}>
              <option value="">All companies you follow</option>
              {companies.map((c) => (
                <option key={c.index} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="scan-days">Only openings from the last … days</label>
            <input id="scan-days" type="number" min="1" value={since} placeholder="Any age" onChange={(e) => setSince(e.target.value)} />
          </div>
          <label className="check">
            <input type="checkbox" checked={preview} onChange={(e) => setPreview(e.target.checked)} /> Preview without saving — see what would be added
          </label>
          <label className="check">
            <input type="checkbox" checked={verify} onChange={(e) => setVerify(e.target.checked)} /> Confirm each posting is still live — slower
          </label>
        </div>
      </details>
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * To review (ia.md §2.4): links waiting to be checked, found by a check for
 * new openings or saved by the user (data/pipeline.md).
 */
export function ToReviewPage() {
  const inbox = useResource('inbox');
  const portals = useResource('portals');
  const today = useResource('today');
  const workspace = useResource('workspace');
  const { list, start, retry, track } = useRuns();
  const [selected, setSelected] = useState([]);
  const [confirm, setConfirm] = useState(null);
  const [error, setError] = useState(null);

  if (!inbox.data) return <PageHead title="To review" lead={inbox.error ? inbox.error.message : 'Loading…'} />;

  const pending = inbox.data.pending;
  const fresh = new Set(newFromChecks(pending, list, today.data?.lastSeen ?? null).map((p) => p.url));
  const agentOk = workspace.data?.setup?.assistant && workspace.data?.setup?.cv;
  const scanRun = latest(list, 'scan');
  const runsFor = (url) => list.filter((r) => r.kind === 'evaluate' && r.meta?.url === url);

  const check = async (urls) => {
    setError(null);
    setConfirm(null);
    for (const url of urls) {
      try {
        const run = await start('evaluate', { url, autoPdf: false });
        track(run);
      } catch (e) {
        setError(e.message);
      }
    }
    announce(urls.length === 1 ? 'Started the fit check.' : `Started ${urls.length} fit checks. Up to 2 run at once; the rest wait their turn.`);
    setSelected([]);
  };

  const remove = async (items) => {
    setConfirm(null);
    const lines = [];
    for (const item of items) {
      try {
        const removed = await removeInboxUrl(item.url);
        lines.push(removed.line);
      } catch (e) {
        setError(e.message);
      }
    }
    await reload('inbox');
    setSelected([]);
    if (lines.length) {
      offerUndo(
        items.length === 1 ? `Removed ${jobName(items[0])} from To review` : `Removed ${lines.length} links from To review`,
        async () => {
          for (const line of lines) await restoreInboxLine(line);
          await reload('inbox');
        },
        { focus: true },
      );
    }
  };

  const chosen = pending.filter((p) => selected.includes(p.url));
  return (
    <>
      <PageHead title="To review" lead="Job links waiting to be checked: found at the companies you follow, or saved by you." />
      <ScanButton portals={portals.data} />
      <ScanSummary inbox={inbox.data} portals={portals.data} scanRun={scanRun} lastReal={list.filter((r) => r.kind === 'scan' && r.status === 'succeeded' && !r.result?.preview).sort((a, b) => (b.endedAt ?? 0) - (a.endedAt ?? 0))[0] ?? null} />
      {scanRun?.result?.preview && runState(scanRun) === 'done' ? (
        <p className="notice info" role="status">
          Preview, nothing saved: {plural(scanRun.result.added?.length ?? 0, 'new opening')} would be added
          {scanRun.result.added?.length ? `: ${scanRun.result.added.map((a) => `${a.company} — ${a.title}`).join('; ')}` : ''}.
        </p>
      ) : null}

      <section aria-labelledby="tr-h" className="stack-sm">
        <div className="row between">
          <h2 id="tr-h">
            {plural(pending.length, 'link')} to review{fresh.size ? ` · ${fresh.size} new` : ''}
          </h2>
          <div className="row">
            {chosen.length ? (
              <>
                <button type="button" className="btn" disabled={!agentOk} onClick={() => setConfirm('check')}>
                  Check fit for selected ({chosen.length})
                </button>
                <button type="button" className="btn2" onClick={() => setConfirm('remove')}>
                  Remove selected ({chosen.length})
                </button>
              </>
            ) : (
              <span className="small muted">Select links to check or remove several at once.</span>
            )}
            <ActionMenu label="Tidy up To review" text="Tidy up" items={[{ id: 'reconcile', label: 'Remove links already in Applications' }]} onAction={() => navigate('#/workspace#tool-reconcile')} />
          </div>
        </div>
        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}
        {!agentOk && workspace.data ? <p className="small muted">Checking fit needs your CV and the assistant (Claude Code) — see Today › Get set up.</p> : null}

        {pending.length ? (
          <ul className="plain stack-sm">
            {pending.map((p) => {
              const runs = runsFor(p.url);
              const checking = runs.find((r) => ['waiting', 'working'].includes(runState(r)));
              const failed = runs.find((r) => needsAttention(r, list));
              const name = jobName(p);
              return (
                <li key={p.url} className="card review-item">
                  <div className="row between">
                    <label className="check">
                      <input
                        type="checkbox"
                        checked={selected.includes(p.url)}
                        onChange={(e) => setSelected((s) => (e.target.checked ? [...s, p.url] : s.filter((u) => u !== p.url)))}
                      />
                      <span>
                        <b>{p.company ?? new URL(p.url).hostname}</b>
                        {p.title ? ` — ${p.title}` : ''} <span className="muted small">{[p.location, p.posted ? `posted ${shortDate(p.posted)}` : null].filter(Boolean).join(' · ')}</span>
                      </span>
                    </label>
                    <span className="row">
                      {fresh.has(p.url) ? <span className="badge new">New</span> : null}
                      {failed ? <span className="badge fail">Last check failed</span> : null}
                      {p.error ? <span className="badge warn">Posting couldn’t be read</span> : null}
                    </span>
                  </div>
                  {failed ? <p className="small">{explainFailure(failed).what}</p> : null}
                  {p.error ? <p className="small">The posting page didn’t load ({p.error}). Try again, or remove it if the job is gone.</p> : null}
                  {checking ? (
                    <RunItem run={checking} headingLevel={3} />
                  ) : (
                    <div className="row">
                      {failed ? (
                        <button type="button" className="btn btn-sm" onClick={() => retry(failed.id)}>
                          Try again<span className="visually-hidden"> for {name}</span>
                        </button>
                      ) : (
                        <button type="button" className="btn2 btn-sm" disabled={!agentOk} onClick={() => check([p.url])}>
                          Check fit<span className="visually-hidden"> for {name}</span>
                        </button>
                      )}
                      <a className="btn2 btn-sm" href={p.url} target="_blank" rel="noopener noreferrer">
                        Open the posting ↗<span className="visually-hidden"> {name} (new tab)</span>
                      </a>
                      <button type="button" className="btn2 btn-sm" onClick={() => remove([p])}>
                        Remove<span className="visually-hidden"> {name}</span>
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState title="Nothing waiting to be checked">
            <p>
              Check the companies you follow for new openings (above), or add a job by its link in <a href="#/applications">Applications</a>.
            </p>
          </EmptyState>
        )}

        {inbox.data.processed.length ? (
          <details>
            <summary>Already checked ({inbox.data.processed.length})</summary>
            <ul className="small">
              {inbox.data.processed.map((p) => (
                <li key={`${p.url}-${p.line}`}>
                  {p.reportId ? <a href={`#/applications/report/${p.reportId}`}>{jobName(p)}</a> : jobName(p)}
                  {typeof p.score === 'number' ? ` · fit ${fit(p.score)}` : ''}
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </section>

      <ConfirmDialog
        isOpen={confirm === 'check'}
        title={`Check fit for ${plural(chosen.length, 'job')}?`}
        confirmLabel={`Check ${plural(chosen.length, 'job')}`}
        onConfirm={() => check(chosen.map((p) => p.url))}
        onCancel={() => setConfirm(null)}
      >
        <p>
          Each check takes 2–5 minutes and uses your Claude plan; up to 2 run at once, so {plural(chosen.length, 'check')} take about {Math.ceil(chosen.length / 2) * 4} minutes in all.
        </p>
        <p>
          <CostNote />
        </p>
      </ConfirmDialog>
      <ConfirmDialog
        isOpen={confirm === 'remove'}
        title={`Remove ${plural(chosen.length, 'link')} from To review?`}
        confirmLabel="Remove"
        danger
        onConfirm={() => remove(chosen)}
        onCancel={() => setConfirm(null)}
      >
        <p>You can undo this right after. The jobs are not deleted anywhere else.</p>
      </ConfirmDialog>
    </>
  );
}
