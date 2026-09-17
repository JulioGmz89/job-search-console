/**
 * aggregate.js — from per-posting skill lists to "what should I learn next?"
 *
 * Pure code, no I/O, no LLM (PROJECT_PLAN.md §6 steps 3 and 4). Given the
 * postings with their extracted skills, the CV's skills, the gap notes mined
 * from the A–H reports and the user's overrides, it produces one record per
 * skill and the three ranked lists the page shows.
 *
 * Weighting: a posting counts by how much the user would want it. Evaluated
 * postings weigh by score band (4.5+ counts double, under 3.0 half); a scanned
 * but never-evaluated posting counts once. A nice-to-have mention is worth half
 * a required one. `gapMentions` — how many reports called this skill out as a
 * gap — is the additional signal §6 asks for, and the tie-breaker for "learn".
 *
 * Classification precedence: the user's override, then the CV skills (LLM depth
 * or the rules' section/prose split), else missing. `ignore` removes a skill
 * from every list without deleting the evidence.
 */

import { categoryOf, CATEGORY_IDS } from './aliases.js';

export const WEIGHTS = Object.freeze({ strong: 2.0, good: 1.5, ok: 1.0, weak: 0.5, unscored: 1.0, niceToHave: 0.5 });

/** Score from which a posting counts as one the user would apply to. */
export const STRONG_SCORE = 4.0;

/** A skill must be demanded by this many postings before it can be a recommendation. */
export const MIN_DEMAND = 2;

/** Months of history in the trend. */
export const TREND_MONTHS = 6;

/** Co-occurring skills listed per skill. */
const COOCCUR_TOP = 5;

export function postingWeight(score) {
  if (typeof score !== 'number') return WEIGHTS.unscored;
  if (score >= 4.5) return WEIGHTS.strong;
  if (score >= 4.0) return WEIGHTS.good;
  if (score >= 3.0) return WEIGHTS.ok;
  return WEIGHTS.weak;
}

export const monthOf = (date) => (typeof date === 'string' && /^\d{4}-\d{2}/.test(date) ? date.slice(0, 7) : null);

/** The last `count` months ending with `now`'s, oldest first. */
export function monthAxis(now = new Date(), count = TREND_MONTHS) {
  const months = [];
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  for (let i = count - 1; i >= 0; i -= 1) {
    const m = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - i, 1));
    months.push(m.toISOString().slice(0, 7));
  }
  return months;
}

/** Status from the CV alone: LLM depth or rules depth. */
function cvStatus(cvSkill) {
  if (!cvSkill) return null;
  if (cvSkill.depth === 'expert' || cvSkill.depth === 'solid') return 'have';
  return 'partial';
}

/**
 * @param {object} input
 * @param {Array<{id: string, firstSeen: string|null, score: number|null, skills: Array<{canonical: string, id: string, category?: string, level: string}>}>} input.postings
 *   Only postings that have skills (text was fetched and extracted).
 * @param {{skills: Array<{id: string, canonical: string, depth: string}>}|null} [input.cv]
 * @param {Map<string, Set<number>>} [input.gapMentions] - skill id → report ids whose gap notes name it.
 * @param {Object<string, string>} [input.overrides] - skill id → status.
 * @param {Date} [input.now]
 * @returns {{skills: object[], lists: {learn: string[], deepen: string[], demanded: string[]}, months: string[]}}
 */
