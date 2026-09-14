import { useState } from 'react';

import { setRowStatus } from '../api.js';

/**
 * The inline status editor.
 *
 * Optimistic, with a rollback: the cell shows the new status immediately and
 * reverts if the server refuses. The tracker is a locked, shared file that a
 * Claude Code session in the same directory may also be writing, so a refusal
 * here is a normal outcome (a held lock is a 503), not an exceptional one.
 */
export default function StatusCell({ row, statuses, onChanged }) {
  const [value, setValue] = useState(row.statusId ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const change = async (next) => {
    const previous = value;
    setValue(next);
    setSaving(true);
    setError(null);
    try {
      await setRowStatus(row.id, next);
      onChanged?.();
    } catch (failure) {
      setValue(previous);
      setError(failure.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    // The whole row opens the report on click, so the editor has to keep its own
    // clicks to itself.
    <div className="status-cell" onClick={(e) => e.stopPropagation()}>
      <select
        value={value}
        disabled={saving}
        aria-label={`Status for ${row.company ?? `row ${row.id}`}`}
        onChange={(e) => change(e.target.value)}
      >
        {/* A status the tracker holds but states.yml does not know stays
            selectable so the cell shows the truth rather than silently
            re-labelling the row. */}
        {row.statusId ? null : <option value="">{row.status ?? '—'}</option>}
        {statuses.map((state) => (
          <option key={state.id} value={state.id}>{state.label}</option>
        ))}
      </select>
      {saving ? <span className="muted">saving…</span> : null}
      {error ? <span className="status-error" title={error}>!</span> : null}
    </div>
  );
}
