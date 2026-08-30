/**
 * reports.js — parses A–H evaluation reports and resolves their PDFs.
 *
 * Part of the service seam (PROJECT_PLAN.md §4).
 *
 * A report has three layers, and all three are worth surfacing separately:
 *   1. a header block of `**Key:** value` lines (Date, URL, Score, Legitimacy…)
 *   2. a `## Machine Summary` fenced YAML block — the structured payload, and
 *      by far the richest thing in the file. M4's skills gap will mine the same
 *      block, which is why it is parsed into real fields here rather than being
 *      left inside the rendered prose.
 *   3. the A–H prose sections, plus Keywords/Risk Summary/Cover Letter Draft.
 *
 * SECURITY: report prose is written by an agent reasoning over a job posting
 * scraped from the open web. It is untrusted input. This module is the single
 * choke point where it becomes HTML — the API never hands raw markdown to the
 * client, so there is exactly one place to audit. See `renderMarkdown` below.
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { basename, join, relative } from 'node:path';

import { outputDir, pdfIndexPath, reportsDir, safeResolve } from './paths.js';

const require = createRequire(import.meta.url);
const yaml = require('js-yaml');
const MarkdownIt = require('markdown-it');
const sanitizeHtml = require('sanitize-html');

/** Report filenames are `NNN-slug-YYYY-MM-DD.md`. The leading digits are the id. */
const REPORT_FILE_RE = /^(\d+)-(.+)\.md$/;

/** `**Key:** value` header lines. */
const HEADER_FIELD_RE = /^\*\*([A-Za-z][A-Za-z ]*?):\*\*\s*(.+)$/gm;

/** The Machine Summary block: an H2 followed by a fenced (usually ```yaml) block. */
const MACHINE_SUMMARY_RE = /^##\s*Machine Summary\s*$\n+```(?:yaml|yml)?\n([\s\S]*?)\n```/im;

const markdown = new MarkdownIt({ html: false, linkify: false, breaks: false });

/**
 * Render untrusted report markdown to safe HTML.
 *
 * Defence is layered because each layer fails differently:
 *   - `html: false` makes markdown-it escape raw HTML instead of passing it
 *     through, so `<script>` never becomes a tag in the first place.
 *   - `linkify: false` stops bare text being auto-promoted into anchors.
 *   - sanitize-html then enforces an allowlist over whatever did get generated,
 *     and restricts URL schemes so a `[click](javascript:…)` link — which
 *     markdown-it will happily render — cannot survive.
 *
 * @param {string} source - Untrusted markdown.
 * @returns {string} Sanitized HTML.
 */
export function renderMarkdown(source) {
  return sanitizeHtml(markdown.render(String(source ?? '')), {
    allowedTags: [
      'p', 'br', 'hr', 'blockquote', 'pre', 'code', 'span',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'dl', 'dt', 'dd',
      'strong', 'em', 'del', 'sup', 'sub',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'a',
    ],
    // `rel` and `target` must be allowlisted or sanitize-html strips them right
    // back off after transformTags adds them, silently making the transform a
    // no-op and leaving external links opening without noopener.
    allowedAttributes: { a: ['href', 'title', 'rel', 'target'], td: ['align'], th: ['align'] },
    allowedSchemes: ['http', 'https', 'mailto'],
    // Anything not on the allowlist loses its tag but keeps its text, so a
    // stripped element never silently deletes a sentence of the evaluation.
    disallowedTagsMode: 'discard',
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer', target: '_blank' }),
    },
  });
}

/**
 * Parse `data/pdf-index.tsv` into `reportId -> artifact`.
 *
 * Columns: `report \t pdf \t html \t format \t date`, with a leading `#` comment
 * line. Written by generate-pdf.mjs; the index — not a directory listing — is
 * the join key, so unindexed strays in output/ are correctly ignored.
 *
 * @param {string} [root] - Data root.
 * @returns {Map<number, object>}
 */
