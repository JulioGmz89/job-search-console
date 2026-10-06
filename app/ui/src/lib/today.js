/**
 * today.js — what Today shows, derived from data the app actually holds
 * (ia.md §2.1). No invented facts: every card is backed by a run, a file, or a
 * health record, and every card has a permanent home elsewhere.
 */

import { needsAttention } from './runs.js';

/**
 * Board health values (data/portal-health.tsv) that need the user: the board
 * moved or closed, or wants a login. Network and server errors are usually
 * transient and fix themselves on the next check.
 */
const BROKEN_BOARD = new Set(['slug_gone', 'auth']);

/** A board's health in words. */
export const BOARD_HEALTH = Object.freeze({
  reachable: 'Working',
  empty: 'Working, no openings right now',
  slug_gone: 'Board not found',
  auth: 'The board wants a login, so it can’t be read',
  network: 'Couldn’t be reached last time (usually temporary)',
  server: 'The board had an error last time (usually temporary)',
});

/**
 * Openings in To review the user has not seen: first seen after the day they
 * last looked, or on that day by a check that ran after they looked.
 *
 * @param {object[]} pending - `/api/inbox` pending entries (with firstSeen).
 * @param {string|null} lastSeen - ISO time the user last left Today.
 * @param {{timestamp?: string}|null} lastScan
 */
export function newSince(pending, lastSeen, lastScan = null) {
  const withDate = pending.filter((p) => p.firstSeen);
  if (!lastSeen) return withDate;
  const day = lastSeen.slice(0, 10);
  const scannedAfter = lastScan?.timestamp ? Date.parse(lastScan.timestamp) > Date.parse(lastSeen) : false;
  return withDate.filter((p) => p.firstSeen > day || (p.firstSeen === day && scannedAfter));
}

/** Companies whose job board check last failed, with the date it started failing. */
export function brokenBoards(companies, health = {}) {
  return companies
    .filter((c) => c.enabled && BROKEN_BOARD.has(String(health[c.name]?.status ?? '').toLowerCase()))
    .map((c) => ({ ...c, since: health[c.name].timestamp }));
}

/**
 * The card groups, in ia.md's fixed order. Empty groups are left out.
 *
 * @param {object} data
 * @param {object[]} data.runs - every run the server knows about
 * @param {string[]} data.dismissed
 * @param {object[]} data.rows - pipeline rows
 * @param {object[]} data.issues - health issues
 * @param {object|null} data.design - `/api/cv/design-check`
 * @param {object[]} data.companies - portals companies
 * @param {object} data.health - portal health by company
 * @param {object[]} data.pending - To review entries
 * @param {string|null} data.lastSeen
 * @param {object|null} data.lastScan
 */
export function todayCards({ runs = [], dismissed = [], rows = [], issues = [], design = null, companies = [], health = {}, pending = [], lastSeen = null, lastScan = null }) {
  const failures = runs.filter((r) => needsAttention(r, runs, dismissed));
  const unreadable = issues.filter((i) => i.code === 'row-unparseable');
  const boards = brokenBoards(companies, health);
  const designFails = design?.verdict === 'fail';

  const fresh = newSince(pending, lastSeen, lastScan);
  const replied = rows.filter((r) => ['responded', 'interview'].includes(String(r.statusId ?? r.status).toLowerCase()) && (!r.pdf || !r.cover));
  const reviewed = rows
    .filter((r) => String(r.statusId ?? r.status).toLowerCase() === 'evaluated')
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const working = runs.filter((r) => r.status === 'running' || r.status === 'queued');

  return {
    needs: { failures, unreadable, boards, designFails, count: failures.length + (unreadable.length ? 1 : 0) + boards.length + (designFails ? 1 : 0) },
    fresh,
    waiting: { replied, reviewed },
    working,
  };
}
