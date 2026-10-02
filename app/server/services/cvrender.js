/**
 * cvrender.js — the deterministic CV renderer (PROJECT_PLAN.md §7c):
 *
 *   payload + theme + tokens → HTML → Chromium → PDF
 *
 * No agent is involved. The payload is upstream's `build-cv-html.mjs` JSON, so
 * the HTML step *is* upstream's builder (spawned: it runs `main()` on import),
 * and everything after it repeats what upstream's `generate-pdf.mjs` does to a
 * CV, in the same order, with its own exported functions:
 *
 *   build-cv-html.mjs                      payload → template HTML   (cached)
 *   theme.js buildThemedHtml               the console's tokens, density, heading font, section order
 *   reorderCvSections(profile cv.sections) upstream's own order, applied after ours
 *   normalizeTextForATS                    smart quotes, dashes, zero-width characters
 *   injectThemeStyle(profile style:)       profile.yml tokens, which win over ours
 *   injectPrintPageCss, inlineLocalFonts   page size and embedded fonts
 *
 * so a preview is the PDF a final render would produce. The difference is
 * where it ends: a preview is printed on the warm browser into memory and
 * touches neither `output/` nor `data/pdf-index.tsv`; a final render goes
 * through `app/cv/render-cv.js` → `generate-pdf.mjs`, which owns the manifest.
 *
 * Changing a token never re-runs the builder: built HTML is cached by the hash
 * of the payload, the template and its section partials.
 */

import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { buildThemedHtml, listCvTemplates, resolveTemplatePath, validateStyle } from '../../cv/theme.js';
import { readCvSectionOrder, readStyleTokens, injectThemeStyle } from '../../../theme-style.mjs';
import { checkAts } from './ats.js';
import { sharedBrowserPool } from './browser.js';
import { getCvDocument } from './cvdocs.js';
import { repoRoot, resolveDataRoot } from './paths.js';

export class CvRenderError extends Error {
  constructor(message, { code, status = 400, detail } = {}) {
    super(message);
    this.name = 'CvRenderError';
    this.code = code;
    this.status = status;
    this.detail = detail;
  }
}

/** generate-pdf.mjs imports Playwright at module load; load it once, on first render. */
let upstreamPdf = null;
async function pdfHelpers() {
  upstreamPdf ??= import('../../../generate-pdf.mjs');
  return upstreamPdf;
}

export const cacheDir = (root) => join(resolveDataRoot(root), 'data', 'jsc', 'cache', 'cv');

/** Everything that changes what build-cv-html.mjs writes for a payload. */
export function buildKey(payloadText, templatePath) {
  const hash = createHash('sha256');
  hash.update(payloadText);
  hash.update('\0');
  hash.update(readFileSync(templatePath));
  const sections = join(dirname(templatePath), 'sections');
  if (existsSync(sections)) {
    for (const file of readdirSync(sections).sort()) {
      hash.update(`\0${file}\0`);
      hash.update(readFileSync(join(sections, file)));
    }
  }
  hash.update(`\0${statSync(join(repoRoot, 'build-cv-html.mjs')).mtimeMs}`);
  return hash.digest('hex').slice(0, 24);
}

/** Run upstream's builder; resolves with its stderr on failure. */
export function runBuilder(payloadPath, outPath, templatePath, { spawnFn = spawn } = {}) {
  return new Promise((done, fail) => {
    const child = spawnFn(process.execPath, [join(repoRoot, 'build-cv-html.mjs'), payloadPath, outPath, templatePath], {
      cwd: repoRoot,
      windowsHide: true,
      stdio: ['ignore', 'ignore', 'pipe'],
    });
    let stderr = '';
    child.stderr?.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', (error) => fail(new CvRenderError(`Could not run build-cv-html.mjs: ${error.message}`, { code: 'build-failed', status: 500 })));
    child.on('close', (code) => {
      if (code === 0) done();
      else fail(new CvRenderError(`build-cv-html.mjs failed: ${stderr.trim() || `exit ${code}`}`, { code: 'build-failed', status: 422 }));
    });
  });
}

