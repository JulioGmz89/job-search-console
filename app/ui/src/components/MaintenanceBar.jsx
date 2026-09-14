import { useCallback, useState } from 'react';

import { useRun } from '../useRun.js';
import RunPanel from './RunPanel.jsx';

/**
 * The dedup and integrity buttons.
 *
 * Two behaviours, decided by the server's own `confirmRequired` flag rather than
 * by a list repeated here:
 *
 *   - A read-only check (`verify-pipeline`, `validate-portals`, `verify-portals`)
 *     runs on the first click. It writes nothing, so asking first would be noise.
 *   - Anything that rewrites `applications.md` runs its `--dry-run` first. The
 *     real run is only offered afterwards, and is authorised by the id of that
 *     preview — so the server can tell "the user read the preview" apart from
 *     "the client sent a flag".
 *
 * The help panel renders each kind's `help` text from the server. The spec that
 * runs a script is the one place that describes it; nothing here restates it.
 */
export default function MaintenanceBar({ kinds, onFinish }) {
  const [pending, setPending] = useState(null);
  const run = useRun({ onFinish });

  const startKind = useCallback(async (kind) => {
    setPending(kind);
    await run.start(kind.kind, kind.confirmRequired ? { dryRun: true } : {});
  }, [run]);

  const confirm = useCallback(async () => {
    if (!pending || !run.run) return;
    // The preview's own id is the authorisation. The server burns it on use.
    await run.start(pending.kind, {}, run.run.id);
  }, [pending, run]);

  const dismiss = useCallback(() => {
    run.reset();
    setPending(null);
  }, [run]);

  const busy = run.run?.status === 'running' || run.starting;
  const gated = kinds.filter((kind) => kind.confirmRequired);
  const checks = kinds.filter((kind) => !kind.confirmRequired);

  return (
    <section className="maintenance">
      <div className="toolbar">
        <span className="muted">Maintenance</span>
        {kinds.map((kind) => (
          <button
            key={kind.kind}
            className="chip"
            disabled={busy}
            title={kind.description}
            onClick={() => startKind(kind)}
          >
            {kind.label}
            {kind.confirmRequired ? <span className="n">preview first</span> : null}
          </button>
        ))}
      </div>

      <details className="help">
        <summary>What do these do?</summary>

        <p>
          These run the same maintenance scripts you would otherwise run from a terminal, and show
          their output live. None of them talks to an AI; all of them work on the files in{' '}
          <code>data/</code>.
        </p>

        {gated.length > 0 ? (
          <>
            <h4>Rewrite a file — so they preview first</h4>
            <p className="muted">
              Clicking one of these runs it in preview mode: it prints exactly what it <em>would</em>{' '}
              change and writes nothing. Read the preview, then click the confirm button to apply it.
              One preview authorises one real run of the same kind, and only for ten minutes — the
              server refuses anything else, so a change to your tracker can never happen without you
              having seen it first.
            </p>
            <dl>
              {gated.map((kind) => (
                <div key={kind.kind}>
                  <dt>{kind.label}</dt>
                  <dd>{kind.help ?? kind.description}</dd>
                </div>
              ))}
            </dl>
          </>
        ) : null}

        {checks.length > 0 ? (
          <>
            <h4>Read only — they run immediately</h4>
            <dl>
              {checks.map((kind) => (
                <div key={kind.kind}>
                  <dt>{kind.label}</dt>
                  <dd>{kind.help ?? kind.description}</dd>
                </div>
              ))}
            </dl>
            <p className="muted">
              A check that ends as <strong>Found problems</strong> did its job: the file it looked at
              needs attention. <strong>Failed</strong> means the script itself could not run.
            </p>
          </>
        ) : null}
      </details>

      <RunPanel
        run={run.run}
        lines={run.lines}
        progress={run.progress}
        error={run.error}
        onCancel={run.cancel}
        onDismiss={dismiss}
        onConfirm={pending?.confirmRequired ? confirm : undefined}
        confirmLabel={pending ? `Run ${pending.label.toLowerCase()} for real` : undefined}
      />
    </section>
  );
}
