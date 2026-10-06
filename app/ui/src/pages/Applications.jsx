import { useMemo, useState } from 'react';
import { Cell, Column, Row, Table, TableBody, TableHeader } from 'react-aria-components';

import { AddJob } from '../components/AddJob.jsx';
import { StatusControl } from '../components/StatusControl.jsx';
import { ActionMenu, EmptyState, Notice } from '../components/ui.jsx';
import { useResource } from '../data.js';
import { fit, jobName, plural, shortDate, statusLabel } from '../lib/labels.js';
import { runTitle } from '../lib/runs.js';
import { useRuns } from '../runs.jsx';
import { announce } from '../shell/announce.jsx';
import { navigate, PageHead } from '../shell/router.jsx';

const FITS = [
  { id: 'any', label: 'Any fit', test: () => true },
  { id: '4', label: '4 and up', test: (r) => r.score >= 4 },
  { id: '3.5', label: '3.5 and up', test: (r) => r.score >= 3.5 },
  { id: 'low', label: 'Under 3', test: (r) => typeof r.score === 'number' && r.score < 3 },
];

const STORE = 'jsc-applications-filters';
/** Filters survive going to a job and coming back (ia.md §2.2): kept per tab. */
function readFilters() {
  const fromUrl = /[?&]status=([\w-]+)/.exec(window.location.hash)?.[1] ?? null;
  let saved;
  try {
    saved = JSON.parse(window.sessionStorage.getItem(STORE) ?? '{}') ?? {};
  } catch {
    saved = {};
  }
  return { status: fromUrl ?? saved.status ?? 'all', fit: saved.fit ?? 'any', text: saved.text ?? '', sort: saved.sort ?? { column: 'fit', direction: 'descending' } };
}
function writeFilters(filters) {
  try {
    window.sessionStorage.setItem(STORE, JSON.stringify(filters));
  } catch {
    // Without storage the filters simply reset when the page is left.
  }
}

const statusOf = (row) => String(row.statusId ?? row.status ?? '').toLowerCase();

const SORTS = {
  number: (r) => r.id,
  job: (r) => jobName(r).toLowerCase(),
  fit: (r) => r.score ?? -1,
  status: (r) => statusLabel(statusOf(r)),
  checked: (r) => r.date ?? '',
};

/**
 * Applications (ia.md §2.2): the tracker, dense, sortable and filterable, and
 * fully keyboard-operable (React Aria Table; F-005, F-014). P1's home.
 */
