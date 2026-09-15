import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { fetchAgentStatus, fetchRuns } from './api.js';
import { useServerEvents } from './useServerEvents.js';

/**
 * The queue as the whole UI sees it: every run the server knows about, kept
 * current by the event feed, plus whether agent runs can work at all.
 *
 * A context rather than per-component fetches because the same run shows up
 * in several places — the Runs page, the panel under the paste box, a badge on
 * a pipeline row — and they must agree.
 */
const RunsContext = createContext(null);

const byId = (list) => Object.fromEntries(list.map((run) => [run.id, run]));

export function RunsProvider({ children, onChanged }) {
  const [runs, setRuns] = useState({});
  const [kinds, setKinds] = useState([]);
  const [agent, setAgent] = useState(null);
  const [connected, setConnected] = useState(true);

  const load = useCallback(() => {
    fetchRuns()
      .then((listed) => {
        setKinds(listed.kinds);
        setRuns(byId([...listed.queued, ...listed.active, ...listed.recent]));
      })
      .catch(() => {});
    fetchAgentStatus().then(setAgent).catch(() => setAgent({ bin: { found: false }, profile: {} }));
  }, []);

  useEffect(load, [load]);

  useServerEvents({
    onHello: (hello) => setRuns(byId([...hello.runs.queued, ...hello.runs.active, ...hello.runs.recent])),
    onRun: (run) => setRuns((current) => ({ ...current, [run.id]: run })),
    onChanged: (event) => onChanged?.(event),
    onConnection: setConnected,
  });

  const value = useMemo(() => {
    const list = Object.values(runs);
    const order = (a, b) => (b.queuedAt ?? 0) - (a.queuedAt ?? 0);
    return {
      runs,
      list: list.sort(order),
      queued: list.filter((r) => r.status === 'queued').sort((a, b) => a.queuedAt - b.queuedAt),
      active: list.filter((r) => r.status === 'running').sort((a, b) => a.startedAt - b.startedAt),
      recent: list.filter((r) => !['queued', 'running'].includes(r.status)).sort((a, b) => (b.endedAt ?? 0) - (a.endedAt ?? 0)),
      kinds,
      agent,
      connected,
      reload: load,
      /** Whether the buttons that start a Claude session should be enabled, and why not. */
      agentReady: agent?.bin?.found === true && agent?.cvPresent === true,
      agentReason:
        agent === null
          ? 'Checking for Claude Code…'
          : agent.bin?.found !== true
            ? `Claude Code CLI not found (${agent.bin?.display ?? 'claude'}) — install it or set JSC_CLAUDE_BIN`
            : agent.cvPresent !== true
              ? 'No cv.md in the data directory yet'
              : null,
    };
  }, [runs, kinds, agent, connected, load]);

  return <RunsContext.Provider value={value}>{children}</RunsContext.Provider>;
}

export function useRuns() {
  const value = useContext(RunsContext);
  if (!value) throw new Error('useRuns() needs a RunsProvider');
  return value;
}

/** The runs that belong to a report: its own, and the ones chained from them. */
export function runsForReport(list, reportId) {
  const id = Number(reportId);
  const direct = list.filter((r) => r.meta?.reportId === id || r.result?.reportId === id);
  const ids = new Set(direct.map((r) => r.id));
  return list.filter((r) => ids.has(r.id) || ids.has(r.parentId));
}
