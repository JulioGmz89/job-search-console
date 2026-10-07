/**
 * profile.js — the CV (`cv.md`) and the profile (`config/profile.yml`) as the
 * My CV page edits them (ia.md §2.7, §4).
 *
 * Both are upstream's user-layer files, read by every mode as they are. The
 * console never reformats them:
 *   - cv.md is saved as the text the user gave (line endings normalized).
 *   - profile.yml is edited field by field through the `yaml` Document API, so
 *     comments, key order and every key the form does not know survive a save.
 *     js-yaml (used for reading elsewhere) would drop the comments on dump.
 * A missing profile.yml is created with only the fields the user filled in —
 * never from config/profile.example.yml, whose fictional candidate would end up
 * in the user's fit reports.
 */

import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { isMap, isScalar, parseDocument } from 'yaml';

import { profilePath, readProfile } from '../agents/profile.js';
import { atomicWrite, normalizeText } from './files.js';
import { resolveDataRoot } from './paths.js';

export class ProfileError extends Error {
  constructor(message, { code, status = 400, detail } = {}) {
    super(message);
    this.name = 'ProfileError';
    this.code = code;
    this.status = status;
    this.detail = detail;
  }
}

// ── cv.md ─────────────────────────────────────────────────────────────

const MAX_CV_BYTES = 512 * 1024;

export function cvPath(root) {
  return join(resolveDataRoot(root), 'cv.md');
}

/**
 * What a saved CV holds, in the words the set-up step confirms it with:
 * "Alex Rivera · Summary, Experience (2 roles), Education, Skills".
 *
 * @param {string} text
 * @returns {{name: string|null, sections: Array<{title: string, entries: number}>}}
 */
