/**
 * service.js — the Skills page's one read: everything joined.
 *
 * Corpus (which postings) + cache (their text and any LLM extraction) + rules
 * (for postings the LLM has not seen) + the CV (LLM if fresh, rules otherwise)
 * + the reports' gap notes + the user's overrides → `aggregate()` → the payload.
 *
 * Read per request, like the dashboard: the cache changes under us whenever a
 * fetch or extraction run finishes, or a Claude Code session writes a report,
 * and the file watcher tells the page to reload. The only memo is the rules
 * extraction by text hash, which is pure and would otherwise be recomputed for
 * every posting on every reload.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { parseReportGaps } from '../../../upskill.mjs';
import { profilePath } from '../agents/profile.js';
import { reportsDir, resolveDataRoot } from '../services/paths.js';
import { indexReportFiles } from '../services/reports.js';
import { aggregate } from './aggregate.js';
import { readCorpus } from './corpus.js';
import { extractCvRules, extractRules, findSkills } from './rules.js';
import { skillId } from './aliases.js';
import { readCvSkills, readExtractions, readOverrides, readPostings, textHash } from './store.js';

/** Postings per Claude session. Ten 6k-character postings is a comfortable single turn. */
export const BATCH_SIZE = 10;

/** Rules extractions by text hash. Bounded; the oldest entries go first. */
const rulesMemo = new Map();
const RULES_MEMO_MAX = 2_000;

function rulesFor(hash, text) {
  const hit = rulesMemo.get(hash);
  if (hit) return hit;
  const skills = extractRules(text);
  if (rulesMemo.size >= RULES_MEMO_MAX) rulesMemo.delete(rulesMemo.keys().next().value);
  rulesMemo.set(hash, skills);
  return skills;
}

const readText = (path) => (existsSync(path) ? readFileSync(path, 'utf-8') : null);

/**
 * The CV's skills: the cached LLM extraction when it matches cv.md as it is
 * now, else the rules over cv.md + profile.yml.
 *
 * @returns {{present: boolean, hash: string|null, engine: 'llm'|'rules'|null, stale: boolean, skills: object[], extractedAt: string|null}}
 */
export function readCv({ root }) {
  const dataRoot = resolveDataRoot(root);
  const cvText = readText(join(dataRoot, 'cv.md'));
  if (cvText === null) return { present: false, hash: null, engine: null, stale: false, skills: [], extractedAt: null };
  const hash = textHash(cvText);
  const cached = readCvSkills({ root: dataRoot });
  if (cached && cached.cvHash === hash && Array.isArray(cached.skills)) {
    return { present: true, hash, engine: 'llm', stale: false, skills: cached.skills, extractedAt: cached.extractedAt ?? null };
  }
  const profileText = readText(profilePath(dataRoot)) ?? '';
  return { present: true, hash, engine: 'rules', stale: cached !== null, skills: extractCvRules({ cvText, profileText }), extractedAt: null };
}

/**
 * Skill ids named in each report's gap notes (Machine Summary hard/soft gaps
 * and the Gap table), through upstream's own report parser.
 *
 * @returns {Map<string, Set<number>>} skill id → report ids.
 */
export function readGapMentions({ root }) {
  const dir = reportsDir(root);
  const mentions = new Map();
  for (const [id, name] of indexReportFiles(root)) {
    let content;
    try {
      content = readFileSync(join(dir, name), 'utf-8');
    } catch {
      continue;
    }
    const { gapText } = parseReportGaps(content);
    if (!gapText) continue;
    for (const canonical of findSkills(gapText).keys()) {
      const key = skillId(canonical);
      if (!mentions.has(key)) mentions.set(key, new Set());
      mentions.get(key).add(id);
    }
  }
  return mentions;
}

/**
 * Every corpus posting joined to its cache entry and its skills.
 *
 * @returns {Array<object>} corpus fields + `cache` (text state) + `engine` + `skills`.
 */
export function readPostingsWithSkills({ root }) {
  const { postings } = readCorpus({ root });
  const cached = readPostings({ root });
  const extractions = readExtractions({ root });

  return postings.map((posting) => {
    const entry = cached.get(posting.id) ?? null;
    const text = entry?.text ?? null;
    const hash = entry?.textHash ?? null;
    let engine = null;
    let skills = [];
    if (text && hash) {
      const llm = extractions.get(hash);
      if (llm && llm.engine === 'llm' && Array.isArray(llm.skills)) {
        engine = 'llm';
        skills = llm.skills;
      } else {
        engine = 'rules';
        skills = rulesFor(hash, text);
      }
    }
    return {
      ...posting,
      title: entry?.title ?? posting.title,
      fetched: entry !== null,
      hasText: text !== null,
      textHash: hash,
      textLength: text ? text.length : 0,
      source: entry?.source ?? null,
      fetchedAt: entry?.fetchedAt ?? null,
      fetchError: entry?.error ?? null,
      engine,
      skills,
    };
  });
}

/** The postings whose text Claude has not extracted yet, best candidates first. */
export function pendingLlm(postings) {
  return postings
    .filter((p) => p.hasText && p.engine !== 'llm')
    .sort((a, b) => Number(b.reportId !== null) - Number(a.reportId !== null) || (b.score ?? 0) - (a.score ?? 0) || (b.firstSeen ?? '').localeCompare(a.firstSeen ?? ''));
}

/**
 * The whole payload for `GET /api/skills`.
 *
 * @param {{root?: string, now?: Date}} [options]
 */
export function readSkillsOverview({ root, now = new Date() } = {}) {
  const postings = readPostingsWithSkills({ root });
  const cv = readCv({ root });
  const gapMentions = readGapMentions({ root });
  const overrides = readOverrides({ root });

  const withSkills = postings.filter((p) => p.hasText);
  const { skills, lists, months } = aggregate({ postings: withSkills, cv, gapMentions, overrides, now });

  const pending = pendingLlm(postings);
  const fetchedAt = postings.map((p) => p.fetchedAt).filter(Boolean).sort();
  const coverage = {
    postings: postings.length,
    withText: withSkills.length,
    fetchFailed: postings.filter((p) => p.fetched && !p.hasText).length,
    unfetched: postings.filter((p) => !p.fetched).length,
    extractedLlm: postings.filter((p) => p.engine === 'llm').length,
    rulesOnly: postings.filter((p) => p.engine === 'rules').length,
    pendingLlm: pending.length,
    sessionsNeeded: Math.ceil(pending.length / BATCH_SIZE),
    evaluated: postings.filter((p) => p.reportId !== null).length,
    lastFetchAt: fetchedAt.at(-1) ?? null,
    reportsWithGaps: new Set([...gapMentions.values()].flatMap((s) => [...s])).size,
  };

  const postingIndex = Object.fromEntries(
    postings.map((p) => [
      p.id,
      {
        id: p.id,
        url: p.url,
        company: p.company,
        title: p.title,
        location: p.location,
        firstSeen: p.firstSeen,
        portal: p.portal,
        reportId: p.reportId,
        score: p.score,
        hasText: p.hasText,
        engine: p.engine,
        source: p.source,
        error: p.fetchError ? { code: p.fetchError.code, message: p.fetchError.message } : null,
        skillCount: p.skills.length,
      },
    ]),
  );

  return {
    coverage,
    cv: { present: cv.present, engine: cv.engine, stale: cv.stale, skillCount: cv.skills.length, extractedAt: cv.extractedAt, skills: cv.skills },
    skills,
    lists,
    months,
    postings: postingIndex,
    overrides,
  };
}
