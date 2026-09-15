import { useCallback, useEffect, useState } from 'react';

import { createPortalEntry, deletePortalEntry, fetchInbox, fetchPortals, startEvaluate, updatePortalEntry } from '../api.js';
import { useRuns } from '../runs.jsx';
import { useRun } from '../useRun.js';
import PortalEntryForm from './PortalEntryForm.jsx';
import RunPanel from './RunPanel.jsx';

/** How `portal-health.tsv` verdicts read to a human, and what to do about each. */
const HEALTH_LABEL = {
  reachable: 'reachable',
  empty: 'live but empty',
  slug_gone: 'board not found',
  network: 'network error',
  auth: 'needs auth',
  server: 'server error',
  unknown: 'unknown',
};

const HEALTH_MEANING = [
  ['reachable', 'The board answered and listed postings on the last scan.'],
  ['live but empty', 'The board answered but had zero openings. Normal for small companies; nothing to fix.'],
  ['board not found', 'The address is wrong or the company moved to another ATS. Run Probe sources — it suggests the corrected board.'],
  ['network error / server error', 'The board could not be reached that time. Usually transient; if it persists, the URL may be dead.'],
  ['needs auth', 'The board wants a login. The scanner cannot read it; consider websearch for this one.'],
  ['never scanned', 'Either a websearch source (scans never fetch those) or one added since the last scan.'],
];

/** A source's effective provider, as the scanner will resolve it. */
function providerOf(entry) {
  if (entry.provider) return entry.provider;
  if (entry.scanMethod === 'websearch') return 'web search';
  if (entry.careersUrl) return 'auto-detected';
  return '—';
}

