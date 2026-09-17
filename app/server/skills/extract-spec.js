/**
 * extract-spec.js — the Claude sessions of the skills layer.
 *
 * The second tier of the hybrid extraction (PROJECT_PLAN.md §6, §11): a
 * headless session reads a batch of postings and writes structured skills —
 * category, required vs nice-to-have, names outside the rules' vocabulary.
 * One more, `skills-cv`, does the same for the CV with a depth per skill.
 *
 * Same discipline as `queue/agent-specs.js`, whose plumbing this reuses:
 * `before` writes the input file and the prompt, the session may only Read
 * and Write, and `after` believes nothing but the output file — parsed,
 * validated, canonicalized through the rules' alias map, and cached per text
 * hash so a posting is never sent twice. A posting missing from the output
 * simply stays pending; the run fails only when the file itself is unusable.
 *
 * These prompts are fork-owned (there is no upstream mode for this), so they
 * do not go through `assemblePrompt`; `_shared.md` and the profile would only
 * dilute a task that must not evaluate anything.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { profilePath } from '../agents/profile.js';
import { fillTemplate, writePromptFile } from '../agents/prompts/assemble.js';
import { createAgentCommand, TIMEOUTS } from '../agents/runner.js';
import { agentError, agentPlumbing, promptPath, requireAgent, requireCv } from '../queue/agent-specs.js';
import { SpecError } from '../queue/specs.js';
import { canonicalSkill, categoryOf, CATEGORY_IDS, skillId } from './aliases.js';
import { BATCH_SIZE } from './service.js';
import { readExtraction, readPosting, sha1, textHash, writeCvSkills, writeExtraction } from './store.js';

const here = dirname(fileURLToPath(import.meta.url));

/** Characters of one posting shown to the model. */
const TEXT_CAP = 7_000;
const OPENING = 2_000;

const REQUIREMENTS_RE = /(requirements?|qualifications?|what you.ll bring|what we.re looking for|who you are|about you|you have|must have|skills|experience)\b/i;

const DEPTHS = new Set(['expert', 'solid', 'basic']);
const LEVELS = new Set(['required', 'nice-to-have']);

/**
 * Trim a long posting to its opening plus the stretch from the first
 * requirements-like heading — the part that names skills — rather than its
 * first N characters, which on many boards is the company pitch.
 */
export function trimForPrompt(text, cap = TEXT_CAP) {
  const clean = String(text ?? '');
  if (clean.length <= cap) return clean;
  const at = clean.slice(OPENING).search(REQUIREMENTS_RE);
  if (at === -1) return `${clean.slice(0, cap)}\n…`;
  const start = OPENING + at;
  return `${clean.slice(0, OPENING)}\n…\n${clean.slice(start, start + (cap - OPENING))}\n…`;
}

/** Normalize one skill from the model into the cache's shape, or null when it is unusable. */
export function normalizeSkill(raw, { withLevel = true, withDepth = false } = {}) {
  if (!raw || typeof raw !== 'object') return null;
  const name = typeof raw.skill === 'string' ? raw.skill.trim() : '';
  if (!name || name.length > 60) return null;
  const canonical = canonicalSkill(name);
  const known = categoryOf(canonical);
  const category = known !== 'other' ? known : CATEGORY_IDS.includes(raw.category) ? raw.category : 'other';
  const out = { skill: name, canonical, id: skillId(canonical), category };
  if (withLevel) out.level = LEVELS.has(raw.level) ? raw.level : 'required';
  if (withDepth) out.depth = DEPTHS.has(raw.depth) ? raw.depth : 'basic';
  return out;
}

/** One entry per canonical name; a required mention beats a nice-to-have one. */
export function dedupeSkills(list) {
  const map = new Map();
  for (const skill of list) {
    if (!skill) continue;
    const prev = map.get(skill.id);
    if (!prev || (prev.level !== 'required' && skill.level === 'required')) map.set(skill.id, skill);
  }
  return [...map.values()].sort((a, b) => a.canonical.localeCompare(b.canonical));
}

const tmpPath = (dataRoot, name) => join(dataRoot, 'data', 'jsc', 'tmp', name);

function writeJsonFile(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf-8');
}

