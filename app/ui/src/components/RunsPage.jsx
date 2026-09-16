import { useEffect, useState } from 'react';

import { cancelRun } from '../api.js';
import { useRuns } from '../runs.jsx';
import { useRun } from '../useRun.js';
import RunPanel, { describeRun, outcome, useElapsed } from './RunPanel.jsx';

/** One table row; its own component so each has its own ticking clock. */
function RunRow({ run, selected, onOpen }) {
  const elapsed = useElapsed(run);
  const result = outcome(run);
  const live = run.status === 'queued' || run.status === 'running';
  return (
    <tr aria-selected={selected} onClick={() => onOpen(run)}>
      <td><span className={`badge ${result.className}`}>{result.label}</span></td>
      <td className="company">{run.label}</td>
      <td className="notes">{describeRun(run) || <span className="muted">—</span>}</td>
      <td className="muted">{run.lane === 'agent' ? 'Claude' : run.exclusive ? 'exclusive' : 'script'}</td>
      <td className="num">{elapsed ?? '—'}</td>
      <td className="date muted">{new Date(run.startedAt ?? run.queuedAt).toLocaleTimeString()}</td>
      <td className="row-actions">
        {live ? (
          <button className="chip" onClick={(e) => { e.stopPropagation(); cancelRun(run.id).catch(() => {}); }}>Cancel</button>
        ) : null}
      </td>
    </tr>
  );
}

/**
 * The queue: what is waiting, what is running, what finished — and the log of
 * whichever one is open. Chains (evaluate → merge → reconcile → PDF) show as
 * separate rows because they are separate runs; the description column says
 * which report each belongs to.
 */
export default function RunsPage({ openId, onOpen }) {
  const { queued, active, recent, kinds, connected } = useRuns();
  const [selectedId, setSelectedId] = useState(openId ?? null);
  const log = useRun();
  const { follow, reset } = log;

  // A deep link (#/runs/<id>) or a click: attach to that run's log. `follow`
  // and `reset` are stable callbacks, so this only re-runs when the id changes.
  useEffect(() => {
    if (openId) setSelectedId(openId);
  }, [openId]);
  useEffect(() => {
    if (selectedId) follow(selectedId);
    else reset();
  }, [selectedId, follow, reset]);

  const open = (run) => {
    setSelectedId(run.id);
    onOpen?.(run.id);
  };

  const groups = [
    ['Running', active],
    ['Waiting', queued],
    ['Finished', recent],
  ];
  const agentKinds = kinds.filter((k) => k.lane === 'agent');

  return (
    <div className="runs-page">
      {!connected ? <div className="notice warn">Not connected to the server’s event feed — this list may be stale. It reconnects by itself.</div> : null}

      <RunPanel run={log.run} lines={log.lines} progress={log.progress} error={log.error} onCancel={log.cancel} onDismiss={() => { setSelectedId(null); onOpen?.(null); }} />

      {groups.map(([title, runs]) => (
        <section key={title}>
          <div className="section-head">
            <h2>{title}</h2>
            <span className="muted">{runs.length}</span>
          </div>
          {runs.length === 0 ? (
            <p className="muted">Nothing {title.toLowerCase()}.</p>
          ) : (
            <div className="table-wrap">
              <table className="runs-table">
                <thead>
                  <tr>
                    <th>Status</th><th>Run</th><th>About</th><th>Lane</th><th className="num">Time</th><th>Started</th><th />
                  </tr>
                </thead>
                <tbody>
                  {runs.map((run) => <RunRow key={run.id} run={run} selected={run.id === selectedId} onOpen={open} />)}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ))}

      <details className="help">
        <summary>How runs work</summary>
        <p>
          Every long task is a run with a live log: scans and maintenance scripts (M2), and now headless
          Claude Code sessions. Runs sit in two lanes. <strong>Script</strong> runs go one at a time — they all
          touch the same tracker files. <strong>Claude</strong> runs may overlap (two by default,{' '}
          <code>JSC_MAX_AGENTS</code> to change it), each working on its own report number. A run marked{' '}
          <strong>exclusive</strong> — merging the tracker, reconciling the inbox, flipping a PDF flag — waits
          until nothing else runs and blocks everything while it does, so no two writers ever touch{' '}
          <code>applications.md</code> at once.
        </p>
        <p>
          A chain is several runs: an evaluation that succeeds queues the tracker merge, which queues the inbox
          reconcile; a good score also queues the PDF, which queues the flag flip. If a step fails, the ones
          after it are cancelled and say why.
        </p>
        {agentKinds.length ? (
          <dl>
            {agentKinds.map((kind) => (
              <div key={kind.kind}>
                <dt>{kind.label}</dt>
                <dd>{kind.help ?? kind.description}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        <p className="muted">
          The full Claude transcript of each session is kept as <code>data/jsc/logs/&lt;run id&gt;.jsonl</code>, and
          the exact prompt it was given as <code>data/jsc/prompts/&lt;run id&gt;.md</code>. The server keeps the
          last sixty runs in memory; a restart forgets them all, and the files they wrote stay.
        </p>
      </details>
    </div>
  );
}
