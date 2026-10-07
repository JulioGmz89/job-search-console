import { useEffect, useRef, useState } from 'react';

import { checkAgent, createPortalEntry, saveCvContent, saveToday } from '../api.js';
import { AddJob, shownInline } from '../components/AddJob.jsx';
import { RunItem } from '../components/RunItem.jsx';
import { HelpLink, Tag } from '../components/ui.jsx';
import { reload, setResource, useResource } from '../data.js';
import { fit, jobName, plural, shortDate, statusLabel } from '../lib/labels.js';
import { isTopLevel, outcome, runState, runTitle } from '../lib/runs.js';
import { todayCards } from '../lib/today.js';
import { useRuns } from '../runs.jsx';
import { announce } from '../shell/announce.jsx';
import { boardType, isBoard } from '../lib/boards.js';
import { cvSummaryText, readTextFile } from '../lib/cvtext.js';
import { PageHead } from '../shell/router.jsx';
import { offerUndo } from '../shell/undo.jsx';

function StepHead({ n, done, id, children }) {
  return (
    <div className="row">
      <span className={`stepnum ${done ? 'done' : ''}`} aria-hidden="true">
        {done ? '✓' : n}
      </span>
      <h3 id={id}>
        {children}
        {done ? <span className="visually-hidden"> (done)</span> : null}
      </h3>
    </div>
  );
}

function CvStep() {
  const cv = useResource('cv');
  const [text, setText] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const savedRef = useRef(null);
  const [justSaved, setJustSaved] = useState(false);
  const done = cv.data?.exists === true;

  useEffect(() => {
    if (justSaved) savedRef.current?.focus();
  }, [justSaved]);

  const save = async (value) => {
    setError(null);
    setBusy(true);
    try {
      const saved = await saveCvContent(value);
      setResource('cv', saved);
      reload('workspace');
      reload('agent');
      setJustSaved(true);
      announce(`Your CV is saved: ${cvSummaryText(saved.summary)}`);
    } catch (e) {
      setError(e.message);
      announce(`Your CV was not saved: ${e.message}`, { assertive: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className={`card ${done ? 'ok' : ''}`} aria-labelledby="step-cv">
      <StepHead n={1} done={done} id="step-cv">
        Add your CV
      </StepHead>
      {done ? (
        <p id="cv-saved" tabIndex={-1} ref={savedRef}>
          Saved: {cvSummaryText(cv.data.summary)}. <a href="#/my-cv/content">Edit in My CV</a>
        </p>
      ) : (
        <>
          <p className="muted">Every check, tailored CV and letter starts from it. Paste it, or choose a Markdown or text file.</p>
          <form
            className="stack-sm"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              if (!text.trim()) {
                setError('Paste your CV first, or choose a file.');
                announce('Paste your CV first, or choose a file.', { assertive: true });
                document.getElementById('cv-paste')?.focus();
              } else save(text);
            }}
          >
            <div className="field">
              <label htmlFor="cv-paste">Your CV</label>
              <textarea
                id="cv-paste"
                rows={8}
                value={text}
                placeholder="Paste your CV here (Markdown or plain text)"
                onChange={(e) => {
                  setText(e.target.value);
                  setError(null);
                }}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? 'cv-paste-err cv-paste-hint' : 'cv-paste-hint'}
              />
              {error ? (
                <p className="error" id="cv-paste-err">
                  {error}
                </p>
              ) : null}
              <p className="hint" id="cv-paste-hint">
                Saved in your workspace folder as cv.md, so the command-line tools see it too. You can edit it later in My CV.
              </p>
            </div>
            <div className="row">
              <span className="small muted">Or</span>
              <label htmlFor="cv-file" className="btn2 btn-sm file-button">
                Choose a file…
              </label>
              <input
                id="cv-file"
                className="visually-hidden"
                type="file"
                accept=".md,.txt,text/markdown,text/plain"
                onChange={async (e) => {
                  try {
                    const value = await readTextFile(e.target.files?.[0]);
                    setText(value);
                    await save(value);
                  } catch (err) {
                    setError(err.message);
                  }
                }}
              />
            </div>
            <div className="row">
              <button type="submit" className="btn" disabled={busy}>
                Save my CV
              </button>
            </div>
          </form>
        </>
      )}
    </li>
  );
}

