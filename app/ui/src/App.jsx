import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { fetchPipeline, fetchReport, startCover } from './api.js';
import AddJobBox from './components/AddJobBox.jsx';
import CoverLetterDialog from './components/CoverLetterDialog.jsx';
import CvStudioPage from './components/CvStudioPage.jsx';
import MaintenanceBar from './components/MaintenanceBar.jsx';
import PipelineTable from './components/PipelineTable.jsx';
import ReportDetail from './components/ReportDetail.jsx';
import RunsPage from './components/RunsPage.jsx';
import SkillsPage from './components/SkillsPage.jsx';
import SourcesPage from './components/SourcesPage.jsx';
import { RunsProvider, useRuns } from './runs.jsx';

/** Sort comparator. Nulls always sort last, whichever direction is active. */
function compare(a, b, key, dir) {
  const pick = (row) => {
    if (key === 'decision') return row.report?.decision ?? null;
    return row[key] ?? null;
  };
  const [x, y] = [pick(a), pick(b)];
  if (x === null && y === null) return 0;
  if (x === null) return 1;
  if (y === null) return -1;
  const result = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y));
  return dir === 'asc' ? result : -result;
}

const PAGES = [
  { id: 'pipeline', label: 'Pipeline' },
  { id: 'sources', label: 'Sources' },
  { id: 'skills', label: 'Skills' },
  { id: 'runs', label: 'Runs' },
  { id: 'cv', label: 'CV Studio' },
];

/**
 * Hash routing, in twenty lines.
 *
 * Five pages still do not justify a router dependency, and PROJECT_PLAN.md §11
 * leaves the UI stack open — pulling one in now would quietly settle that
 * question. `#/runs/<id>` deep-links to one run's log; `#/pipeline/<reportId>`
 * opens that report's row (the Skills page links evidence this way).
 */
