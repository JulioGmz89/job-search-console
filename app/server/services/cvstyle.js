/**
 * cvstyle.js — CV Studio's files: `config/cv/style.yml` (the fork's style
 * tokens, §7a) and `voice-dna.md` (upstream's writing guardrail, §7b), plus
 * the read-only listings the page shows: templates and `writing-samples/`.
 *
 * All three are user-layer files (gitignored). style.yml is fork-owned;
 * voice-dna.md is upstream's contract — the console edits it in place rather
 * than inventing a parallel file, so a manual `claude` session in the same
 * directory applies the same voice rules the console's runs do.
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import yaml from 'js-yaml';

import { CV_SECTION_KEYS, DEFAULT_STYLE, DENSITIES, listCvTemplates as listTemplates, loadStyle, STYLE_FIELDS, stylePath, validateStyle } from '../../cv/theme.js';
import { readProfile } from '../agents/profile.js';
import { atomicWrite } from './files.js';
import { repoRoot, resolveDataRoot } from './paths.js';

export class CvStyleError extends Error {
  constructor(message, { code, status = 400, detail } = {}) {
    super(message);
    this.name = 'CvStyleError';
    this.code = code;
    this.status = status;
    this.detail = detail;
  }
}

/** Upstream's renderer applies profile.yml's own settings after ours, so warn when they exist. */
function profileWarnings(root) {
  const profile = readProfile({ root });
  return { style: profile.hasStyle, cvSections: profile.hasCvSections, cvTemplate: profile.cvTemplate };
}

/**
 * @param {{root?: string}} [options]
 * @returns {{path: string, exists: boolean, style: object, errors: object[], defaults: object,
 *   fields: object, densities: object, sectionKeys: string[], profileWarnings: object}}
 */
export function readStyle({ root } = {}) {
  const dataRoot = resolveDataRoot(root);
  const loaded = loadStyle({ root: dataRoot });
  return {
    path: loaded.path,
    exists: loaded.exists,
    style: loaded.style,
    errors: loaded.errors,
    defaults: DEFAULT_STYLE,
    fields: STYLE_FIELDS,
    densities: Object.fromEntries(Object.entries(DENSITIES).map(([k, v]) => [k, v.label])),
    sectionKeys: CV_SECTION_KEYS,
    profileWarnings: profileWarnings(dataRoot),
  };
}

/**
 * Validate and save the style. Only recognized keys are written, and an
 * invalid value is a 400 naming the key rather than a half-saved file.
 *
 * @param {{root?: string, style: object}} input
 * @returns {{path: string, style: object}}
 */
export function writeStyle({ root, style } = {}) {
  const { style: clean, errors } = validateStyle(style);
  if (errors.length) throw new CvStyleError('Some style values are not valid', { code: 'style-invalid', detail: errors });

  const doc = {};
  for (const key of Object.keys(DEFAULT_STYLE)) {
    const value = clean[key];
    if (value === null || value === undefined) continue;
    if (key === 'sections' && value.length === 0) continue;
    if (key === 'density' && value === 'normal') continue;
    if (key === 'template' && value === 'standard') continue;
    doc[key] = value;
  }
  const header = [
    '# Job Search Console — CV style tokens (PROJECT_PLAN.md §7a).',
    '# Edited from the CV Studio page; applied by app/cv/render-cv.js when a PDF is',
    '# generated from the console. Delete a key to fall back to the template default.',
    '',
  ].join('\n');
  const path = stylePath(resolveDataRoot(root));
  atomicWrite(path, header + (Object.keys(doc).length ? yaml.dump(doc, { lineWidth: 120 }) : '{}\n'));
  return { path, style: clean };
}

// ── voice ─────────────────────────────────────────────────────────────

const MAX_VOICE_BYTES = 256 * 1024;

export function voicePath(root) {
  return join(resolveDataRoot(root), 'voice-dna.md');
}

/**
 * @param {{root?: string}} [options]
 * @returns {{path: string, exists: boolean, text: string, words: string[], modified: string|null,
 *   hasBackup: boolean, templateText: string|null}}
 */
export function readVoice({ root } = {}) {
  const path = voicePath(root);
  const template = join(repoRoot, 'voice-dna.template.md');
  const text = existsSync(path) ? readFileSync(path, 'utf-8') : '';
  return {
    path,
    exists: existsSync(path),
    text,
    words: listAvoidWords(text),
    modified: existsSync(path) ? statSync(path).mtime.toISOString() : null,
    hasBackup: existsSync(`${path}.bak`),
    templateText: existsSync(template) ? readFileSync(template, 'utf-8') : null,
  };
}

/**
 * @param {{root?: string, text: string}} input
 * @returns {{path: string, bytes: number}}
 */
