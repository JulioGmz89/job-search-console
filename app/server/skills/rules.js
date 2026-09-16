/**
 * rules.js — deterministic skill extraction: no tokens, no network, instant.
 *
 * The first tier of the hybrid design (PROJECT_PLAN.md §6 step 1, resolved in
 * §11): every posting with text gets a rules-based extraction the moment it is
 * fetched, so the Skills page has something to say before any Claude session
 * runs. The LLM tier (extract-spec.js) then replaces it per posting, cached by
 * content hash.
 *
 * Three matchers, union'd:
 *   - upstream's `extractSkills` — its vocabulary, case-insensitive, the
 *     "Go"/"SAFe" special cases included;
 *   - the fork's alias vocabulary (aliases.js), multi-word spellings included,
 *     case-insensitive except for the everyday-word aliases, which must appear
 *     as written ("Express", "Unity");
 *   - upstream's `extractJdSkills` — capitalized tokens from requirement
 *     bullets — kept only when the vocabulary recognizes the token. On its own
 *     it also returns "Bachelor", "English" and company names; the vocabulary
 *     is the filter, and the LLM tier is where out-of-vocabulary skills come from.
 *
 * Required vs nice-to-have is read from the section a mention sits in: a
 * heading such as "Nice to have", "Preferred", "Bonus points" opens a
 * nice-to-have block until the next heading; a bullet that itself says
 * "(preferred)" or "a plus" is nice-to-have; everything else is required. A
 * skill mentioned in both is required — the stricter reading of the posting.
 */

import { extractJdSkills } from '../../../jd-skill-gap.mjs';
import { extractSkills } from '../../../skill-extract.mjs';
import { stripMarkdownComments, yamlValueText } from '../../../upskill.mjs';
import { ALIASES, AMBIGUOUS_ALIASES, CASE_SENSITIVE_ALIASES, canonicalSkill, categoryOf, isKnownSkill, skillId } from './aliases.js';

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const longestFirst = (a, b) => b.length - a.length;

/** Fork aliases, case-insensitive. `(?<!\w)`/`(?!\w)` rather than `\b` so `.NET` and `C#` match at symbol edges. */
const FORK_PATTERN = new RegExp(
  `(?<![\\w.#+])(?:${Object.keys(ALIASES).filter((k) => !AMBIGUOUS_ALIASES.has(k)).sort(longestFirst).map(escape).join('|')})(?![\\w#+])`,
  'gi',
);

/** Everyday-word aliases, exact case. */
const EXACT_PATTERN = new RegExp(
  `(?<![\\w.#+])(?:${Object.keys(CASE_SENSITIVE_ALIASES).sort(longestFirst).map(escape).join('|')})(?![\\w#+-])`,
  'g',
);

/** Canonical skill names found in one piece of text (no levels). */
export function findSkills(text) {
  const found = new Map();
  if (!text) return found;
  const add = (spelling, canonical) => {
    if (!canonical || found.has(canonical)) return;
    found.set(canonical, spelling);
  };
  for (const canonical of extractSkills(text)) add(canonical, canonicalSkill(canonical));
  for (const m of text.matchAll(FORK_PATTERN)) add(m[0], canonicalSkill(m[0]));
  for (const m of text.matchAll(EXACT_PATTERN)) add(m[0], CASE_SENSITIVE_ALIASES[m[0]]);
  for (const token of extractJdSkills(text)) {
    const canonical = canonicalSkill(token);
    if (isKnownSkill(canonical)) add(token, canonical);
  }
  return found;
}

// ── required vs nice-to-have ──────────────────────────────────────────

const NICE_RE = /\b(nice[- ]to[- ]haves?|preferred|bonus|plus(es)?|desirable|ideally|good to have|great to have|not required|optional|would be (great|nice|a plus)|advantage|helpful)\b/i;
const BULLET_RE = /^\s*(?:[-*•▪◦]|\d+[.)])\s+/;

