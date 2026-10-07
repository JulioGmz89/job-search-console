/**
 * today.js — the Today page's own memory (ia.md §2.1, M7 decision D-3).
 *
 * `data/jsc/today.json` is fork-owned state, outside upstream's data contract:
 *   - lastSeen: when the user last left Today, so "New since you last looked"
 *     means something;
 *   - dismissed: run ids whose failure card the user dismissed.
 * Losing the file only resets those two things, so a bad file reads as empty.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { atomicWrite } from './files.js';
import { resolveDataRoot } from './paths.js';

/** Dismissed ids kept; older ones belong to runs long gone from the history. */
const MAX_DISMISSED = 200;

export class TodayError extends Error {
  constructor(message, { code = 'today-invalid', status = 400 } = {}) {
    super(message);
    this.name = 'TodayError';
    this.code = code;
    this.status = status;
  }
}

export function todayPath(root) {
  return join(resolveDataRoot(root), 'data', 'jsc', 'today.json');
}

/** @returns {{lastSeen: string|null, dismissed: string[]}} */
export function readToday({ root } = {}) {
  const path = todayPath(root);
  if (!existsSync(path)) return { lastSeen: null, dismissed: [] };
  try {
    const doc = JSON.parse(readFileSync(path, 'utf-8'));
    return {
      lastSeen: typeof doc?.lastSeen === 'string' ? doc.lastSeen : null,
      dismissed: Array.isArray(doc?.dismissed) ? doc.dismissed.filter((id) => typeof id === 'string') : [],
    };
  } catch {
    return { lastSeen: null, dismissed: [] };
  }
}

/**
 * @param {{root?: string, lastSeen?: string, dismiss?: string, undismiss?: string}} input
 */
export function writeToday({ root, lastSeen, dismiss, undismiss } = {}) {
  const state = readToday({ root });
  if (lastSeen !== undefined) {
    if (typeof lastSeen !== 'string' || Number.isNaN(Date.parse(lastSeen))) throw new TodayError('lastSeen must be a date');
    state.lastSeen = new Date(lastSeen).toISOString();
  }
  for (const [value, name] of [[dismiss, 'dismiss'], [undismiss, 'undismiss']]) {
    if (value !== undefined && (typeof value !== 'string' || !value || value.length > 100)) throw new TodayError(`${name} must be a run id`);
  }
  if (dismiss) state.dismissed = [...state.dismissed.filter((id) => id !== dismiss), dismiss].slice(-MAX_DISMISSED);
  if (undismiss) state.dismissed = state.dismissed.filter((id) => id !== undismiss);
  atomicWrite(todayPath(root), `${JSON.stringify(state, null, 2)}\n`);
  return state;
}
