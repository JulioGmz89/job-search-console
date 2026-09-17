/**
 * store.js — the skills cache under `data/skills/` (PROJECT_PLAN.md §6).
 *
 * Everything here is derived and regenerable: posting text fetched from the
 * boards, skill extractions keyed by the text's hash, the CV's own skills keyed
 * by cv.md's hash, and the user's status overrides. It sits under `data/`, so
 * upstream's blanket gitignore covers it, and nothing upstream reads it.
 *
 * Two keys, deliberately different:
 *   - a posting is keyed by its normalized URL, so a re-scan finds the same file;
 *   - an extraction is keyed by the CONTENT hash of the text it was made from,
 *     so a posting whose text has not changed is never sent to Claude twice,
 *     and two URLs with identical text share one extraction.
 *
 * Writes go through a temp file and a rename so a crash mid-write cannot leave
 * a half-written JSON file that every later read chokes on.
 */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { normalizeUrl } from '../../../url-key.mjs';
import { resolveDataRoot } from '../services/paths.js';

export function skillsDir(root) {
  return join(resolveDataRoot(root), 'data', 'skills');
}

/** sha1 as a short stable id; not a security boundary. */
export const sha1 = (text) => createHash('sha1').update(String(text)).digest('hex');

/** The posting key: a hash of upstream's normalized URL, so tracking params and http/https do not fork the cache. */
export function postingId(url) {
  const key = normalizeUrl(url);
  return key ? sha1(key) : null;
}

/** Text is hashed after whitespace normalization, so a re-fetch that only changed line breaks hits the cache. */
export function textHash(text) {
  return sha1(String(text ?? '').replace(/\s+/g, ' ').trim().toLowerCase());
}

function readJson(path) {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch {
    // A corrupt cache file is regenerable; treat it as absent rather than failing every read.
    return null;
  }
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.${process.pid}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(value, null, 2)}\n`, 'utf-8');
  renameSync(tmp, path);
}

function listJson(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith('.json'))
    .map((name) => readJson(join(dir, name)))
    .filter((v) => v && typeof v === 'object');
}

// ── postings ──────────────────────────────────────────────────────────

const postingPath = (root, id) => join(skillsDir(root), 'postings', `${id}.json`);

/**
 * @typedef {object} CachedPosting
 * @property {string} id
 * @property {string} url
 * @property {string} fetchedAt - ISO time of the last attempt.
 * @property {string|null} source - `greenhouse-api` … `browser`, `jds`; null when nothing was ever read.
 * @property {string|null} title
 * @property {string|null} text
 * @property {string|null} textHash
 * @property {{code: string, message: string, at: string}|null} error - The last attempt's failure, if it failed.
 */

/** @returns {CachedPosting|null} */
export function readPosting({ root, id }) {
  return readJson(postingPath(root, id));
}

/** @returns {Map<string, CachedPosting>} keyed by posting id. */
export function readPostings({ root } = {}) {
  const map = new Map();
  for (const entry of listJson(join(skillsDir(root), 'postings'))) {
    if (typeof entry.id === 'string') map.set(entry.id, entry);
  }
  return map;
}

/**
 * Record a fetch outcome. A failure keeps the previous text when there was one:
 * a board that is down today does not erase what was read last week.
 */
export function writePosting({ root, url, source = null, title = null, text = null, error = null, fetchedAt = new Date().toISOString() }) {
  const id = postingId(url);
  if (!id) throw new TypeError(`not a posting URL: ${url}`);
  const previous = text === null ? readPosting({ root, id }) : null;
  const entry = {
    id,
    url,
    fetchedAt,
    source: text === null ? previous?.source ?? null : source,
    title: text === null ? previous?.title ?? title : title,
    text: text === null ? previous?.text ?? null : text,
    textHash: text === null ? previous?.textHash ?? null : textHash(text),
    error: error ? { code: error.code ?? 'fetch-failed', message: String(error.message ?? error), at: fetchedAt } : null,
  };
  writeJson(postingPath(root, id), entry);
  return entry;
}

// ── extractions ───────────────────────────────────────────────────────

const extractionPath = (root, hash) => join(skillsDir(root), 'extractions', `${hash}.json`);

/**
 * @typedef {object} Extraction
 * @property {string} textHash
 * @property {'llm'|'rules'} engine
 * @property {string|null} model
 * @property {string|null} runId
 * @property {string} extractedAt
 * @property {Array<{skill: string, canonical: string, category: string, level: 'required'|'nice-to-have'}>} skills
 */

/** @returns {Extraction|null} */
export function readExtraction({ root, hash }) {
  return readJson(extractionPath(root, hash));
}

/** @returns {Map<string, Extraction>} keyed by text hash. */
export function readExtractions({ root } = {}) {
  const map = new Map();
  for (const entry of listJson(join(skillsDir(root), 'extractions'))) {
    if (typeof entry.textHash === 'string') map.set(entry.textHash, entry);
  }
  return map;
}

export function writeExtraction({ root, textHash: hash, engine, model = null, runId = null, skills, extractedAt = new Date().toISOString() }) {
  const entry = { textHash: hash, engine, model, runId, extractedAt, skills };
  writeJson(extractionPath(root, hash), entry);
  return entry;
}

// ── the CV ────────────────────────────────────────────────────────────

const cvPath = (root) => join(skillsDir(root), 'cv.json');

/** @returns {{cvHash: string, engine: string, model: string|null, runId: string|null, extractedAt: string, skills: object[]}|null} */
export function readCvSkills({ root } = {}) {
  return readJson(cvPath(root));
}

export function writeCvSkills({ root, cvHash, engine, model = null, runId = null, skills, extractedAt = new Date().toISOString() }) {
  const entry = { cvHash, engine, model, runId, extractedAt, skills };
  writeJson(cvPath(root), entry);
  return entry;
}

// ── overrides ─────────────────────────────────────────────────────────

const overridesPath = (root) => join(skillsDir(root), 'overrides.json');

export const OVERRIDE_STATUSES = Object.freeze(['have', 'partial', 'missing', 'ignore']);

/** @returns {Object<string, 'have'|'partial'|'missing'|'ignore'>} keyed by skill id. */
export function readOverrides({ root } = {}) {
  const parsed = readJson(overridesPath(root));
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
  return Object.fromEntries(Object.entries(parsed).filter(([, v]) => OVERRIDE_STATUSES.includes(v)));
}

/** Set (or with `status: null`, clear) one override. */
export function writeOverride({ root, id, status }) {
  if (typeof id !== 'string' || !id) throw new TypeError('id must be a skill id');
  if (status !== null && !OVERRIDE_STATUSES.includes(status)) {
    throw new TypeError(`status must be one of ${OVERRIDE_STATUSES.join(', ')} or null`);
  }
  const all = readOverrides({ root });
  if (status === null) delete all[id];
  else all[id] = status;
  writeJson(overridesPath(root), all);
  return all;
}

/** Remove every cached file; for tests and a future "rebuild" button. */
export function clearSkillsCache({ root } = {}) {
  rmSync(skillsDir(root), { recursive: true, force: true });
}