export function writeVoice({ root, text } = {}) {
  if (typeof text !== 'string') throw new CvStyleError('voice text must be a string', { code: 'voice-invalid' });
  const normalized = text.replace(/\r\n?/g, '\n');
  const bytes = Buffer.byteLength(normalized, 'utf-8');
  if (bytes > MAX_VOICE_BYTES) throw new CvStyleError('voice-dna.md is limited to 256 KB', { code: 'voice-too-large' });
  const path = voicePath(root);
  atomicWrite(path, normalized.endsWith('\n') || normalized === '' ? normalized : `${normalized}\n`);
  return { path, bytes };
}

// ── words to avoid (ia.md §2.7 Writing rules, F-002) ────────────────

const AVOID_HEADING = /^##\s+Never write\s*$/i;
const BULLET = /^\s*[-*]\s+(.+?)\s*$/;

/** The `## Never write` section: its heading line and the lines it spans. */
function avoidSection(lines) {
  const start = lines.findIndex((l) => AVOID_HEADING.test(l));
  if (start === -1) return null;
  let end = start + 1;
  while (end < lines.length && !/^#{1,2}\s/.test(lines[end])) end += 1;
  return { start, end };
}

/** The words under `## Never write`, as written. */
export function listAvoidWords(text) {
  const lines = String(text ?? '').split('\n');
  const section = avoidSection(lines);
  if (!section) return [];
  return lines.slice(section.start + 1, section.end).map((l) => BULLET.exec(l)?.[1]).filter(Boolean);
}

const cleanWord = (word) => {
  const text = typeof word === 'string' ? word.trim() : '';
  if (!text || text.length > 80 || /[\r\n]/.test(text)) throw new CvStyleError('Type one word or short phrase', { code: 'word-invalid' });
  return text;
};

/**
 * Add one word to avoid. Only its bullet line is written: the rest of the file
 * is the user's and is never rewritten. A missing section is added at the end.
 */
export function addAvoidWord({ root, word } = {}) {
  const clean = cleanWord(word);
  const { text } = readVoice({ root });
  if (listAvoidWords(text).some((w) => w.toLowerCase() === clean.toLowerCase())) return { added: false, words: listAvoidWords(text) };
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const section = avoidSection(lines);
  if (section) {
    let at = section.end;
    while (at > section.start + 1 && lines[at - 1].trim() === '') at -= 1;
    lines.splice(at, 0, `- ${clean}`);
  } else {
    while (lines.length && lines.at(-1).trim() === '') lines.pop();
    lines.push(...(lines.length ? [''] : ['# Writing rules', '']), '## Never write', `- ${clean}`);
  }
  writeVoice({ root, text: lines.join('\n') });
  return { added: true, words: listAvoidWords(readVoice({ root }).text) };
}

/** Remove one word to avoid: only lines under `## Never write` that are exactly it. */
export function removeAvoidWord({ root, word } = {}) {
  const clean = cleanWord(word).toLowerCase();
  const { text } = readVoice({ root });
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const section = avoidSection(lines);
  if (!section) return { removed: false, words: [] };
  const kept = lines.filter((line, i) => !(i > section.start && i < section.end && BULLET.exec(line)?.[1].toLowerCase() === clean));
  if (kept.length === lines.length) return { removed: false, words: listAvoidWords(text) };
  writeVoice({ root, text: kept.join('\n') });
  return { removed: true, words: listAvoidWords(readVoice({ root }).text) };
}

/**
 * Undo the last change to the rules: swap voice-dna.md with the voice-dna.md.bak
 * every save keeps ("Start from the example rules" says so before it replaces).
 */
export function restoreVoice({ root } = {}) {
  const backup = `${voicePath(root)}.bak`;
  if (!existsSync(backup)) throw new CvStyleError('There is no earlier version to go back to', { code: 'voice-no-backup', status: 404 });
  writeVoice({ root, text: readFileSync(backup, 'utf-8') });
  return readVoice({ root });
}

// ── listings ──────────────────────────────────────────────────────────

/** The user's own writing, which the modes calibrate against. README.md is upstream's, not a sample. */
export function listWritingSamples({ root } = {}) {
  const dir = join(resolveDataRoot(root), 'writing-samples');
  if (!existsSync(dir)) return { path: dir, samples: [] };
  const samples = readdirSync(dir)
    .filter((name) => !name.startsWith('.') && name.toLowerCase() !== 'readme.md')
    .map((name) => {
      const stats = statSync(join(dir, name));
      return stats.isFile() ? { name, size: stats.size, modified: stats.mtime.toISOString() } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));
  return { path: dir, samples };
}

export function listCvTemplates({ root } = {}) {
  const dataRoot = resolveDataRoot(root);
  return {
    templates: listTemplates({ root: dataRoot, repoRoot }),
    customDir: join(dataRoot, 'config', 'cv', 'templates'),
    current: loadStyle({ root: dataRoot }).style.template,
  };
}
