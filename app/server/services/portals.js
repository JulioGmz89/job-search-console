/**
 * portals.js — structured reads and comment-preserving writes for `portals.yml`.
 *
 * Part of the service seam (PROJECT_PLAN.md §4): all knowledge of the scanner's
 * configuration format is concentrated here.
 *
 * Why this file does line surgery instead of `yaml.load` → mutate → `yaml.dump`:
 * a real portals.yml is a hand-curated document. This repo's own is 16 KB of
 * search lanes annotated with the reasoning behind each block ("always_allow is
 * checked BEFORE block, so a multi-region role still passes…"). A dump-based
 * write is a one-way door — the first time the user toggles a company off, every
 * comment in the file is gone and the diff is unreadable. Upstream reached the
 * same conclusion for the same file: `fix-slugs.mjs` writes ATS slug fixes back
 * with plain line edits, and its docblock says exactly why. This module is the
 * same technique, made general and section-aware (fix-slugs splits on `- name:`
 * across the whole file, which also matches `search_queries` entries).
 *
 * Surgery can go wrong in a way that dumping cannot, so every write is verified
 * before it lands — see `commit()` for the four gates.
 */

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';

import { listProviderIds, portalsPath, repoRoot } from './paths.js';

const require = createRequire(import.meta.url);
const yaml = require('js-yaml');

/** Wire-facing entry kind to the top-level portals.yml key it lives under. */
const SECTIONS = Object.freeze({ company: 'tracked_companies', board: 'job_boards' });

/**
 * The fields the form editor owns.
 *
 * Everything else an entry may carry — `parser:`, `max_pages`, per-provider
 * blocks like `amazon:` or `arbeitsagentur:` — is preserved untouched and
 * reported as `extraKeys` so the UI can say "edit this one by hand" rather than
 * silently dropping it. `enabled` is included because toggling a source off is
 * the single most common edit.
 */
const EDITABLE = Object.freeze([
  'name', 'enabled', 'careers_url', 'api', 'provider', 'scan_method', 'scan_query', 'notes',
]);

/** `scan_method` values upstream understands (scan.mjs `resolveEntries`). */
const SCAN_METHODS = Object.freeze(['playwright', 'websearch', 'local_parser']);

/** A list item that opens an entry: `  - name: Foo`. */
const ITEM_NAME_RE = /^([ \t]+)-\s+name:\s*(\S.*?)\s*$/;
/** Any list item at the section's item indent, whether or not it opens with `name:`. */
const ITEM_RE = /^([ \t]+)-\s+\S/;
/** A top-level key, which is what ends a section. */
const TOP_KEY_RE = /^[A-Za-z_][A-Za-z0-9_-]*:/;
/** Blank, or a whole-line comment. Never part of the entry above it — see `splitEntries`. */
const BLANK_OR_COMMENT_RE = /^\s*(#.*)?$/;

/**
 * A refusal the route layer can map to a status code.
 *
 * Every write path fails closed through this: the user's portals.yml is either
 * left exactly as it was, or replaced with something that parses, means what was
 * asked, and passes upstream's own validator.
 */
export class PortalsError extends Error {
  constructor(message, { code, status = 400, detail } = {}) {
    super(message);
    this.name = 'PortalsError';
    this.code = code;
    this.status = status;
    if (detail !== undefined) this.detail = detail;
  }
}

/** Content hash for optimistic concurrency. Content only — mtime resolution is coarse on Windows. */
function etagOf(text) {
  return createHash('sha256').update(text, 'utf-8').digest('hex').slice(0, 16);
}

/** @param {string} line @returns {boolean} */
const isBlankOrComment = (line) => BLANK_OR_COMMENT_RE.test(line);

/**
 * Serialize one `key: value` pair the way js-yaml would, so quoting and escaping
 * are never hand-rolled. A company named `Foo: Bar #1` has to survive.
 *
 * @param {string} key @param {*} value @returns {string} A single line, unindented.
 */
function scalarLine(key, value) {
  const dumped = yaml.dump({ [key]: value }, { lineWidth: -1 }).replace(/\n$/, '');
  if (dumped.includes('\n')) {
    throw new PortalsError(`Value for "${key}" is not a single-line scalar`, { code: 'value-not-scalar' });
  }
  return dumped;
}

/** Locate a top-level key's line range: `[headerLine, endExclusive)`. */
function sectionRange(lines, key) {
  const header = new RegExp(`^${key}:\\s*(#.*)?$`);
  const start = lines.findIndex((line) => header.test(line));
  if (start === -1) return null;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (TOP_KEY_RE.test(lines[i])) { end = i; break; }
  }
  return { start, end };
}