function readOutput(path) {
  if (!existsSync(path)) throw new Error(`the session exited without writing ${path}`);
  try {
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch (error) {
    throw new Error(`the output file is not valid JSON: ${error.message}`, { cause: error });
  }
}

const readText = (path) => (existsSync(path) ? readFileSync(path, 'utf-8') : null);

function validatePostingIds(postingIds) {
  const ids = Array.isArray(postingIds) ? [...new Set(postingIds)] : [];
  if (ids.length === 0 || ids.length > BATCH_SIZE) {
    throw new SpecError(`postingIds must list 1–${BATCH_SIZE} posting ids`, { code: 'options-invalid' });
  }
  for (const id of ids) {
    if (typeof id !== 'string' || !/^[a-f0-9]{40}$/.test(id)) throw new SpecError('postingIds must be posting ids', { code: 'options-invalid' });
  }
  return ids;
}

/**
 * Extract skills from up to BATCH_SIZE cached postings in one session.
 *
 * @param {{postingIds: string[], model?: string|null}} options
 * @param {{root?: string, repoRoot: string, agent: object}} ctx
 */
export function buildSkillsExtractSpec({ postingIds, model = null } = {}, { root, repoRoot, agent } = {}) {
  requireAgent(agent);
  const ids = validatePostingIds(postingIds);
  if (model !== null && (typeof model !== 'string' || model.length > 80)) {
    throw new SpecError('model must be a short string', { code: 'options-invalid' });
  }
  const plumbing = agentPlumbing({ root, model });
  const { dataRoot } = plumbing;
  /** posting id → text hash, fixed in `before` so `after` verifies against the same text. */
  let hashes = new Map();

  return {
    kind: 'skills-extract',
    label: `Extract skills from ${ids.length} posting${ids.length === 1 ? '' : 's'}`,
    args: [],
    dryRun: false,
    writes: true,
    confirmRequired: false,
    reportsFindings: false,
    lane: 'agent',
    exclusive: false,
    dedupeKey: `skills-extract:${sha1([...ids].sort().join(','))}`,
    timeoutMs: TIMEOUTS.skillsExtract,
    meta: { postingIds: ids, model: plumbing.model },
    hooks: {
      async before(run) {
        // Re-read at dequeue time: another batch, or a re-fetch, may have
        // changed what is worth sending since the click.
        const items = [];
        hashes = new Map();
        for (const id of ids) {
          const posting = readPosting({ root: dataRoot, id });
          if (!posting?.text || !posting.textHash) continue;
          if (readExtraction({ root: dataRoot, hash: posting.textHash })?.engine === 'llm') continue;
          hashes.set(id, posting.textHash);
          items.push({ id, company: posting.company ?? null, title: posting.title ?? null, text: trimForPrompt(posting.text) });
        }
        if (items.length === 0) throw new Error('nothing left to extract: every posting in this batch is already extracted or has no text');

        const inputPath = tmpPath(dataRoot, `skills-${run.id}-input.json`);
        const outputPath = tmpPath(dataRoot, `skills-${run.id}-output.json`);
        writeJsonFile(inputPath, items);
        const overlay = readFileSync(join(here, 'prompts', 'skills-extract.md'), 'utf-8');
        const system = fillTemplate(overlay, {
          INPUT_PATH: promptPath(repoRoot, inputPath),
          OUTPUT_PATH: promptPath(repoRoot, outputPath),
          COUNT: items.length,
          CATEGORIES: CATEGORY_IDS.map((c) => `\`${c}\``).join(', '),
        });
        const systemPromptPath = writePromptFile({ root: dataRoot, runId: run.id, text: system });
        const command = createAgentCommand({
          bin: agent,
          userPrompt: `Extract the skills from the ${items.length} job postings in ${promptPath(repoRoot, inputPath)} and write ${promptPath(repoRoot, outputPath)}. Follow your instructions exactly.`,
          systemPromptPath,
          model: plumbing.model,
          cwd: repoRoot,
        });
        return {
          command,
          meta: { inputPath, outputPath, promptPath: systemPromptPath, sent: items.length },
          lines: [`Sending ${items.length} posting${items.length === 1 ? '' : 's'}${plumbing.model ? ` · model ${plumbing.model}` : ''}`],
        };
      },

      parseLine: plumbing.parseLine,

      async after(run, { provisional, record }) {
        plumbing.flush(record);
        if (provisional.status === 'cancelled') return {};
        if (provisional.status !== 'succeeded') return { status: 'failed', error: provisional.error ?? `claude exited with code ${provisional.exitCode}` };
        if (agentError(run)) return { status: 'failed', error: agentError(run) };

        let output;
        try {
          output = readOutput(run.meta.outputPath);
        } catch (error) {
          return { status: 'failed', error: error.message };
        }
        if (!Array.isArray(output)) return { status: 'failed', error: 'the output file is not a JSON array' };

        let extracted = 0;
        let skillsFound = 0;
        const done = new Set();
        for (const item of output) {
          const hash = item && typeof item.id === 'string' ? hashes.get(item.id) : undefined;
          if (!hash || done.has(item.id) || !Array.isArray(item.skills)) continue;
          const skills = dedupeSkills(item.skills.map((s) => normalizeSkill(s)));
          writeExtraction({ root: dataRoot, textHash: hash, engine: 'llm', model: plumbing.model, runId: run.id, skills });
          done.add(item.id);
          extracted += 1;
          skillsFound += skills.length;
        }
        if (extracted === 0) return { status: 'failed', error: 'the output file named none of the postings that were sent' };

        const missing = [...hashes.keys()].filter((id) => !done.has(id));
        record(`Extracted ${extracted} posting${extracted === 1 ? '' : 's'} · ${skillsFound} skill mentions`);
        if (missing.length) record(`${missing.length} posting${missing.length === 1 ? '' : 's'} not in the output — still pending`, 'stderr');
        return { result: { ...(run.result ?? {}), extracted, skillsFound, missing } };
      },
    },
  };
}

/**
 * Extract the CV's skills, with depth, in one session. Cached by cv.md's hash.
 *
 * @param {{model?: string|null}} options
 * @param {{root?: string, repoRoot: string, agent: object}} ctx
 */
export function buildSkillsCvSpec({ model = null } = {}, { root, repoRoot, agent } = {}) {
  requireAgent(agent);
  requireCv(root);
  if (model !== null && (typeof model !== 'string' || model.length > 80)) {
    throw new SpecError('model must be a short string', { code: 'options-invalid' });
  }
  const plumbing = agentPlumbing({ root, model });
  const { dataRoot } = plumbing;

  return {
    kind: 'skills-cv',
    label: 'Extract skills from the CV',
    args: [],
    dryRun: false,
    writes: true,
    confirmRequired: false,
    reportsFindings: false,
    lane: 'agent',
    exclusive: false,
    dedupeKey: 'skills-cv',
    timeoutMs: TIMEOUTS.skillsCv,
    meta: { model: plumbing.model },
    hooks: {
      async before(run) {
        const cv = readText(join(dataRoot, 'cv.md'));
        if (cv === null) throw new Error('cv.md disappeared before the session started');
        const profile = readText(profilePath(dataRoot)) ?? '';
        const inputPath = tmpPath(dataRoot, `skills-cv-${run.id}-input.json`);
        const outputPath = tmpPath(dataRoot, `skills-cv-${run.id}-output.json`);
        writeJsonFile(inputPath, { cv, profile });
        const overlay = readFileSync(join(here, 'prompts', 'skills-cv.md'), 'utf-8');
        const system = fillTemplate(overlay, {
          INPUT_PATH: promptPath(repoRoot, inputPath),
          OUTPUT_PATH: promptPath(repoRoot, outputPath),
          CATEGORIES: CATEGORY_IDS.map((c) => `\`${c}\``).join(', '),
        });
        const systemPromptPath = writePromptFile({ root: dataRoot, runId: run.id, text: system });
        const command = createAgentCommand({
          bin: agent,
          userPrompt: `List the skills evidenced by the CV in ${promptPath(repoRoot, inputPath)} and write ${promptPath(repoRoot, outputPath)}. Follow your instructions exactly.`,
          systemPromptPath,
          model: plumbing.model,
          cwd: repoRoot,
        });
        return {
          command,
          meta: { inputPath, outputPath, promptPath: systemPromptPath, cvHash: textHash(cv) },
          lines: [`Reading cv.md (${cv.length} characters)${plumbing.model ? ` · model ${plumbing.model}` : ''}`],
        };
      },

      parseLine: plumbing.parseLine,

      async after(run, { provisional, record }) {
        plumbing.flush(record);
        if (provisional.status === 'cancelled') return {};
        if (provisional.status !== 'succeeded') return { status: 'failed', error: provisional.error ?? `claude exited with code ${provisional.exitCode}` };
        if (agentError(run)) return { status: 'failed', error: agentError(run) };

        let output;
        try {
          output = readOutput(run.meta.outputPath);
        } catch (error) {
          return { status: 'failed', error: error.message };
        }
        if (!output || !Array.isArray(output.skills)) return { status: 'failed', error: 'the output file has no "skills" array' };

        const skills = dedupeSkills(output.skills.map((s) => normalizeSkill(s, { withLevel: false, withDepth: true })));
        writeCvSkills({ root: dataRoot, cvHash: run.meta.cvHash, engine: 'llm', model: plumbing.model, runId: run.id, skills });
        record(`CV: ${skills.length} skills recorded`);
        return { result: { ...(run.result ?? {}), skills: skills.length } };
      },
    },
  };
}
