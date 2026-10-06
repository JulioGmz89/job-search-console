import { useState } from 'react';

import { setRowStatus } from '../api.js';
import { reload } from '../data.js';
import { jobName, statusLabel } from '../lib/labels.js';
import { announce } from '../shell/announce.jsx';
import { offerUndo } from '../shell/undo.jsx';
import { ChoiceSelect, ConfirmDialog } from './ui.jsx';

const iso = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/**
 * Change one application's status (ia.md §2.2 "Status change"): saved at once
 * with an inline confirmation and Undo. The select commits only when an option
 * is chosen (F-022). Choosing Applied asks When? first, which is sent as `on`.
 *
 * @param {{row: object, statuses: Array<{id: string, label: string}>, onSaved?: (statusId: string) => void, visibleLabel?: boolean}} props
 */
export function StatusControl({ row, statuses, onSaved, visibleLabel = false, id = null }) {
  const [asking, setAsking] = useState(null);
  const [when, setWhen] = useState('today');
  const [date, setDate] = useState(iso(new Date()));
  const [note, setNote] = useState('');
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const current = String(row.statusId ?? row.status ?? '').toLowerCase();
  const name = jobName(row);

  const save = async (statusId, extra = {}) => {
    setBusy(true);
    setError(null);
    const before = current;
    try {
      await setRowStatus(row.id, statusId, extra);
      await reload('pipeline');
      const label = statusLabel(statusId);
      setMessage(`Saved: ${label}`);
      announce(`${name}: status saved as ${label}`);
      onSaved?.(statusId);
      offerUndo(`${name} set to ${label}`, async () => {
        await setRowStatus(row.id, before);
        await reload('pipeline');
        setMessage(`Back to ${statusLabel(before)}`);
      });
    } catch (e) {
      setError(e.message);
      announce(`Could not save the status of ${name}: ${e.message}`, { assertive: true });
    } finally {
      setBusy(false);
    }
  };

  const choose = (statusId) => {
    if (statusId === 'applied') {
      setAsking(statusId);
      return;
    }
    save(statusId);
  };

  const confirmWhen = async () => {
    const day = new Date();
    if (when === 'yesterday') day.setDate(day.getDate() - 1);
    const on = when === 'pick' ? date : iso(day);
    setAsking(null);
    await save('applied', { on, ...(note.trim() ? { note: note.trim() } : {}) });
  };

  return (
    <span className="status-control">
      <ChoiceSelect
        label={`Status for ${name}`}
        visibleLabel={visibleLabel}
        value={current}
        options={statuses.map((s) => ({ id: s.id, label: statusLabel(s.id) }))}
        onChange={choose}
        isDisabled={busy}
        className={id ? `status-${id}` : ''}
      />
      {message ? (
        <span className="rowmsg" role="status">
          {message}
        </span>
      ) : null}
      {error ? (
        <span className="error" role="alert">
          {error}
        </span>
      ) : null}
      <ConfirmDialog
        isOpen={asking !== null}
        title={`When did you apply to ${row.company ?? 'this job'}?`}
        confirmLabel="Save as Applied"
        onConfirm={confirmWhen}
        onCancel={() => setAsking(null)}
      >
        <fieldset className="stack-sm">
          <legend>Applied</legend>
          {[
            ['today', 'Today'],
            ['yesterday', 'Yesterday'],
            ['pick', 'On another day'],
          ].map(([value, label]) => (
            <label className="check" key={value}>
              <input type="radio" name={`when-${row.id}`} value={value} checked={when === value} onChange={() => setWhen(value)} />
              {label}
            </label>
          ))}
          {when === 'pick' ? (
            <div className="field">
              <label htmlFor={`when-date-${row.id}`}>Date</label>
              <input id={`when-date-${row.id}`} type="date" value={date} max={iso(new Date())} onChange={(e) => setDate(e.target.value)} />
            </div>
          ) : null}
        </fieldset>
        <div className="field">
          <label htmlFor={`when-note-${row.id}`}>Add a note (optional)</label>
          <input id={`when-note-${row.id}`} type="text" value={note} placeholder="e.g. via the careers site, referral from Sam" onChange={(e) => setNote(e.target.value)} />
        </div>
      </ConfirmDialog>
    </span>
  );
}
