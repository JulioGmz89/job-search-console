/**
 * specs.js — the allowlist of things the console may run.
 *
 * This is the security boundary of M2. The browser never names a command, a
 * script path, or an argv array: it names a *kind* from this table plus a narrow
 * option set, and every argument is rebuilt here from constants. A route that
 * accepted a command string would turn a local dashboard into a remote shell for
 * anything that can reach 127.0.0.1.
 *
 * Two properties of the table matter beyond that:
 *
 * - `confirmRequired` marks the scripts that rewrite the user's tracker. Those
 *   can only run after a successful dry run of the same kind (see
 *   `runner.consumeConfirmation`), so nothing rewrites `applications.md` before
 *   the user has read what it would do.
 * - Only scripts that validate their own flags are listed. `merge-tracker.mjs`
 *   and `normalize-statuses.mjs` read flags with a bare `process.argv.includes`,
 *   so a mistyped `--dry-run` there runs live and writes; they are deliberately
 *   absent, and `queue/specs.test.js` pins the exact argv of everything that is
 *   here so a typo cannot reach one of them by accident.
 */

import { parseProgress, scanArgs } from '../services/scanner.js';

/**
 * @typedef {object} RunKind
 * @property {string} script - Filename at the repository root.
 * @property {string} label - What the UI calls this run.
 * @property {string} description - One line, for the button's tooltip.
 * @property {string} [help] - A paragraph for the UI's help panel: what it changes,
 *   when to use it, and how to read its result. The UI never hardcodes this text;
 *   the spec that runs the script is the one place that describes it.
 * @property {boolean} writes - True when a real run modifies user files.
 * @property {boolean} confirmRequired - True when a real run needs a prior dry run.
 * @property {boolean} [reportsFindings] - True when a non-zero exit means the check
 *   found problems rather than that the check itself broke.
 * @property {boolean} supportsDryRun
 */
export const RUN_KINDS = Object.freeze({
  scan: {
    script: 'scan.mjs',
    label: 'Scan portals',
    description: 'Fetch new postings from every enabled source into the inbox.',
    writes: true,
    // Scanning only appends to the inbox and the history TSVs; it never rewrites
    // an existing row. Gating the milestone's primary action behind a dry run
    // every time would be friction without a matching risk.
    confirmRequired: false,
    supportsDryRun: true,
    args: (options) => scanArgs(options),
    parseProgress,
  },
  dedup: {
    script: 'dedup-tracker.mjs',
    label: 'Dedup tracker',
    description: 'Merge duplicate rows in applications.md, keeping the best score and furthest status.',
    help:
      'The same job can be evaluated twice — found again under a different URL, re-listed by an agency, or pasted after it was already scanned — leaving two rows for one application. Dedup groups rows by company and a fuzzy role match and merges each group into one, keeping the higher score, the most advanced status (Applied beats Evaluated) and every note. Rewrites data/applications.md and saves the previous version as applications.md.bak.',
    writes: true,
    confirmRequired: true,
    supportsDryRun: true,
    args: ({ dryRun }) => (dryRun ? ['--dry-run'] : []),
  },
  reconcile: {
    script: 'reconcile-pipeline.mjs',
    label: 'Reconcile inbox',
    description: 'Move already-evaluated URLs out of the inbox’s Pending section.',
    help:
      'Evaluated URLs are supposed to move from the inbox’s Pending section to Processed, and the two drift when an evaluation runs but the inbox is not updated. Reconcile moves them so the inbox count reflects what is actually still waiting. Rewrites data/pipeline.md.',
    writes: true,
    confirmRequired: true,
    supportsDryRun: true,
    args: ({ dryRun }) => (dryRun ? ['--dry-run'] : []),
  },
  'verify-pipeline': {
    script: 'verify-pipeline.mjs',
    label: 'Check integrity',
    description: 'Run every tracker integrity check. Reads only.',
    help:
      'Thirteen consistency checks over the tracker: every status is a canonical one, no duplicate company+role, every report link points at a file that exists, scores are well-formed, no row number is reused, and more. Reports what it finds and changes nothing — “Found problems” means the tracker needs a fix by hand, not that the check broke.',
    writes: false,
    confirmRequired: false,
    supportsDryRun: false,
    // Exits non-zero when it FINDS something, which is the check working.
    reportsFindings: true,
    args: () => [],
  },
  'validate-portals': {
    script: 'validate-portals.mjs',
    label: 'Validate sources',
    description: 'Check portals.yml against the scanner’s schema. Reads only.',
    help:
      'Checks portals.yml against the scanner’s schema: unknown provider ids, entries without a name, malformed URLs, duplicate names. The console already runs this before saving any edit made here; run it by hand after editing the file directly. Changes nothing.',
    writes: false,
    confirmRequired: false,
    supportsDryRun: false,
    // Exits non-zero when it FINDS something, which is the check working.
    reportsFindings: true,
    args: () => [],
  },
  'verify-portals': {
    script: 'verify-portals.mjs',
    label: 'Probe sources',
    description: 'Ask every tracked company’s ATS whether its board still exists. Reads only, but hits the network.',
    help:
      'Asks every provider-backed company’s job board whether it still exists, and suggests the corrected board when a company has moved ATS. Sources that use websearch have no board to ask and are reported as skipped — that is expected, not a failure. Hits the network; changes nothing.',
    writes: false,
    confirmRequired: false,
    supportsDryRun: false,
    // Exits non-zero when it FINDS something, which is the check working.
    reportsFindings: true,
    args: () => [],
  },
});

