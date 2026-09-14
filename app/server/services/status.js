/**
 * status.js — the console's write path into `data/applications.md`.
 *
 * It does not edit the tracker. It shells out to upstream's `set-status.mjs`,
 * which is the canonical writer for that file and already does everything a
 * correct write needs: it validates the state against `templates/states.yml`,
 * takes the shared tracker lock, replaces the file atomically, and appends the
 * transition to `data/status-log.tsv` so `funnel-velocity.mjs` can read it. It
 * even reserves `web` as a `--source` value for exactly this caller.
 *
 * That supersedes what M1 anticipated. `pipeline.js` keeps `rawLine`/`sourceLine`
 * on every row against a hand-editing write-back; delegating is strictly better,
 * because a second writer of a locked, shared markdown table is a race and a
 * format-drift bug waiting to happen. PROJECT_PLAN.md §9.4 requires anything we
 * write to round-trip through upstream's scripts — the surest way to satisfy
 * that is to let upstream's own script do the writing.
 *
 * The selector is always `--row`. Tracker row ids and report ids are separate
 * counters that diverge permanently once any row exists without a report, so a
 * bare numeric selector is ambiguous and trips set-status's own mismatch guard.
 * The dashboard's `row.id` is the tracker `#` column, which is what `--row`
 * means, so the ambiguity never arises and `--force` is never needed.
 */

import { execFile } from 'node:child_process';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { loadStates, repoRoot, trackerPath } from './paths.js';

const run = promisify(execFile);

/**
 * set-status.mjs's exit codes, mapped to what they mean over HTTP.
 *
 * 4 is `503` rather than `409` because it is transient: another writer holds the
 * tracker lock and the same request will succeed shortly.
 */
const EXIT_STATUS = Object.freeze({
  0: 200,
  1: 400,
  2: 404,
  3: 409,
  4: 503,
});

/** `YYYY-MM-DD`, the only date shape `--on` accepts. */
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** A refusal the route layer can map to a status code. */
export class StatusError extends Error {
  constructor(message, { code, status = 400, detail } = {}) {
    super(message);
    this.name = 'StatusError';
    this.code = code;
    this.status = status;
    if (detail !== undefined) this.detail = detail;
  }
}

/**
 * Build set-status.mjs's argv.
 *
 * Exported so a test can assert the exact command without spawning anything:
 * every element is derived here from validated input, and nothing the client
 * sends is ever concatenated into a string.
 *
 * @param {{rowId: number, label: string, note?: string, on?: string}} input
 * @returns {string[]}
 */
export function statusArgs({ rowId, label, note, on }) {
  const args = ['--row', String(rowId), label, '--source', 'web', '--json'];
  if (note) args.push('--note', note);
  if (on) args.push('--on', on);
  return args;
}

/**
 * Change one tracker row's status.
 *
 * @param {{rowId: number|string, statusId: string, note?: string, on?: string, root?: string}} input
 * @returns {Promise<object>} set-status.mjs's own JSON result.
 * @throws {StatusError}
 */
export async function setStatus({ rowId, statusId, note, on, root } = {}) {
  const id = Number(rowId);
  if (!Number.isInteger(id) || id < 1) {
    throw new StatusError('Row id must be a positive whole number', { code: 'row-invalid' });
  }

  // Resolve to the canonical label here rather than passing the id through.
  // set-status accepts aliases, but validating first means an unknown status is
  // a form error instead of a spawned process that exits 1.
  const { byAlias } = loadStates();
  const state = typeof statusId === 'string' ? byAlias.get(statusId.toLowerCase()) : undefined;
  if (!state) {
    throw new StatusError(`"${statusId}" is not a status in templates/states.yml`, { code: 'status-unknown' });
  }

  if (note !== undefined && note !== null && note !== '') {
    if (typeof note !== 'string' || /[\r\n]/.test(note)) {
      throw new StatusError('Note must be a single line of text', { code: 'note-invalid' });
    }
    // The Notes cell lives in a markdown table; a pipe would add a column.
    if (note.includes('|')) {
      throw new StatusError('Note cannot contain "|" — it would break the tracker table', { code: 'note-pipe' });
    }
  }

  if (on !== undefined && on !== null && on !== '' && !ISO_DATE_RE.test(on)) {
    throw new StatusError('Date must be YYYY-MM-DD', { code: 'date-invalid' });
  }

  const args = statusArgs({ rowId: id, label: state.label, note, on });

  let stdout;
  try {
    ({ stdout } = await run(process.execPath, [join(repoRoot, 'set-status.mjs'), ...args], {
      cwd: repoRoot,
      // The tracker path is pinned ALWAYS, not only when a root is passed in.
      //
      // set-status.mjs is the one upstream script that does not ask
      // path-resolver where the data root is: it resolves its target as
      // `resolveTrackerPath(CAREER_OPS)` with CAREER_OPS being the *script's own
      // directory* (set-status.mjs:263). dedup-tracker.mjs,
      // reconcile-pipeline.mjs and verify-pipeline.mjs all call
      // getCareerOpsRoot() and so honour CAREER_OPS_ROOT / .career-ops-data;
      // set-status does not, and only CAREER_OPS_TRACKER redirects it.
      //
      // Left alone, a user who points the console at a data directory outside
      // the repository gets a dashboard that READS that tracker and a status
      // button that WRITES the repository's own — silently, and to a file they
      // are not looking at. Passing the path the dashboard itself resolved makes
      // the reader and the writer agree in every configuration. set-status puts
      // status-log.tsv beside whatever file it resolves, so the ledger follows.
      env: { ...process.env, CAREER_OPS_TRACKER: trackerPath(root) },
      timeout: 30_000,
      maxBuffer: 1024 * 1024,
    }));
  } catch (error) {
    // With --json, set-status puts its failure payload on stdout for every exit
    // code, so the user gets its own words ("ambiguous company match", the
    // candidate list) rather than a generic message invented here.
    const payload = parseJson(error.stdout);
    throw new StatusError(payload?.error ?? error.message.trim(), {
      code: payload?.code ?? 'set-status-failed',
      status: EXIT_STATUS[error.code] ?? 500,
      detail: payload ?? undefined,
    });
  }

  const result = parseJson(stdout);
  if (!result) {
    throw new StatusError('set-status.mjs returned output that is not JSON', { code: 'set-status-unparseable', status: 500 });
  }
  return result;
}

/** @param {string|undefined} text @returns {object|null} */
function parseJson(text) {
  if (!text) return null;
  try {
    const value = JSON.parse(text);
    return value && typeof value === 'object' ? value : null;
  } catch {
    return null;
  }
}
