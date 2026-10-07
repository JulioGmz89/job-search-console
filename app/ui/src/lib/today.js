/**
 * today.js — what Today shows, derived from data the app actually holds
 * (ia.md §2.1). No invented facts: every card is backed by a run, a file, or a
 * health record, and every card has a permanent home elsewhere.
 */

import { isBoard } from './boards.js';
import { isTopLevel, needsAttention } from './runs.js';

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
 * The openings checks for new openings added since the user last looked,
 * matched to To review by company and title (T4). Uses each check's own list,
 * never dates, so it holds across midnight and time zones.
 *
 * @param {object[]} pending - `/api/inbox` pending entries.
 * @param {object[]} runs - every run the app knows about.
 * @param {string|null} lastSeen - ISO time the user last left Today.
 */
export function newFromChecks(pending, runs, lastSeen) {
  const since = lastSeen ? Date.parse(lastSeen) : 0;
  const key = (company, title) => `${String(company ?? '').trim().toLowerCase()}|${String(title ?? '').trim().toLowerCase()}`;
  const added = new Set(
    runs
      .filter((r) => r.kind === 'scan' && r.status === 'succeeded' && !r.result?.preview && (r.endedAt ?? 0) > since)
      .flatMap((r) => (r.result?.added ?? []).map((a) => key(a.company, a.title))),
  );
  return pending.filter((p) => added.has(key(p.company, p.title)));
}

/** Companies whose job board check last failed, with the date it started failing. */
export function brokenBoards(companies, health = {}) {
  return companies
    .filter((c) => c.enabled && BROKEN_BOARD.has(String(health[c.name]?.status ?? '').toLowerCase()))
    .map((c) => ({ ...c, since: health[c.name].since ?? health[c.name].timestamp }));
}

/**
 * Followed companies whose link is a careers page, not a job board the
 * scanner reads, and that no check has read yet: checks find nothing there
 * until the link is changed (H8-today-01).
 */
export function unreadableLinks(companies, health = {}) {
  const read = new Set(['reachable', 'empty']);
  return companies.filter((c) => c.enabled && c.scanMethod !== 'websearch' && !isBoard(c) && !read.has(String(health[c.name]?.status ?? '').toLowerCase()));
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
 */
export function todayCards({ runs = [], dismissed = [], rows = [], issues = [], design = null, companies = [], health = {}, pending = [], lastSeen = null }) {
  const failures = runs.filter((r) => needsAttention(r, runs, dismissed));
  const unreadable = issues.filter((i) => i.code === 'row-unparseable');
  const boards = brokenBoards(companies, health);
  const links = unreadableLinks(companies, health).filter((c) => !boards.some((b) => b.name === c.name));
  const designFails = design?.verdict === 'fail';

  const fresh = newFromChecks(pending, runs, lastSeen);
  const replied = rows.filter((r) => ['responded', 'interview'].includes(String(r.statusId ?? r.status).toLowerCase()) && (!r.pdf || !r.cover));
  const reviewed = rows
    .filter((r) => String(r.statusId ?? r.status).toLowerCase() === 'evaluated')
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const working = runs.filter((r) => isTopLevel(r) && (r.status === 'running' || r.status === 'queued'));

  return {
    needs: { failures, unreadable, boards, links, designFails, count: failures.length + (unreadable.length ? 1 : 0) + boards.length + links.length + (designFails ? 1 : 0) },
    fresh,
    waiting: { replied, reviewed },
    working,
  };
}
