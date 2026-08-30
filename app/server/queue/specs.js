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
 * @property {string} description - What it does, shown before it is started.
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
    writes: true,
    confirmRequired: true,
    supportsDryRun: true,
    args: ({ dryRun }) => (dryRun ? ['--dry-run'] : []),
  },
  reconcile: {
    script: 'reconcile-pipeline.mjs',
    label: 'Reconcile inbox',
    description: 'Move already-evaluated URLs out of the inbox’s Pending section.',
    writes: true,
    confirmRequired: true,
    supportsDryRun: true,
    args: ({ dryRun }) => (dryRun ? ['--dry-run'] : []),
  },
  'verify-pipeline': {
    script: 'verify-pipeline.mjs',
    label: 'Check integrity',
    description: 'Run every tracker integrity check. Reads only.',
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