/**
 * Split a section into per-entry line blocks.
 *
 * The subtlety is where an entry *ends*. Blank lines and group headers
 * (`# -- SWE México / LatAm / nearshore --`) sit between entries and introduce
 * the one below, so they are deliberately excluded from the block above. If they
 * weren't, deleting the last studio would also delete the heading for the next
 * group — a comment-preserving editor that eats comments on delete is worse than
 * one that never claimed to preserve them.
 *
 * @returns {{items: object[], indent: string, issues: object[]}}
 */
function splitEntries(lines, range) {
  const items = [];
  const issues = [];
  let indent = null;

  for (let i = range.start + 1; i < range.end; i++) {
    const item = ITEM_RE.exec(lines[i]);
    if (!item) continue;
    if (indent === null) indent = item[1];
    // A deeper `- ` is a nested list inside an entry (e.g. `keywords:`), not a
    // sibling entry.
    if (item[1] !== indent) continue;

    const named = ITEM_NAME_RE.exec(lines[i]);
    if (!named) {
      // `-` on its own line with `name:` beneath it is legal YAML but nothing in
      // this repo writes it. Surface it rather than editing a shape we cannot
      // round-trip.
      issues.push({
        level: 'warn',
        code: 'entry-shape-unsupported',
        line: i + 1,
        message: `Entry at line ${i + 1} does not open with "- name:"; it is read-only in the console`,
      });
      items.push({ startLine: i, indent, name: null, editable: false });
      continue;
    }
    items.push({ startLine: i, indent, name: named[2], editable: true });
  }

  items.forEach((item, n) => {
    const hardEnd = n + 1 < items.length ? items[n + 1].startLine : range.end;
    let end = hardEnd;
    while (end > item.startLine + 1 && isBlankOrComment(lines[end - 1])) end--;
    item.endLine = end;
    // Field lines sit two columns right of the `-`, aligning with the `name:` on
    // the item line itself. Detect it rather than assume, then fall back.
    const field = lines.slice(item.startLine + 1, end).find((line) => /^\s+\S/.test(line));
    item.fieldIndent = field ? /^(\s+)/.exec(field)[1] : `${item.indent}  `;
  });

  return { items, indent: indent ?? '  ', issues };
}

/** Read and index the file once. Internal; `readPortals` is the public shape. */
function load(root) {
  const path = portalsPath(root);
  const issues = [];

  let text;
  try {
    text = readFileSync(path, 'utf-8');
  } catch (error) {
    issues.push({
      level: error.code === 'ENOENT' ? 'info' : 'error',
      code: error.code === 'ENOENT' ? 'portals-missing' : 'portals-unreadable',
      message:
        error.code === 'ENOENT'
          ? 'No portals.yml yet — add a company to create one.'
          : `Could not read portals.yml: ${error.message}`,
    });
    return { path, exists: false, text: null, lines: [], doc: null, sections: {}, issues };
  }

  let doc = null;
  try {
    // JSON_SCHEMA for the same reason reports.js uses it: the file is user-owned
    // but its contents come from scraped boards, and nothing here needs js-yaml's
    // richer type machinery.
    doc = yaml.load(text, { schema: yaml.JSON_SCHEMA });
  } catch (error) {
    issues.push({ level: 'error', code: 'portals-unparseable', message: error.message });
  }

  const lines = text.split('\n');
  const sections = {};
  for (const [kind, key] of Object.entries(SECTIONS)) {
    const range = sectionRange(lines, key);
    if (!range) { sections[kind] = { key, range: null, items: [], indent: '  ' }; continue; }
    const split = splitEntries(lines, range);
    issues.push(...split.issues);
    sections[kind] = { key, range, items: split.items, indent: split.indent };
  }

  return { path, exists: true, text, lines, doc, sections, issues };
}