export function ApplicationsPage() {
  const pipeline = useResource('pipeline');
  const { start } = useRuns();
  const [filters, setFiltersState] = useState(readFilters);
  const [moved, setMoved] = useState({});
  const setFilters = (change) => {
    const next = { ...filters, ...change };
    setFiltersState(next);
    writeFilters(next);
    setMoved({});
  };

  const rows = pipeline.data?.rows ?? [];
  const statuses = pipeline.data?.statuses ?? [];
  const unreadable = (pipeline.data?.issues ?? []).filter((i) => i.code === 'row-unparseable');
  const counts = useMemo(() => {
    const c = {};
    for (const r of rows) c[statusOf(r)] = (c[statusOf(r)] ?? 0) + 1;
    return c;
  }, [rows]);

  const fitTest = FITS.find((f) => f.id === filters.fit)?.test ?? FITS[0].test;
  const words = filters.text.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const matches = (r) =>
    (filters.status === 'all' || statusOf(r) === filters.status) &&
    fitTest(r) &&
    words.every((w) => `${jobName(r)} ${r.notes ?? ''}`.toLowerCase().includes(w));
  // A row whose status was just changed out of the filter stays, greyed, until
  // the next filter change, so it never vanishes silently (ia.md §2.2).
  const shown = rows
    .filter((r) => matches(r) || moved[r.id])
    .sort((a, b) => {
      const key = SORTS[filters.sort.column] ?? SORTS.fit;
      const [x, y] = [key(a), key(b)];
      const order = x < y ? -1 : x > y ? 1 : a.id - b.id;
      return filters.sort.direction === 'ascending' ? order : -order;
    });
  const filtering = filters.status !== 'all' || filters.fit !== 'any' || words.length > 0;

  const act = async (row, action) => {
    try {
      if (action === 'cv') {
        const run = await start('pdf', { reportId: row.reportId });
        announce(`Started: ${runTitle(run)}. About 3 minutes.`);
      } else if (action === 'check') {
        const run = await start('evaluate', { url: row.report?.url, autoPdf: false });
        announce(`Started: ${runTitle(run)}. About 2 to 5 minutes.`);
      } else if (action === 'cover') navigate(`#/applications/${row.id}#cover`);
      else if (action === 'open') window.open(row.report?.url, '_blank', 'noopener');
      else if (action === 'job') navigate(`#/applications/${row.id}`);
    } catch (e) {
      announce(`Could not start it: ${e.message}`, { assertive: true });
    }
  };

  const clear = (
    <button type="button" className="btn-link" onClick={() => setFilters({ status: 'all', fit: 'any', text: '' })}>
      Clear filters
    </button>
  );

  return (
    <>
      <PageHead title="Applications" lead="Every job you have checked, its fit and where you are with it.">
        <ActionMenu
          label="Tidy up your applications"
          text="Tidy up"
          items={[
            { id: 'dedup', label: 'Find duplicate applications' },
            { id: 'verify', label: 'Check my list for problems' },
          ]}
          onAction={(id) => navigate(`#/workspace#${id === 'dedup' ? 'tool-dedup' : 'tool-verify'}`)}
        />
      </PageHead>

      {unreadable.length ? (
        <Notice tone="attn">
          <b>{plural(unreadable.length, 'application')} could not be read</b> and {unreadable.length === 1 ? 'is' : 'are'} not in this list: {unreadable.map((i) => i.message).join(' ')}{' '}
          <a href="#/workspace#health">Show me how to fix it</a>
        </Notice>
      ) : null}

      <section className="card add-job" aria-labelledby="add-job-h">
        <h2 id="add-job-h" className="card-title">
          Add a job
        </h2>
        <AddJob idPrefix="apps" headingId="add-job-h" />
      </section>

      {rows.length === 0 && pipeline.data ? (
        <EmptyState title="No applications yet">
          <p>Each job you check gets a row here with its fit, your status and its documents. Add a job by its link above, or look at the openings waiting in To review.</p>
          <p>
            <a href="#/to-review">Open To review</a>
          </p>
        </EmptyState>
      ) : null}

      {rows.length ? (
        <>
          <div className="stack-sm">
            <div className="chips" role="group" aria-label="Show applications with status">
              <button type="button" className="chip" aria-pressed={filters.status === 'all'} onClick={() => setFilters({ status: 'all' })}>
                All ({rows.length})
              </button>
              {statuses
                .filter((s) => counts[s.id])
                .map((s) => (
                  <button key={s.id} type="button" className="chip" aria-pressed={filters.status === s.id} onClick={() => setFilters({ status: s.id })}>
                    {statusLabel(s.id)} ({counts[s.id]})
                  </button>
                ))}
            </div>
            <div className="row filters">
              <div className="field narrow">
                <label htmlFor="apps-fit">Fit</label>
                <select id="apps-fit" value={filters.fit} onChange={(e) => setFilters({ fit: e.target.value })}>
                  {FITS.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field grow">
                <label htmlFor="apps-search">Search</label>
                <input id="apps-search" type="search" value={filters.text} placeholder="Company, role or note" onChange={(e) => setFilters({ text: e.target.value })} />
              </div>
              {filtering ? clear : null}
            </div>
            <p className="small muted" role="status">
              Showing {shown.length} of {rows.length}
              {filtering ? ' (filtered)' : ''}.
            </p>
          </div>

          {shown.length ? (
            <div className="table-wrap">
              <Table
                aria-label="Applications"
                className="apps-table stackable"
                sortDescriptor={filters.sort}
                onSortChange={(sort) => setFilters({ sort })}
              >
                <TableHeader>
                  <Column id="number" allowsSorting>
                    #
                  </Column>
                  <Column id="job" isRowHeader allowsSorting>
                    Company and role
                  </Column>
                  <Column id="fit" allowsSorting>
                    Fit
                  </Column>
                  <Column id="reco" className="hide-md">
                    Recommendation
                  </Column>
                  <Column id="status" allowsSorting>
                    Status
                  </Column>
                  <Column id="docs" className="hide-md">
                    Documents
                  </Column>
                  <Column id="checked" allowsSorting className="hide-md">
                    Checked
                  </Column>
                  <Column id="actions">Actions</Column>
                </TableHeader>
                <TableBody items={shown}>
                  {(row) => {
                    const left = moved[row.id] && !matches(row);
                    return (
                      <Row id={row.id} className={left ? 'moved' : ''}>
                        <Cell className="num" data-label="#">
                          {row.id}
                        </Cell>
                        <Cell>
                          <a className="joblink" href={`#/applications/${row.id}`}>
                            {jobName(row)}
                          </a>
                          {left ? <span className="rowmsg">Moved to {statusLabel(moved[row.id])}</span> : null}
                        </Cell>
                        <Cell className="num">{fit(row.score)}</Cell>
                        <Cell className="hide-md">{row.report?.decision ?? '—'}</Cell>
                        <Cell>
                          <StatusControl row={row} statuses={statuses} onSaved={(id) => setMoved((m) => ({ ...m, [row.id]: id }))} />
                        </Cell>
                        <Cell className="hide-md">{[row.pdf ? 'CV' : null, row.cover ? 'letter' : null].filter(Boolean).join(', ') || '—'}</Cell>
                        <Cell className="hide-md num">{shortDate(row.date)}</Cell>
                        <Cell>
                          <ActionMenu
                            label={`Actions for ${jobName(row)}`}
                            items={[
                              { id: 'job', label: 'Open the job' },
                              { id: 'cv', label: row.pdf ? 'Make tailored CV again' : 'Make tailored CV' },
                              { id: 'cover', label: 'Write cover letter' },
                              { id: 'check', label: 'Check fit again' },
                              { id: 'open', label: 'Open the posting ↗', disabled: !row.report?.url },
                            ]}
                            onAction={(id) => act(row, id)}
                          />
                        </Cell>
                      </Row>
                    );
                  }}
                </TableBody>
              </Table>
            </div>
          ) : (
            <EmptyState title="No applications match these filters">
              <p>{clear}</p>
            </EmptyState>
          )}
        </>
      ) : null}
    </>
  );
}
