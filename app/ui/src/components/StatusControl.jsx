import { useEffect, useRef, useState } from 'react';

import { setRowStatus } from '../api.js';
import { reload } from '../data.js';
import { jobName, shortDate, statusLabel } from '../lib/labels.js';
import { announce } from '../shell/announce.jsx';
import { offerUndo } from '../shell/undo.jsx';
import { ChoiceSelect, ConfirmDialog } from './ui.jsx';

const iso = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/**
 * When did you apply? (ia.md §2.2): Today, Yesterday or a date, and an
 * optional note. Sent as `on` and `note` with the Applied status.
 *
 * @param {{isOpen: boolean, row: object, onConfirm: (extra: {on: string, note?: string}) => void, onCancel: () => void}} props
 */
export function WhenDialog({ isOpen, row, onConfirm, onCancel }) {
  const [when, setWhen] = useState('today');
  const [date, setDate] = useState(() => iso(new Date()));
  const [note, setNote] = useState('');
  const today = new Date();
  const yesterday = new Date(Date.now() - 86_400_000);
  const confirm = () => {
    const on = when === 'pick' ? date : iso(when === 'yesterday' ? yesterday : today);
    onConfirm({ on, ...(note.trim() ? { note: note.trim() } : {}) });
  };
  return (
    <ConfirmDialog isOpen={isOpen} title={`When did you apply to ${jobName(row)}?`} confirmLabel="Save as Applied" focusConfirm={false} onConfirm={confirm} onCancel={onCancel}>
      <fieldset className="stack-sm">
        <legend>Applied</legend>
        {[
          ['today', `Today (${shortDate(today)})`],
          ['yesterday', `Yesterday (${shortDate(yesterday)})`],
          ['pick', 'On another day'],
        ].map(([value, label], i) => (
          <label className="check" key={value}>
            <input type="radio" name={`when-${row.id}`} value={value} checked={when === value} onChange={() => setWhen(value)} autoFocus={i === 0} />
            {label}
          </label>
        ))}
        {when === 'pick' ? (
          <div className="field">
            <label htmlFor={`when-date-${row.id}`}>Date</label>
            <input id={`when-date-${row.id}`} type="date" value={date} max={iso(today)} onChange={(e) => setDate(e.target.value)} />
          </div>
        ) : null}
      </fieldset>
      <div className="field">
        <label htmlFor={`when-note-${row.id}`}>Add a note (optional)</label>
        <input id={`when-note-${row.id}`} type="text" value={note} placeholder="e.g. through the careers site, referral from Sam" onChange={(e) => setNote(e.target.value)} />
      </div>
    </ConfirmDialog>
  );
}

/**
 * Save a status with Undo; shared by the select below and the job page's
 * "I've sent my application".
 */
export async function saveStatus(row, statusId, extra = {}) {
  const before = String(row.statusId ?? row.status ?? '').toLowerCase();
  const name = jobName(row);
  await setRowStatus(row.id, statusId, extra);
  await reload('pipeline');
  const label = statusLabel(statusId);
  const when = extra.on ? `, applied ${shortDate(extra.on)}` : '';
  announce(`${name}: status saved as ${label}${when}`);
  offerUndo(`${name} set to ${label}${when}`, async () => {
    await setRowStatus(row.id, before);
    await reload('pipeline');
  });
  return label;
}

/**
 * Change one application's status (ia.md §2.2 "Status change"): saved at once
 * with an inline confirmation and Undo. The select commits only when an option
 * is chosen (F-022). Choosing Applied asks When? first, which is sent as `on`.
 *
 * @param {{row: object, statuses: Array<{id: string, label: string}>, onSaved?: (statusId: string) => void, visibleLabel?: boolean}} props
 */
export function StatusControl({ row, statuses, onSaved, visibleLabel = false, id = null }) {
  const [asking, setAsking] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const wrap = useRef(null);
  const current = String(row.statusId ?? row.status ?? '').toLowerCase();
  const name = jobName(row);

  // A message about a status the row no longer has is stale (changed elsewhere, or undone).
  const [messageFor, setMessageFor] = useState(null);
  useEffect(() => {
    if (messageFor && messageFor !== current) setMessage(null);
  }, [current, messageFor]);

  const save = async (statusId, extra = {}) => {
    setBusy(true);
    setError(null);
    try {
      const label = await saveStatus(row, statusId, extra);
      setMessage(`Saved: ${label}`);
      setMessageFor(statusId);
      onSaved?.(statusId);
    } catch (e) {
      setError(e.message);
      announce(`Could not save the status of ${name}: ${e.message}`, { assertive: true });
    } finally {
      setBusy(false);
      // Focus stays on this job's control, wherever the list re-renders it.
      setTimeout(() => wrap.current?.querySelector('button')?.focus(), 0);
    }
  };

  return (
    <span className="status-control" ref={wrap}>
      <ChoiceSelect
        label={`Status for ${name}`}
        visibleLabel={visibleLabel}
        value={current}
        options={statuses.map((s) => ({ id: s.id, label: statusLabel(s.id) }))}
        onChange={(statusId) => (statusId === 'applied' ? setAsking(true) : save(statusId))}
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
      <WhenDialog
        isOpen={asking}
        row={row}
        onConfirm={(extra) => {
          setAsking(false);
          save('applied', extra);
        }}
        onCancel={() => setAsking(false)}
      />
    </span>
  );
}