export function aggregate({ postings, cv = null, gapMentions = new Map(), overrides = {}, now = new Date() }) {
  const months = monthAxis(now);
  const monthIndex = new Map(months.map((m, i) => [m, i]));
  const cvById = new Map((cv?.skills ?? []).map((s) => [s.id, s]));

  /** id → accumulator */
  const acc = new Map();
  const get = (skill) => {
    let entry = acc.get(skill.id);
    if (!entry) {
      entry = {
        id: skill.id,
        name: skill.canonical,
        categories: new Map(),
        demand: 0,
        required: 0,
        nice: 0,
        weighted: 0,
        strong: 0,
        trend: months.map(() => 0),
        cooccur: new Map(),
        postings: [],
      };
      acc.set(skill.id, entry);
    }
    return entry;
  };

  for (const posting of postings) {
    // One vote per posting per skill, whatever the extractor repeated.
    const seen = new Map();
    for (const skill of posting.skills ?? []) {
      if (!skill?.id || !skill.canonical) continue;
      const prev = seen.get(skill.id);
      if (!prev || (prev.level !== 'required' && skill.level === 'required')) seen.set(skill.id, skill);
    }
    const weight = postingWeight(posting.score);
    const strong = typeof posting.score === 'number' && posting.score >= STRONG_SCORE;
    const month = monthIndex.get(monthOf(posting.firstSeen));
    const ids = [...seen.keys()];

    for (const skill of seen.values()) {
      const entry = get(skill);
      const required = skill.level === 'required';
      entry.demand += 1;
      if (required) entry.required += 1;
      else entry.nice += 1;
      entry.weighted += weight * (required ? 1 : WEIGHTS.niceToHave);
      if (strong) entry.strong += 1;
      if (month !== undefined) entry.trend[month] += 1;
      const category = CATEGORY_IDS.includes(skill.category) ? skill.category : 'other';
      entry.categories.set(category, (entry.categories.get(category) ?? 0) + 1);
      entry.postings.push({ id: posting.id, level: required ? 'required' : 'nice-to-have' });
      for (const other of ids) {
        if (other !== skill.id) entry.cooccur.set(other, (entry.cooccur.get(other) ?? 0) + 1);
      }
    }
  }

  const skills = [...acc.values()].map((entry) => {
    // The vocabulary's category wins when it knows the skill; otherwise the
    // extractors' majority (which is how an LLM-only skill gets its category).
    const known = categoryOf(entry.name);
    const category = known !== 'other' ? known : [...entry.categories.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'other';

    let status;
    let statusSource;
    if (overrides[entry.id]) {
      status = overrides[entry.id];
      statusSource = 'override';
    } else if (cvById.has(entry.id)) {
      status = cvStatus(cvById.get(entry.id));
      statusSource = cv?.engine === 'llm' ? 'cv-llm' : 'cv-rules';
    } else {
      status = 'missing';
      statusSource = 'none';
    }

    const mentions = gapMentions.get(entry.id);
    return {
      id: entry.id,
      name: entry.name,
      category,
      status,
      statusSource,
      demand: entry.demand,
      required: entry.required,
      nice: entry.nice,
      weighted: Math.round(entry.weighted * 100) / 100,
      strong: entry.strong,
      gapMentions: mentions ? mentions.size : 0,
      gapReports: mentions ? [...mentions].sort((a, b) => a - b) : [],
      trend: entry.trend,
      cooccur: [...entry.cooccur.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, COOCCUR_TOP)
        .map(([id, n]) => ({ id, name: acc.get(id)?.name ?? id, n })),
      postings: entry.postings,
    };
  });

  const byWeight = (a, b) => b.weighted - a.weighted || b.gapMentions - a.gapMentions || b.demand - a.demand || a.name.localeCompare(b.name);
  const byDemand = (a, b) => b.demand - a.demand || b.weighted - a.weighted || a.name.localeCompare(b.name);
  const visible = skills.filter((s) => s.status !== 'ignore');
  const lists = {
    demanded: [...visible].sort(byDemand).map((s) => s.id),
    learn: visible.filter((s) => s.status === 'missing' && s.demand >= MIN_DEMAND).sort(byWeight).map((s) => s.id),
    deepen: visible.filter((s) => s.status === 'partial' && s.demand >= MIN_DEMAND).sort(byWeight).map((s) => s.id),
  };

  skills.sort(byDemand);
  return { skills, lists, months };
}
