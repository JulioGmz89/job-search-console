import { useEffect, useRef, useState } from 'react';

import { coverUrl, pdfUrl } from '../api.js';
import { useResource } from '../data.js';
import { designName } from '../lib/designs.js';
import { dateTime, jobName, shortDate } from '../lib/labels.js';
import { runState, runTitle } from '../lib/runs.js';
import { latest, runsForJob, useRuns } from '../runs.jsx';
import { announce } from '../shell/announce.jsx';
import { RunItem } from './RunItem.jsx';
import { ConfirmDialog, CostNote, HelpLink, Progress } from './ui.jsx';

const TONES = [
  ['mirror', 'Match the posting'],
  ['direct', 'Direct'],
  ['conversational', 'Warm'],
  ['formal', 'Formal'],
];

const VERDICT = {
  pass: ['ok', 'Screening check: readable by screening systems'],
  warn: ['warn', 'Screening check: readable, with small issues'],
  fail: ['fail', 'Screening check: fails — an applicant-tracking system will lose part of this CV'],
};

/** The assistant is needed; say why a button is off, beside it (ia.md §3 "Empty states"). */
function useAgentBlock() {
  const workspace = useResource('workspace');
  const setup = workspace.data?.setup;
  if (!setup) return null;
  if (!setup.cv) return 'Add your CV first (My CV › Content).';
  if (!setup.assistant) return 'The assistant (Claude Code) is not ready — see Workspace › AI assistant.';
  return null;
}

/** Focus the card's new state when it changes (ia.md §3 "Focus"). */
function useFocusOnChange(key, ref) {
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    // Only when the user was here (or focus was lost with the old state);
    // never pull them out of a field they are typing in elsewhere.
    const active = document.activeElement;
    const card = ref.current?.closest('.card');
    if (!active || active === document.body || card?.contains(active)) ref.current?.focus();
  }, [key, ref]);
}

