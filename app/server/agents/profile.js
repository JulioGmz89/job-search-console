/**
 * profile.js — the few facts the agent runner needs from config/profile.yml.
 *
 * Part of the seam: the only knowledge of profile.yml's layout on the runner's
 * side lives here. Never throws — a missing or broken profile is reported, and
 * the run that needs it decides whether that is fatal.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import yaml from 'js-yaml';

/** Upstream's default when `cv.auto_pdf_score_threshold` is unset (batch-prompt.md Step 4). */
export const DEFAULT_AUTO_PDF_THRESHOLD = 3.0;

export function profilePath(root) {
  return join(root, 'config', 'profile.yml');
}

export function kebab(text) {
  return String(text ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * @param {{root: string}} options
 * @returns {{exists: boolean, path: string, yaml: string|null, doc: object|null, error: string|null,
 *   language: string|null, modesDir: string|null, spendTier: string|null, autoPdfThreshold: number,
 *   hasStyle: boolean, hasCvSections: boolean, cvTemplate: string|null, candidateName: string|null,
 *   candidateSlug: string|null, location: string|null}}
 */
export function readProfile({ root }) {
  const path = profilePath(root);
  const base = {
    exists: false,
    path,
    yaml: null,
    doc: null,
    error: null,
    language: null,
    modesDir: null,
    spendTier: null,
    autoPdfThreshold: DEFAULT_AUTO_PDF_THRESHOLD,
    hasStyle: false,
    hasCvSections: false,
    cvTemplate: null,
    candidateName: null,
    candidateSlug: null,
    location: null,
  };
  if (!existsSync(path)) return base;

  let text;
  try {
    text = readFileSync(path, 'utf-8');
  } catch (error) {
    return { ...base, error: error.message };
  }

  let doc;
  try {
    doc = yaml.load(text, { schema: yaml.JSON_SCHEMA });
  } catch (error) {
    return { ...base, exists: true, yaml: text, error: `profile.yml does not parse: ${error.message}` };
  }
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) {
    return { ...base, exists: true, yaml: text, error: 'profile.yml is not a mapping' };
  }

  const threshold = Number(doc.cv?.auto_pdf_score_threshold);
  const name = doc.candidate?.name ?? doc.name ?? null;
  const location = doc.location?.current ?? doc.location?.city ?? doc.candidate?.location ?? null;
  return {
    ...base,
    exists: true,
    yaml: text,
    doc,
    language: typeof doc.language?.output === 'string' ? doc.language.output : null,
    modesDir: typeof doc.language?.modes_dir === 'string' ? doc.language.modes_dir : null,
    spendTier: typeof doc.spend_tier === 'string' ? doc.spend_tier : null,
    autoPdfThreshold: Number.isFinite(threshold) ? threshold : DEFAULT_AUTO_PDF_THRESHOLD,
    hasStyle: doc.style !== undefined && doc.style !== null,
    hasCvSections: Array.isArray(doc.cv?.sections) && doc.cv.sections.length > 0,
    cvTemplate: typeof doc.cv?.template === 'string' ? doc.cv.template : null,
    candidateName: typeof name === 'string' ? name : null,
    candidateSlug: typeof name === 'string' ? kebab(name) || null : null,
    location: typeof location === 'string' ? location : null,
  };
}
