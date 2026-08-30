/**
 * inbox.js — parses `data/pipeline.md`, the inbox of job URLs waiting to be
 * evaluated.
 *
 * Named `inbox`, not `pipeline`, on purpose. Upstream uses "pipeline" for two
 * different files and `services/pipeline.js` already means `data/applications.md`
 * (the application tracker). Inheriting that collision into the console would
 * make every later reference ambiguous, so the seam renames it once, here.
 *
 * Read-only. `scan.mjs` appends to this file under an advisory lock
 * (`pipeline-lock.mjs`); nothing in the console writes it, so nothing here takes
 * that lock. Anything that does write it in a later milestone must.
 *
 * Format is documented in `modes/pipeline.md` and produced by
 * `scan.mjs:formatPipelineOffer`.
 */

import { readFileSync } from 'node:fs';

import { inboxPath } from './paths.js';

/** Section headers. Upstream writes either language and readers must accept both. */
const PENDING_MARKERS = ['## Pending', '## Pendientes'];
const PROCESSED_MARKERS = ['## Processed', '## Procesadas'];

/** `- [ ]` pending, `- [x]` processed, `- [!]` errored. */
const ROW_RE = /^- \[([ xX!])\]\s*(.*)$/;

/** Labeled trailing segments, which ride after the positional cells in a stable order. */
const LABEL_RE = /^(posted|trust|note):\s*(.*)$/;

/** `#143` leading a processed row. */
const REPORT_NUM_RE = /^#(\d+)$/;

/** A score cell on a processed row, e.g. `3.4/5`. */
const SCORE_RE = /^(\d+(?:\.\d+)?)\/5$/;

/** `- [!] {url} — Error: login required` */
const ERROR_SUFFIX_RE = /\s+[—-]\s+Error:\s*(.+)$/;

/**
 * Split a row body into its positional cells and its labeled segments.
 *
 * The file has no escaping: `sanitizeMarkdownField` rewrites `|` to `/` before
 * the scanner writes a cell, so anything the scanner produced splits cleanly.
 * A hand-pasted line can still carry a literal `|` inside a title, which is
 * genuinely ambiguous — upstream's own reader silently truncates the role in
 * that case. We keep the extra cells in the title instead and report the row, so
 * the UI shows the whole title and the user can see which line to fix.
 */
function splitCells(body) {
  const cells = body.split('|').map((cell) => cell.trim());
  const positional = [];
  const labels = {};
  for (const cell of cells) {
    const label = LABEL_RE.exec(cell);
    if (label) labels[label[1]] = label[2];
    else positional.push(cell);
  }
  return { positional, labels };
}

/**
 * Parse one pending row.
 *
 * Positional contract (modes/pipeline.md): `url | company | title | location |
 * compensation`, where the 1-, 3-, 4- and 5-cell forms are all valid and a
 * present compensation forces a (possibly empty) location cell so comp stays in
 * column 5.
 */
function parsePending(body, line) {
  const { positional, labels } = splitCells(body);
  const issues = [];
  let cells = positional;

  if (cells.length > 5) {
    issues.push({
      level: 'warn',
      code: 'inbox-row-extra-cells',
      line,
      message: `Line ${line} has ${cells.length} cells; a "|" inside the title is being folded back in`,
    });
    // Which trailing cell is which is genuinely unknowable here, so pick the
    // reading that is right for the row this actually happens to: a pasted
    // posting whose title contains a pipe, with a location after it. A pasted
    // row that ALSO carries compensation would put it in `location` — rare
    // enough to be worth the whole title surviving, and the row is flagged.
    cells = [cells[0], cells[1], cells.slice(2, -1).join(' | '), cells.at(-1), null];
  }

  const [url = '', company = null, title = null, location = null, compensation = null] = cells;
  return {
    row: {
      url,
      company: company || null,
      title: title || null,
      location: location || null,
      compensation: compensation || null,
      posted: labels.posted ?? null,
      trust: labels.trust ?? null,
      note: labels.note ?? null,
      error: null,
      line,
    },
    issues,
  };
}

/**
 * Parse one processed row: `- [x] #143 | url | company | role | score | PDF ✅`.
 *
 * The report number and the PDF flag are what distinguish it from a pending row;
 * everything else is best-effort, since this section is history rather than
 * something the console acts on.
 */
function parseProcessed(body, line) {
  const { positional } = splitCells(body);
  const cells = [...positional];

  const numbered = REPORT_NUM_RE.exec(cells[0] ?? '');
  const reportId = numbered ? Number(numbered[1]) : null;
  if (numbered) cells.shift();

  const scoreIndex = cells.findIndex((cell) => SCORE_RE.test(cell));
  const score = scoreIndex === -1 ? null : Number(SCORE_RE.exec(cells[scoreIndex])[1]);

  return {
    reportId,
    url: cells[0] ?? null,
    company: cells[1] ?? null,
    role: cells[2] ?? null,
    score,
    hasPdf: body.includes('PDF ✅'),
    line,
  };
}

/**
 * Read the URL inbox.
 *
 * Never throws: a missing file is the normal first-run state (nothing has been
 * scanned yet) and reports as an `info` issue with empty lists, matching how
 * `pipeline.js` treats a missing tracker.
 *
 * @param {{root?: string}} [options]
 * @returns {{path: string, pending: object[], processed: object[], issues: object[]}}
 */
export function readInbox({ root } = {}) {
  const path = inboxPath(root);
  const issues = [];

  let text;
  try {
    text = readFileSync(path, 'utf-8');
  } catch (error) {
    issues.push({
      level: error.code === 'ENOENT' ? 'info' : 'error',
      code: error.code === 'ENOENT' ? 'inbox-missing' : 'inbox-unreadable',
      message:
        error.code === 'ENOENT'
          ? 'No pipeline.md yet — run a scan to fill the inbox.'
          : `Could not read the inbox: ${error.message}`,
    });
    return { path, pending: [], processed: [], issues };
  }

  const pending = [];
  const processed = [];
  let section = null;

  text.split(/\r?\n/).forEach((raw, index) => {
    const line = index + 1;
    const heading = raw.trim();
    if (heading.startsWith('## ')) {
      if (PENDING_MARKERS.includes(heading)) section = 'pending';
      else if (PROCESSED_MARKERS.includes(heading)) section = 'processed';
      else section = null;
      return;
    }

    const match = ROW_RE.exec(raw);
    if (!match) return;
    const [, mark, body] = match;

    // The marker is authoritative over the section it sits in: a `- [x]` left in
    // the Pending section is processed, and reconcile-pipeline.mjs exists
    // precisely because those two drift apart.
    if (mark === 'x' || mark === 'X') {
      processed.push(parseProcessed(body, line));
      return;
    }

    if (mark === '!') {
      const error = ERROR_SUFFIX_RE.exec(body);
      const parsed = parsePending(body.replace(ERROR_SUFFIX_RE, ''), line);
      issues.push(...parsed.issues);
      pending.push({ ...parsed.row, error: error ? error[1] : 'unspecified' });
      return;
    }

    if (section === 'processed') {
      processed.push(parseProcessed(body, line));
      return;
    }
    const parsed = parsePending(body, line);
    issues.push(...parsed.issues);
    pending.push(parsed.row);
  });

  return { path, pending, processed, issues };
}