/**
 * Template HTML for a payload, from the cache when nothing that matters changed.
 *
 * @param {{payloadPath: string, templatePath: string, root?: string, builder?: Function}} input
 * @returns {Promise<{html: string, cached: boolean, key: string}>}
 */
export async function buildCvHtml({ payloadPath, templatePath, root, builder = runBuilder }) {
  const key = buildKey(readFileSync(payloadPath, 'utf-8'), templatePath);
  const dir = cacheDir(root);
  const cached = join(dir, `${key}.html`);
  if (existsSync(cached)) return { html: readFileSync(cached, 'utf-8'), cached: true, key };
  mkdirSync(dir, { recursive: true });
  const tmp = join(dir, `${key}.${randomUUID()}.tmp.html`);
  try {
    await builder(payloadPath, tmp, templatePath);
    renameSync(tmp, cached);
  } finally {
    rmSync(tmp, { force: true });
  }
  return { html: readFileSync(cached, 'utf-8'), cached: false, key };
}

/**
 * Everything generate-pdf.mjs does to a CV's HTML before printing it, with the
 * console's style applied first.
 *
 * @param {string} html - build-cv-html.mjs output.
 * @param {object} style - A validated style.
 * @param {{root?: string, format: 'a4'|'letter', helpers?: object}} options
 * @returns {Promise<{html: string, applied: string[]}>}
 */
export async function finalizeCvHtml(html, style, { root, format, helpers = null }) {
  const h = helpers ?? (await pdfHelpers());
  const profile = join(resolveDataRoot(root), 'config', 'profile.yml');
  const themed = buildThemedHtml(html, style, { reorder: h.reorderCvSections });
  let out = h.reorderCvSections(themed.html, readCvSectionOrder(profile));
  out = h.normalizeTextForATS(out).html;
  out = injectThemeStyle(out, readStyleTokens(profile));
  out = h.injectPrintPageCss(out, format);
  out = await h.inlineLocalFonts(out);
  return { html: out, applied: themed.applied };
}

/** The style a request asked for: validated, with the template resolved to a file. */
export function resolveRequestStyle(input, { root } = {}) {
  const { style, errors } = validateStyle(input ?? {});
  if (errors.length) throw new CvRenderError('Some style values are not valid', { code: 'style-invalid', detail: errors });
  const dataRoot = resolveDataRoot(root);
  let template;
  try {
    template = resolveTemplatePath(style, { root: dataRoot, repoRoot });
  } catch (error) {
    throw new CvRenderError(`Template "${style.template}" is not available: ${error.message}`, { code: 'template-missing', status: 404 });
  }
  if (!existsSync(template.path)) throw new CvRenderError(`Template "${style.template}" is not available`, { code: 'template-missing', status: 404 });
  return { style, template };
}

const PREVIEW_LIMIT = 8;
const previews = new Map();

function remember(entry) {
  previews.set(entry.id, entry);
  while (previews.size > PREVIEW_LIMIT) previews.delete(previews.keys().next().value);
}

/** A rendered preview PDF by id, while it is among the most recent few. */
export function getPreview(id) {
  return previews.get(id) ?? null;
}

/**
 * Render a CV document with a style into a PDF in memory, and check it.
 *
 * @param {{documentId: string, style?: object, root?: string, pool?: object}} input
 * @returns {Promise<{id: string, documentId: string, template: object, pages: number|null, ms: number,
 *   cached: boolean, applied: string[], ats: object}>}
 */
export async function renderPreview({ documentId, style: input, root, pool = sharedBrowserPool() }) {
  const started = performance.now();
  const doc = getCvDocument(documentId, { root });
  const { style, template } = resolveRequestStyle(input, { root });
  const format = doc.payload.page_format === 'letter' ? 'letter' : 'a4';
  const built = await buildCvHtml({ payloadPath: doc.path, templatePath: template.path, root });
  const final = await finalizeCvHtml(built.html, style, { root, format });
  const pdf = await pool.withPage(final.html, { dir: cacheDir(root) }, (page) =>
    page.pdf({ printBackground: true, margin: { top: '0', right: '0', bottom: '0', left: '0' }, preferCSSPageSize: true }),
  );
  const ats = await checkAts({ html: final.html, pdf, payload: doc.payload });
  const entry = {
    id: randomUUID(),
    documentId: doc.id,
    template: { name: template.name, source: template.source },
    pages: ats.pages,
    ms: Math.round(performance.now() - started),
    cached: built.cached,
    applied: final.applied,
    ats,
  };
  remember({ ...entry, pdf: Buffer.from(pdf) });
  return entry;
}