export function summarizeCv(text) {
  const lines = String(text ?? '').split(/\r?\n/);
  const name = lines.map((l) => /^#\s+(.+?)\s*#*\s*$/.exec(l)?.[1]).find(Boolean) ?? null;
  const sections = [];
  for (const line of lines) {
    const h2 = /^##\s+(.+?)\s*#*\s*$/.exec(line);
    if (h2) sections.push({ title: h2[1], entries: 0 });
    else if (/^###\s+\S/.test(line) && sections.length) sections.at(-1).entries += 1;
  }
  return { name, sections };
}

/** @returns {{path: string, exists: boolean, text: string, modified: string|null, summary: object}} */
export function readCvContent({ root } = {}) {
  const path = cvPath(root);
  if (!existsSync(path)) return { path, exists: false, text: '', modified: null, summary: summarizeCv('') };
  const text = readFileSync(path, 'utf-8');
  return { path, exists: true, text, modified: statSync(path).mtime.toISOString(), summary: summarizeCv(text) };
}

/** @param {{root?: string, text: string}} input */
export function writeCvContent({ root, text } = {}) {
  if (typeof text !== 'string') throw new ProfileError('The CV must be text', { code: 'cv-invalid' });
  const normalized = normalizeText(text);
  if (normalized.trim() === '') throw new ProfileError('The CV is empty — paste your CV or choose a file', { code: 'cv-empty' });
  if (Buffer.byteLength(normalized, 'utf-8') > MAX_CV_BYTES) {
    throw new ProfileError('The CV is longer than 512 KB — is this the right file?', { code: 'cv-too-large' });
  }
  atomicWrite(cvPath(root), normalized);
  return readCvContent({ root });
}

// ── profile.yml ───────────────────────────────────────────────────────

export const SPEND_TIERS = ['economy', 'standard', 'premium'];

/**
 * The fields the Profile form owns, and where each lives in upstream's layout
 * (config/profile.example.yml). `read` falls back to older spellings the file
 * may use; `write` always uses upstream's current one.
 */
const FIELDS = {
  fullName: { path: ['candidate', 'full_name'], also: [['candidate', 'name']], type: 'text' },
  email: { path: ['candidate', 'email'], type: 'text' },
  location: { path: ['candidate', 'location'], type: 'text' },
  targetRoles: { path: ['target_roles', 'primary'], type: 'list' },
  compensation: { path: ['compensation', 'target_range'], type: 'text' },
  minimum: { path: ['compensation', 'minimum'], type: 'text' },
  workArrangement: { path: ['compensation', 'location_flexibility'], type: 'text' },
  autoPdfThreshold: { path: ['cv', 'auto_pdf_score_threshold'], type: 'score' },
  language: { path: ['language', 'output'], type: 'text' },
  spendTier: { path: ['spend_tier'], type: 'tier' },
};

/** `language: en` (a scalar) is an older spelling of `language: {output: en}`. */
function getField(doc, key) {
  const field = FIELDS[key];
  if (key === 'language' && isScalar(doc.get('language', true))) return doc.get('language');
  for (const path of [field.path, ...(field.also ?? [])]) {
    const value = doc.getIn(path);
    if (value !== undefined && value !== null) return field.type === 'list' && value?.toJSON ? value.toJSON() : value;
  }
  return null;
}

function clean(key, value) {
  const { type } = FIELDS[key];
  if (value === null || value === undefined || value === '') return null;
  if (type === 'list') {
    const list = (Array.isArray(value) ? value : String(value).split(/\r?\n|,/)).map((v) => String(v).trim()).filter(Boolean);
    return list.length ? list : null;
  }
  if (type === 'score') {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0 || n > 5) throw new ProfileError('Enter a fit between 0 and 5, for example 3.5', { code: 'profile-invalid', detail: [{ field: key }] });
    return n;
  }
  if (type === 'tier' && !SPEND_TIERS.includes(value)) {
    throw new ProfileError(`Choose one of: ${SPEND_TIERS.join(', ')}`, { code: 'profile-invalid', detail: [{ field: key }] });
  }
  const text = String(value).trim();
  if (text.includes('\n')) throw new ProfileError('Use a single line', { code: 'profile-invalid', detail: [{ field: key }] });
  return text || null;
}

function setField(doc, key, value) {
  const field = FIELDS[key];
  if (key === 'language' && isScalar(doc.get('language', true))) {
    if (value === null) doc.delete('language');
    else doc.set('language', value);
    return;
  }
  // A value saved under an older spelling is moved to the current one.
  for (const old of field.also ?? []) if (doc.hasIn(old)) doc.deleteIn(old);
  if (value === null) {
    if (doc.hasIn(field.path)) doc.deleteIn(field.path);
    return;
  }
  // setIn creates missing parents, but refuses to descend into a scalar.
  const parent = field.path.slice(0, -1);
  if (parent.length && doc.hasIn(parent) && !isMap(doc.getIn(parent, true))) {
    throw new ProfileError(`profile.yml has "${parent.join('.')}" in a shape the form cannot edit; change it in your editor`, { code: 'profile-shape', status: 422 });
  }
  doc.setIn(field.path, field.type === 'list' ? doc.createNode(value, { flow: false }) : value);
}

function loadDocument(root) {
  const path = profilePath(resolveDataRoot(root));
  const exists = existsSync(path);
  const text = exists ? readFileSync(path, 'utf-8') : '';
  const doc = parseDocument(text);
  return { path, exists, text, doc };
}

/**
 * @returns {{path: string, exists: boolean, error: string|null, fields: object, modified: string|null,
 *   tiers: string[], advanced: Array<{file: string, exists: boolean}>}}
 */
export function readProfileForm({ root } = {}) {
  const dataRoot = resolveDataRoot(root);
  const { path, exists, doc } = loadDocument(root);
  const error = doc.errors.length ? `profile.yml does not parse: ${doc.errors[0].message}` : null;
  const fields = {};
  if (!error) for (const key of Object.keys(FIELDS)) fields[key] = getField(doc, key);
  // The runner's own default applies when the threshold is unset; show it.
  fields.autoPdfThreshold ??= readProfile({ root: dataRoot }).autoPdfThreshold;
  return {
    path,
    exists,
    error,
    fields,
    modified: exists ? statSync(path).mtime.toISOString() : null,
    tiers: SPEND_TIERS,
    advanced: ['modes/_profile.md', 'article-digest.md'].map((file) => ({ file, exists: existsSync(join(dataRoot, file)) })),
  };
}

/**
 * Save the given fields. Keys not sent are left as they are; a key sent as
 * null or "" is removed. Everything else in the file is untouched.
 *
 * @param {{root?: string, fields: object}} input
 */
export function writeProfileForm({ root, fields } = {}) {
  if (!fields || typeof fields !== 'object' || Array.isArray(fields)) {
    throw new ProfileError('Expected the profile fields', { code: 'profile-invalid' });
  }
  const unknown = Object.keys(fields).filter((k) => !(k in FIELDS));
  if (unknown.length) throw new ProfileError(`Unknown profile field: ${unknown.join(', ')}`, { code: 'profile-invalid', detail: unknown.map((field) => ({ field })) });

  const { path, exists, doc } = loadDocument(root);
  if (doc.errors.length) {
    throw new ProfileError('profile.yml does not parse; fix it in your editor first', { code: 'profile-unparseable', status: 422, detail: doc.errors.map((e) => e.message) });
  }
  if (exists && doc.contents !== null && !isMap(doc.contents)) {
    throw new ProfileError('profile.yml is not a set of fields; fix it in your editor first', { code: 'profile-shape', status: 422 });
  }
  if (!exists) {
    doc.commentBefore = ' Your profile for the job-search assistant (career-ops config/profile.yml).\n Created by Job Search Console. Every option: config/profile.example.yml';
  }
  for (const [key, value] of Object.entries(fields)) setField(doc, key, clean(key, value));
  atomicWrite(path, normalizeText(doc.toString({ lineWidth: 0 })));
  return readProfileForm({ root });
}

// ── handing the CV design over to My CV › Design ─────────────────────

/** profile.yml keys that override the Design page, as `[path, words]`. */
const DESIGN_KEYS = [
  [['style'], 'style'],
  [['cv', 'sections'], 'section order'],
];

const designBackupPath = (root) => `${profilePath(resolveDataRoot(root))}.design.bak`;

/**
 * Remove profile.yml's own design settings so My CV › Design decides
 * (UI-cv-profile-warning). Everything else in the file is kept, comments too;
 * the file as it was is kept beside it for Undo.
 *
 * @returns {{removed: string[]}}
 */
export function releaseDesignKeys({ root } = {}) {
  const { path, exists, text, doc } = loadDocument(root);
  if (!exists) return { removed: [] };
  if (doc.errors.length) {
    throw new ProfileError('profile.yml does not parse; fix it in your editor first', { code: 'profile-unparseable', status: 422 });
  }
  const removed = DESIGN_KEYS.filter(([keyPath]) => doc.hasIn(keyPath)).map(([keyPath, words]) => {
    doc.deleteIn(keyPath);
    return words;
  });
  if (!removed.length) return { removed };
  atomicWrite(designBackupPath(root), text);
  atomicWrite(path, normalizeText(doc.toString({ lineWidth: 0 })));
  return { removed };
}

/** Undo `releaseDesignKeys`: put back profile.yml as it was. */
export function restoreDesignKeys({ root } = {}) {
  const backup = designBackupPath(root);
  if (!existsSync(backup)) throw new ProfileError('There is nothing to put back', { code: 'no-backup', status: 409 });
  atomicWrite(profilePath(resolveDataRoot(root)), readFileSync(backup, 'utf-8'));
  return { restored: true };
}
