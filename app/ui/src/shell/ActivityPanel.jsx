import { useEffect, useRef } from 'react';

import { RunItem } from '../components/RunItem.jsx';
import { useResource } from '../data.js';
import { FOLLOW_UP_KINDS, needsAttention, runState } from '../lib/runs.js';
import { useRuns } from '../runs.jsx';
import { UndoButton, useUndo } from './undo.jsx';

/**
 * The Activity panel (ia.md §1, §2.8): a non-modal sheet laid over the right
 * edge of the page, never part of the layout, so it can never drop below the
 * content. Focus moves in when it opens; Escape closes it and focus returns
 * to the Activity button.
 */
export function ActivityPanel({ open, onClose }) {
  const { list } = useRuns();
  const today = useResource('today');
  const undo = useUndo();
  const heading = useRef(null);
  const dismissed = today.data?.dismissed ?? [];

  useEffect(() => {
    if (open) heading.current?.focus();
  }, [open]);

  if (!open) return null;

  const top = list.filter((r) => !FOLLOW_UP_KINDS.has(r.kind));
  const now = top.filter((r) => ['waiting', 'working'].includes(runState(r)) || needsAttention(r, list, dismissed));
  const startOfDay = new Date().setHours(0, 0, 0, 0);
  const earlier = top.filter((r) => !now.includes(r) && (r.endedAt ?? r.queuedAt ?? 0) >= startOfDay).slice(0, 6);

  return (
    <section
      className="panel"
      id="activity-panel"
      role="dialog"
      aria-modal="false"
      aria-labelledby="panel-h"
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.stopPropagation();
          onClose();
        }
      }}
    >
      <div className="panel-head">
        <h2 id="panel-h" ref={heading} tabIndex={-1}>
          Activity
        </h2>
        <button type="button" className="btn2 btn-sm" onClick={onClose}>
          Close<span className="visually-hidden"> Activity</span>
        </button>
      </div>
      <div className="panel-body">
        {undo ? (
          <div className="notice info row between">
            <span>{undo.message}</span>
            <UndoButton entry={undo} />
          </div>
        ) : null}
        <h3 className="group-title">Now</h3>
        {now.length ? now.map((r) => <RunItem key={r.id} run={r} headingLevel={4} />) : <p className="muted small">Nothing running, and nothing needs you.</p>}
        <h3 className="group-title">Earlier today</h3>
        {earlier.length ? earlier.map((r) => <RunItem key={r.id} run={r} headingLevel={4} />) : <p className="muted small">Nothing yet today.</p>}
        <a href="#/activity" onClick={onClose}>
          See all activity
        </a>
      </div>
    </section>
  );
}
