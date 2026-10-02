/**
 * ats.js — the ATS guardrail (PROJECT_PLAN.md §7d).
 *
 * Any theme must produce a PDF an applicant-tracking system can read. Two
 * independent checks, merged into one verdict:
 *
 * 1. **Structure (HTML)** — upstream's `verify-ats.mjs` `auditAts()`: layout
 *    tables, multi-column CSS, text in images, hidden text, fonts, headings,
 *    contact. Imported, not copied, so upstream's improvements arrive on merge.
 * 2. **Survival (PDF)** — the fork's half. The text layer is extracted back out
 *    of the rendered PDF with pdfjs and checked against the payload that was
 *    rendered: is there real text, did the name and email survive, does every
 *    non-empty section's heading appear, in the order the document has them,
 *    and what share of the CV's own keywords (competencies, skills) can an
 *    extractor still find. A theme can pass the HTML audit and still lose text
 *    in print (CSS-generated headings, text drawn as images, zero-size fonts);
 *    this is the check that catches it.
 *
 * Verdict: `fail` on any critical issue or an upstream score under its own
 * threshold, `warn` on warnings, else `pass`. Nothing here throws on a bad PDF:
 * an unreadable PDF is itself a critical finding.
 */

import { auditAts, DEFAULT_MIN_SCORE, extractHeadings, isPass } from '../../../verify-ats.mjs';

/** build-cv-html.mjs's default section titles (not exported there). */
export const DEFAULT_SECTION_TITLES = Object.freeze({
  summary: 'Professional Summary',
  competencies: 'Core Competencies',
  experience: 'Work Experience',
  projects: 'Projects',
  education: 'Education',
  certifications: 'Certifications',
  awards: 'Awards & Honors',
  skills: 'Skills',
  interests: 'Interests',
});

const MIN_TEXT = 300;
const KEYWORD_WARN = 0.9;
const KEYWORD_FAIL = 0.6;

/** Lowercase, strip diacritics and every whitespace run, so PDF spacing quirks never cause a miss. */
export function fold(text) {
  return String(text ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[‐-―]/g, '-')
    .replace(/&amp;/g, '&')
    .toLowerCase()
    .replace(/\s+/g, '');
}

/**
 * The text layer of a PDF, in content-stream order.
 *
 * @param {Buffer|Uint8Array} pdf
 * @returns {Promise<{text: string, pages: number}>}
 */
export async function extractPdfText(pdf) {
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const data = new Uint8Array(pdf.buffer ? pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength) : pdf);
  const task = getDocument({ data, isEvalSupported: false, disableFontFace: true, useSystemFonts: false, verbosity: 0 });
  try {
    const doc = await task.promise;
    const parts = [];
    for (let i = 1; i <= doc.numPages; i += 1) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      for (const item of content.items) {
        if (typeof item.str !== 'string') continue;
        parts.push(item.str, item.hasEOL ? '\n' : '');
      }
      parts.push('\n');
    }
    return { text: parts.join(''), pages: doc.numPages };
  } finally {
    await task.destroy();
  }
}

const nonEmpty = (value) => {
  if (Array.isArray(value)) return value.length > 0;
  return typeof value === 'string' && value.trim() !== '';
};

/** The keywords a CV carries about itself: its competencies and every skills item. */
export function payloadKeywords(payload) {
  const out = [];
  for (const c of payload?.competencies ?? []) if (typeof c === 'string') out.push(c);
  for (const s of payload?.skills ?? []) {
    const items = Array.isArray(s?.items) ? s.items : typeof s?.items === 'string' ? s.items.split(',') : [];
    for (const item of items) if (typeof item === 'string') out.push(item);
  }
  const clean = out.map((k) => k.replace(/\*\*/g, '').trim()).filter((k) => k.length >= 2);
  return [...new Set(clean)];
}

/**
 * The fork's half: check the text extracted from the PDF against the payload.
 *
 * @param {{text: string, payload: object, html: string}} input
 * @returns {{issues: {severity: string, message: string}[], keywords: {total: number, found: number, percent: number, missing: string[]}, sections: object[]}}
 */
