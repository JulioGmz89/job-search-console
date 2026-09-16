/**
 * covers.js — where each report's cover letter PDF is.
 *
 * Upstream's `generate-pdf.mjs --report NNN` keeps one PDF per report in
 * `data/pdf-index.tsv` and drops the previous rows for that number — which is
 * right for a regenerated CV and wrong for a cover letter, which would evict
 * the CV from the dashboard's PDF tab. So cover letters are rendered without
 * `--report` and recorded here instead, in a fork-owned JSON file under
 * `data/jsc/` (gitignored with the rest of `data/`).
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { outputDir, resolveDataRoot, safeResolve } from './paths.js';

export function coversPath(root) {
  return join(resolveDataRoot(root), 'data', 'jsc', 'covers.json');
}

/** @returns {Object<string, {path: string, date: string}>} keyed by report id (no padding). */
export function readCovers({ root } = {}) {
  const path = coversPath(root);
  if (!existsSync(path)) return {};
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf-8'));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function recordCover({ root, reportId, path }) {
  const all = readCovers({ root });
  const key = String(Number.parseInt(reportId, 10));
  all[key] = { path: path.replace(/\\/g, '/'), date: new Date().toISOString().slice(0, 10) };
  const file = coversPath(root);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(all, null, 2)}\n`, 'utf-8');
  return all[key];
}

/**
 * The cover PDF for a report, if it exists on disk inside output/.
 *
 * @returns {{path: string, absolutePath: string, fileName: string, date: string}|null}
 */
export function resolveReportCover(id, { root } = {}) {
  const key = String(Number.parseInt(id, 10));
  const entry = readCovers({ root })[key];
  if (!entry?.path) return null;
  const relative = entry.path.replace(/^output\//, '');
  const absolutePath = safeResolve(relative, outputDir(root));
  if (!absolutePath || !existsSync(absolutePath)) return null;
  return { path: entry.path, absolutePath, fileName: relative.split('/').pop(), date: entry.date };
}
