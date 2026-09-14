/**
 * scanner.js — how to invoke `scan.mjs`, and how to read what it left behind.
 *
 * Part of the service seam (PROJECT_PLAN.md §4). The scanner is upstream code we
 * never edit, so everything the console knows about its command line and its
 * output lives here.
 *
 * Two things about scan.mjs shape this module:
 *
 * 1. **It reports no per-portal progress.** The fetch sweep runs every provider
 *    concurrently (`parallelFetch(tasks, CONCURRENCY=10)`) and prints nothing
 *    until it is done — one opening line, a long silence, then a summary block.
 *    The only counted phase is `--verify`, which announces how many offers it is
 *    about to check and then prints exactly one line per offer. `parseProgress`
 *    exists to pick that up; there is deliberately no attempt to fake a
 *    percentage for the silent phase.
 *
 * 2. **Its summary block is not a stable format.** Each `Filtered by …` line is
 *    printed only when the matching filter is configured or non-zero, and the
 *    labels are not all the same width. Regexing it would break the first time
 *    the user adds a filter. `data/scan-runs.tsv` carries the same numbers as
 *    named columns, so the structured result is read from there instead.
 */

import { readFileSync } from 'node:fs';

import { portalHealthPath, scanRunsPath } from './paths.js';

/** `Verifying liveness of 47 new offer(s) with Playwright (sequential)...` */
const VERIFY_HEADER_RE = /^Verifying liveness of (\d+) new offer\(s\)/;

/**
 * One verify verdict: `  {icon} {result padded to 9} {company} | {title}` for a
 * pass, and `  {icon} {label}  {company} | {title} ({reason})` for the rest.
 * Both collapse to the same shape once the icon and label are split off.
 */
const VERIFY_LINE_RE = /^ {2}(\S+)\s+(active|uncertain|expired|invalid|no-apply|migrated)\s+(.+?)\s\|\s(.+?)(?:\s\((.+)\))?$/;

/** `  + GitLab | AI Engineer | Remote, US` in the closing "New offers:" list. */
const NEW_OFFER_RE = /^ {2}\+ (.+?) \| (.+?) \| (.+?)(?: \[Trust: .*)?$/;

/**
 * Build scan.mjs's argv from a validated option set.
 *
 * This is the security boundary for the "Scan now" button: the browser chooses
 * from a fixed vocabulary and every value is re-derived here. Nothing the client
 * sends is ever concatenated into a command — `company` becomes its own argv
 * element and the process is spawned without a shell.
 *
 * @param {{dryRun?: boolean, verify?: boolean, company?: string, since?: number|string}} [options]
 * @returns {string[]} Arguments for `scan.mjs`.
 * @throws {TypeError} On a value upstream would reject.
 */
export function scanArgs(options = {}) {
  const args = [];
  if (options.dryRun) args.push('--dry-run');
  if (options.verify) args.push('--verify');

  if (options.company !== undefined && options.company !== null && options.company !== '') {
    const company = String(options.company).trim();
    if (!company) throw new TypeError('company filter is empty');
    // scan.mjs treats this as a case-insensitive substring match on entry names.
    // A newline would let one argv element look like two in a log.
    if (/[\r\n]/.test(company)) throw new TypeError('company filter must be a single line');
    args.push('--company', company);
  }

  if (options.since !== undefined && options.since !== null && options.since !== '') {
    const since = Number(options.since);
    if (!Number.isInteger(since) || since < 1) throw new TypeError('since must be a positive whole number of days');
    args.push('--since', String(since));
  }

  return args;
}

/**
 * Read one line of scan output for anything that moves a progress indicator.
 *
 * @param {string} line
 * @returns {{type: string}&object|null} A progress event, or null for ordinary log output.
 */
export function parseProgress(line) {
  const header = VERIFY_HEADER_RE.exec(line);
  if (header) return { type: 'verify-start', total: Number(header[1]) };

  const verdict = VERIFY_LINE_RE.exec(line);
  if (verdict) {
    return {
      type: 'verify-result',
      icon: verdict[1],
      result: verdict[2],
      company: verdict[3],
      title: verdict[4],
      reason: verdict[5] ?? null,
    };
  }

  const offer = NEW_OFFER_RE.exec(line);
  if (offer) return { type: 'offer', company: offer[1], title: offer[2], location: offer[3] };

  if (line.startsWith('Scanning ')) return { type: 'sweep-start', message: line };
  return null;
}

/**
 * Parse a TSV whose first line is a header row.
 *
 * Upstream appends columns to these files over time and older rows are simply
 * short, so missing cells read as null and any cell past the header is ignored
 * rather than shifting the ones before it.
 *
 * @returns {object[]} One object per data row.
 */
function readTsv(path) {
  let text;
  try {
    text = readFileSync(path, 'utf-8');
  } catch {
    return [];
  }
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '');
  if (lines.length < 2) return [];
  const header = lines[0].split('\t');
  return lines.slice(1).map((line) => {
    const cells = line.split('\t');
    return Object.fromEntries(header.map((key, i) => [key, cells[i] ?? null]));
  });
}

/** Columns of `scan-runs.tsv` that are counts rather than text. */
const NUMERIC_RUN_COLUMNS = /^(companies|boards|found|dupes|new_added|errors|filtered_.*)$/;

/**
 * The most recent row of `data/scan-runs.tsv`.
 *
 * This is the structured result of a scan: `status` is `completed` or `failed`,
 * and the rest are counts. Reading it is how the UI reports what a run did
 * without parsing the human summary block.
 *
 * @param {{root?: string}} [options]
 * @returns {object|null}
 */
export function readLastScanRun({ root } = {}) {
  const rows = readTsv(scanRunsPath(root));
  const last = rows.at(-1);
  if (!last) return null;
  return Object.fromEntries(
    Object.entries(last).map(([key, value]) => [
      key,
      NUMERIC_RUN_COLUMNS.test(key) && value !== null && value !== '' ? Number(value) : value,
    ]),
  );
}

/**
 * The latest health verdict per company from `data/portal-health.tsv`.
 *
 * One row is appended per target per run, so the file is a history; the Sources
 * page wants only the current state.
 *
 * @param {{root?: string}} [options]
 * @returns {Record<string, {status: string, timestamp: string}>}
 */
export function readPortalHealth({ root } = {}) {
  const health = {};
  for (const row of readTsv(portalHealthPath(root))) {
    if (!row.company) continue;
    health[row.company] = { status: row.status, timestamp: row.timestamp };
  }
  return health;
}
