import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

import { announce } from './announce.jsx';

/**
 * undo.jsx — the one Undo (ia.md §3 "Destructive actions").
 *
 * Remove, Replace and status changes offer Undo for 10 s in a bar at the
 * bottom of the screen, and the same Undo stays in the Activity panel until
 * the next undoable action replaces it, so it is never only in a toast.
 */

let current = null;
const listeners = new Set();
const emit = () => listeners.forEach((fn) => fn());

/**
 * @param {string} message - What was done, e.g. "Removed Kestrel Media — Backend Engineer from To review".
 * @param {() => Promise<unknown>} run - Puts it back.
 * @param {{focus?: boolean}} [options] - `focus`: the action removed the control
 *   the user was on, so focus moves to Undo rather than falling to the page.
 */
export function offerUndo(message, run, { focus = false } = {}) {
  current = { message, run, focus, at: Date.now(), id: Math.random().toString(36).slice(2) };
  announce(`${message}. Undo is available.`);
  emit();
}

export function clearUndo() {
  current = null;
  emit();
}

export function useUndo() {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => current,
  );
}

/** Run the current Undo, then say what happened. */
export async function undoNow(entry) {
  if (!entry) return;
  try {
    await entry.run();
    announce(`Undone: ${entry.message}`);
    if (current?.id === entry.id) clearUndo();
  } catch (error) {
    announce(`Could not undo: ${error.message}`, { assertive: true });
  }
}

export function UndoButton({ entry, className = 'btn2 btn-sm', buttonRef = null, onDone = null }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      ref={buttonRef}
      className={className}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await undoNow(entry);
        setBusy(false);
        onDone?.();
      }}
    >
      Undo<span className="visually-hidden">: {entry.message}</span>
    </button>
  );
}

/** The 10-second bar. */
export function UndoBar() {
  const entry = useUndo();
  const [visible, setVisible] = useState(false);
  const undoRef = useRef(null);
  useEffect(() => {
    if (!entry) return undefined;
    setVisible(true);
    // While the user is on the bar, it stays; it only times out unattended.
    const timer = setTimeout(() => {
      if (!undoRef.current?.closest('.undo-bar')?.contains(document.activeElement)) setVisible(false);
    }, 10_000);
    return () => clearTimeout(timer);
  }, [entry]);
  useEffect(() => {
    if (entry?.focus && visible) undoRef.current?.focus();
  }, [entry, visible]);
  if (!entry || !visible) return null;
  return (
    <div className="undo-bar" role="region" aria-label="Undo">
      <span>{entry.message}</span>
      <UndoButton entry={entry} className="btn btn-sm" buttonRef={undoRef} onDone={() => document.querySelector('main h1')?.focus()} />
      <button
        type="button"
        className="btn-link"
        onClick={() => {
          setVisible(false);
          document.querySelector('main h1')?.focus();
        }}
      >
        Hide<span className="visually-hidden"> the undo bar</span>
      </button>
    </div>
  );
}
