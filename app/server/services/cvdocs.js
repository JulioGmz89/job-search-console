/**
 * cvdocs.js — the structured CVs the console can render (PROJECT_PLAN.md §7c).
 *
 * The structured form of a CV is upstream's `build-cv-html.mjs` payload — the
 * JSON `modes/pdf.md` step 17 has the agent write (decision recorded in §11).
 * Upstream's interactive sessions leave it next to the HTML it built, as
 * `output/cv-<candidate>-<company>.json`, and from M5 on the console's own PDF
 * runs write it there too. So the library is simply: every payload-shaped JSON
 * in `output/`, joined to `data/pdf-index.tsv` through the HTML that shares its
 * basename, which is how a payload learns its report number.
 *
 * Two extras:
 * - M3's PDF runs wrote their payloads to `data/jsc/tmp/cv-<runId>.json`.
 *   `importRunPayloads` copies each one next to the HTML it built (the run's
 *   prompt file names both), once, never overwriting.
 * - A bundled fictional payload (`app/cv/sample-payload.json`) so the gallery
 *   and preview work before the user has generated anything.
 *
 * A document id is the payload's basename; ids are looked up in the listing,
 * never joined into a path.
 */

import { copyFileSync, existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';

import { readPdfIndex } from './reports.js';
import { outputDir, repoRoot, resolveDataRoot } from './paths.js';

export const SAMPLE_ID = 'sample';
export const SAMPLE_PATH = join(repoRoot, 'app', 'cv', 'sample-payload.json');

const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,150}$/;

export class CvDocError extends Error {
  constructor(message, { code, status = 400 } = {}) {
    super(message);
    this.name = 'CvDocError';
    this.code = code;
    this.status = status;
  }
}

/** True for a CV payload: a named candidate plus some CV body. Cover-letter payloads have neither. */
export function isCvPayload(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const name = value.candidate?.name;
  if (typeof name !== 'string' || !name.trim()) return false;
  return Array.isArray(value.experience) || typeof value.summary === 'string' || Array.isArray(value.skills);
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch {
    return null;
  }
}

/**
 * Copy M3's run payloads next to the HTML their run built. The prompt file
 * holds the exact `build-cv-html.mjs <payload> <html>` command the run was told
 * to execute, which is the only record of which CV a run's payload belongs to.
 *
 * @param {{root?: string}} [options]
 * @returns {string[]} Basenames imported into output/.
 */
export function importRunPayloads({ root } = {}) {
  const dataRoot = resolveDataRoot(root);
  const tmp = join(dataRoot, 'data', 'jsc', 'tmp');
  const prompts = join(dataRoot, 'data', 'jsc', 'prompts');
  if (!existsSync(tmp)) return [];
  const imported = [];
  for (const file of readdirSync(tmp)) {
    const runId = /^cv-([0-9a-f-]{36})\.json$/.exec(file)?.[1];
    if (!runId) continue;
    const prompt = join(prompts, `${runId}.md`);
    if (!existsSync(prompt)) continue;
    const html = /build-cv-html\.mjs\s+\S+\s+(output\/cv-[A-Za-z0-9._-]+)\.html/.exec(readFileSync(prompt, 'utf-8'))?.[1];
    if (!html) continue;
    const target = join(dataRoot, `${html}.json`);
    if (existsSync(target)) continue;
    if (!isCvPayload(readJson(join(tmp, file)))) continue;
    copyFileSync(join(tmp, file), target);
    imported.push(basename(target));
  }
  return imported;
}

/**
 * @param {{root?: string, sample?: boolean}} [options]
 * @returns {{id: string, label: string, path: string, reportId: number|null,
 *   pdf: string|null, format: string|null, modified: string, sample: boolean}[]}
 *   Newest first, the sample last.
 */
export function listCvDocuments({ root, sample = true } = {}) {
  const dataRoot = resolveDataRoot(root);
  const dir = outputDir(dataRoot);
  try {
    importRunPayloads({ root: dataRoot });
  } catch {
    // Importing is a convenience; a failure must never hide the documents already there.
  }

  const byHtml = new Map();
  for (const entry of readPdfIndex(dataRoot).values()) {
    // generate-pdf.mjs records the file it was handed, which for a console
    // render is render-cv.js's `<id>.themed.html` copy — same CV, same id.
    if (entry.html) byHtml.set(basename(entry.html, '.html').replace(/\.themed$/, ''), entry);
  }

  const docs = [];
  if (existsSync(dir)) {
    for (const file of readdirSync(dir)) {
      if (!file.endsWith('.json')) continue;
      const id = basename(file, '.json');
      if (!ID_RE.test(id) || id === SAMPLE_ID) continue;
      const path = join(dir, file);
      const payload = readJson(path);
      if (!isCvPayload(payload)) continue;
      const indexed = byHtml.get(id) ?? null;
      docs.push({
        id,
        label: indexed ? `Report ${String(indexed.reportId).padStart(3, '0')} · ${id}` : id,
        path,
        reportId: indexed?.reportId ?? null,
        pdf: indexed?.exists ? basename(indexed.absolutePath) : null,
        format: payload.page_format === 'letter' ? 'letter' : 'a4',
        modified: statSync(path).mtime.toISOString(),
        sample: false,
      });
    }
  }
  docs.sort((a, b) => b.modified.localeCompare(a.modified));

  if (sample) {
    docs.push({
      id: SAMPLE_ID,
      label: 'Sample CV (fictional)',
      path: SAMPLE_PATH,
      reportId: null,
      pdf: null,
      format: 'a4',
      modified: statSync(SAMPLE_PATH).mtime.toISOString(),
      sample: true,
    });
  }
  return docs;
}

/**
 * Resolve a document id from the listing, with its parsed payload.
 *
 * @param {string} id
 * @param {{root?: string}} [options]
 */
export function getCvDocument(id, { root } = {}) {
  if (typeof id !== 'string' || !ID_RE.test(id)) throw new CvDocError('documentId is not a CV document id', { code: 'document-invalid' });
  const doc = listCvDocuments({ root }).find((d) => d.id === id);
  if (!doc) throw new CvDocError(`No CV document "${id}"`, { code: 'document-missing', status: 404 });
  const payload = readJson(doc.path);
  if (!isCvPayload(payload)) throw new CvDocError(`${doc.id} is no longer a readable CV payload`, { code: 'document-unreadable', status: 409 });
  return { ...doc, payload };
}