/** Project one parsed entry into the wire shape, keeping unknown keys visible. */
function wireEntry(parsed, block, index, kind) {
  const source = parsed && typeof parsed === 'object' ? parsed : {};
  return {
    kind,
    index,
    name: typeof source.name === 'string' ? source.name : block?.name ?? null,
    // Upstream's rule: any value other than an explicit `false` means enabled.
    enabled: source.enabled !== false,
    careersUrl: source.careers_url ?? null,
    api: source.api ?? null,
    provider: source.provider ?? null,
    scanMethod: source.scan_method ?? null,
    scanQuery: source.scan_query ?? source.search_query ?? null,
    notes: source.notes ?? null,
    extraKeys: Object.keys(source).filter((k) => !EDITABLE.includes(k) && k !== 'search_query'),
    editable: block?.editable !== false,
    line: block ? block.startLine + 1 : null,
  };
}

/**
 * Read portals.yml into the shape the Sources page renders.
 *
 * Never throws. A missing or unparseable file is an `issues[]` entry and an empty
 * list, so a first-run user sees an empty Sources page that explains itself
 * rather than a 500.
 *
 * @param {{root?: string}} [options]
 * @returns {{path: string, exists: boolean, etag: string|null, editable: boolean,
 *            companies: object[], boards: object[], filters: object,
 *            providers: string[], scanMethods: string[], issues: object[]}}
 */
export function readPortals({ root } = {}) {
  const state = load(root);
  const doc = state.doc && typeof state.doc === 'object' ? state.doc : {};

  const project = (kind) => {
    const parsed = Array.isArray(doc[SECTIONS[kind]]) ? doc[SECTIONS[kind]] : [];
    const blocks = state.sections[kind]?.items ?? [];
    if (state.exists && parsed.length !== blocks.length) {
      state.issues.push({
        level: 'warn',
        code: 'entry-index-drift',
        message:
          `${SECTIONS[kind]}: YAML parsed ${parsed.length} entries but the line index found ` +
          `${blocks.length}. Editing is disabled until the file is fixed by hand.`,
      });
    }
    return parsed.map((entry, i) => wireEntry(entry, blocks[i], i, kind));
  };

  const companies = project('company');
  const boards = project('board');
  const drift = state.issues.some((i) => i.code === 'entry-index-drift');

  return {
    path: state.path,
    exists: state.exists,
    etag: state.text === null ? null : etagOf(state.text),
    editable: state.exists && state.doc !== null && !drift,
    companies,
    boards,
    // Filters are shown read-only in M2 (PROJECT_PLAN.md §8 scopes this milestone
    // to portal CRUD; six nested filter editors is its own piece of work).
    filters: Object.fromEntries(
      Object.entries(doc).filter(([key]) => !Object.values(SECTIONS).includes(key)),
    ),
    providers: listProviderIds(),
    scanMethods: [...SCAN_METHODS],
    issues: state.issues,
  };
}

// ── validation of an incoming entry ──────────────────────────────────

/** @param {*} value @returns {boolean} */
const isBlank = (value) => value === null || value === undefined || value === '';

/**
 * Normalize and check a form submission.
 *
 * Fails on anything upstream would reject at scan time, so the error surfaces in
 * the form rather than as an empty scan three minutes later.
 *
 * @param {object} input - Wire-shaped entry (camelCase).
 * @param {{partial?: boolean, providers?: string[]}} [options]
 * @returns {object} Map of yaml key to value; `null` means "remove this field".
 */
