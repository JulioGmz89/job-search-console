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

/**
 * Absolute path to `portals.yml`, the scanner's configuration.
 *
 * Upstream honours `CAREER_OPS_PORTALS` in scan.mjs, fix-slugs.mjs and
 * validate-portals.mjs alike, so the console has to as well: if the UI edited
 * one file while the scan it launches read another, every change would look
 * silently ignored.
 *
 * An explicit `root` still wins, matching resolveDataRoot's contract — tests
 * point at a fixture directory without mutating process.env, which would leak
 * across the test files `node --test` runs in parallel.
 *
 * @param {string} [root] - Data root; omit to use upstream resolution.
 * @returns {string} Absolute path to portals.yml.
 */
export function portalsPath(root) {
  if (!root && process.env.CAREER_OPS_PORTALS) return resolve(process.env.CAREER_OPS_PORTALS);
  return join(resolveDataRoot(root), 'portals.yml');
}

/** @param {string} [root] @returns {string} Absolute path to `data/pipeline.md`, the URL inbox. */
export function inboxPath(root) {
  if (!root && process.env.CAREER_OPS_PIPELINE) return resolve(process.env.CAREER_OPS_PIPELINE);
  return join(resolveDataRoot(root), 'data', 'pipeline.md');
}

/**
 * The two scan bookkeeping files, which are anchored differently from every
 * other data file.
 *
 * `scan.mjs` builds most of its paths from `getCareerOpsRoot()`, but these two
 * are bare relative constants — `const SCAN_RUNS_PATH = 'data/scan-runs.tsv'`
 * and `const PORTAL_HEALTH_PATH = 'data/portal-health.tsv'` (scan.mjs:2037,
 * 2110). A relative path resolves against the process's working directory, so
 * they land wherever the scan was *launched from*, not under the data root.
 *
 * The console launches scans with `cwd: repoRoot` (queue/runner.js), so that is
 * where they are, and that is where these read from. Resolving them under the
 * data root instead would look right and work fine in the usual setup where the
 * two are the same directory — and then silently report "never scanned" for
 * every source the moment anyone points CAREER_OPS_ROOT somewhere else.
 *
 * An explicit `root` still wins, so tests can supply fixtures.
 */
function scanBookkeepingDir(root) {
  return root ? resolveDataRoot(root) : repoRoot;
}

/** @param {string} [root] @returns {string} Absolute path to `data/scan-runs.tsv`. */
export function scanRunsPath(root) {
  return join(scanBookkeepingDir(root), 'data', 'scan-runs.tsv');
}

/** @param {string} [root] @returns {string} Absolute path to `data/portal-health.tsv`. */
export function portalHealthPath(root) {
  return join(scanBookkeepingDir(root), 'data', 'portal-health.tsv');
}

/**
 * The provider ids upstream can actually resolve, derived from `providers/`.
 *
 * validate-portals.mjs derives its own list the same way (every `*.mjs` not
 * prefixed with `_`), so a provider the user picks in the UI is one upstream
 * will accept. Providers live in the system layer next to the code, so this
 * reads from the repo root rather than the data root.
 *
 * @returns {string[]} Sorted provider ids.
 */
export function listProviderIds() {
  const { readdirSync } = require('node:fs');
  try {
    return readdirSync(join(repoRoot, 'providers'))
      .filter((f) => f.endsWith('.mjs') && !f.startsWith('_'))
      .map((f) => f.slice(0, -4))
      .sort();
  } catch {
    return [];
  }
}
