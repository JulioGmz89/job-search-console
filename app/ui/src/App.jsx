import { useCallback, useEffect, useMemo, useState } from 'react';

import { fetchPipeline, fetchReport, fetchRuns } from './api.js';
import MaintenanceBar from './components/MaintenanceBar.jsx';
import PipelineTable from './components/PipelineTable.jsx';
import ReportDetail from './components/ReportDetail.jsx';
import SourcesPage from './components/SourcesPage.jsx';

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
];

/**
 * Hash routing, in fifteen lines.
 *
 * Two pages do not justify a router dependency, and PROJECT_PLAN.md §11 leaves
 * the UI stack open — pulling one in now would quietly settle that question.
 */
function useHashPage() {
  const read = () => window.location.hash.replace(/^#\/?/, '') || 'pipeline';
  const [page, setPage] = useState(read);
  useEffect(() => {
    const onChange = () => setPage(read());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return [PAGES.some((p) => p.id === page) ? page : 'pipeline', (next) => { window.location.hash = `#/${next}`; }];
}

export default function App() {
  const [page, goTo] = useHashPage();
  const [data, setData] = useState(null);
  const [kinds, setKinds] = useState([]);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [bandFilter, setBandFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState({ key: 'score', dir: 'desc' });
  const [selected, setSelected] = useState(null);
  const [report, setReport] = useState(null);
  const [reportError, setReportError] = useState(null);

  const reload = useCallback(() => {
    fetchPipeline().then(setData).catch((e) => setError(e.message));
  }, []);

  useEffect(reload, [reload]);
  useEffect(() => {
    fetchRuns().then((runs) => setKinds(runs.kinds)).catch(() => {});
  }, []);

  const openRow = useCallback((row) => {
    setSelected(row.id);
    setReport(null);
    setReportError(null);
    if (!row.hasReport) {
      setReportError(`Row ${row.id} references report ${row.reportId}, which is not on disk.`);
      return;
    }
    fetchReport(row.reportId).then(setReport).catch((e) => setReportError(e.message));
  }, []);

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
          aria-pressed={page === entry.id}
          onClick={() => goTo(entry.id)}
        >
          {entry.label}
        </button>
      ))}
    </nav>
  );

  if (page === 'sources') {
    return (
      <div className="app">
        <header className="masthead">
          <h1>Job Search Console</h1>
          {nav}
        </header>
        <SourcesPage />
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
      <header className="masthead">
        <h1>Job Search Console</h1>
        {nav}
        <span className="counts">
          {data.rows.length} applications · {data.rows.filter((r) => r.pdf).length} PDFs
        </span>
      </header>

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
      />

      <ReportDetail report={report} error={reportError} />

      {kinds.length > 0 ? (
        <MaintenanceBar
          kinds={kinds.filter((kind) => kind.kind !== 'scan')}
          onFinish={reload}
        />
      ) : null}
    </div>
  );
}
