import { useEffect, useRef, useState } from 'react';
import { Switch } from 'react-aria-components';

import { createPortalEntry, deletePortalEntry, fetchPortals, updatePortalEntry } from '../api.js';
import { RunItem } from '../components/RunItem.jsx';
import { ConfirmDialog, EmptyState, HelpLink } from '../components/ui.jsx';
import { reload, useResource } from '../data.js';
import { plural, shortDate } from '../lib/labels.js';
import { outcome, runState, runTitle } from '../lib/runs.js';
import { boardType, isBoard, PROVIDER_NAMES } from '../lib/boards.js';
import { BOARD_HEALTH, brokenBoards } from '../lib/today.js';
import { latest, useRuns } from '../runs.jsx';
import { announce } from '../shell/announce.jsx';
import { PageHead } from '../shell/router.jsx';
import { offerUndo } from '../shell/undo.jsx';

/** The fields an entry is saved with: only what the form owns. */
const toEntry = (e) => ({
  name: e.name,
  careersUrl: e.careersUrl || null,
  api: e.api || null,
  provider: e.provider || null,
  scanMethod: e.scanMethod || null,
  scanQuery: e.scanQuery || null,
  notes: e.notes || null,
  enabled: e.enabled !== false,
});

function EntryForm({ kind, entry = null, providers = [], scanMethods = [], onSaved, onCancel, etag }) {
  const [draft, setDraft] = useState(() => ({ name: '', careersUrl: '', api: '', provider: '', scanMethod: '', scanQuery: '', notes: '', ...(entry ? toEntry(entry) : {}) }));
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const heading = useRef(null);
  useEffect(() => heading.current?.focus(), []);
  const id = entry ? `edit-${kind}-${entry.index}` : `new-${kind}`;
  const set = (key) => (e) => {
    setDraft({ ...draft, [key]: e.target.value });
    setErrors((x) => ({ ...x, [key]: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const found = {};
    if (!draft.name.trim()) found.name = kind === 'company' ? 'Type the company name.' : 'Give this search a name.';
    if (draft.careersUrl && !/^https?:\/\/\S+$/i.test(draft.careersUrl.trim())) found.careersUrl = 'Paste a link starting with https://';
    if (kind === 'company' && !draft.careersUrl.trim() && draft.scanMethod !== 'websearch') found.careersUrl = 'Paste the careers page link, starting with https://';
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      const fields = toEntry({ ...draft, name: draft.name.trim(), careersUrl: draft.careersUrl.trim() });
      if (entry) await updatePortalEntry(kind, entry.index, entry.name, fields, etag);
      else await createPortalEntry(kind, fields, etag);
      await reload('portals');
      reload('workspace');
      announce(entry ? `Saved ${fields.name}` : `Following ${fields.name}`);
      onSaved(fields.name);
    } catch (err) {
      setErrors({ form: err.detail ? `${err.message}: ${[].concat(err.detail).join('; ')}` : err.message });
    } finally {
      setBusy(false);
    }
  };

  const field = (key, label, props = {}) => (
    <div className="field">
      <label htmlFor={`${id}-${key}`}>{label}</label>
      <input
        id={`${id}-${key}`}
        type="text"
        value={draft[key] ?? ''}
        onChange={set(key)}
        aria-invalid={errors[key] ? true : undefined}
        aria-describedby={errors[key] ? `${id}-${key}-err` : props.hint ? `${id}-${key}-hint` : undefined}
        placeholder={props.placeholder}
      />
      {errors[key] ? (
        <p className="error" id={`${id}-${key}-err`}>
          {errors[key]}
        </p>
      ) : props.hint ? (
        <p className="hint" id={`${id}-${key}-hint`}>
          {props.hint}
        </p>
      ) : null}
    </div>
  );

  return (
    <form className="card soft stack-sm" noValidate onSubmit={submit} aria-labelledby={`${id}-h`}>
      <h3 id={`${id}-h`} tabIndex={-1} ref={heading}>
        {entry ? `Edit ${entry.name}` : kind === 'company' ? 'Follow a company' : 'Add a job-board search'}
      </h3>
      <div className="grid-2">
        {field('name', kind === 'company' ? 'Company name' : 'Name of this search', { placeholder: kind === 'company' ? 'e.g. Example Corp' : 'e.g. Remote backend roles' })}
        {field('careersUrl', kind === 'company' ? 'Careers page link' : 'Job board link', { placeholder: 'https://…', hint: 'Greenhouse, Lever, Ashby and most other job boards are recognised from the link.' })}
      </div>
      <details>
        <summary>More options</summary>
        <div className="grid-2">
          <div className="field">
            <label htmlFor={`${id}-provider`}>Board type</label>
            <select id={`${id}-provider`} value={draft.provider ?? ''} onChange={set('provider')}>
              <option value="">Recognised from the link</option>
              {providers.map((p) => (
                <option key={p} value={p}>
                  {PROVIDER_NAMES[p] ?? p}
                </option>
              ))}
            </select>
          </div>
          {field('api', 'Job board’s data link (API)', { placeholder: 'Filled in automatically when blank' })}
          <div className="field">
            <label htmlFor={`${id}-method`}>How to check for openings</label>
            <select id={`${id}-method`} value={draft.scanMethod ?? ''} onChange={set('scanMethod')}>
              <option value="">The job board (recommended)</option>
              {scanMethods.map((m) => (
                <option key={m} value={m}>
                  {m === 'websearch' ? 'Web search (only with the command-line tools)' : m}
                </option>
              ))}
            </select>
          </div>
          {field('scanQuery', 'Search query', { hint: 'Only for web search.' })}
          {field('notes', 'Notes')}
        </div>
      </details>
      {errors.form ? (
        <p className="error" role="alert">
          {errors.form}
        </p>
      ) : null}
      <div className="row">
        <button type="submit" className="btn" disabled={busy}>
          {entry ? 'Save' : kind === 'company' ? 'Follow' : 'Add'}
        </button>
        <button type="button" className="btn2" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function EntryRow({ entry, kind, health, portals, onEdit, editing, children }) {
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState(null);
  const [fixing, setFixing] = useState(false);
  const { list, start } = useRuns();
  const [findId, setFindId] = useState(null);
  const finding = findId ? (list.find((r) => r.id === findId) ?? null) : null;
  const found = finding && runState(finding) === 'done';
  const answerRef = useRef(null);
  // The answer replaces the run card: focus and say it there, about this company (R-disc-04).
  useEffect(() => {
    if (!found) return;
    const active = document.activeElement;
    if (!active || active === document.body || answerRef.current?.closest('[data-run-home]')?.contains(active)) answerRef.current?.focus();
    announce(boardAnswer(entry.name, finding));
    // Runs once, when the run finishes.
  }, [found]);
  const status = health?.status ?? null;
  const broken = ['slug_gone', 'auth'].includes(status);

  const toggle = async (on) => {
    setError(null);
    try {
      await updatePortalEntry(kind, entry.index, entry.name, { enabled: on }, portals.etag);
      await reload('portals');
      announce(on ? `Checking ${entry.name} for new openings again` : `Paused ${entry.name}`);
    } catch (e) {
      setError(e.message);
    }
  };
  const remove = async () => {
    setConfirm(false);
    try {
      await deletePortalEntry(kind, entry.index, entry.name, portals.etag);
      await reload('portals');
      offerUndo(
        `Stopped following ${entry.name}`,
        async () => {
          const fresh = await fetchPortals();
          await createPortalEntry(kind, toEntry(entry), fresh.etag);
          await reload('portals');
        },
        { focus: true },
      );
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <li className="card review-item">
      <div className="row between">
        <div>
          <b>{entry.name}</b> <span className="small muted">· {boardType(entry)}</span>
          <br />
          {!entry.enabled ? (
            <span className="badge neutral">Paused</span>
          ) : broken ? (
            <span className="badge fail">
              {BOARD_HEALTH[status]} since {shortDate(health.since ?? health.timestamp)}
            </span>
          ) : status ? (
            <span className="small muted">
              {BOARD_HEALTH[status] ?? status} · last checked {shortDate(health.timestamp)}
            </span>
          ) : !isBoard(entry) && entry.scanMethod !== 'websearch' ? (
            <span className="badge warn">This link isn’t a job board the app can read · checks find nothing here</span>
          ) : (
            <span className="small muted">Not checked yet</span>
          )}
        </div>
        <div className="row">
          <Switch className="switch" isSelected={entry.enabled} onChange={toggle} isDisabled={!entry.editable}>
            <span className="switch-track" aria-hidden="true">
              <span className="switch-thumb" />
            </span>
            Check {entry.name} for new openings
          </Switch>
          {broken && entry.enabled ? (
            <button type="button" className="btn btn-sm" onClick={() => setFixing((f) => !f)} aria-expanded={fixing}>
              Fix<span className="visually-hidden"> {entry.name}</span>
            </button>
          ) : null}
          <button type="button" className="btn2 btn-sm" onClick={onEdit} aria-expanded={editing} disabled={!entry.editable}>
            Edit<span className="visually-hidden"> {entry.name}</span>
          </button>
          <button type="button" className="btn2 btn-sm" onClick={() => setConfirm(true)} disabled={!entry.editable}>
            Remove<span className="visually-hidden"> {entry.name}</span>
          </button>
        </div>
      </div>
      {!entry.editable ? <p className="small muted">Written in a shape the app can’t edit safely; change it in portals.yml with your editor.</p> : null}
      {fixing ? (
        <div className="notice warn stack-sm" data-run-home>
          <p>
            <b>{entry.name}’s job board {status === 'auth' ? 'wants a login' : 'moved or closed'}.</b>{' '}
            {status === 'auth'
              ? 'The app can’t read boards behind a login.'
              : 'The company may have moved to another job board system, or stopped hiring there. Open their careers page to find the current link.'}{' '}
            You can pause {entry.name} for now, or edit its link.
          </p>
          <div className="row">
            {status === 'slug_gone' ? (
              <button
                type="button"
                className="btn btn-sm"
                disabled={finding && ['waiting', 'working'].includes(runState(finding))}
                onClick={async () => {
                  const run = await start('verify-portals', {});
                  setFindId(run.id);
                  announce(`Started: looking for ${entry.name}’s job board`);
                }}
              >
                Find the right job board for {entry.name}
              </button>
            ) : null}
            <button type="button" className="btn2 btn-sm" onClick={() => toggle(false)}>
              Pause {entry.name}
            </button>
            <button type="button" className="btn2 btn-sm" onClick={onEdit}>
              Edit the link
            </button>
            {entry.careersUrl ? (
              <a className="btn2 btn-sm" href={entry.careersUrl} target="_blank" rel="noopener noreferrer">
                Open their careers page ↗
              </a>
            ) : null}
          </div>
          {finding && runState(finding) !== 'done' ? <RunItem run={finding} headingLevel={4} takeFocus /> : null}
          {finding && runState(finding) === 'done' ? (
            <p className="notice info" tabIndex={-1} data-run-focus ref={answerRef}>
              {boardAnswer(entry.name, finding)}
            </p>
          ) : null}
          <p className="small muted">Finding the board asks Greenhouse, Lever and Ashby whether {entry.name} has one now. A few seconds; no AI. If one is found, use Edit the link to switch to it.</p>
        </div>
      ) : null}
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
      {children}
      <ConfirmDialog isOpen={confirm} title={`Stop following ${entry.name}?`} confirmLabel="Stop following" danger onConfirm={remove} onCancel={() => setConfirm(false)}>
        <p>The app stops checking {entry.name} for new openings. Links already in To review stay. You can undo this right after, and a backup of your list is kept too.</p>
      </ConfirmDialog>
    </li>
  );
}

/** "2026-08" → "Aug 2026"; anything else as written. */
function monthOf(value) {
  const m = String(value).match(/^(\d{4})-(\d{2})/u);
  return m ? new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, 1)).toLocaleDateString('en', { month: 'short', year: 'numeric', timeZone: 'UTC' }) : value;
}

/** What the board finder found for one company, in words (R-disc-04). */
function boardAnswer(name, run) {
  const mine = (run.result?.findings ?? []).find((f) => f.startsWith(`${name}:`)) ?? null;
  const moved = mine?.match(/its board may now be (\S+)/u)?.[1];
  if (moved) return `Found a board for ${name}: ${moved.replace('/', ' › ')}. Use Edit the link and paste that board’s link.`;
  if (mine) return `No board for ${name} was found on Greenhouse, Lever or Ashby. Open their careers page to see where they post jobs now, or pause ${name}.`;
  return `${name}’s board answered this time; the status above is up to date.`;
}

/**
 * Companies to skip: data/blacklist.md, read-only like the title filter (D-3).
 * Checks for new openings leave these companies out, and a fit check refuses them.
 */
function SkipList() {
  const skip = useResource('skipList');
  const companies = skip.data?.companies ?? [];
  return (
    <section className="card" aria-labelledby="skip-h" id="skip">
      <h2 id="skip-h" className="card-title">
        Companies to skip
      </h2>
      {!skip.data ? (
        <p className="muted">{skip.error ? skip.error.message : 'Loading…'}</p>
      ) : companies.length ? (
        <>
          <p>Checks for new openings leave these out, and the assistant won’t check a job at them:</p>
          <ul>
            {companies.map((c) => (
              <li key={c.company}>
                <b>{c.company}</b>
                {c.reason ? ` · ${c.reason}` : ''}
                {c.since ? <span className="small muted"> · since {monthOf(c.since)}</span> : null}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p>None. Every company’s openings are kept.</p>
      )}
      <p className="small muted">
        To change this list, {skip.data?.exists ? 'edit' : 'create'} <code>data/blacklist.md</code> in your workspace folder with your editor: a table with the columns Company, Since, Scope and
        Reason. The app picks the change up by itself. <HelpLink topic="skip">About this list</HelpLink>
      </p>
    </section>
  );
}

/** "What jobs to keep" in words (read-only in v1; M7 decision D-3). */
function Filters({ filters }) {
  const t = filters?.title_filter ?? {};
  const list = (xs) => (xs ?? []).map((x) => String(x).replace(/^(word|stem):/, '')).join(', ');
  return (
    <section className="card" aria-labelledby="keep-h">
      <h2 id="keep-h" className="card-title">
        What jobs to keep
      </h2>
      <p>
        {t.positive?.length ? (
          <>
            Job titles containing <b>{list(t.positive)}</b>
          </>
        ) : (
          'Every job title'
        )}
        {t.negative?.length ? (
          <>
            , except titles with <b>{list(t.negative)}</b>
          </>
        ) : null}
        .
      </p>
      <p className="small muted">
        To change these, edit the title filter in your companies file (portals.yml) with your editor; the app picks the change up by itself. <HelpLink topic="files">Files in your workspace folder</HelpLink>
      </p>
    </section>
  );
}

/**
 * Companies you follow (ia.md §2.5): portals.yml's companies and job-board
 * searches, each with its health in words, On/Paused, Edit and Remove.
 */
export function CompaniesPage() {
  const portals = useResource('portals');
  const { list, start } = useRuns();
  const [form, setForm] = useState(null);
  const [scanId, setScanId] = useState(null);
  const [cardRunId, setCardRunId] = useState(null);
  const followButton = useRef(null);

  if (!portals.data) return <PageHead title="Companies you follow" lead={portals.error ? portals.error.message : 'Loading…'} />;
  const { companies, boards, health = {}, etag, providers, scanMethods } = portals.data;
  const broken = brokenBoards(companies, health);
  // The check started from this card, else the last board check (R-disc-03).
  const checkRun = (cardRunId ? list.find((r) => r.id === cardRunId) : null) ?? latest(list, 'verify-portals');
  const checking = checkRun && ['waiting', 'working'].includes(runState(checkRun));

  const closeForm = () => {
    setForm(null);
    followButton.current?.focus();
  };
  const scan = async () => {
    const run = await start('scan', {});
    setScanId(run.id);
    announce(`Started: ${runTitle(run)}`);
  };

  const listOf = (kind, entries) =>
    entries.length ? (
      <ul className="plain stack-sm">
        {entries.map((entry) => (
          <EntryRow
            key={`${kind}-${entry.name}`}
            entry={entry}
            kind={kind}
            health={health[entry.name]}
            portals={portals.data}
            editing={form === `${kind}-${entry.index}`}
            onEdit={() => setForm(`${kind}-${entry.index}`)}
          >
            {form === `${kind}-${entry.index}` ? (
              <EntryForm kind={kind} entry={entry} providers={providers} scanMethods={scanMethods} etag={etag} onSaved={() => setForm(null)} onCancel={() => setForm(null)} />
            ) : null}
          </EntryRow>
        ))}
      </ul>
    ) : null;

  return (
    <>
      <PageHead title="Companies you follow" lead="The app checks these companies’ job boards for new openings.">
        <button type="button" className="btn" ref={followButton} aria-expanded={form === 'new-company'} onClick={() => setForm(form === 'new-company' ? null : 'new-company')}>
          Follow a company
        </button>
        <button type="button" className="btn2" onClick={scan} disabled={!companies.some((c) => c.enabled)}>
          Check for new openings
        </button>
      </PageHead>
      {scanId && list.find((r) => r.id === scanId) ? <RunItem run={list.find((r) => r.id === scanId)} headingLevel={2} takeFocus /> : null}
      {broken.length ? (
        <p className="notice attn">
          {plural(broken.length, 'job board needs', 'job boards need')} you: {broken.map((c) => c.name).join(', ')}. Use <b>Fix</b> below.
        </p>
      ) : null}
      {form === 'new-company' ? <EntryForm kind="company" providers={providers} scanMethods={scanMethods} etag={etag} onSaved={() => setForm(null)} onCancel={closeForm} /> : null}

      <section aria-labelledby="cl-h" className="stack-sm">
        <h2 id="cl-h">{plural(companies.length, 'company', 'companies')}</h2>
        {companies.length ? (
          listOf('company', companies)
        ) : (
          <EmptyState title="You don’t follow any company yet">
            <p>Follow a company and the app checks its job board for new openings whenever you ask. Start with one you would like to work for.</p>
          </EmptyState>
        )}
      </section>

      <section aria-labelledby="bl-h" className="stack-sm">
        <div className="row between">
          <h2 id="bl-h">Job-board searches</h2>
          <button type="button" className="btn2 btn-sm" aria-expanded={form === 'new-board'} onClick={() => setForm(form === 'new-board' ? null : 'new-board')}>
            Add a job-board search
          </button>
        </div>
        <p className="small muted">Searches on boards that list many companies at once (for example a remote-jobs board).</p>
        {form === 'new-board' ? <EntryForm kind="board" providers={providers} scanMethods={scanMethods} etag={etag} onSaved={() => setForm(null)} onCancel={() => setForm(null)} /> : null}
        {listOf('board', boards) ?? <p className="muted">None yet.</p>}
      </section>

      <Filters filters={portals.data.filters} />

      <section className="card" aria-labelledby="chk-h">
        <h2 id="chk-h" className="card-title">
          Check companies’ job boards
        </h2>
        <p className="muted">Visits every board you follow and records which ones work, without saving any openings. A few seconds; no AI.</p>
        {checkRun && (checking || runState(checkRun) !== 'done') ? <RunItem run={checkRun} takeFocus /> : null}
        {checkRun && runState(checkRun) === 'done' ? (
          <p className={`notice ${checkRun.result?.findings?.length ? 'warn' : 'ok'}`} tabIndex={-1} data-run-focus>
            {runTitle(checkRun)}, {dateOf(checkRun)}: {outcome(checkRun).text}
            {checkRun.kind === 'verify-portals' ? ' The status beside each company above is up to date.' : ''}
          </p>
        ) : null}
        {!checking ? (
          <div className="row">
            <button type="button" className="btn2" onClick={() => start('verify-portals', {}).then((r) => (setCardRunId(r.id), announce(`Started: ${runTitle(r)}`)))}>
              Check companies’ job boards
            </button>
            <button type="button" className="btn2" onClick={() => start('validate-portals', {}).then((r) => (setCardRunId(r.id), announce(`Started: ${runTitle(r)}`)))}>
              Check the companies list for mistakes
            </button>
            <span className="hint inline">Reads your companies file for unknown board types, missing names and broken links. Changes nothing.</span>
          </div>
        ) : null}
      </section>

      <SkipList />
    </>
  );
}

const dateOf = (run) => shortDate(run.endedAt);
