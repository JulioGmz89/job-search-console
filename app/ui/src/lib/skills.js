/**
 * skills.js — how the Skills page counts and ranks (ia.md §2.6).
 *
 * Pure functions over the `/api/skills` payload, shared by the page and by
 * `app/ux/check-task.mjs` (T6), so the order a user sees is the order the
 * checker accepts. With the fit filter on, every number in a row, its evidence
 * and the ranking come from the same good-fit postings (WP-T6-01).
 */

/** A posting counts as a good fit from this score up (server STRONG_SCORE). */
export const GOOD_FIT = 4;

/** The three views and the server list each one starts from. */
export const SKILL_VIEWS = {
  learn: { list: 'learn', label: 'Learn next' },
  strengthen: { list: 'deepen', label: 'Strengthen' },
  asked: { list: 'demanded', label: 'Most asked for' },
};

const isGoodFit = (posting) => typeof posting?.score === 'number' && posting.score >= GOOD_FIT;

/**
 * The rows of one view, counted and ranked as the page shows them.
 *
 * @param {object} data - the `/api/skills` payload.
 * @param {object} [opts]
 * @param {'learn'|'strengthen'|'asked'} [opts.view]
 * @param {boolean} [opts.goodFitOnly] - "Only jobs I'd apply to (fit 4 and up)".
 * @param {boolean} [opts.showIgnored] - "Show skills I ignored".
 * @param {Object<string,string>} [opts.statusById] - local status changes not yet reloaded.
 * @returns {{rows: object[], hidden: number, counted: number}}
 *   `hidden` is the number of skills with no posting left under the filter;
 *   `counted` is the number of postings the counts are taken from.
 */
export function rankSkills(data, { view = 'learn', goodFitOnly = false, showIgnored = false, statusById = {} } = {}) {
  const listName = SKILL_VIEWS[view]?.list ?? 'learn';
  const byId = new Map((data?.skills ?? []).map((s) => [s.id, s]));
  const index = data?.postings ?? {};
  let ids = [...(data?.lists?.[listName] ?? [])];
  // Ignored skills are left out of every server list, and the override hides
  // which view they came from; "Show skills I ignored" lists them in each view.
  if (showIgnored) {
    for (const s of data?.skills ?? []) if (s.status === 'ignore' && !ids.includes(s.id)) ids.push(s.id);
  }

  const rows = [];
  ids.forEach((id, order) => {
    const skill = byId.get(id);
    if (!skill) return;
    const status = statusById[id] ?? skill.status;
    if (status === 'ignore' && !showIgnored) return;
    const postings = (skill.postings ?? [])
      .map((p) => ({ ...index[p.id], id: p.id, level: p.level }))
      .filter((p) => !goodFitOnly || isGoodFit(p));
    const required = postings.filter((p) => p.level === 'required').length;
    const gapReports = goodFitOnly
      ? (skill.gapReports ?? []).filter((rid) => Object.values(index).some((p) => p.reportId === rid && isGoodFit(p)))
      : (skill.gapReports ?? []);
    rows.push({ ...skill, status, order, postings, count: postings.length, required, nice: postings.length - required, gapReports });
  });

  const hidden = rows.filter((r) => r.count === 0).length;
  const ranked = rows.filter((r) => r.count > 0).sort((a, b) => b.count - a.count || b.required - a.required || a.order - b.order);
  const counted = Object.values(index).filter((p) => p.hasText !== false && (!goodFitOnly || isGoodFit(p))).length;
  return { rows: ranked, hidden, counted };
}