function CvCard({ row, report }) {
  const { list, start } = useRuns();
  const style = useResource('style');
  const voice = useResource('voice');
  const documents = useResource('documents');
  const templates = useResource('templates');
  const designCheck = useResource('design');
  const block = useAgentBlock();
  const [confirm, setConfirm] = useState(null);
  const [error, setError] = useState(null);
  const stateRef = useRef(null);

  const runs = runsForJob(list, { reportId: report.id });
  const making = runs.find((r) => ['pdf', 'cv-render'].includes(r.kind) && ['waiting', 'working'].includes(runState(r)));
  const lastPdf = latest(runs, 'pdf');
  const failed = lastPdf && runState(lastPdf) === 'failed' && !list.some((r) => r.retryOf === lastPdf.id) ? lastPdf : null;
  const pdf = report.pdf?.exists ? report.pdf : null;
  const design = designName(style.data?.style?.template ?? 'standard', templates.data?.templates);
  const madeIn = report.ats?.template ?? null;
  const doc = (documents.data?.documents ?? []).find((d) => d.reportId === report.id) ?? null;
  const rulesChanged = voice.data?.modified && pdf?.modified && Date.parse(voice.data.modified) > Date.parse(pdf.modified);
  const name = jobName(row);
  useFocusOnChange(making ? 'making' : pdf ? `ready-${pdf.modified}` : 'none', stateRef);

  const go = async (kind, options) => {
    setConfirm(null);
    setError(null);
    try {
      const run = await start(kind, options);
      announce(`Started: ${runTitle(run)}`);
    } catch (e) {
      setError(e.message);
    }
  };

  const verdict = report.ats?.verdict ? VERDICT[report.ats.verdict] : null;
  return (
    <section className="card" aria-labelledby="doc-cv-h">
      <div className="row between">
        <h3 id="doc-cv-h">Tailored CV</h3>
        <span className={`badge ${making ? 'new' : pdf ? (report.ats?.verdict === 'fail' ? 'fail' : 'ok') : 'neutral'}`}>
          {making ? 'Working' : pdf ? (report.ats?.verdict === 'fail' ? 'Fails screening' : 'Ready') : 'Not made yet'}
        </span>
      </div>
      <div ref={stateRef} tabIndex={-1} className="stack-sm">
        {making ? (
          <>
            <Progress label={`Making the tailored CV for ${name}`} />
            <p className="small">
              {making.kind === 'pdf' ? 'Writing your CV for this role… usually about 3 minutes.' : 'Laying out the PDF again in your design… a few seconds, no AI.'} You can leave this page; it
              appears here and in Activity.
            </p>
          </>
        ) : pdf ? (
          <>
            <p>
              <span className="mono">{pdf.fileName ?? pdf.path}</span>
              <br />
              Made {dateTime(pdf.modified ?? pdf.date)}
              {madeIn ? ` · ${designName(madeIn, templates.data?.templates)} design` : ''} ·{' '}
              {voice.data?.exists ? (rulesChanged ? `written before your writing rules changed (${shortDate(voice.data.modified)})` : 'written under your current writing rules') : 'no writing rules set'}
            </p>
            {verdict ? (
              <p className={`badge-line ${verdict[0]}`}>
                {verdict[1]}
                {report.ats.verdict === 'fail' && report.ats.issues?.length ? `: ${report.ats.issues.find((i) => i.severity === 'critical')?.message ?? ''}` : ''}
                {report.ats.verdict === 'fail' ? (
                  <>
                    {' '}
                    <a href="#/my-cv/design">Choose a design that passes</a>
                  </>
                ) : null}
              </p>
            ) : (
              <p className="small muted">No screening check was recorded for this PDF.</p>
            )}
          </>
        ) : (
          <p>
            Your CV rewritten for this role, in your design ({design}). <CostNote minutes="3" />
          </p>
        )}
      </div>
      {!making && pdf ? (
        <div className="row">
          <a className="btn" href={pdfUrl(report.id)} target="_blank" rel="noopener noreferrer">
            Open<span className="visually-hidden"> the tailored CV for {name} (new tab)</span>
          </a>
          <a className="btn2" href={pdfUrl(report.id)} download={pdf.fileName ?? true}>
            Download<span className="visually-hidden"> the tailored CV for {name}</span>
          </a>
          <button type="button" className="btn2" disabled={Boolean(block)} onClick={() => setConfirm('again')}>
            Make it again
          </button>
          <CostNote minutes="3" />
          {doc && madeIn && madeIn !== style.data?.style?.template ? (
            <button type="button" className="btn2" onClick={() => go('cv-render', { documentId: doc.id, template: style.data?.style?.template ?? 'standard' })}>
              Update the layout to {design}
            </button>
          ) : null}
        </div>
      ) : null}
      {!making && !pdf ? (
        <div className="row">
          <button type="button" className="btn" disabled={Boolean(block)} onClick={() => go('pdf', { reportId: report.id })}>
            Make tailored CV
          </button>
        </div>
      ) : null}
      {!making && pdf ? (
        <p className="small muted">
          <b>Make it again</b> rewrites the CV for this role with your current CV and writing rules (AI, about 3 min).
          {doc && madeIn && madeIn !== style.data?.style?.template ? ` Update the layout only re-draws it in ${design} (no AI, wording unchanged).` : ''}
        </p>
      ) : null}
      {block && !making ? <p className="small muted">{block}</p> : null}
      {failed ? <RunItem run={failed} headingLevel={4} /> : null}
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
      <ConfirmDialog
        isOpen={confirm === 'again'}
        title={`Make the tailored CV for ${name} again?`}
        confirmLabel="Make it again"
        focusConfirm={false}
        onConfirm={() => go('pdf', { reportId: report.id })}
        onCancel={() => setConfirm(null)}
      >
        <p>The assistant rewrites it with your current CV and writing rules, in your design ({design}). About 3 minutes; uses your Claude plan.</p>
        <p>The new PDF replaces the one made {shortDate(pdf?.modified ?? pdf?.date)}.</p>
        {designCheck.data?.verdict === 'fail' ? (
          <p className="notice attn">
            Your design ({design}) fails the screening check: the new CV would lose part of its text for applicant-tracking systems. <a href="#/my-cv/design">Choose a design that passes</a> first.
          </p>
        ) : null}
      </ConfirmDialog>
    </section>
  );
}