export default function SourcesPage({ onRunStarted }) {
  const { agentReady, agentReason, list: allRuns } = useRuns();
  const [evaluating, setEvaluating] = useState(null);
  const [portals, setPortals] = useState(null);
  const [inbox, setInbox] = useState(null);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [scanOptions, setScanOptions] = useState({ dryRun: false, verify: false, company: '', since: '' });

  const reload = useCallback(() => {
    fetchPortals().then(setPortals).catch((e) => setError(e.message));
    fetchInbox().then(setInbox).catch(() => {});
  }, []);

  useEffect(reload, [reload]);

  // A finished scan has appended to the inbox and the health file, so both are
  // stale the moment it ends.
  const scan = useRun({ onFinish: reload });

  /** Every write goes through here so the etag and the error handling stay in one place. */
  const write = useCallback(async (action) => {
    setBusy(true);
    setError(null);
    try {
      await action(portals.etag);
      setEditing(null);
      reload();
    } catch (failure) {
      setError(
        failure.code === 'stale-etag'
          ? 'portals.yml changed on disk since this page loaded. Reload to see the current file, then try again.'
          : [failure.message, ...(failure.detail ?? [])].join(' — '),
      );
      if (failure.code === 'stale-etag') reload();
    } finally {
      setBusy(false);
    }
  }, [portals, reload]);

  if (error && !portals) return <div className="notice warn">{error}</div>;
  if (!portals) return <p className="empty">Loading…</p>;

  const sections = [
    { kind: 'company', title: 'Tracked companies', entries: portals.companies },
    { kind: 'board', title: 'Job boards', entries: portals.boards },
  ];

  const scanning = scan.run?.status === 'running' || scan.starting;

  return (
    <div className="sources">
      {error ? <div className="notice warn">{error}</div> : null}

      {portals.issues.length > 0 ? (
        <details className="notice warn">
          <summary>{portals.issues.length} issue(s) in portals.yml</summary>
          <ul>{portals.issues.map((issue, i) => <li key={i}><code>{issue.code}</code>: {issue.message}</li>)}</ul>
        </details>
      ) : null}

      <section className="scan-box">
        <div className="toolbar">
          <button
            className="chip primary"
            disabled={scanning}
            onClick={() => scan.start('scan', {
              dryRun: scanOptions.dryRun,
              verify: scanOptions.verify,
              company: scanOptions.company,
              since: scanOptions.since,
            })}
          >
            Scan now
          </button>

          <label className="inline">
            <input
              type="checkbox"
              checked={scanOptions.dryRun}
              onChange={(e) => setScanOptions({ ...scanOptions, dryRun: e.target.checked })}
            />
            Preview only
          </label>

          <label className="inline" title="Open each new posting in a browser and drop the ones that have expired. Much slower.">
            <input
              type="checkbox"
              checked={scanOptions.verify}
              onChange={(e) => setScanOptions({ ...scanOptions, verify: e.target.checked })}
            />
            Verify each posting is live
          </label>

          <input
            placeholder="Only this company…"
            value={scanOptions.company}
            onChange={(e) => setScanOptions({ ...scanOptions, company: e.target.value })}
          />
          <input
            type="number"
            min="1"
            placeholder="Last N days"
            value={scanOptions.since}
            onChange={(e) => setScanOptions({ ...scanOptions, since: e.target.value })}
          />
        </div>

        <details className="help compact">
          <summary>What the scan options do</summary>
          <dl>
            <div>
              <dt>Scan now</dt>
              <dd>
                Fetches every enabled source, applies your filters from <code>portals.yml</code> (title,
                location, salary…), drops anything already seen, and appends what is left to the inbox as
                URLs waiting to be evaluated. Nothing is applied to or sent anywhere.
              </dd>
            </div>
            <div>
              <dt>Preview only</dt>
              <dd>Runs the whole scan and shows what it would add, but writes nothing. Safe to run any time.</dd>
            </div>
            <div>
              <dt>Verify each posting is live</dt>
              <dd>
                Opens every <em>new</em> posting in a real browser and drops the ones that have expired or
                lost their apply button. Much slower — seconds per posting — and the only phase with a
                real progress bar, because it is the only phase the scanner counts.
              </dd>
            </div>
            <div>
              <dt>Only this company</dt>
              <dd>Scan a single source, matched by name (case-insensitive, partial match works).</dd>
            </div>
            <div>
              <dt>Last N days</dt>
              <dd>Ignore postings the employer published more than N days ago.</dd>
            </div>
          </dl>
          <p className="muted">
            The scanner reports nothing while it is fetching — every source is queried at once and the
            summary arrives all together — so a quiet log with a running clock is normal, not stuck.
          </p>
        </details>

        <RunPanel
          run={scan.run}
          lines={scan.lines}
          progress={scan.progress}
          error={scan.error}
          onCancel={scan.cancel}
          onDismiss={scan.reset}
        />

        {inbox ? (
          <div className="inbox-summary">
            <strong>{inbox.pending.length}</strong> URL(s) waiting to be evaluated
            {inbox.lastScan ? (
              <span className="muted">
                {' · '}last scan {inbox.lastScan.timestamp?.slice(0, 10)}: {inbox.lastScan.found} found,
                {' '}{inbox.lastScan.new_added} added, {inbox.lastScan.dupes} duplicate(s)
              </span>
            ) : null}
            {inbox.pending.length > 0 ? (
              <details>
                <summary>Show the inbox</summary>
                <ul className="inbox-list">
                  {inbox.pending.map((item, i) => {
                    const inFlight = allRuns.find((r) => r.kind === 'evaluate' && r.meta?.url === item.url && (r.status === 'queued' || r.status === 'running'));
                    return (
                      <li key={i} className={item.error ? 'err' : undefined}>
                        <a href={item.url} target="_blank" rel="noopener noreferrer">
                          {item.title ?? item.url}
                        </a>
                        {item.company ? <span className="muted"> · {item.company}</span> : null}
                        {item.location ? <span className="muted"> · {item.location}</span> : null}
                        {item.posted ? <span className="muted"> · posted {item.posted}</span> : null}
                        {item.error ? <span className="muted"> · {item.error}</span> : null}
                        {' '}
                        <button
                          className="chip"
                          disabled={!agentReady || Boolean(inFlight) || evaluating === item.url}
                          title={agentReady ? (inFlight ? `Already ${inFlight.status}` : 'Evaluate this posting with Claude') : agentReason}
                          onClick={async () => {
                            setEvaluating(item.url);
                            try {
                              onRunStarted?.(await startEvaluate({ url: item.url }));
                            } catch (failure) {
                              setError(failure.message);
                            } finally {
                              setEvaluating(null);
                            }
                          }}
                        >
                          {inFlight ? inFlight.status : 'Evaluate'}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </details>
            ) : null}
          </div>
        ) : null}
      </section>

      <details className="help">
        <summary>How sources work</summary>
        <p>
          Every scan reads each enabled source below and drops new postings into the inbox. A source is
          read in one of three ways, and the <strong>Provider</strong> column tells you which:
        </p>
        <dl>
          <div>
            <dt>auto-detected</dt>
            <dd>
              The careers URL is on a job-board system the scanner recognises (Greenhouse, Lever, Ashby,
              Workday, SmartRecruiters and about twenty more). Fetched for free on every scan. This is
              what you want for most companies.
            </dd>
          </div>
          <div>
            <dt>a provider name</dt>
            <dd>
              The provider was chosen by hand — needed for aggregator boards with no per-company page,
              or when a custom domain hides which system is behind it.
            </dd>
          </div>
          <div>
            <dt>web search</dt>
            <dd>
              No provider can reach this company. <strong>Scans never fetch it</strong>; it is listed
              under “Agent/WebSearch handoff” in the scan log for the AI agent (a later milestone). If a
              company shows up here but does have a careers page on a known system, editing the source
              to add that URL turns it into a real one.
            </dd>
          </div>
        </dl>
        <h4>The Last seen column</h4>
        <dl>
          {HEALTH_MEANING.map(([label, meaning]) => (
            <div key={label}><dt>{label}</dt><dd>{meaning}</dd></div>
          ))}
        </dl>
        <p className="muted">
          Everything you change here is written straight into <code>portals.yml</code>, editing only the
          lines involved — your comments and the rest of the file are left exactly as they were, and a
          copy of the previous version is kept as <code>portals.yml.bak</code>. If the file changes on
          disk while this page is open, saving is refused until you reload, so nothing is ever
          overwritten.
        </p>
      </details>

      {sections.map(({ kind, title, entries }) => (
        <section key={kind}>
          <div className="section-head">
            <h2>{title} <span className="muted">({entries.length})</span></h2>
            <button
              className="chip"
              disabled={!portals.editable || busy}
              onClick={() => setEditing({ kind, entry: null })}
            >
              Add
            </button>
          </div>

          {entries.length === 0 ? <p className="empty">Nothing here yet.</p> : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>On</th>
                    <th>Name</th>
                    <th>Provider</th>
                    <th>Last seen</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={`${entry.kind}-${entry.index}`}>
                      <td>
                        <input
                          type="checkbox"
                          checked={entry.enabled}
                          disabled={!portals.editable || busy || !entry.editable}
                          aria-label={`Include ${entry.name} in scans`}
                          onChange={(e) => write((etag) =>
                            updatePortalEntry(kind, entry.index, entry.name, { enabled: e.target.checked }, etag))}
                        />
                      </td>
                      <td className="company">
                        {entry.name}
                        {entry.notes ? <div className="muted">{entry.notes}</div> : null}
                      </td>
                      <td>
                        {providerOf(entry)}
                        {entry.extraKeys.length > 0 ? (
                          <span className="muted" title={`Also sets ${entry.extraKeys.join(', ')}`}> +{entry.extraKeys.length}</span>
                        ) : null}
                      </td>
                      <td className={portals.health[entry.name]?.status === 'reachable' ? 'muted' : 'warn-text'}>
                        {portals.health[entry.name]
                          ? HEALTH_LABEL[portals.health[entry.name].status] ?? portals.health[entry.name].status
                          : <span className="muted">never scanned</span>}
                      </td>
                      <td className="row-actions">
                        <button
                          className="chip"
                          disabled={!portals.editable || busy || !entry.editable}
                          onClick={() => setEditing({ kind, entry })}
                        >
                          Edit
                        </button>
                        <button
                          className="chip"
                          disabled={!portals.editable || busy}
                          onClick={() => write((etag) => deletePortalEntry(kind, entry.index, entry.name, etag))}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ))}

      {editing ? (
        <PortalEntryForm
          kind={editing.kind}
          entry={editing.entry}
          providers={portals.providers}
          scanMethods={portals.scanMethods}
          busy={busy}
          onCancel={() => setEditing(null)}
          onSubmit={(draft) => write((etag) => (
            editing.entry
              ? updatePortalEntry(editing.kind, editing.entry.index, editing.entry.name, draft, etag)
              : createPortalEntry(editing.kind, draft, etag)
          ))}
        />
      ) : null}

      <details className="filters">
        <summary>Filters ({Object.keys(portals.filters).length} blocks, read-only)</summary>
        <p className="muted">
          Location, title, salary and visa filtering still live in <code>portals.yml</code>. Editing them here is not
          part of this milestone; the file itself remains the place to change them, and everything the console writes
          leaves your comments intact.
        </p>
        <pre>{JSON.stringify(portals.filters, null, 2)}</pre>
      </details>
    </div>
  );
}