/**
 * The theme gallery for one document: every template, with a page-1 thumbnail
 * and its ATS verdict under the current tokens. Both are cached on disk by the
 * build key plus the style, so the gallery is instant after the first visit.
 *
 * @param {{documentId: string, style?: object, root?: string, pool?: object}} input
 */
export async function listThemes({ documentId, style: input, root, pool = sharedBrowserPool() }) {
  const dataRoot = resolveDataRoot(root);
  const doc = getCvDocument(documentId, { root: dataRoot });
  const { style } = resolveRequestStyle(input, { root: dataRoot });
  const themes = [];
  for (const t of listCvTemplates({ root: dataRoot, repoRoot })) {
    const themeStyle = { ...style, template: t.name };
    try {
      const result = await themeThumbnail({ doc, style: themeStyle, templatePath: t.path, root: dataRoot, pool });
      themes.push({ name: t.name, displayName: t.displayName, source: t.source, thumb: result.thumb, ats: result.ats });
    } catch (error) {
      themes.push({ name: t.name, displayName: t.displayName, source: t.source, thumb: null, ats: null, error: error.message });
    }
  }
  return { documentId: doc.id, themes };
}

const THUMB_RE = /^[0-9a-f]{24}$/;

/** profile.yml's style and section order shape every render, so they key the thumbnail cache too. */
function profileText(root) {
  const path = join(resolveDataRoot(root), 'config', 'profile.yml');
  return existsSync(path) ? readFileSync(path, 'utf-8') : '';
}

export function thumbPath(key, { root } = {}) {
  if (!THUMB_RE.test(key)) return null;
  const path = join(cacheDir(root), 'thumbs', `${key}.png`);
  return existsSync(path) ? path : null;
}

async function themeThumbnail({ doc, style, templatePath, root, pool }) {
  const format = doc.payload.page_format === 'letter' ? 'letter' : 'a4';
  const built = await buildCvHtml({ payloadPath: doc.path, templatePath, root });
  const key = createHash('sha256').update(`${built.key}\0${JSON.stringify(style)}\0${profileText(root)}`).digest('hex').slice(0, 24);
  const dir = join(cacheDir(root), 'thumbs');
  const png = join(dir, `${key}.png`);
  const meta = join(dir, `${key}.json`);
  if (existsSync(png) && existsSync(meta)) return { thumb: key, ats: JSON.parse(readFileSync(meta, 'utf-8')) };

  const final = await finalizeCvHtml(built.html, style, { root, format });
  const { pdf, shot } = await pool.withPage(final.html, { dir: cacheDir(root) }, async (page) => {
    const pdfBuffer = await page.pdf({ printBackground: true, margin: { top: '0', right: '0', bottom: '0', left: '0' }, preferCSSPageSize: true });
    await page.emulateMedia?.({ media: 'print' });
    await page.setViewportSize?.({ width: format === 'letter' ? 816 : 794, height: format === 'letter' ? 1056 : 1123 });
    const image = await page.screenshot({ type: 'png', fullPage: false });
    return { pdf: pdfBuffer, shot: image };
  });
  const ats = await checkAts({ html: final.html, pdf, payload: doc.payload });
  const summary = { verdict: ats.verdict, score: ats.score, critical: ats.issues.filter((i) => i.severity === 'critical').length, warnings: ats.issues.filter((i) => i.severity === 'warning').length };
  mkdirSync(dir, { recursive: true });
  writeFileSync(png, shot);
  writeFileSync(meta, JSON.stringify(summary));
  return { thumb: key, ats: summary };
}
