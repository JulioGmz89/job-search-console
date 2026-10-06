import { useState } from 'react';

import { RunItem } from '../components/RunItem.jsx';
import { EmptyState } from '../components/ui.jsx';
import { FOLLOW_UP_KINDS, runState, runTitle } from '../lib/runs.js';
import { useRuns } from '../runs.jsx';
import { PageHead } from '../shell/router.jsx';

const FILTERS = [
  { id: 'all', label: 'All', test: () => true },
  { id: 'failed', label: 'Failed', test: (r) => runState(r) === 'failed' },
  { id: 'documents', label: 'Documents', test: (r) => ['pdf', 'cover', 'cv-render'].includes(r.kind) },
  { id: 'checks', label: 'Fit checks', test: (r) => r.kind === 'evaluate' },
  { id: 'openings', label: 'Openings', test: (r) => ['scan', 'skills-fetch', 'verify-portals', 'validate-portals'].includes(r.kind) },
];

/** One activity on its own page (#/activity/:id). */
function OneActivity({ id }) {
  const { runs } = useRuns();
  const run = runs[id];
  const back = <a href="#/activity">← Activity</a>;
  if (!run) {
    return (
      <>
        <PageHead title="Activity not found" back={back} lead="It may be from before the app last started, beyond the history it keeps." />
      </>
    );
  }
  return (
    <>
      <PageHead title={runTitle(run)} docTitle={runTitle(run)} back={back} />
      <RunItem run={run} headingLevel={2} link={false} />
    </>
  );
}

/**
 * Activity (ia.md §2.8): everything the app has done, named by what it is
 * about, with filters. Follow-ups are shown under the activity that started them.
 */
export function ActivityPage({ params }) {
  const { list } = useRuns();
  const [filter, setFilter] = useState('all');
  if (params.id) return <OneActivity id={params.id} />;

  const top = list.filter((r) => !FOLLOW_UP_KINDS.has(r.kind));
  const shown = top.filter(FILTERS.find((f) => f.id === filter).test);
  return (
    <>
      <PageHead title="Activity" lead="Everything the app has done for you: checks, documents and openings. The last 60 are kept across restarts; older logs are in your workspace folder (data/jsc/logs)." />
      <div className="chips" role="group" aria-label="Show">
        {FILTERS.map((f) => (
          <button key={f.id} type="button" className="chip" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
            {f.label} ({top.filter(f.test).length})
          </button>
        ))}
      </div>
      {shown.length ? (
        <section className="stack-sm" aria-label="Activities">
          {shown.map((r) => (
            <RunItem key={r.id} run={r} headingLevel={2} />
          ))}
        </section>
      ) : top.length ? (
        <p className="muted">Nothing matches this filter. <button type="button" className="btn-link" onClick={() => setFilter('all')}>Show all</button></p>
      ) : (
        <EmptyState title="Nothing has run yet">
          <p>Fit checks, tailored CVs, letters and checks for new openings appear here while they run and after they finish.</p>
          <p>
            Start with <a href="#/applications">Add a job</a> or <a href="#/to-review">Check for new openings</a>.
          </p>
        </EmptyState>
      )}
    </>
  );
}