function CoverCard({ row, report, openForm = false }) {
  const { list, start } = useRuns();
  const block = useAgentBlock();
  const [open, setOpen] = useState(openForm);
  const [answers, setAnswers] = useState({ why: '', problem: '', approach: '', tone: 'mirror' });
  const [errors, setErrors] = useState({});
  const [replace, setReplace] = useState(false);
  const stateRef = useRef(null);
  const runs = runsForJob(list, { reportId: report.id });
  const writing = runs.find((r) => r.kind === 'cover' && ['waiting', 'working'].includes(runState(r)));
  const lastCover = latest(runs, 'cover');
  const failed = lastCover && runState(lastCover) === 'failed' && !list.some((r) => r.retryOf === lastCover.id) ? lastCover : null;
  const cover = report.cover;
  const name = jobName(row);
  useFocusOnChange(writing ? 'writing' : open ? 'form' : cover ? `ready-${cover.date}` : 'none', stateRef);

  const submit = async () => {
    setReplace(false);
    try {
      const run = await start('cover', { reportId: report.id, answers });
      setOpen(false);
      announce(`Started: ${runTitle(run)}`);
    } catch (e) {
      setErrors({ form: e.message });
    }
  };
  const check = (e) => {
    e.preventDefault();
    const found = {};
    if (!answers.why.trim()) found.why = 'Say why you want this role.';
    if (!answers.problem.trim()) found.problem = 'Say what problem you would solve for them.';
    if (!answers.approach.trim()) found.approach = 'Say how you would start.';
    setErrors(found);
    if (Object.keys(found).length) {
      document.getElementById(`cl-${Object.keys(found)[0]}`)?.focus();
      return;
    }
    if (cover) setReplace(true);
    else submit();
  };
  const field = (key, label) => (
    <div className="field">
      <label htmlFor={`cl-${key}`}>
        {label} <span className="req">(required)</span>
      </label>
      <textarea
        id={`cl-${key}`}
        rows={2}
        value={answers[key]}
        onChange={(e) => {
          setAnswers({ ...answers, [key]: e.target.value });
          setErrors((x) => ({ ...x, [key]: undefined }));
        }}
        aria-invalid={errors[key] ? true : undefined}
        aria-describedby={errors[key] ? `cl-${key}-err` : undefined}
      />
      {errors[key] ? (
        <p className="error" id={`cl-${key}-err`}>
          {errors[key]}
        </p>
      ) : null}
    </div>
  );

  return (
    <section className="card" aria-labelledby="doc-cl-h">
      <div className="row between">
        <h3 id="doc-cl-h">Cover letter</h3>
        <span className={`badge ${writing ? 'new' : cover ? 'ok' : 'neutral'}`}>{writing ? 'Working' : cover ? 'Ready' : 'Not made yet'}</span>
      </div>
      <div ref={stateRef} tabIndex={-1} className="stack-sm">
        {writing ? (
          <>
            <Progress label={`Writing the cover letter for ${name}`} />
            <p className="small">Writing your letter… usually about 2 minutes. You can leave this page.</p>
          </>
        ) : open ? (
          <form className="stack-sm" noValidate onSubmit={check} aria-label={`Cover letter questions for ${name}`}>
            <p className="small muted">Answer three short questions; the assistant drafts a one-page letter from them, the fit report and your CV.</p>
            {field('why', 'Why this role?')}
            {field('problem', 'What problem would you solve for them?')}
            {field('approach', 'How would you start?')}
            <div className="field narrow">
              <label htmlFor="cl-tone">Tone</label>
              <select id="cl-tone" value={answers.tone} onChange={(e) => setAnswers({ ...answers, tone: e.target.value })}>
                {TONES.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            {cover ? <p className="notice warn">This replaces the letter of {shortDate(cover.date)}.</p> : null}
            <p>
              <CostNote minutes="2" />
            </p>
            {errors.form ? (
              <p className="error" role="alert">
                {errors.form}
              </p>
            ) : null}
            <div className="row">
              <button type="submit" className="btn" disabled={Boolean(block)}>
                Write the letter
              </button>
              <button type="button" className="btn2" onClick={() => setOpen(false)}>
                Cancel
              </button>
            </div>
            {block ? <p className="small muted">{block}</p> : null}
          </form>
        ) : cover ? (
          <p>
            <span className="mono">{cover.path.split('/').pop()}</span>
            <br />
            Made {shortDate(cover.date)}
          </p>
        ) : (
          <p>A one-page letter for this role from three short answers.</p>
        )}
      </div>
      {!writing && !open ? (
        <div className="row">
          {cover ? (
            <>
              <a className="btn" href={coverUrl(report.id)} target="_blank" rel="noopener noreferrer">
                Open<span className="visually-hidden"> the cover letter for {name} (new tab)</span>
              </a>
              <a className="btn2" href={coverUrl(report.id)} download={cover.path.split('/').pop()}>
                Download<span className="visually-hidden"> the cover letter for {name}</span>
              </a>
            </>
          ) : null}
          <button type="button" className={cover ? 'btn2' : 'btn'} onClick={() => setOpen(true)}>
            {cover ? 'Write it again' : 'Write cover letter'}
          </button>
        </div>
      ) : null}
      {failed ? <RunItem run={failed} headingLevel={4} /> : null}
      <ConfirmDialog isOpen={replace} title={`Replace the letter of ${shortDate(cover?.date)}?`} confirmLabel="Replace the letter" onConfirm={submit} onCancel={() => setReplace(false)}>
        <p>The new letter replaces the one you have for {name}. About 2 minutes; uses your Claude plan.</p>
      </ConfirmDialog>
    </section>
  );
}

/** The two document cards of a job page (ia.md §2.3, from direction A). */
export function Documents({ row, report, openCover = false }) {
  return (
    <>
      <div className="grid-2">
        <CvCard row={row} report={report} />
        <CoverCard row={row} report={report} openForm={openCover} />
      </div>
      <p className="small muted">
        You send these yourself — the app never applies or emails for you. <HelpLink topic="never">What the app never does</HelpLink>
      </p>
    </>
  );
}