function CompanyStep() {
  const portals = useResource('portals');
  const { list, start } = useRuns();
  const [scanId, setScanId] = useState(null);
  const scanRun = scanId ? (list.find((r) => r.id === scanId) ?? null) : null;
  const [name, setName] = useState('');
  const [link, setLink] = useState('');
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const savedRef = useRef(null);
  const following = (portals.data?.companies ?? []).filter((c) => c.enabled);
  const done = following.length > 0;

  useEffect(() => {
    if (justSaved) savedRef.current?.focus();
  }, [justSaved]);

  const submit = async (e) => {
    e.preventDefault();
    const found = {};
    if (!name.trim()) found.name = 'Type the company name.';
    if (!/^https?:\/\/\S+$/i.test(link.trim())) found.link = 'Paste the careers page link, starting with https://';
    setErrors(found);
    if (Object.keys(found).length) {
      announce(Object.values(found).join(' '), { assertive: true });
      document.getElementById(found.name ? 'co-name' : 'co-url')?.focus();
      return;
    }
    setBusy(true);
    try {
      await createPortalEntry('company', { name: name.trim(), careersUrl: link.trim(), enabled: true }, portals.data?.etag ?? null);
      await reload('portals');
      reload('workspace');
      setJustSaved(true);
      announce(`Following ${name.trim()}`);
    } catch (err) {
      setErrors({ form: err.message });
      announce(`The company was not followed: ${err.message}`, { assertive: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className={`card ${done ? 'ok' : ''}`} aria-labelledby="step-co">
      <StepHead n={2} done={done} id="step-co">
        Follow a company
      </StepHead>
      {done ? (
        <div className="stack-sm">
          <p id="co-saved" tabIndex={-1} ref={savedRef}>
            Following <b>{following[0].name}</b>
            {isBoard(following[0]) ? ` · ${boardType(following[0])} job board recognised from the link` : ''}
            {following.length > 1 ? ` · and ${plural(following.length - 1, 'other company', 'other companies')}` : ''}. The first check for new openings shows whether it answers.{' '}
            <a href="#/companies">Companies you follow</a>
          </p>
          {isBoard(following[0]) ? null : (
            <p className="notice warn">
              The app doesn’t recognise this link as a job board it can read, so checks may find nothing at {following[0].name}. If the company posts its jobs on Greenhouse,
              Lever or Ashby, use that link instead (<a href="#/companies">Companies</a> › Edit).
            </p>
          )}
          <div className="row">
            <button
              type="button"
              className="btn2 btn-sm"
              onClick={async () => {
                const run = await start('scan', {});
                setScanId(run.id);
                announce(`Started: ${runTitle(run)}`);
              }}
            >
              Check {following.length === 1 ? following[0].name : 'them'} for new openings now
            </button>
            <span className="hint inline">A few seconds · no AI involved</span>
          </div>
          {scanRun ? (
            <div data-run-home>
              <RunItem run={scanRun} headingLevel={4} />
            </div>
          ) : null}
        </div>
      ) : (
        <>
          <p className="muted">The app checks the companies you follow for new openings. Start with one; add more any time.</p>
          <form className="stack-sm" noValidate onSubmit={submit}>
            <div className="grid-2">
              <div className="field">
                <label htmlFor="co-name">Company name</label>
                <input id="co-name" type="text" value={name} placeholder="e.g. Example Corp" onChange={(e) => {
                    setName(e.target.value);
                    setErrors((x) => ({ ...x, name: undefined }));
                  }} aria-invalid={errors.name ? true : undefined} aria-describedby={errors.name ? 'co-name-err' : undefined} />
                {errors.name ? (
                  <p className="error" id="co-name-err">
                    {errors.name}
                  </p>
                ) : null}
              </div>
              <div className="field">
                <label htmlFor="co-url">Careers page link</label>
                <input id="co-url" type="url" value={link} placeholder="https://…" onChange={(e) => {
                    setLink(e.target.value);
                    setErrors((x) => ({ ...x, link: undefined }));
                  }} aria-invalid={errors.link ? true : undefined} aria-describedby={errors.link ? 'co-url-err' : 'co-url-hint'} />
                {errors.link ? (
                  <p className="error" id="co-url-err">
                    {errors.link}
                  </p>
                ) : (
                  <p className="hint" id="co-url-hint">
                    Greenhouse, Lever, Ashby and most other job boards are recognised from the link.
                  </p>
                )}
              </div>
            </div>
            {errors.form ? (
              <p className="error" role="alert">
                {errors.form}
              </p>
            ) : null}
            <div className="row">
              <button type="submit" className="btn" disabled={busy}>
                Follow company
              </button>
            </div>
          </form>
        </>
      )}
    </li>
  );
}

function AssistantStep() {
  const agent = useResource('agent');
  const [busy, setBusy] = useState(false);
  const check = agent.data?.check;
  const ready = check?.ready === true;
  return (
    <li className={`card ${ready ? 'ok' : agent.data ? 'attn' : ''}`} aria-labelledby="step-ai">
      <StepHead n={3} done={ready} id="step-ai">
        {ready ? 'AI assistant ready' : 'AI assistant'}
      </StepHead>
      {!agent.data ? <p className="muted">Checking for Claude Code…</p> : null}
      {ready ? (
        <p>
          Claude Code is installed{check.version ? ` (version ${check.version})` : ''}. Each check takes 2–5 minutes and uses your Claude plan.{' '}
          <HelpLink topic="costs">What a check costs</HelpLink>
        </p>
      ) : null}
      {agent.data && !ready ? (
        <>
          <p>
            {check?.error === 'not-found'
              ? 'Claude Code was not found on this computer. The app uses it to check jobs and write tailored CVs and letters.'
              : `Claude Code was found but did not start${check?.error && check.error !== 'not-found' ? ` (${check.error})` : ''}.`}
          </p>
          <div className="row">
            <a className="btn2" href="#/help/assistant">
              How to install it
            </a>
            <button
              type="button"
              className="btn"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const status = await checkAgent();
                  setResource('agent', status);
                  reload('workspace');
                  announce(status.check?.ready ? 'Claude Code is ready.' : 'Claude Code is still not available.', { assertive: !status.check?.ready });
                } finally {
                  setBusy(false);
                }
              }}
            >
              Check again
            </button>
          </div>
          <p className="small muted">Everything else in the app works without it: following companies, checking for openings, your CV and its design.</p>
        </>
      ) : null}
    </li>
  );
}