export function normalizeEntry(input, { partial = false, providers = listProviderIds() } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new PortalsError('Entry must be an object', { code: 'entry-not-object' });
  }

  const out = {};
  const has = (key) => Object.prototype.hasOwnProperty.call(input, key);

  if (has('name') || !partial) {
    const name = typeof input.name === 'string' ? input.name.trim() : '';
    if (!name) throw new PortalsError('Name is required', { code: 'name-required' });
    if (name.includes('\n')) throw new PortalsError('Name must be a single line', { code: 'name-multiline' });
    out.name = name;
  }

  if (has('enabled')) {
    if (typeof input.enabled !== 'boolean') {
      throw new PortalsError('enabled must be true or false', { code: 'enabled-not-boolean' });
    }
    out.enabled = input.enabled;
  } else if (!partial) {
    out.enabled = true;
  }

  for (const [wire, key] of [['careersUrl', 'careers_url'], ['api', 'api']]) {
    if (!has(wire) && partial) continue;
    const value = isBlank(input[wire]) ? null : String(input[wire]).trim();
    if (value !== null && !/^https?:\/\/\S+$/.test(value)) {
      throw new PortalsError(`${key} must be an http(s) URL`, { code: 'url-invalid', detail: key });
    }
    out[key] = value;
  }

  if (has('provider') || !partial) {
    const value = isBlank(input.provider) ? null : String(input.provider).trim();
    if (value !== null && !providers.includes(value)) {
      throw new PortalsError(`Unknown provider "${value}"`, { code: 'provider-unknown' });
    }
    out.provider = value;
  }

  if (has('scanMethod') || !partial) {
    const value = isBlank(input.scanMethod) ? null : String(input.scanMethod).trim();
    if (value !== null && !SCAN_METHODS.includes(value)) {
      throw new PortalsError(`scan_method must be one of ${SCAN_METHODS.join(', ')}`, { code: 'scan-method-unknown' });
    }
    out.scan_method = value;
  }

  for (const [wire, key] of [['scanQuery', 'scan_query'], ['notes', 'notes']]) {
    if (!has(wire) && partial) continue;
    const value = isBlank(input[wire]) ? null : String(input[wire]);
    if (value !== null && value.includes('\n')) {
      throw new PortalsError(`${key} must be a single line`, { code: 'value-multiline', detail: key });
    }
    out[key] = value;
  }

  // scan.mjs resolves a provider from `provider:`, then `parser.command`, then
  // each provider's detect(careers_url). An entry with none of those is silently
  // skipped at scan time, which reads as "the scanner is broken".
  if (!partial && !out.provider && !out.careers_url && out.scan_method !== 'websearch') {
    throw new PortalsError(
      'An entry needs a careers URL, an explicit provider, or scan_method: websearch — ' +
      'otherwise the scanner has no way to reach it',
      { code: 'entry-unreachable' },
    );
  }

  return out;
}

// ── line surgery ─────────────────────────────────────────────────────

/** Find a `field:` line at the block's own field indent. Deeper keys belong to nested blocks. */
function findFieldLine(lines, block, field) {
  const re = new RegExp(`^${block.fieldIndent}${field}:`);
  for (let i = block.startLine + 1; i < block.endLine; i++) {
    if (re.test(lines[i])) return i;
  }
  return -1;
}

/**
 * Apply one field change to one entry, returning new text.
 *
 * Re-indexed from scratch on every call so line numbers are never stale — a
 * splice shifts everything below it, and one wrong offset silently rewrites the
 * neighbouring company.
 */
function editField(text, kind, index, field, value) {
  const lines = text.split('\n');
  const range = sectionRange(lines, SECTIONS[kind]);
  if (!range) throw new PortalsError(`No ${SECTIONS[kind]} section`, { code: 'section-missing', status: 404 });
  const block = splitEntries(lines, range).items[index];
  if (!block) throw new PortalsError('No such entry', { code: 'entry-missing', status: 404 });

  if (field === 'name') {
    lines[block.startLine] = `${block.indent}- ${scalarLine('name', value)}`;
    return lines.join('\n');
  }

  const at = findFieldLine(lines, block, field);
  if (value === null) {
    if (at !== -1) lines.splice(at, 1);
    return lines.join('\n');
  }
  const rendered = `${block.fieldIndent}${scalarLine(field, value)}`;
  if (at !== -1) lines[at] = rendered;
  else lines.splice(block.endLine, 0, rendered);
  return lines.join('\n');
}

/** Render a whole new entry as indented lines. */
function renderEntry(fields, indent) {
  const fieldIndent = `${indent}  `;
  const order = EDITABLE.filter((key) => key in fields && fields[key] !== null);
  const [first, ...rest] = order;
  return [
    `${indent}- ${scalarLine(first, fields[first])}`,
    ...rest.map((key) => `${fieldIndent}${scalarLine(key, fields[key])}`),
  ];
}

/** The parsed document the caller intends to end up with, used to verify the surgery. */
function expectedDoc(doc, kind, mutate) {
  const next = structuredClone(doc ?? {});
  const key = SECTIONS[kind];
  next[key] = Array.isArray(next[key]) ? next[key] : [];
  mutate(next[key]);
  return next;
}