export function checkPdfText({ text, payload, html }) {
  const issues = [];
  const add = (severity, message) => issues.push({ severity, message });
  const hay = fold(text);
  const htmlHay = fold(html.replace(/<style\b[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' '));

  const visible = text.replace(/\s+/g, ' ').trim();
  if (visible.length < MIN_TEXT) {
    add('critical', `The PDF has almost no selectable text (${visible.length} characters). An ATS reads the text layer; this theme draws the CV as images or hides it.`);
  }

  const candidate = payload?.candidate ?? {};
  if (candidate.name && !hay.includes(fold(candidate.name))) {
    add('critical', `The candidate name "${candidate.name}" is not in the PDF text. Keep the name as real text, not an image or CSS-generated content.`);
  }
  if (candidate.email && !hay.includes(fold(candidate.email))) {
    add('critical', `The email ${candidate.email} is not in the PDF text. Contact details must be selectable text in the body.`);
  }

  // Every non-empty section's heading, in document order.
  const titles = { ...DEFAULT_SECTION_TITLES, ...(payload?.sections ?? {}) };
  const sections = [];
  for (const key of Object.keys(DEFAULT_SECTION_TITLES)) {
    if (!nonEmpty(payload?.[key])) continue;
    const title = typeof titles[key] === 'string' ? titles[key] : DEFAULT_SECTION_TITLES[key];
    const needle = fold(title);
    const inPdf = hay.indexOf(needle);
    const inHtml = htmlHay.includes(needle);
    sections.push({ key, title, found: inPdf >= 0, position: inPdf });
    if (inPdf >= 0) continue;
    if (inHtml) add('critical', `The "${title}" heading is in the document but not in the PDF text — it is hidden, zero-size, or drawn as an image. ATS parsers key off standard headings.`);
    else add('warning', `This theme does not render the "${title}" section, so its content never reaches the PDF.`);
  }

  // Reading order: walk the headings in the order the HTML has them and find
  // each one in the PDF text after the previous. A heading that only occurs
  // *before* the cursor was extracted out of order. Sequential search keeps a
  // body mention of "skills" from passing for the Skills heading's position.
  const headingOrder = extractHeadings(html).map(fold);
  const htmlRank = (s) => {
    const i = headingOrder.indexOf(fold(s.title));
    return i >= 0 ? i : headingOrder.length + htmlHay.indexOf(fold(s.title));
  };
  const ordered = sections.filter((s) => s.found).sort((a, b) => htmlRank(a) - htmlRank(b));
  let cursor = 0;
  const outOfOrder = [];
  for (const s of ordered) {
    const at = hay.indexOf(fold(s.title), cursor);
    if (at >= 0) cursor = at + 1;
    else outOfOrder.push(s.title);
  }
  if (outOfOrder.length) {
    add('critical', `The PDF text reads ${outOfOrder.map((t) => `"${t}"`).join(', ')} out of place — before sections the document puts first. Multi-column or positioned layouts scramble what an ATS extracts.`);
  }

  const keywords = payloadKeywords(payload);
  const missing = keywords.filter((k) => !hay.includes(fold(k)));
  const share = keywords.length ? (keywords.length - missing.length) / keywords.length : 1;
  const coverage = { total: keywords.length, found: keywords.length - missing.length, percent: Math.round(share * 100), missing };
  if (keywords.length && share < KEYWORD_FAIL) {
    add('critical', `Only ${coverage.percent}% of the CV's own keywords survive in the PDF text (missing: ${missing.slice(0, 8).join(', ')}${missing.length > 8 ? '…' : ''}).`);
  } else if (keywords.length && share < KEYWORD_WARN) {
    add('warning', `${coverage.percent}% of the CV's keywords survive in the PDF text; missing: ${missing.slice(0, 8).join(', ')}${missing.length > 8 ? '…' : ''}.`);
  }
  return { issues, keywords: coverage, sections };
}

/**
 * Two of upstream's structural warnings are guesses about an outcome the PDF
 * half measures directly: whether a font's text extracts (it lists every
 * fallback in the stack, `var(--font-family)` included, and the CJK fallbacks
 * of every shipped template) and whether a non-photo `<img>` holds CV text (it
 * also counts an `<img>` mentioned inside an HTML comment). Left as warnings,
 * every upstream theme would warn and the warning would stop meaning anything,
 * so they are kept as info; if text really is lost, the PDF half fails it.
 */
function demoteMeasured(issue) {
  if (issue.severity !== 'warning') return issue;
  if (/^Non-standard font/.test(issue.message) || /non-photo image/.test(issue.message)) {
    return { ...issue, severity: 'info', message: `${issue.message} (Advisory: the PDF text check measures this directly.)` };
  }
  return issue;
}

/**
 * Run both halves and merge them into one verdict.
 *
 * @param {{html: string, pdf: Buffer|Uint8Array, payload: object}} input
 * @returns {Promise<{verdict: 'pass'|'warn'|'fail', score: number, grade: string, pages: number|null,
 *   issues: {severity: string, message: string, source: 'structure'|'pdf'}[], keywords: object, sections: object[]}>}
 */
export async function checkAts({ html, pdf, payload }) {
  const audit = auditAts(html);
  const issues = audit.issues.map((i) => ({ ...demoteMeasured(i), source: 'structure' }));

  let pages = null;
  let pdfCheck = { issues: [], keywords: { total: 0, found: 0, percent: 100, missing: [] }, sections: [] };
  try {
    const extracted = await extractPdfText(pdf);
    pages = extracted.pages;
    pdfCheck = checkPdfText({ text: extracted.text, payload, html });
  } catch (error) {
    pdfCheck.issues.push({ severity: 'critical', message: `The PDF's text could not be read back (${error.message}).` });
  }
  issues.push(...pdfCheck.issues.map((i) => ({ ...i, source: 'pdf' })));

  const critical = issues.some((i) => i.severity === 'critical');
  const verdict = critical || !isPass(audit, DEFAULT_MIN_SCORE) ? 'fail' : issues.some((i) => i.severity === 'warning') ? 'warn' : 'pass';
  return { verdict, score: audit.score, grade: audit.grade, pages, issues, keywords: pdfCheck.keywords, sections: pdfCheck.sections };
}