function Setup({ setup }) {
  const left = [setup.cv, setup.company, setup.assistant].filter((x) => !x).length;
  return (
    <>
      <PageHead title="Welcome. Let’s get you set up." lead={`${plural(left, 'step')} left · about 5 minutes. Everything else in the app works meanwhile.`} />
      <section aria-labelledby="setup-h" className="stack">
        <h2 id="setup-h">Get set up</h2>
        <ol className="steps">
          <CvStep />
          <CompanyStep />
          <AssistantStep />
        </ol>
      </section>
      {setup.cv ? (
        <section aria-labelledby="fj-h" className="card stack">
          <h2 id="fj-h" className="card-title">
            Check your first job
          </h2>
          <p className="muted">Have a job in mind? Paste its link and the assistant tells you how well it fits your CV.</p>
          <AddJob idPrefix="first" headingId="fj-h" />
        </section>
      ) : null}
    </>
  );
}

function FailureCard({ run, onDismiss }) {
  return (
    <div className="stack-sm">
      <Tag tone="attn">Needs you · {run.kind === 'evaluate' ? 'a fit check' : 'something'} didn’t finish</Tag>
      <RunItem run={run} headingLevel={3} />
      <div className="row">
        <button type="button" className="btn2 btn-sm" onClick={() => onDismiss(run)}>
          Dismiss<span className="visually-hidden"> {runTitle(run)}</span>
        </button>
      </div>
    </div>
  );
}

/** Set-up was finished on this visit: say so, and keep focus on something real (WP-T1). */
function SetupDone({ cvSummary, company, readable, onClose }) {
  const ref = useRef(null);
  useEffect(() => ref.current?.focus(), []);
  return (
    <article className="card ok" aria-labelledby="setup-done-h">
      <Tag tone="ok">Set-up complete</Tag>
      <h2 id="setup-done-h" className="card-title" tabIndex={-1} ref={ref}>
        You’re set up
      </h2>
      <ul className="plain stack-sm">
        <li>✓ Your CV: {cvSummary} · <a href="#/my-cv/content">Edit in My CV</a></li>
        <li>
          ✓ Following <b>{company}</b> · <a href="#/companies">Companies you follow</a>
          {readable ? null : (
            <p className="notice warn">
              The app doesn’t recognise this link as a job board it can read, so checks may find nothing at {company}. If the company posts its jobs on Greenhouse, Lever
              or Ashby, use that link instead (<a href="#/companies">Companies</a> › Edit).
            </p>
          )}
        </li>
        <li>✓ AI assistant ready</li>
      </ul>
      <p>Next: check a job you already like (below), or look for new openings at {company}.</p>
      <div className="row">
        <button type="button" className="btn2" onClick={onClose}>
          Got it
        </button>
      </div>
    </article>
  );
}

