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
 * - Only scripts that validate their own flags are exposed to the browser.
 *   `merge-tracker.mjs` reads flags with a bare `process.argv.includes`, so a
 *   mistyped `--dry-run` there runs live and writes; it is listed only as an
 *   `internal` kind that the server itself queues after an evaluation, with an
 *   argv pinned to `[]`, and `buildSpec()` refuses it from a request.
 *   `queue/specs.test.js` pins the exact argv of everything here so a typo
 *   cannot reach one of them by accident.
 *
 * M3 adds two more shapes to the table:
 * - Agent kinds (`evaluate`, `pdf`, `cover`) have no `script`; a `build`
 *   function in `agent-specs.js` produces the whole spec, hooks included.
 * - `lane` and `exclusive` tell the queue how a kind may overlap with others.
 */

import { parseProgress, scanArgs } from '../services/scanner.js';
import { parseFetchProgress } from '../skills/cli.js';
import { buildSkillsCvSpec, buildSkillsExtractSpec } from '../skills/extract-spec.js';
import { buildCoverSpec, buildEvaluateSpec, buildPdfSpec } from './agent-specs.js';

/** Argv for the skills fetch worker (`skills/cli.js`): only flags it validates itself. */
function skillsFetchArgs(options = {}) {
  const args = ['fetch'];
  if (options.retryFailed === true) args.push('--retry-failed');
  if (options.limit !== undefined && options.limit !== null && options.limit !== '') {
    const limit = Number(options.limit);
    if (!Number.isInteger(limit) || limit < 1) throw new TypeError('limit must be a positive whole number');
    args.push('--limit', String(limit));
  }
  return args;
}

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
 * @property {'script'|'agent'} [lane] - Queue lane; `script` (serialized) unless set.
 * @property {boolean} [exclusive] - Runs only when nothing else does.
 * @property {boolean} [internal] - Queued by the server after another run; never from a request.
 * @property {Function} [build] - Agent kinds: `(options, ctx) => spec`, replacing `script`/`args`.
 * @property {string} [page] - The UI page that owns this kind's button; unset means the Maintenance bar.
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
    // New postings mean new text to read for the skills analysis (M4). Only a
    // real scan chains it: a dry run added nothing to the inbox.
    after: (run) => (run.dryRun ? {} : { next: ['skills-fetch-auto'] }),
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

  // ── the skills layer (M4) ───────────────────────────────────────────
  'skills-fetch': {
    script: 'app/server/skills/cli.js',
    label: 'Fetch posting text',
    description: 'Read the text of every scanned posting that has not been read yet, for the skills analysis.',
    help:
      'The scanner only records that a posting exists; the Skills page needs what it says. This reads each posting once — through the board’s public API when it is a Greenhouse, Lever, Ashby, Workday or LinkedIn posting, otherwise through upstream’s headless browser reader — and caches the text under data/skills/. Postings already read are skipped; a failed read is retried after a week (a removed posting after a month), or now with “retry failed”. Runs on its own after every real scan. Network only; writes nothing upstream reads.',
    writes: true,
    confirmRequired: false,
    supportsDryRun: false,
    page: 'skills',
    args: (options) => skillsFetchArgs(options),
    parseProgress: parseFetchProgress,
  },

  // ── agent kinds (headless Claude Code sessions) ─────────────────────
  evaluate: {
    label: 'Evaluate posting',
    description: 'Run the A–G evaluation on a job URL and add it to the tracker.',
    help:
      'Starts a headless Claude Code session that reads your cv.md and profile, fetches the posting, writes the full A–G report to reports/, and adds a tracker row — the same thing `/career-ops oferta` does in a terminal, without the terminal. The report number is reserved before the session starts and released when it ends. After a successful report the console merges the tracker row and moves the URL out of the inbox by running upstream’s own scripts, and queues a tailored PDF when the score reaches your profile’s auto_pdf_score_threshold. Nothing is ever submitted anywhere.',
    writes: true,
    confirmRequired: false,
    supportsDryRun: false,
    lane: 'agent',
    build: buildEvaluateSpec,
  },
  pdf: {
    label: 'Generate PDF',
    description: 'Tailor the CV to an evaluated posting and render it as a PDF.',
    help:
      'Starts a headless Claude Code session that follows `modes/pdf.md`: it reads the report and your cv.md, tailors the content (keywords injected, nothing invented — the fact gate runs before rendering), builds the HTML with the template chosen in CV Studio, and renders the PDF through upstream’s renderer with your style tokens applied. The result appears in the report’s PDF tab and in data/pdf-index.tsv.',
    writes: true,
    confirmRequired: false,
    supportsDryRun: false,
    lane: 'agent',
    build: buildPdfSpec,
  },
  cover: {
    label: 'Cover letter',
    description: 'Draft a cover letter from the report and your answers, and render it as a PDF.',
    help:
      'Starts a headless Claude Code session that follows `modes/cover.md` in slug mode, starting from the report’s Cover Letter Draft. The four questions the mode always asks (why this role, what problem you would solve, how you would approach it, tone) are answered by you in the form before the run, so the session never has to guess. The PDF lands in output/ and is linked from the report.',
    writes: true,
    confirmRequired: false,
    supportsDryRun: false,
    lane: 'agent',
    build: buildCoverSpec,
  },

  'skills-extract': {
    label: 'Extract skills',
    description: 'Read a batch of cached postings in a Claude session and record the skills each one asks for.',
    help:
      'Starts a headless Claude Code session over up to ten postings whose text the console has already fetched. The session may only read the batch file and write one JSON file; the console validates that file, folds spellings onto canonical names, and caches the result by the text’s hash — a posting is never sent twice. Until this runs, a posting’s skills come from the rules-based pass, which knows the common vocabulary but not required vs nice-to-have as well. Queued from the Skills page, one run per batch.',
    writes: true,
    confirmRequired: false,
    supportsDryRun: false,
    lane: 'agent',
    page: 'skills',
    build: buildSkillsExtractSpec,
  },
  'skills-cv': {
    label: 'Extract CV skills',
    description: 'Read cv.md in a Claude session and record each skill it evidences, with a depth.',
    help:
      'Starts a headless Claude Code session over cv.md and profile.yml that lists every skill they evidence with a depth (expert, solid, basic). The Skills page uses it to tell “have” from “deepen”. Cached against cv.md’s content, so it re-runs only after the CV changes; until then, or when it has never run, the rules-based pass reads the CV instead.',
    writes: true,
    confirmRequired: false,
    supportsDryRun: false,
    lane: 'agent',
    page: 'skills',
    build: buildSkillsCvSpec,
  },

  // ── internal post-steps (queued by the server, never by a request) ──
  'merge-tracker': {
    script: 'merge-tracker.mjs',
    label: 'Merge tracker additions',
    description: 'Fold batch/tracker-additions/*.tsv into applications.md.',
    writes: true,
    confirmRequired: false,
    supportsDryRun: false,
    exclusive: true,
    internal: true,
    args: () => [],
    // The tracker is updated; now the inbox can learn the URL was processed.
    after: () => ({ next: ['reconcile-auto'] }),
  },
  'reconcile-auto': {
    script: 'reconcile-pipeline.mjs',
    label: 'Reconcile inbox',
    description: 'Move evaluated URLs out of the inbox’s Pending section.',
    writes: true,
    confirmRequired: false,
    supportsDryRun: false,
    exclusive: true,
    internal: true,
    args: () => [],
  },
  'skills-fetch-auto': {
    script: 'app/server/skills/cli.js',
    label: 'Fetch posting text',
    description: 'Read the text of newly scanned postings for the skills analysis.',
    writes: true,
    confirmRequired: false,
    supportsDryRun: false,
    internal: true,
    args: () => ['fetch'],
    parseProgress: parseFetchProgress,
  },
  'mark-pdf-ready': {
    script: 'mark-pdf-ready.mjs',
    label: 'Mark PDF ready',
    description: 'Flip the tracker row’s PDF column to ✅ after a render.',
    writes: true,
    confirmRequired: false,
    supportsDryRun: false,
    exclusive: true,
    internal: true,
    args: ({ reportNum }) => {
      if (!/^\d{1,6}$/.test(String(reportNum ?? ''))) throw new TypeError('reportNum must be a report number');
      return [String(reportNum)];
    },
  },
});