/** A line that reads as a heading: short, not a bullet, not a sentence. */
function isHeading(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 80 || BULLET_RE.test(trimmed)) return false;
  if (/^#{1,6}\s/.test(trimmed)) return true;
  if (trimmed.endsWith(':')) return true;
  const words = trimmed.split(/\s+/);
  // Title Case or ALL CAPS, few words, no sentence punctuation inside.
  return words.length <= 8 && !/[.,;](\s|$)/.test(trimmed) && (trimmed === trimmed.toUpperCase() || words.every((w) => /^[A-Z(&/]|^\d|^(and|or|to|of|for|a|an|the|&|you|we|-)$/i.test(w)));
}

/**
 * Extract skills with their level from one posting's text.
 *
 * @param {string} text
 * @returns {Array<{skill: string, canonical: string, id: string, category: string, level: 'required'|'nice-to-have'}>}
 */
export function extractRules(text) {
  if (!text) return [];
  /** canonical → { spelling, required: boolean } */
  const levels = new Map();
  let mood = 'required';

  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (isHeading(line)) {
      mood = NICE_RE.test(line) ? 'nice-to-have' : 'required';
      continue;
    }
    const inline = BULLET_RE.test(line) && NICE_RE.test(line);
    const level = inline ? 'nice-to-have' : mood;
    for (const [canonical, spelling] of findSkills(line)) {
      const entry = levels.get(canonical) ?? { spelling, required: false };
      if (level === 'required') entry.required = true;
      levels.set(canonical, entry);
    }
  }

  // Multi-line matches (a skill split across a line break) are rare; a final
  // whole-text pass catches names the per-line pass could not see. Level: required.
  for (const [canonical, spelling] of findSkills(text)) {
    if (!levels.has(canonical)) levels.set(canonical, { spelling, required: true });
  }

  return [...levels.entries()]
    .map(([canonical, { spelling, required }]) => ({
      skill: spelling,
      canonical,
      id: skillId(canonical),
      category: categoryOf(canonical),
      level: required ? 'required' : 'nice-to-have',
    }))
    .sort((a, b) => a.canonical.localeCompare(b.canonical));
}

// ── the CV ────────────────────────────────────────────────────────────

const SKILLS_HEADING_RE = /^#{1,6}\s*(skills|technical skills|tech stack|technologies|core competencies|stack)\b/i;
const ANY_HEADING_RE = /^#{1,6}\s/;

/**
 * Split cv.md into its named skills section and the rest, the way
 * `jd-skill-gap.mjs` does (its helper is not exported).
 */
export function splitCvSections(cvText) {
  const lines = String(cvText ?? '').split(/\r?\n/);
  const named = [];
  const prose = [];
  let inSkills = false;
  for (const line of lines) {
    if (ANY_HEADING_RE.test(line)) inSkills = SKILLS_HEADING_RE.test(line);
    (inSkills ? named : prose).push(line);
  }
  return { namedSkillsText: named.join('\n'), proseText: prose.join('\n') };
}

/**
 * The CV's skills by rules: named in a skills section (or the profile) →
 * `solid`; only mentioned in the prose → `basic`.
 *
 * @param {{cvText: string, profileText?: string}} input
 * @returns {Array<{skill: string, canonical: string, id: string, category: string, depth: 'solid'|'basic'}>}
 */
export function extractCvRules({ cvText, profileText = '' }) {
  const { namedSkillsText, proseText } = splitCvSections(stripMarkdownComments(cvText));
  const named = findSkills(`${namedSkillsText}\n${yamlValueText(profileText)}`);
  const prose = findSkills(proseText);
  const out = new Map();
  for (const [canonical, spelling] of named) out.set(canonical, { spelling, depth: 'solid' });
  for (const [canonical, spelling] of prose) if (!out.has(canonical)) out.set(canonical, { spelling, depth: 'basic' });
  return [...out.entries()]
    .map(([canonical, { spelling, depth }]) => ({ skill: spelling, canonical, id: skillId(canonical), category: categoryOf(canonical), depth }))
    .sort((a, b) => a.canonical.localeCompare(b.canonical));
}