function useHashPage() {
  const read = () => {
    const [page = 'pipeline', arg = null] = window.location.hash.replace(/^#\/?/, '').split('/');
    return { page: PAGES.some((p) => p.id === page) ? page : 'pipeline', arg };
  };
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const onChange = () => setRoute(read());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return [route, (next, arg) => { window.location.hash = arg ? `#/${next}/${arg}` : `#/${next}`; }];
}

/** Files whose change means the Skills page is stale: its own cache, the CV, the reports, the corpus. */
const SKILLS_REFRESH_ON = [/^data\/skills\//, /^reports\//, /^cv\.md$/, /^data\/scan-history\.tsv$/, /^data\/pipeline\.md$/, /^data\/applications\.md$/];

/** Files whose change means the pipeline table or an open report is stale. */
const REFRESH_ON = [/^data\/applications\.md$/, /^reports\//, /^output\//, /^data\/pdf-index\.tsv$/, /^data\/jsc\/covers\.json$/];

function Shell({ reloadRef, skillsReloadRef }) {
  const [route, goTo] = useHashPage();
  const { kinds } = useRuns();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [bandFilter, setBandFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState({ key: 'score', dir: 'desc' });
  const [selected, setSelected] = useState(null);
  const [report, setReport] = useState(null);
  const [reportError, setReportError] = useState(null);
  const [coverFor, setCoverFor] = useState(null);
  const [coverBusy, setCoverBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const reportIdRef = useRef(null);

  const reload = useCallback(() => {
    fetchPipeline().then(setData).catch((e) => setError(e.message));
    // The open report may have gained a PDF or a cover letter.
    if (reportIdRef.current) fetchReport(reportIdRef.current).then(setReport).catch(() => {});
  }, []);

  useEffect(reload, [reload]);
  useEffect(() => {
    reloadRef.current = reload;
  }, [reload, reloadRef]);

  const openRow = useCallback((row) => {
    setSelected(row.id);
    setReport(null);
    setReportError(null);
    reportIdRef.current = null;
    if (!row.hasReport) {
      setReportError(`Row ${row.id} references report ${row.reportId}, which is not on disk.`);
      return;
    }
    reportIdRef.current = row.reportId;
    fetchReport(row.reportId).then(setReport).catch((e) => setReportError(e.message));
  }, []);

  // A deep link to a report (`#/pipeline/<reportId>`): open its row once the table is loaded.
  const openedLinkRef = useRef(null);
  useEffect(() => {
    if (route.page !== 'pipeline' || !route.arg || !data) return;
    if (openedLinkRef.current === route.arg) return;
    const row = data.rows.find((r) => String(r.reportId) === String(route.arg));
    if (!row) return;
    openedLinkRef.current = route.arg;
    openRow(row);
    setTimeout(() => document.querySelector('.detail')?.scrollIntoView({ block: 'start', behavior: 'smooth' }), 50);
  }, [route, data, openRow]);

  // A run was started from a row or a report: say so, and offer its log.
  const onRunStarted = useCallback((run) => {
    if (!run) return;
    setToast({ id: run.id, text: `${run.label} ${run.status === 'queued' ? 'queued' : 'started'}` });
    setTimeout(() => setToast((t) => (t?.id === run.id ? null : t)), 6000);
  }, []);

  const requestCover = useCallback(async (target) => {
    // From a row we only have the id; the dialog wants the report for its hints.
    const id = target?.machine ? target.id : target?.reportId;
    if (!id) return;
    const full = target?.machine ? target : await fetchReport(id).catch(() => ({ id }));
    setCoverFor(full);
  }, []);

  const submitCover = useCallback(async (answers) => {
    setCoverBusy(true);
    try {
      const run = await startCover(coverFor.id, answers);
      setCoverFor(null);
      onRunStarted(run);
      goTo('runs', run.id);
    } catch (failure) {
      setToast({ id: 'cover-error', text: failure.message });
    } finally {
      setCoverBusy(false);
    }
  }, [coverFor, onRunStarted, goTo]);

  const rows = useMemo(() => {
    if (!data) return [];
    const needle = query.trim().toLowerCase();
    return data.rows
      .filter((row) => statusFilter === 'all' || row.statusId === statusFilter)
      .filter((row) => bandFilter === 'all' || row.scoreBand === bandFilter)
      .filter((row) => !needle || `${row.company} ${row.role} ${row.notes ?? ''}`.toLowerCase().includes(needle))
      .sort((a, b) => compare(a, b, sort.key, sort.dir));
  }, [data, statusFilter, bandFilter, query, sort]);

  const nav = (
    <nav className="tabs nav">
      {PAGES.map((entry) => (
        <button
          key={entry.id}
          className="chip"
          aria-pressed={route.page === entry.id}
          onClick={() => goTo(entry.id)}
        >
          {entry.label}
        </button>
      ))}
    </nav>
  );

  const masthead = (extra) => (
    <header className="masthead">
      <h1>Job Search Console</h1>
      {nav}
      {extra}
    </header>
  );

  const toastEl = toast ? (
    <div className="toast" role="status">
      {toast.text}
      {toast.id && toast.id !== 'cover-error' ? <button className="chip" onClick={() => { goTo('runs', toast.id); setToast(null); }}>Open log</button> : null}
      <button className="chip" onClick={() => setToast(null)}>×</button>
    </div>
  ) : null;

  const coverDialog = coverFor ? (
    <div className="dialog-backdrop" onClick={() => !coverBusy && setCoverFor(null)}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <CoverLetterDialog report={coverFor} busy={coverBusy} onSubmit={submitCover} onCancel={() => setCoverFor(null)} />
      </div>
    </div>
  ) : null;

  if (route.page === 'sources') {
    return (
      <div className="app">
        {masthead()}
        <SourcesPage onRunStarted={(run) => { onRunStarted(run); }} />
        {toastEl}
      </div>
    );
  }

  if (route.page === 'runs') {
    return (
      <div className="app">
        {masthead()}
        <RunsPage openId={route.arg} onOpen={(id) => goTo('runs', id)} />
      </div>
    );
  }

  if (route.page === 'skills') {
    return (
      <div className="app">
        {masthead()}
        <SkillsPage reloadRef={skillsReloadRef} onRunStarted={onRunStarted} />
        {toastEl}
      </div>
    );
  }

  if (route.page === 'cv') {
    return (
      <div className="app">
        {masthead()}
        <CvStudioPage />
      </div>
    );
  }

  if (error) return <div className="app"><div className="notice warn">Could not reach the server: {error}</div></div>;
  if (!data) return <div className="app"><p className="empty">Loading…</p></div>;

  // Only offer a status tab when the tracker actually contains that status —
  // ten mostly-empty tabs would be noise. The vocabulary still comes from the
  // server, so a status appearing for the first time gets a tab automatically.
  const statusCounts = data.rows.reduce((acc, row) => {
    if (row.statusId) acc[row.statusId] = (acc[row.statusId] ?? 0) + 1;
    return acc;
  }, {});
  const bandCounts = data.rows.reduce((acc, row) => {
    if (row.scoreBand) acc[row.scoreBand] = (acc[row.scoreBand] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="app">
      {masthead(
        <span className="counts">
          {data.rows.length} applications · {data.rows.filter((r) => r.pdf).length} PDFs
        </span>,
      )}

      <AddJobBox onChanged={reload} />

      {data.issues.length > 0 ? (
        <details className="notice warn">
          <summary>{data.issues.length} data {data.issues.length === 1 ? 'issue' : 'issues'} found</summary>
          <ul>
            {data.issues.map((issue, i) => (
              <li key={i}>
                <code>{issue.code}</code>
                {issue.id ? ` (row ${issue.id})` : ''}
                {issue.message ? `: ${issue.message}` : ''}
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      <div className="toolbar">
        <button className="chip" aria-pressed={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>
          All<span className="n">{data.rows.length}</span>
        </button>
        {data.statuses
          .filter((state) => statusCounts[state.id])
          .map((state) => (
            <button
              key={state.id}
              className="chip"
              aria-pressed={statusFilter === state.id}
              onClick={() => setStatusFilter(state.id)}
            >
              {state.label}<span className="n">{statusCounts[state.id]}</span>
            </button>
          ))}

        <span className="spacer" />

        <label htmlFor="band">Score</label>
        <select id="band" value={bandFilter} onChange={(e) => setBandFilter(e.target.value)}>
          <option value="all">Any</option>
          {data.scoreBands.map((band) => (
            <option key={band.id} value={band.id} disabled={!bandCounts[band.id]}>
              {band.label} ({bandCounts[band.id] ?? 0})
            </option>
          ))}
        </select>

        <input
          type="search"
          placeholder="Filter company, role, notes…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <PipelineTable
        rows={rows}
        statuses={data.statuses}
        sort={sort}
        onSortChange={setSort}
        selectedId={selected}
        onSelect={openRow}
        onStatusChanged={reload}
        onRunStarted={onRunStarted}
        onCoverRequested={requestCover}
      />

      <ReportDetail
        report={report}
        error={reportError}
        onRunStarted={onRunStarted}
        onCoverRequested={requestCover}
        onOpenRun={(id) => goTo('runs', id)}
      />

      {kinds.length > 0 ? (
        <MaintenanceBar
          kinds={kinds.filter((kind) => kind.kind !== 'scan' && kind.lane !== 'agent' && !kind.page)}
          onFinish={reload}
        />
      ) : null}

      {toastEl}
      {coverDialog}
    </div>
  );
}

export default function App() {
  // The pipeline refetches itself when a report, PDF or the tracker changes on
  // disk — whoever wrote it. A ref so the provider's handler never goes stale.
  const reloadRef = useRef(null);
  // The Skills page depends on its own cache, the CV and the reports.
  const skillsReloadRef = useRef(null);
  const onChanged = useCallback((event) => {
    if (event.paths.some((path) => REFRESH_ON.some((re) => re.test(path)))) reloadRef.current?.();
    if (event.paths.some((path) => SKILLS_REFRESH_ON.some((re) => re.test(path)))) skillsReloadRef.current?.();
  }, []);
  return (
    <RunsProvider onChanged={onChanged}>
      <Shell reloadRef={reloadRef} skillsReloadRef={skillsReloadRef} />
    </RunsProvider>
  );
}
