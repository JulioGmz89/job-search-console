import { useEffect, useRef, useState } from 'react';

import { checkAgent, fetchRun } from '../api.js';
import { RunItem } from '../components/RunItem.jsx';
import { reload, setResource, useResource } from '../data.js';
import { jobName, plural, shortDate } from '../lib/labels.js';
import { reportsNotInApplications } from '../lib/reports.js';
import { runState } from '../lib/runs.js';
import { useRuns } from '../runs.jsx';
import { announce } from '../shell/announce.jsx';
import { PageHead, useAnchor } from '../shell/router.jsx';

/** The useful part of a script's output for a person: no blank lines, the end of it. */
/** The duplicate finder's "Remove #23 (Co — Role, 3.4) → kept #13 (4.1)" lines, as pairs. */
const pairs = (run) =>
  (run?.lines ?? [])
    .map((l) => /Remove #(\d+) \((.+), ([^,()]+)\) → kept #(\d+) \(([^)]+)\)/.exec(l.text))
    .filter(Boolean)
    .map(([, remove, name, fit, keep, keepFit]) => ({ remove, name, fit, keep, keepFit }));

const outputOf = (run) => (run?.lines ?? []).map((l) => l.text).filter((t) => t.trim()).slice(-40).join('\n');

/**
 * One tidy-up tool (ia.md §2.9). Tools that rewrite a file show a preview
 * first and change nothing until confirmed; the preview's own id authorises
 * the real run, once. Checks only read, so they run at once; one that finds
 * problems says so rather than "failed".
 */
function Tool({ id, kind, title, description, preview = false, confirmLabel = 'Apply these changes' }) {
  const { runs, start } = useRuns();
  const [step, setStep] = useState(null);
  const [runId, setRunId] = useState(null);
  const [full, setFull] = useState(null);
  const [error, setError] = useState(null);
  const resultRef = useRef(null);
  const run = runId ? runs[runId] : null;
  const finished = run && !['queued', 'running'].includes(run.status);

  useEffect(() => {
    if (!finished) return;
    fetchRun(run.id)
      .then(setFull)
      .catch(() => setFull(run));
  }, [finished, run]);
  useEffect(() => {
    if (full) resultRef.current?.focus();
  }, [full]);

  const go = async (asPreview, token) => {
    setError(null);
    setFull(null);
    try {
      const started = await start(kind, asPreview ? { dryRun: true } : {}, token);
      setRunId(started.id);
      setStep(asPreview ? 'preview' : 'apply');
      announce(`Started: ${title}`);
    } catch (e) {
      setError(e.message);
    }
  };

  // What the check found, in words, from its result (R-recheck-02); a check can
  // find warnings and still exit 0.
  const findings = full?.result?.findings ?? [];
  const total = full?.result?.total ?? findings.length;
  const clean = full?.result?.clean === true;
  const found = Boolean(full && full.reportsFindings && ((full.status === 'failed' && full.exitCode === 1) || findings.length));
  const ok = full && (full.status === 'succeeded' || found);
  return (
    <section className="card" aria-labelledby={`${id}-h`} id={id}>
      <h3 id={`${id}-h`}>{title}</h3>
      <p className="muted">{description}</p>
      {run && !finished ? <RunItem run={run} headingLevel={4} /> : null}
      {full && !ok ? <RunItem run={full} headingLevel={4} /> : null}
      {ok ? (
        <div className="stack-sm" tabIndex={-1} ref={resultRef}>
          <p className={`notice ${found ? 'warn' : step === 'preview' ? 'info' : 'ok'}`}>
            {step === 'preview' ? 'Preview — nothing has changed yet. This is what would change:' : found ? (total ? `Found ${plural(total, 'problem')}:` : 'Found problems:') : clean ? 'No problems found.' : 'Done.'}
          </p>
          {findings.length && !pairs(full).length ? (
            <ul>
              {findings.map((f) => (
                <li key={f}>{f}</li>
              ))}
              {total > findings.length ? <li>and {total - findings.length} more (in Technical details)</li> : null}
            </ul>
          ) : null}
          {pairs(full).length ? (
            <ul>
              {pairs(full).map((p) => (
                <li key={p.remove}>
                  Application #{p.remove} ({p.name}, fit {p.fit}) would be merged into #{p.keep} (fit {p.keepFit}), keeping the higher fit, the furthest status and every note.
                </li>
              ))}
            </ul>
          ) : null}
          <details open={!pairs(full).length && !findings.length && !clean}>
            <summary>{pairs(full).length || findings.length || clean ? 'Technical details' : 'What it printed'}</summary>
            <pre className="log" tabIndex={0} aria-label={`${title}: output`}>
              {outputOf(full) || 'Nothing to report.'}
            </pre>
          </details>
          {step === 'preview' ? (
            <div className="row">
              <button type="button" className="btn" onClick={() => go(false, full.id)}>
                {confirmLabel}
              </button>
              <button
                type="button"
                className="btn2"
                onClick={() => {
                  setRunId(null);
                  setFull(null);
                  setStep(null);
                  announce('Nothing was changed.');
                  setTimeout(() => document.querySelector(`#${id} .row button`)?.focus(), 0);
                }}
              >
                Don’t change anything
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
      {!run || (finished && step !== 'preview') ? (
        <div className="row">
          <button type="button" className="btn2" onClick={() => go(preview)}>
            {title}
          </button>
          <span className="hint inline">{preview ? 'Shows what would change first' : 'Only reads; changes nothing'} · no AI</span>
        </div>
      ) : null}
    </section>
  );
}

/** What to do about each kind of data problem, in words. */
function Fix({ issue }) {
  if (issue.code === 'row-unparseable') {
    return (
      <>
        <b>{issue.message}</b> To fix it: open data/applications.md in your editor, go to line {issue.line}, and make the row match the others (one cell per column, a score like 4.2/5). The app picks the change up by itself.
      </>
    );
  }
  if (issue.code === 'report-missing') return <>Application #{issue.id} points to a fit report that is not in the reports folder. Check the job again, or remove the row.</>;
  if (issue.code === 'status-unknown') return <>{issue.message}. Choose a status for it in Applications.</>;
  return <>{issue.message ?? issue.code}</>;
}

/**
 * Workspace (ia.md §2.9): the folder in use, the health of its data, the
 * tidy-up tools, the assistant, and help.
 */
export function WorkspacePage() {
  const workspace = useResource('workspace');
  const agent = useResource('agent');
  const anchor = useAnchor();
  const [checking, setChecking] = useState(false);
  const { list } = useRuns();
  const reports = useResource('reports');
  const pipeline = useResource('pipeline');

  useEffect(() => {
    if (anchor && workspace.data) document.getElementById(anchor)?.scrollIntoView();
  }, [anchor, workspace.data]);

  if (!workspace.data) return <PageHead title="Workspace" lead={workspace.error ? workspace.error.message : 'Loading…'} />;
  const { dataRoot, counts, issues, files } = workspace.data;
  const problems = issues.filter((i) => i.level !== 'info');
  const loose = reports.data && pipeline.data ? reportsNotInApplications(reports.data.reports, pipeline.data.rows) : [];
  const check = agent.data?.check;
  const busyAgents = list.filter((r) => r.lane === 'agent' && runState(r) === 'working');

  return (
    <>
      <PageHead title="Workspace" lead="The folder the app reads, its health, and tools to tidy it up." />

      <section className="card" aria-labelledby="fold-h">
        <h2 id="fold-h" className="card-title">
          Folder
        </h2>
        <p className="mono">{dataRoot}</p>
        <p>
          {plural(counts.applications, 'application')} · {plural(counts.reports, 'fit report')} · {plural(counts.pdfs, 'tailored CV')} · {plural(counts.companies, 'company', 'companies')} followed ·{' '}
          {plural(counts.toReview, 'link')} to review
        </p>
        <p className="small muted">
          {['cv', 'profile', 'portals', 'voice'].filter((f) => !files[f]).length
            ? `Not created yet: ${[
                !files.cv && 'your CV (cv.md)',
                !files.profile && 'your profile (config/profile.yml)',
                !files.portals && 'companies you follow (portals.yml)',
                !files.voice && 'writing rules (voice-dna.md)',
              ]
                .filter(Boolean)
                .join(', ')}.`
            : 'Your CV, profile, companies and writing rules are all set up.'}{' '}
          <a href="#/help/files">What each file is</a>
        </p>
      </section>

      <section className={`card ${problems.length ? 'attn' : ''}`} aria-labelledby="health-h" id="health">
        <h2 id="health-h" className="card-title">
          Data health
        </h2>
        {problems.length ? (
          <ul className="stack-sm">
            {problems.map((issue, n) => (
              <li key={n}>
                <Fix issue={issue} />
              </li>
            ))}
          </ul>
        ) : (
          <p>No problems found.</p>
        )}
        <h3 id="loose-h">Fit reports not in Applications ({loose.length})</h3>
        {loose.length ? (
          <>
            <p className="small muted">Checks whose job never reached Applications, or whose application was merged or removed. They are kept, and you can read each one.</p>
            <ul aria-labelledby="loose-h">
              {loose.slice(0, 20).map((rep) => (
                <li key={rep.id}>
                  {jobName({ company: rep.machine?.company, role: rep.machine?.role }) || rep.title} · fit report {rep.id}
                  {rep.date ? `, ${shortDate(rep.date)}` : ''} · <a href={`#/applications/report/${rep.id}`}>Open<span className="visually-hidden"> the fit report for {jobName({ company: rep.machine?.company, role: rep.machine?.role }) || rep.title}</span></a>
                </li>
              ))}
            </ul>
            {loose.length > 20 ? <p className="small muted">and {loose.length - 20} more, in the reports folder.</p> : null}
          </>
        ) : (
          <p className="small">None: every fit report belongs to an application.</p>
        )}
      </section>

      <section className="stack" aria-labelledby="tidy-h">
        <h2 id="tidy-h">Tidy up</h2>
        <div className="grid-2">
          <Tool
            id="tool-dedup"
            kind="dedup"
            preview
            title="Find duplicate applications"
            description="Looks for the same job listed twice and merges each pair, keeping the higher fit, the furthest status and every note. Shows the pairs first; a backup is kept as applications.md.bak."
            confirmLabel="Merge these duplicates"
          />
          <Tool
            id="tool-reconcile"
            kind="reconcile"
            preview
            title="Remove links already in Applications"
            description="Clears links from To review that you have already checked."
            confirmLabel="Remove these links"
          />
          <Tool id="tool-verify" kind="verify-pipeline" title="Check my list for problems" description="Checks that every application has a valid status, score and fit report." />
          <Tool id="tool-validate" kind="validate-portals" title="Check the companies list for mistakes" description="Reads your companies file for unknown board types, missing names and broken links. Changes nothing." />
          <Tool
            id="tool-boards"
            kind="verify-portals"
            title="Find the right job board for a company"
            description="Visits each company’s board; for one that moved, suggests where its board is now."
          />
        </div>
      </section>

      <section className={`card ${check && !check.ready ? 'attn' : ''}`} aria-labelledby="ai-h" id="assistant">
        <h2 id="ai-h" className="card-title">
          AI assistant
        </h2>
        {!agent.data ? (
          <p className="muted">Checking…</p>
        ) : check?.ready ? (
          <p>
            Claude Code {check.version ? `version ${check.version} ` : ''}is installed ({agent.data.bin.display}). Up to {agent.data.maxAgents} checks run at once; more wait their turn
            {busyAgents.length ? ` (${busyAgents.length} running now)` : ''}. Changing this comes in a later version.
          </p>
        ) : (
          <p>
            Claude Code is not available{check?.error && check.error !== 'not-found' ? ` (${check.error})` : ''}. The app looked for: <span className="mono">{agent.data.bin.display}</span>.{' '}
            <a href="#/help/assistant">How to install it</a>
          </p>
        )}
        <div className="row">
          <button
            type="button"
            className="btn2 btn-sm"
            disabled={checking}
            onClick={async () => {
              setChecking(true);
              try {
                const status = await checkAgent();
                setResource('agent', status);
                reload('workspace');
                announce(status.check?.ready ? 'Claude Code is ready.' : 'Claude Code is not available.', { assertive: !status.check?.ready });
              } finally {
                setChecking(false);
              }
            }}
          >
            Check again
          </button>
        </div>
      </section>

      <section className="card" aria-labelledby="help-h">
        <h2 id="help-h" className="card-title">
          Help
        </h2>
        <p>
          <a href="#/help">All help topics</a> · <a href="#/activity">Everything the app has done</a>
        </p>
      </section>
    </>
  );
}
