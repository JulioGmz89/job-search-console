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