/** A rejected run request. */
export class SpecError extends Error {
  constructor(message, { code, status = 400, detail } = {}) {
    super(message);
    this.name = 'SpecError';
    this.code = code;
    this.status = status;
    this.detail = detail;
  }
}

/** The kinds the UI lists, without the argv builders. */
export function describeKinds() {
  return Object.entries(RUN_KINDS)
    .filter(([, def]) => def.internal !== true)
    .map(([kind, def]) => ({
      kind,
      label: def.label,
      description: def.description,
      help: def.help ?? null,
      writes: def.writes,
      confirmRequired: def.confirmRequired,
      supportsDryRun: def.supportsDryRun,
      reportsFindings: def.reportsFindings === true,
      lane: def.lane ?? 'script',
      page: def.page ?? null,
    }));
}

/**
 * Turn a request into a runnable spec.
 *
 * @param {string} kind - A key of RUN_KINDS.
 * @param {object} [options] - Kind-specific options; `dryRun` is understood by all.
 * @param {{root?: string, repoRoot?: string, agent?: object, internal?: boolean}} [ctx] -
 *   What agent kinds need to build themselves; `internal: true` is the server
 *   vouching that this is a post-step, not a request from the browser.
 * @returns {{kind: string, script?: string, label: string, args: string[], dryRun: boolean,
 *            writes: boolean, confirmRequired: boolean, lane: string, exclusive: boolean,
 *            parseProgress?: Function, hooks?: object}}
 * @throws {SpecError}
 */
export function buildSpec(kind, options = {}, ctx = {}) {
  const def = RUN_KINDS[kind];
  // An internal kind is "unknown" to a request: the browser gets no hint that
  // merge-tracker exists, let alone a way to run it.
  if (!def || (def.internal && ctx.internal !== true)) throw new SpecError(`Unknown run "${kind}"`, { code: 'kind-unknown' });
  if (options === null || typeof options !== 'object' || Array.isArray(options)) {
    throw new SpecError('Run options must be an object', { code: 'options-invalid' });
  }
  if (def.build) return def.build(options, ctx);

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
    lane: def.lane ?? 'script',
    exclusive: def.exclusive === true,
    parseProgress: def.parseProgress,
    ...(def.after
      ? {
          hooks: {
            after: (run, hookCtx) => {
              if (hookCtx.provisional.status !== 'succeeded') return {};
              const outcome = def.after(run, hookCtx);
              // Post-steps name the next kind; the spec is built here so the
              // table stays declarative.
              return { ...outcome, next: (outcome.next ?? []).map((k) => internalSpec(k, ctx)) };
            },
          },
        }
      : {}),
  };
}

/** Build a server-queued post-step. Not reachable from a request. */
export function internalSpec(kind, ctx = {}, options = {}) {
  return buildSpec(kind, options, { ...ctx, internal: true });
}