/** A rejected run request. */
export class SpecError extends Error {
  constructor(message, { code, status = 400 } = {}) {
    super(message);
    this.name = 'SpecError';
    this.code = code;
    this.status = status;
  }
}

/** The kinds the UI lists, without the argv builders. */
export function describeKinds() {
  return Object.entries(RUN_KINDS).map(([kind, def]) => ({
    kind,
    label: def.label,
    description: def.description,
    help: def.help ?? null,
    writes: def.writes,
    confirmRequired: def.confirmRequired,
    supportsDryRun: def.supportsDryRun,
    reportsFindings: def.reportsFindings === true,
  }));
}

/**
 * Turn a request into a runnable spec.
 *
 * @param {string} kind - A key of RUN_KINDS.
 * @param {object} [options] - Kind-specific options; `dryRun` is understood by all.
 * @returns {{kind: string, script: string, label: string, args: string[], dryRun: boolean,
 *            writes: boolean, confirmRequired: boolean, parseProgress?: Function}}
 * @throws {SpecError}
 */
export function buildSpec(kind, options = {}) {
  const def = RUN_KINDS[kind];
  if (!def) throw new SpecError(`Unknown run "${kind}"`, { code: 'kind-unknown' });
  if (options === null || typeof options !== 'object' || Array.isArray(options)) {
    throw new SpecError('Run options must be an object', { code: 'options-invalid' });
  }

  const dryRun = options.dryRun === true;
  if (dryRun && !def.supportsDryRun) {
    throw new SpecError(`${def.label} has no dry-run mode`, { code: 'dry-run-unsupported' });
  }

  let args;
  try {
    args = def.args({ ...options, dryRun });
  } catch (error) {
    // scanArgs throws TypeError on a value upstream would reject; that is a bad
    // request, not a server fault.
    throw new SpecError(error.message, { code: 'options-invalid' });
  }

  return {
    kind,
    script: def.script,
    label: def.label,
    args,
    dryRun,
    // A dry run writes nothing by definition, whatever the kind normally does.
    writes: def.writes && !dryRun,
    confirmRequired: def.confirmRequired && !dryRun,
    reportsFindings: def.reportsFindings === true,
    parseProgress: def.parseProgress,
  };
}
