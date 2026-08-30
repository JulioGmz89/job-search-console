/**
 * Path resolution and containment guards for the service seam.
 *
 * PROJECT_PLAN.md §4: `app/server/services/` is the ONLY place that knows where
 * upstream's files live. Every other module asks this one.
 *
 * Two upstream modules are imported rather than reimplemented — they are in the
 * mergeable partition (§4) so we never edit them, but importing is exactly what
 * the seam is for:
 *   - path-resolver.mjs  honours CAREER_OPS_ROOT / CAREER_OPS_DATA_DIR /
 *                        .career-ops-data / CAREER_OPS_TRACKER, which is what
 *                        makes "point it at any populated career-ops directory"
 *                        (§8 M1 acceptance) work at all.
 *   - tracker-utils.mjs  ships `pathIsInsideCanonical`, which checks containment
 *                        both lexically and after resolving symlinks. A third
 *                        copy of that check is precisely what its own docblock
 *                        asks future callers not to write.
 */

import { createRequire } from 'node:module';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getCareerOpsRoot, resolveTrackerPath } from '../../../path-resolver.mjs';
import { pathIsInsideCanonical } from '../../../tracker-utils.mjs';

const require = createRequire(import.meta.url);

/** Repository root — two levels above `app/server/services/`. */
export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

/**
 * Resolve the data root holding cv.md, data/, reports/ and output/.
 *
 * An explicit `root` wins so tests can point at a fixture directory without
 * mutating process.env (which would leak across concurrent `node --test` files).
 * Otherwise upstream's own precedence chain applies.
 *
 * @param {string} [root] - Explicit data root; omit to use upstream resolution.
 * @returns {string} Absolute path to the data root.
 */
export function resolveDataRoot(root) {
  return root ? resolve(root) : getCareerOpsRoot();
}

/**
 * Absolute path to the applications tracker.
 *
 * NOTE: this is `data/applications.md`, NOT `data/pipeline.md`. PROJECT_PLAN.md
 * §8 names the latter, but DATA_CONTRACT.md is clear that pipeline.md is the
 * URL *inbox* (populated by scanning, which is M2) while applications.md is the
 * application tracker the dashboard exists to show.
 *
 * @param {string} [root] - Data root; omit to use upstream resolution.
 * @returns {string} Canonical absolute path to the tracker file.
 */
export function trackerPath(root) {
  return resolveTrackerPath(resolveDataRoot(root));
}

/** @param {string} [root] @returns {string} Absolute path to `reports/`. */
export function reportsDir(root) {
  return join(resolveDataRoot(root), 'reports');
}

/** @param {string} [root] @returns {string} Absolute path to `output/`. */
export function outputDir(root) {
  return join(resolveDataRoot(root), 'output');
}

/** @param {string} [root] @returns {string} Absolute path to `data/pdf-index.tsv`. */
export function pdfIndexPath(root) {
  return join(resolveDataRoot(root), 'data', 'pdf-index.tsv');
}

/**
 * Resolve a path that came out of a data file, refusing anything that escapes
 * its directory.
 *
 * Report ids and PDF paths are read from `applications.md` and `pdf-index.tsv`.
 * Those are user-owned files, but they are populated from scraped job postings,
 * so a `../../.ssh/id_rsa` in a PDF cell must not become a served file. Absolute
 * paths are refused outright: a legitimate entry is always repo-relative.
 *
 * @param {string} candidate - Untrusted relative path.
 * @param {string} baseDir - Directory the result must stay inside.
 * @returns {string|null} Absolute path, or null when it escapes or is absolute.
 */
export function safeResolve(candidate, baseDir) {
  if (typeof candidate !== 'string' || candidate === '') return null;
  if (candidate.includes('\0')) return null;
  if (isAbsolute(candidate)) return null;
  const full = resolve(baseDir, candidate);
  return pathIsInsideCanonical(full, baseDir) ? full : null;
}

/**
 * The canonical application states, read from upstream's `templates/states.yml`.
 *
 * That file calls itself the source of truth for "career-ops (writer) and
 * dashboard (reader)" — this dashboard is a reader, so it reads the file rather
 * than hardcoding the labels it happens to see in one user's tracker. Today's
 * live tracker only uses three of the ten states; a hardcoded list would break
 * the first time a status moves to Interview.
 *
 * States live in the system layer next to the code, so this reads from the repo
 * root, not the data root.
 *
 * @returns {{byAlias: Map<string,object>, states: object[]}}
 */
export function loadStates() {
  const yaml = require('js-yaml');
  const { readFileSync } = require('node:fs');
  const doc = yaml.load(readFileSync(join(repoRoot, 'templates', 'states.yml'), 'utf-8'), {
    schema: yaml.JSON_SCHEMA,
  });
  const states = Array.isArray(doc?.states) ? doc.states : [];
  const byAlias = new Map();
  for (const state of states) {
    const keys = [state.id, state.label, ...(state.aliases ?? [])];
    for (const key of keys) {
      if (typeof key === 'string') byAlias.set(key.toLowerCase(), state);
    }
  }
  return { states, byAlias };
}