export function readPdfIndex(root) {
  const index = new Map();
  let source;
  try {
    source = readFileSync(pdfIndexPath(root), 'utf-8');
  } catch {
    return index; // No PDFs generated yet is a normal state, not an error.
  }

  const base = outputDir(root);
  for (const line of source.split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue;
    const [rawId, pdf, html, format, date] = line.split('\t');
    const id = Number.parseInt(rawId, 10);
    if (Number.isNaN(id)) continue;

    // pdf-index.tsv stores paths as `output/foo.pdf`, relative to the data root.
    const relativePdf = pdf?.replace(/^output[/\\]/, '') ?? '';
    const absolute = safeResolve(relativePdf, base);
    index.set(id, {
      reportId: id,
      path: pdf ?? null,
      absolutePath: absolute,
      exists: absolute ? existsSync(absolute) : false,
      html: html || null,
      format: format || null,
      date: date || null,
    });
  }
  return index;
}

/**
 * Map every report file on disk to its id.
 *
 * @param {string} [root] - Data root.
 * @returns {Map<number, string>} id → filename.
 */
export function indexReportFiles(root) {
  const dir = reportsDir(root);
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return new Map();
  }
  const files = new Map();
  for (const name of entries) {
    const match = REPORT_FILE_RE.exec(name);
    if (!match) continue;
    // Upstream reserves report numbers before writing them; a reserved
    // placeholder is not a real report.
    if (/-RESERVED\.md$/i.test(name)) continue;
    files.set(Number.parseInt(match[1], 10), name);
  }
  return files;
}

/**
 * Parse the header `**Key:** value` block into an object.
 *
 * Only the block above the first `##` heading is scanned: the same bold-label
 * syntax recurs inside prose sections ("**Gaps flagged:**"), and those belong to
 * their section, not to the report header.
 *
 * @param {string} source - Full report markdown.
 * @returns {Object<string,string>}
 */