function greeting(name) {
  const hour = new Date().getHours();
  const part = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  return name ? `${part}, ${name.split(/\s+/)[0]}` : part;
}

export function TodayPage() {
  const workspace = useResource('workspace');
  const today = useResource('today');
  const pipeline = useResource('pipeline');
  const inbox = useResource('inbox');
  const portals = useResource('portals');
  const design = useResource('design');
  const cv = useResource('cv');
  const { list, start } = useRuns();
  const [ackd, setAckd] = useState([]);
  // The check started from this page, shown with its result where it was clicked (H8-today-02).
  const [scanId, setScanId] = useState(null);
  const [justSetUp, setJustSetUp] = useState(false);
  const firstJobVisit = useRef(false);
  const openedAt = useRef(Date.now());
  const wasDone = useRef(null);
  const setupDone = workspace.data?.setup?.done;
  useEffect(() => {
    if (setupDone === undefined) return;
    if (wasDone.current === false && setupDone) {
      setJustSetUp(true);
      announce('You’re set up.');
    }
    wasDone.current = setupDone;
  }, [setupDone]);
  const lastSeenRef = useRef(null);
  lastSeenRef.current = today.data?.lastSeen ?? null;

  // "Last looked" is written when the user leaves Today (ia.md §2.1).
  useEffect(() => {
    const leave = () => saveToday({ lastSeen: new Date().toISOString() }).then(() => reload('today')).catch(() => {});
    window.addEventListener('pagehide', leave);
    return () => {
      window.removeEventListener('pagehide', leave);
      leave();
    };
  }, []);

  if (!workspace.data) return <PageHead title="Today" lead={workspace.error ? `Could not load your workspace: ${workspace.error.message}` : 'Loading…'} />;
  if (!workspace.data.setup.done) return <Setup setup={workspace.data.setup} />;

  const dismissed = today.data?.dismissed ?? [];
  const cards = todayCards({
    runs: list,
    dismissed,
    rows: pipeline.data?.rows ?? [],
    issues: pipeline.data?.issues ?? [],
    design: design.data,
    companies: portals.data?.companies ?? [],
    health: portals.data?.health ?? {},
    pending: inbox.data?.pending ?? [],
    lastSeen: lastSeenRef.current,
  });
  const rowForReport = (id) => pipeline.data?.rows?.find((r) => r.reportId === id) ?? null;
  const finished = list.filter(
    (r) => r.status === 'succeeded' && isTopLevel(r) && ['evaluate', 'pdf', 'cover', 'cv-render'].includes(r.kind) && !dismissed.includes(r.id) && !ackd.includes(r.id) && !shownInline.has(r.id) && (r.endedAt ?? 0) > (lastSeenRef.current ? Date.parse(lastSeenRef.current) : 0),
  );

  const dismiss = async (run) => {
    await saveToday({ dismiss: run.id });
    await reload('today');
    offerUndo(
      `Dismissed ${runTitle(run)}`,
      async () => {
        await saveToday({ undismiss: run.id });
        await reload('today');
      },
      { focus: true },
    );
  };

  const { needs, fresh, waiting, working } = cards;
  // A failure the user just tried again stays here, "still working", until the
  // retry ends, so Try again shows its progress where it was clicked.
  const retrying = list.filter(
    (r) => runState(r) === 'failed' && !dismissed.includes(r.id) && list.some((x) => x.retryOf === r.id && (['waiting', 'working'].includes(runState(x)) || (x.endedAt ?? 0) > openedAt.current)),
  );
  const noJobs = (pipeline.data?.rows ?? []).length === 0;
  // The first check's section stays for the visit, so its result and Open the job
  // stay where the user started it (W8-first-job-02).
  if (noJobs) firstJobVisit.current = true;
  const showFirstJob = noJobs || firstJobVisit.current;
  // A check shown in that section is not shown again under Working now (W8-first-job-01).
  const workingElsewhere = working.filter((r) => !shownInline.has(r.id) && r.id !== scanId);
  const scanRun = scanId ? (list.find((r) => r.id === scanId) ?? null) : null;
  const firstFollowed = (portals.data?.companies ?? []).find((c) => c.enabled);
  const firstCompany = firstFollowed?.name ?? '';

  return (
    <>
      <PageHead
        title={greeting(cv.data?.summary?.name)}
        lead={`${needs.count ? `${plural(needs.count, 'thing needs', 'things need')} you. ` : 'Nothing needs you right now. '}Here is what changed and what is waiting.`}
      />
      {justSetUp ? <SetupDone cvSummary={cvSummaryText(cv.data?.summary)} company={firstCompany} readable={!firstFollowed || isBoard(firstFollowed) || firstFollowed.scanMethod === 'websearch'} onClose={() => setJustSetUp(false)} /> : null}

      {needs.count || retrying.length ? (
        <section aria-labelledby="needs-h" className="stack">
          <h2 id="needs-h" className="group-title">
            Needs you
          </h2>
          {[...needs.failures, ...retrying].map((r) => (
            <FailureCard key={r.id} run={r} onDismiss={dismiss} />
          ))}
          {needs.unreadable.length ? (
            <article className="card attn" aria-labelledby="unread-h">
              <Tag tone="attn">Needs you · data problem</Tag>
              <h3 id="unread-h">{plural(needs.unreadable.length, 'application')} could not be read</h3>
              <ul>
                {needs.unreadable.map((i) => (
                  <li key={i.line}>
                    {i.message ?? `Line ${i.line} of your applications file.`} It is left out of Applications until it is fixed.
                  </li>
                ))}
              </ul>
              <div className="row">
                <a className="btn2" href="#/workspace#health">
                  Show me
                </a>
              </div>
            </article>
          ) : null}
          {needs.designFails ? (
            <article className="card attn" aria-labelledby="design-h">
              <Tag tone="attn">Needs you · your CV design</Tag>
              <h3 id="design-h">Your CV design fails the screening check</h3>
              <p>
                Tailored CVs made with the “{design.data.template}” design lose text when an applicant-tracking system reads them
                {design.data.issues?.length ? `: ${design.data.issues[0].replace(/\.$/, '')}` : ''}.
              </p>
              <div className="row">
                <a className="btn" href="#/my-cv/design">
                  Choose a design that passes
                </a>
                <HelpLink topic="screening">What the screening check is</HelpLink>
              </div>
            </article>
          ) : null}
          {needs.links.map((c) => (
            <article className="card attn" key={c.name} aria-labelledby={`link-${c.index ?? c.name}`}>
              <Tag tone="attn">Needs you · a link the app can’t read</Tag>
              <h3 id={`link-${c.index ?? c.name}`}>{c.name}’s link isn’t a job board the app can read</h3>
              <p>
                Checks for new openings will find nothing at {c.name}. If the company posts its jobs on Greenhouse, Lever or Ashby, use that link instead.
              </p>
              <div className="row">
                <a className="btn2" href="#/companies">
                  Fix {c.name}’s link
                </a>
              </div>
            </article>
          ))}
          {needs.boards.map((c) => (
            <article className="card attn" key={c.name} aria-labelledby={`board-${c.index}`}>
              <Tag tone="attn">Needs you · a job board isn’t working</Tag>
              <h3 id={`board-${c.index}`}>
                {c.name}: board not found since {shortDate(c.since)}
              </h3>
              <p>The app can’t check {c.name} for new openings until the link is fixed or the company is paused.</p>
              <div className="row">
                <a className="btn2" href="#/companies">
                  Fix {c.name}
                </a>
              </div>
            </article>
          ))}
        </section>
      ) : null}

      {finished.length ? (
        <section aria-labelledby="done-h" className="stack">
          <h2 id="done-h" className="group-title">
            Just finished
          </h2>
          {finished.map((r) => {
            const row = rowForReport(Number(r.result?.reportId ?? r.meta?.reportId));
            const res = outcome(r, { rowForReport, all: list, rows: pipeline.data?.rows ?? [] });
            return (
              <article className="card ok" key={r.id} aria-labelledby={`done-${r.id}`}>
                <Tag tone="ok">Done</Tag>
                <h3 id={`done-${r.id}`}>{row ? jobName(row) : runTitle(r)}</h3>
                {r.kind === 'evaluate' && row ? (
                  <p className="big">
                    <b>Fit {fit(row.score)} / 5</b>
                    {row.report?.decision ? (
                      <>
                        {' '}
                        · Recommendation: <b>{row.report.decision}</b>
                      </>
                    ) : null}
                  </p>
                ) : (
                  <p>{res.text}</p>
                )}
                <div className="row">
                  {res.open ? (
                    <a className="btn" href={res.open.href}>
                      {res.open.label}
                    </a>
                  ) : null}
                  <button type="button" className="btn2" onClick={() => setAckd((a) => [...a, r.id])}>
                    Got it<span className="visually-hidden">: {runTitle(r)}</span>
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      ) : null}

      {workingElsewhere.length ? (
        <section aria-labelledby="work-h" className="stack">
          <h2 id="work-h" className="group-title">
            Working now
          </h2>
          {workingElsewhere.map((r) => (
            <RunItem key={r.id} run={r} />
          ))}
        </section>
      ) : null}

      {showFirstJob ? (
        <section aria-labelledby="fj-h" className="card stack">
          <h2 id="fj-h" className="card-title">
            Check your first job
          </h2>
          <p className="muted">Paste a job’s link and the assistant tells you how well it fits your CV.</p>
          <AddJob idPrefix="first" headingId="fj-h" />
        </section>
      ) : null}

      <section aria-labelledby="new-h" className="stack">
        <h2 id="new-h" className="group-title">
          New since you last looked
        </h2>
        {fresh.length ? (
          <article className="card" aria-labelledby="fresh-h">
            <h3 id="fresh-h">{plural(fresh.length, 'new opening')} at the companies you follow</h3>
            <ul>
              {fresh.slice(0, 6).map((p) => (
                <li key={p.url}>{jobName(p)}</li>
              ))}
            </ul>
            {fresh.length > 6 ? <p className="small muted">and {fresh.length - 6} more.</p> : null}
            <div className="row">
              <a className="btn2" href="#/to-review">
                Look at the {fresh.length} new openings
              </a>
            </div>
          </article>
        ) : (
          <article className="card" aria-labelledby="scan-h">
            <h3 id="scan-h">{inbox.data?.lastScan?.timestamp ? `Last checked for new openings ${shortDate(inbox.data.lastScan.timestamp)}` : 'You haven’t checked for new openings yet'}</h3>
            <p className="muted">Checks the {plural(workspace.data.counts.companies, 'company', 'companies')} you follow. Takes a few seconds; no AI involved.</p>
            <div className="row">
              <button
                type="button"
                className="btn2"
                onClick={async () => {
                  const run = await start('scan', {});
                  setScanId(run.id);
                  announce(`Started: ${runTitle(run)}`);
                }}
              >
                Check for new openings
              </button>
            </div>
          </article>
        )}
        {scanRun ? (
          <div data-run-home>
            <RunItem run={scanRun} headingLevel={3} />
          </div>
        ) : null}
      </section>

      {waiting.replied.length || waiting.reviewed.length ? (
        <section aria-labelledby="wait-h" className="stack">
          <h2 id="wait-h" className="group-title">
            Waiting for you
          </h2>
          {waiting.replied.length ? (
            <article className="card" aria-labelledby="replied-h">
              <h3 id="replied-h">
                {plural(waiting.replied.length, 'job')} that replied or {waiting.replied.length === 1 ? 'is' : 'are'} interviewing without a tailored CV or letter
              </h3>
              <ul>
                {waiting.replied.map((r) => (
                  <li key={r.id}>
                    <a href={`#/applications/${r.id}#documents`}>{jobName(r)}</a> — {statusLabel(r.statusId ?? r.status)} · {!r.pdf && !r.cover ? 'no CV or letter' : !r.pdf ? 'no tailored CV' : 'no cover letter'}
                  </li>
                ))}
              </ul>
              <div className="row">
                <a className="btn2" href={`#/applications/${waiting.replied[0].id}#documents`}>
                  Get documents ready{waiting.replied.length > 1 ? ' (start with the first)' : ''}
                </a>
              </div>
            </article>
          ) : null}
          {waiting.reviewed.length ? (
            <article className="card" aria-labelledby="reviewed-h">
              <h3 id="reviewed-h">{plural(waiting.reviewed.length, 'job')} reviewed but not applied</h3>
              <p>
                Best:{' '}
                {waiting.reviewed.slice(0, 3).map((r, i) => (
                  <span key={r.id}>
                    {i ? ' · ' : ''}
                    <a href={`#/applications/${r.id}`}>{jobName(r)}</a> (fit {fit(r.score)})
                  </span>
                ))}
              </p>
              <div className="row">
                <a className="btn2" href="#/applications?status=evaluated">
                  Review them
                </a>
              </div>
            </article>
          ) : null}
        </section>
      ) : null}
    </>
  );
}