// ── committing ───────────────────────────────────────────────────────

/**
 * Run upstream's own validator over a candidate file.
 *
 * The console is not the only writer of portals.yml and must not be the only
 * thing that agrees the file is valid: if `validate-portals.mjs` would reject
 * it, the scan would too, and the user finds out from a failed run instead of a
 * form error.
 *
 * @returns {{errors: string[], warnings: string[]}}
 */
function validateCandidate(candidatePath) {
  let output;
  try {
    output = execFileSync(process.execPath, [join(repoRoot, 'validate-portals.mjs'), '--file', candidatePath], {
      cwd: repoRoot,
      encoding: 'utf-8',
      timeout: 30_000,
    });
  } catch (error) {
    // Exit 1 means "found errors" and the findings are on stdout; a missing
    // validator or a timeout has no stdout and is reported as an error itself.
    output = `${error.stdout ?? ''}${error.stderr ?? ''}` || `validator failed: ${error.message}`;
  }
  const lines = output.split(/\r?\n/);
  return {
    errors: lines.filter((l) => l.startsWith('error:') || l.startsWith('validator failed:')),
    warnings: lines.filter((l) => l.startsWith('warning:')),
  };
}

/**
 * The four gates every write passes, in order: freshness, meaning, upstream
 * validity, then an atomic replace with a backup beside it.
 *
 * @returns {{etag: string, warnings: string[], backup: string}}
 */
function commit(state, candidate, expected, { etag }) {
  if (etag !== etagOf(state.text ?? '')) {
    throw new PortalsError(
      'portals.yml changed on disk since it was loaded — reload before saving',
      { code: 'stale-etag', status: 409 },
    );
  }

  let reparsed;
  try {
    reparsed = yaml.load(candidate, { schema: yaml.JSON_SCHEMA });
  } catch (error) {
    throw new PortalsError(`The edit produced invalid YAML: ${error.message}`, { code: 'surgery-unparseable', status: 500 });
  }
  if (!isDeepStrictEqual(reparsed, expected)) {
    // Valid YAML that means something other than what was asked is the one
    // failure mode line surgery has and dumping does not. Nothing is written.
    throw new PortalsError(
      'The edit did not produce the intended configuration and was discarded',
      { code: 'surgery-mismatch', status: 500 },
    );
  }

  const scratch = mkdtempSync(join(tmpdir(), 'jsc-portals-'));
  const candidatePath = join(scratch, 'portals.yml');
  let validation;
  try {
    writeFileSync(candidatePath, candidate, 'utf-8');
    validation = validateCandidate(candidatePath);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
  if (validation.errors.length > 0) {
    throw new PortalsError('portals.yml would be invalid after this change', {
      code: 'portals-invalid',
      status: 422,
      detail: validation.errors,
    });
  }

  const backup = `${state.path}.bak`;
  if (existsSync(state.path)) copyFileSync(state.path, backup);
  // Stage beside the target so the rename stays on one filesystem and is atomic.
  const staging = join(dirname(state.path), `.${basename(state.path)}.tmp-${process.pid}`);
  writeFileSync(staging, candidate, 'utf-8');
  renameSync(staging, state.path);

  return { etag: etagOf(candidate), warnings: validation.warnings, backup };
}

/** Guard against an index that moved under the client. */
function checkIdentity(block, expectedName) {
  if (expectedName === undefined || expectedName === null) return;
  if (block.name !== expectedName) {
    throw new PortalsError(
      `Entry ${block.name === null ? 'at that position' : `"${block.name}"`} is not "${expectedName}" — reload before saving`,
      { code: 'entry-moved', status: 409 },
    );
  }
}

/** Reject edits to a file whose YAML and line index disagree. */
function requireEditable(state, kind) {
  if (!state.exists) throw new PortalsError('No portals.yml to edit', { code: 'portals-missing', status: 404 });
  if (state.doc === null) {
    throw new PortalsError('portals.yml does not parse; fix it by hand first', { code: 'portals-unparseable', status: 422 });
  }
  const parsed = Array.isArray(state.doc?.[SECTIONS[kind]]) ? state.doc[SECTIONS[kind]] : [];
  if (parsed.length !== state.sections[kind].items.length) {
    throw new PortalsError(
      'portals.yml has a shape the console cannot edit safely; fix it by hand first',
      { code: 'entry-index-drift', status: 422 },
    );
  }
}

/**
 * Append a new entry to the end of its section.
 *
 * @param {{root?: string, kind: string, entry: object, etag: string}} options
 */
export function createEntry({ root, kind, entry, etag }) {
  if (!(kind in SECTIONS)) throw new PortalsError(`Unknown entry kind "${kind}"`, { code: 'kind-unknown' });
  const state = load(root);
  requireEditable(state, kind);

  const fields = normalizeEntry(entry, { partial: false });
  const section = state.sections[kind];
  if (!section.range) {
    throw new PortalsError(`portals.yml has no ${SECTIONS[kind]} section`, { code: 'section-missing', status: 422 });
  }
  if (section.items.some((item) => item.name === fields.name)) {
    throw new PortalsError(`"${fields.name}" is already listed`, { code: 'name-duplicate', status: 409 });
  }

  const lines = [...state.lines];
  const last = section.items.at(-1);
  const at = last ? last.endLine : section.range.start + 1;
  lines.splice(at, 0, '', ...renderEntry(fields, section.indent));

  const expected = expectedDoc(state.doc, kind, (list) => {
    list.push(Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== null)));
  });

  const result = commit(state, lines.join('\n'), expected, { etag });
  return { ...result, index: section.items.length, name: fields.name };
}