function parseHeader(source) {
  const head = source.split(/^##\s/m)[0];
  const fields = {};
  for (const match of head.matchAll(HEADER_FIELD_RE)) {
    fields[match[1].trim().toLowerCase().replace(/\s+/g, '_')] = match[2].trim();
  }
  return fields;
}

/**
 * Extract and parse the Machine Summary YAML.
 *
 * JSON_SCHEMA, not the default: it accepts only plain JSON types, so untrusted
 * report content cannot reach js-yaml's richer type machinery. Failure returns
 * an issue rather than throwing — one malformed block must not make the whole
 * report unreadable, since the prose sections are still perfectly good.
 *
 * @param {string} source - Full report markdown.
 * @returns {{machine: object|null, issue: object|null}}
 */
function parseMachineSummary(source) {
  const match = MACHINE_SUMMARY_RE.exec(source);
  if (!match) return { machine: null, issue: { level: 'warn', code: 'machine-summary-missing' } };
  try {
    const doc = yaml.load(match[1], { schema: yaml.JSON_SCHEMA });
    if (doc === null || typeof doc !== 'object' || Array.isArray(doc)) {
      return { machine: null, issue: { level: 'warn', code: 'machine-summary-not-a-map' } };
    }
    return { machine: doc, issue: null };
  } catch (error) {
    return {
      machine: null,
      issue: { level: 'warn', code: 'machine-summary-invalid', message: error.message.split('\n')[0] },
    };
  }
}

/**
 * Split the report body into its `##` sections, preserving document order.
 *
 * The Machine Summary is dropped from the prose: it is returned as structured
 * data instead, and rendering the same YAML twice would just be noise.
 *
 * @param {string} source - Full report markdown.
 * @returns {Array<{title: string, markdown: string}>}
 */
function parseSections(source) {
  const sections = [];
  const pattern = /^##\s+(.+)$/gm;
  const heads = [...source.matchAll(pattern)];
  heads.forEach((head, i) => {
    const start = head.index + head[0].length;
    const end = i + 1 < heads.length ? heads[i + 1].index : source.length;
    const title = head[1].trim();
    if (/^Machine Summary$/i.test(title)) return;
    sections.push({ title, markdown: source.slice(start, end).trim() });
  });
  return sections;
}

/**
 * Read one report by id.
 *
 * @param {number|string} id - Report id.
 * @param {{root?: string, html?: boolean}} [options] - `html: false` skips
 *   rendering when only the structured fields are wanted (M4 will want this).
 * @returns {object|null} The report, or null when no such report exists.
 */
export function readReport(id, { root, html = true } = {}) {
  const numericId = Number.parseInt(id, 10);
  if (!Number.isInteger(numericId) || numericId < 0) return null;

  const file = indexReportFiles(root).get(numericId);
  if (!file) return null;

  const dir = reportsDir(root);
  // The filename comes from readdirSync so it cannot traverse, but it is routed
  // through the same guard as every other file-derived path — the guard being
  // unconditional is what keeps it correct when a caller changes.
  const absolute = safeResolve(basename(file), dir);
  if (!absolute) return null;

  const source = readFileSync(absolute, 'utf-8');
  const issues = [];
  const { machine, issue } = parseMachineSummary(source);
  if (issue) issues.push({ ...issue, reportId: numericId });

  const header = parseHeader(source);
  const sections = parseSections(source).map((section) => ({
    ...section,
    ...(html ? { html: renderMarkdown(section.markdown) } : {}),
  }));

  const pdf = readPdfIndex(root).get(numericId) ?? null;
  if (pdf && !pdf.exists) {
    issues.push({ level: 'warn', code: 'pdf-missing', reportId: numericId, path: pdf.path });
  }

  return {
    id: numericId,
    file: relative(root ? dir.replace(/reports$/, '') : dir, absolute).replace(/\\/g, '/'),
    fileName: file,
    modified: statSync(absolute).mtime.toISOString(),
    title: /^#\s+(.+)$/m.exec(source)?.[1]?.trim() ?? null,
    header,
    url: header.url ?? null,
    machine,
    sections,
    pdf: pdf ? { path: pdf.path, exists: pdf.exists, format: pdf.format, date: pdf.date } : null,
    issues,
  };
}

/**
 * Summarize every report on disk, without rendering any prose.
 *
 * This is the dashboard's join source: cheap enough to call per request, and it
 * carries the Machine Summary fields the pipeline table wants to show alongside
 * each tracker row.
 *
 * @param {{root?: string}} [options]
 * @returns {{reports: object[], issues: object[]}}
 */
export function listReports({ root } = {}) {
  const files = indexReportFiles(root);
  const pdfIndex = readPdfIndex(root);
  const dir = reportsDir(root);
  const reports = [];
  const issues = [];

  for (const [id, name] of [...files].sort((a, b) => a[0] - b[0])) {
    const absolute = safeResolve(name, dir);
    if (!absolute) continue;
    const source = readFileSync(absolute, 'utf-8');
    const { machine, issue } = parseMachineSummary(source);
    if (issue) issues.push({ ...issue, reportId: id });
    const header = parseHeader(source);
    const pdf = pdfIndex.get(id) ?? null;
    if (pdf && !pdf.exists) {
      issues.push({ level: 'warn', code: 'pdf-missing', reportId: id, path: pdf.path });
    }

    reports.push({
      id,
      fileName: name,
      title: /^#\s+(.+)$/m.exec(source)?.[1]?.trim() ?? null,
      url: header.url ?? null,
      date: header.date ?? null,
      archetype: header.archetype ?? null,
      machine: machine
        ? {
            company: machine.company ?? null,
            role: machine.role ?? null,
            score: typeof machine.score === 'number' ? machine.score : null,
            decision: machine.final_decision ?? null,
            legitimacy: machine.legitimacy_tier ?? null,
            risk: machine.risk_level ?? null,
            confidence: machine.confidence ?? null,
            advertisedComp: machine.advertised_comp ?? null,
            companyConfidential: machine.company_confidential === true,
            hardStops: Array.isArray(machine.hard_stops) ? machine.hard_stops : [],
            softGaps: Array.isArray(machine.soft_gaps) ? machine.soft_gaps : [],
            topStrengths: Array.isArray(machine.top_strengths) ? machine.top_strengths : [],
            nextAction: machine.next_action ?? null,
          }
        : null,
      pdf: pdf ? { path: pdf.path, exists: pdf.exists, format: pdf.format } : null,
    });
  }

  return { reports, issues };
}

/**
 * Resolve a report's PDF to an absolute path safe to stream to the browser.
 *
 * @param {number|string} id - Report id.
 * @param {{root?: string}} [options]
 * @returns {{absolutePath: string, fileName: string}|null}
 */
export function resolveReportPdf(id, { root } = {}) {
  const entry = readPdfIndex(root).get(Number.parseInt(id, 10));
  if (!entry?.absolutePath || !entry.exists) return null;
  return { absolutePath: entry.absolutePath, fileName: basename(entry.absolutePath) };
}

/** @param {string} [root] @returns {string} `output/` — exported for the route layer. */
export function pdfBaseDir(root) {
  return join(outputDir(root));
}
