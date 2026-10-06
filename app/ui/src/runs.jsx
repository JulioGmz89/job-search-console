import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { cancelRun, fetchRuns, retryRun, startRun } from './api.js';
import { filesChanged, reload } from './data.js';
import { explainFailure, FOLLOW_UP_KINDS, outcome, runState, runTitle } from './lib/runs.js';
import { announce } from './shell/announce.jsx';
import { useServerEvents } from './useServerEvents.js';

/**
 * The queue as the whole UI sees it: every run the server knows about, kept
 * current by the event feed (ia.md §3 "Run feedback").
 *
 * The same run shows in several places — the Activity button and panel, Today,
 * a job's document card, the row it started from — and they must agree, so
 * there is one copy here. When a run finishes, the live region says so by name,
 * wherever the user is; failures are assertive.
 */
const RunsContext = createContext(null);

const byId = (list) => Object.fromEntries(list.map((run) => [run.id, run]));
const TERMINAL = new Set(['succeeded', 'failed', 'cancelled']);

export function RunsProvider({ children }) {
  const [runs, setRuns] = useState({});
  const [connected, setConnected] = useState(true);
  const known = useRef({});

  const load = useCallback(() => {
    fetchRuns()
      .then((listed) => {
        const all = byId([...listed.queued, ...listed.active, ...listed.recent]);
        known.current = all;
        setRuns(all);
      })
      .catch(() => {});
  }, []);
  useEffect(load, [load]);

  const upsert = useCallback((run) => {
    const before = known.current[run.id];
    known.current = { ...known.current, [run.id]: run };
    setRuns(known.current);
    // Say it once, when a run the user could see finishes.
    if (TERMINAL.has(run.status) && before && !TERMINAL.has(before.status) && !FOLLOW_UP_KINDS.has(run.kind)) {
      const title = runTitle(run);
      if (run.status === 'failed') announce(`${title} didn't finish. ${explainFailure(run).what}`, { assertive: true });
      else if (run.status === 'succeeded') announce(`${title}: ${outcome(run).text}`);
    }
    if (TERMINAL.has(run.status)) reload('workspace');
  }, []);

  useServerEvents({
    onHello: (hello) => {
      const all = byId([...hello.runs.queued, ...hello.runs.active, ...hello.runs.recent]);
      known.current = all;
      setRuns(all);
    },
    onRun: upsert,
    onChanged: (event) => filesChanged(event.paths ?? []),
    onConnection: setConnected,
  });

  const value = useMemo(() => {
    const list = Object.values(runs).sort((a, b) => (b.queuedAt ?? 0) - (a.queuedAt ?? 0));
    return {
      runs,
      list,
      connected,
      reload: load,
      /** Start a run and add it at once, before its first event arrives. */
      async start(kind, options = {}, confirmToken) {
        const run = await startRun(kind, options, confirmToken);
        upsert(run);
        return run;
      },
      async retry(id) {
        const run = await retryRun(id);
        upsert(run);
        return run;
      },
      async cancel(id) {
        const run = await cancelRun(id);
        upsert(run);
        return run;
      },
      /** Add a run another endpoint started (adding a job by link starts its check). */
      track: upsert,
    };
  }, [runs, connected, load, upsert]);

  return <RunsContext.Provider value={value}>{children}</RunsContext.Provider>;
}

export function useRuns() {
  const value = useContext(RunsContext);
  if (!value) throw new Error('useRuns() needs a RunsProvider');
  return value;
}

/** The runs about one job: by report, or by the posting link before a report exists. */
export function runsForJob(list, { reportId = null, url = null } = {}) {
  const id = reportId === null ? null : Number(reportId);
  const direct = list.filter(
    (r) => (id !== null && (Number(r.meta?.reportId) === id || Number(r.result?.reportId) === id)) || (url && r.meta?.url === url),
  );
  const ids = new Set(direct.map((r) => r.id));
  return list.filter((r) => ids.has(r.id) || ids.has(r.parentId));
}

/** The newest run of a kind among some runs, or null. */
export function latest(list, kind) {
  return list.filter((r) => r.kind === kind).sort((a, b) => (b.queuedAt ?? 0) - (a.queuedAt ?? 0))[0] ?? null;
}

export { runState };