/**
 * Patch an existing entry in place.
 *
 * `name` is the caller's checksum on `index`: indices shift when an entry is
 * deleted, and a stale index must fail loudly rather than edit the neighbour.
 *
 * @param {{root?: string, kind: string, index: number, name?: string, entry: object, etag: string}} options
 */
export function updateEntry({ root, kind, index, name, entry, etag }) {
  if (!(kind in SECTIONS)) throw new PortalsError(`Unknown entry kind "${kind}"`, { code: 'kind-unknown' });
  const state = load(root);
  requireEditable(state, kind);

  const block = state.sections[kind].items[index];
  if (!block) throw new PortalsError('No such entry', { code: 'entry-missing', status: 404 });
  checkIdentity(block, name);
  if (!block.editable) {
    throw new PortalsError('That entry is not written in a shape the console can edit', {
      code: 'entry-shape-unsupported',
      status: 422,
    });
  }

  const patch = normalizeEntry(entry, { partial: true });
  if (Object.keys(patch).length === 0) {
    throw new PortalsError('Nothing to change', { code: 'patch-empty' });
  }
  if (patch.name !== undefined) {
    const clash = state.sections[kind].items.findIndex((item) => item.name === patch.name);
    if (clash !== -1 && clash !== index) {
      throw new PortalsError(`"${patch.name}" is already listed`, { code: 'name-duplicate', status: 409 });
    }
  }

  let candidate = state.text;
  for (const [field, value] of Object.entries(patch)) {
    candidate = editField(candidate, kind, index, field, value);
  }

  const expected = expectedDoc(state.doc, kind, (list) => {
    const target = { ...list[index] };
    for (const [field, value] of Object.entries(patch)) {
      if (value === null) delete target[field];
      else target[field] = value;
    }
    list[index] = target;
  });

  return commit(state, candidate, expected, { etag });
}

/**
 * Remove an entry, and the single blank line that separated it from the next —
 * but never the comment that introduces the group below it.
 *
 * @param {{root?: string, kind: string, index: number, name?: string, etag: string}} options
 */
export function deleteEntry({ root, kind, index, name, etag }) {
  if (!(kind in SECTIONS)) throw new PortalsError(`Unknown entry kind "${kind}"`, { code: 'kind-unknown' });
  const state = load(root);
  requireEditable(state, kind);

  const block = state.sections[kind].items[index];
  if (!block) throw new PortalsError('No such entry', { code: 'entry-missing', status: 404 });
  checkIdentity(block, name);

  const lines = [...state.lines];
  let count = block.endLine - block.startLine;
  if (lines[block.startLine + count] === '') count += 1;
  lines.splice(block.startLine, count);

  const expected = expectedDoc(state.doc, kind, (list) => { list.splice(index, 1); });
  return commit(state, lines.join('\n'), expected, { etag });
}
