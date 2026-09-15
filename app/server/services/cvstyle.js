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

import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import yaml from 'js-yaml';

import { CV_SECTION_KEYS, DEFAULT_STYLE, DENSITIES, listCvTemplates as listTemplates, loadStyle, STYLE_FIELDS, stylePath, validateStyle } from '../../cv/theme.js';
import { readProfile } from '../agents/profile.js';
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

const atomicWrite = (path, text) => {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.tmp-${process.pid}`;
  writeFileSync(tmp, text, 'utf-8');
  if (existsSync(path)) writeFileSync(`${path}.bak`, readFileSync(path));
  renameSync(tmp, path);
};

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
 * @returns {{path: string, exists: boolean, text: string, templateText: string|null}}
 */
export function readVoice({ root } = {}) {
  const path = voicePath(root);
  const template = join(repoRoot, 'voice-dna.template.md');
  return {
    path,
    exists: existsSync(path),
    text: existsSync(path) ? readFileSync(path, 'utf-8') : '',
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
