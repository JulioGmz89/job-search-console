/**
 * theme.js — the fork's CV style tokens (PROJECT_PLAN.md §7a).
 *
 * `config/cv/style.yml` is the console's own, gitignored style file. Its
 * tokens land on upstream's templates in two ways:
 *
 * - The four custom properties every shipped template already reads
 *   (`--accent-color`, `--font-family`, `--font-size`, `--page-margin`) are
 *   injected exactly as upstream's `theme-style.mjs` injects profile.yml's
 *   `style:` block — same function, same sanitizing.
 * - Anything the templates have no variable for (density, a heading font) is
 *   a small `<style id="jsc-style">` block of ordinary rule overrides.
 *
 * Section order goes through upstream's own `reorderCvSections`, and the
 * template name resolves to a fork-owned file in `config/cv/templates/` before
 * falling back to upstream's `templates/cv-template.<name>.html`.
 *
 * Pure: no rendering here. `render-cv.js` is the CLI that applies this and
 * then hands the themed HTML to `generate-pdf.mjs`, so upstream keeps owning
 * Chromium, the page budget and `data/pdf-index.tsv`.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';

import yaml from 'js-yaml';

import { listTemplates, resolveTemplate } from '../../cv-templates.mjs';
import { injectThemeStyle, STYLE_VAR_MAP } from '../../theme-style.mjs';

/** Canonical section keys, copied from generate-pdf.mjs so this module stays Playwright-free at import. */
export const CV_SECTION_KEYS = Object.freeze([
  'summary',
  'competencies',
  'experience',
  'projects',
  'education',
  'certifications',
  'awards',
  'skills',
  'interests',
]);

export const DENSITIES = Object.freeze({
  compact: { lineHeight: 1.25, blockGap: '6px', label: 'Compact — fits more on a page' },
  normal: { lineHeight: null, blockGap: null, label: 'Normal — the template as designed' },
  relaxed: { lineHeight: 1.55, blockGap: '14px', label: 'Relaxed — more air between blocks' },
});

/** The keys style.yml may carry, with a one-line meaning for the UI. */
export const STYLE_FIELDS = Object.freeze({
  accent_color: 'Colour of the name bar, section titles and highlights (any CSS colour).',
  font_family: 'Body font stack, e.g. "DM Sans, Arial, sans-serif". Needs to exist on this machine or in fonts/.',
  heading_font_family: 'Optional font stack for the name and section titles.',
  font_size: 'Base body size, e.g. 10.5pt or 11px.',
  margin: 'Page margin, e.g. 0.6in or 15mm.',
  density: 'compact | normal | relaxed — line height and spacing between blocks.',
  template: 'Which template renders the CV: one of upstream’s (standard, modern, compact…) or a file in config/cv/templates/.',
  sections: 'Order for the named sections; unnamed ones keep the template’s place.',
});

/** Fonts shipped in upstream's fonts/ that a token may name; inlined by generate-pdf.mjs. */
const BUNDLED_FONTS = Object.freeze({
  'dm sans': { family: 'DM Sans', files: ['dm-sans-latin.woff2', 'dm-sans-latin-ext.woff2'] },
  'space grotesk': { family: 'Space Grotesk', files: ['space-grotesk-latin.woff2', 'space-grotesk-latin-ext.woff2'] },
});

export const DEFAULT_STYLE = Object.freeze({
  accent_color: null,
  font_family: null,
  heading_font_family: null,
  font_size: null,
  margin: null,
  density: 'normal',
  template: 'standard',
  sections: [],
});

const CSS_UNSAFE = /[;{}<>]/;
const FONT_RE = /^[\w\s,'"-]{1,200}$/;
const SIZE_RE = /^\d+(\.\d+)?(pt|px|em|rem)$/;
const MARGIN_RE = /^\d+(\.\d+)?(in|cm|mm|pt|px)(\s+\d+(\.\d+)?(in|cm|mm|pt|px)){0,3}$/;
const COLOR_RE = /^(#[0-9a-fA-F]{3,8}|(rgb|rgba|hsl|hsla)\([\d\s.,%/]+\)|[a-zA-Z]{3,30})$/;
const NAME_RE = /^[a-z0-9][a-z0-9-]{0,60}$/;

/**
 * Check a candidate style object.
 *
 * @param {unknown} input
 * @returns {{style: object, errors: {key: string, message: string}[]}} `style`
 *   holds only recognized keys, cleaned; unknown keys are dropped, not errors.
 */
export function validateStyle(input) {
  const errors = [];
  const style = { ...DEFAULT_STYLE };
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { style, errors: input == null ? [] : [{ key: '', message: 'style must be a mapping' }] };
  }
  const str = (key) => {
    const v = input[key];
    if (v === undefined || v === null || v === '') return null;
    if (typeof v !== 'string') {
      errors.push({ key, message: 'must be text' });
      return null;
    }
    return v.trim();
  };

  const color = str('accent_color');
  if (color !== null) {
    if (COLOR_RE.test(color) && !CSS_UNSAFE.test(color)) style.accent_color = color;
    else errors.push({ key: 'accent_color', message: 'use a hex, rgb(), hsl() or named CSS colour' });
  }
  for (const key of ['font_family', 'heading_font_family']) {
    const font = str(key);
    if (font === null) continue;
    if (FONT_RE.test(font) && !CSS_UNSAFE.test(font)) style[key] = font;
    else errors.push({ key, message: 'font stacks may only contain letters, digits, spaces, commas, quotes and dashes' });
  }
  const size = str('font_size');
  if (size !== null) {
    if (SIZE_RE.test(size)) style.font_size = size;
    else errors.push({ key: 'font_size', message: 'use a size like 10.5pt or 11px' });
  }
  const margin = str('margin');
  if (margin !== null) {
    if (MARGIN_RE.test(margin)) style.margin = margin;
    else errors.push({ key: 'margin', message: 'use a length like 0.6in, 15mm or 40px (up to four values)' });
  }
  const density = str('density');
  if (density !== null) {
    if (density in DENSITIES) style.density = density;
    else errors.push({ key: 'density', message: `one of ${Object.keys(DENSITIES).join(', ')}` });
  }
  const template = str('template');
  if (template !== null) {
    if (NAME_RE.test(template)) style.template = template;
    else errors.push({ key: 'template', message: 'a template name: lowercase letters, digits and dashes' });
  }
  if (input.sections !== undefined && input.sections !== null) {
    if (!Array.isArray(input.sections)) errors.push({ key: 'sections', message: 'must be a list of section names' });
    else {
      const seen = new Set();
      const clean = [];
      for (const raw of input.sections) {
        const name = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
        if (!CV_SECTION_KEYS.includes(name)) errors.push({ key: 'sections', message: `"${raw}" is not a CV section (${CV_SECTION_KEYS.join(', ')})` });
        else if (seen.has(name)) errors.push({ key: 'sections', message: `"${name}" is listed twice` });
        else {
          seen.add(name);
          clean.push(name);
        }
      }
      if (clean.length === 1) errors.push({ key: 'sections', message: 'name at least two sections, or none — one name states no order' });
      style.sections = clean;
    }
  }
  return { style, errors };
}

export function stylePath(root) {
  return join(root, 'config', 'cv', 'style.yml');
}

export function customTemplatesDir(root) {
  return join(root, 'config', 'cv', 'templates');
}

/**
 * Read and validate `config/cv/style.yml`. Never throws: a broken file is
 * reported and the defaults apply, so a typo can never stop a PDF.
 *
 * @param {{root: string}} options
 * @returns {{path: string, exists: boolean, style: object, errors: object[], raw: object|null}}
 */
export function loadStyle({ root }) {
  const path = stylePath(root);
  if (!existsSync(path)) return { path, exists: false, style: { ...DEFAULT_STYLE }, errors: [], raw: null };
  let raw;
  try {
    raw = yaml.load(readFileSync(path, 'utf-8'), { schema: yaml.JSON_SCHEMA }) ?? {};
  } catch (error) {
    return { path, exists: true, style: { ...DEFAULT_STYLE }, errors: [{ key: '', message: `style.yml does not parse: ${error.message}` }], raw: null };
  }
  const { style, errors } = validateStyle(raw);
  return { path, exists: true, style, errors, raw };
}

/** The four custom properties upstream's templates read, from our tokens. */
export function styleToTokens(style) {
  const tokens = {};
  const map = { accent_color: 'accent_color', font_family: 'font_family', font_size: 'font_size', margin: 'margin' };
  for (const [ours, theirs] of Object.entries(map)) {
    if (style[ours]) tokens[STYLE_VAR_MAP[theirs]] = style[ours];
  }
  return tokens;
}

/** `@font-face` rules for bundled fonts a stack names, so generate-pdf.mjs can inline them. */
function fontFaces(...stacks) {
  const rules = [];
  const named = stacks.filter(Boolean).join(',').toLowerCase();
  for (const [needle, font] of Object.entries(BUNDLED_FONTS)) {
    if (!named.includes(needle)) continue;
    for (const file of font.files) {
      rules.push(`@font-face { font-family: "${font.family}"; src: url('./fonts/${file}') format('woff2'); font-display: swap; }`);
    }
  }
  return rules;
}

/**
 * Apply the style to a rendered CV.
 *
 * @param {string} html - Output of `build-cv-html.mjs`.
 * @param {object} style - A validated style.
 * @param {{reorder?: (html: string, order: string[]) => string}} [deps] -
 *   `reorder` is upstream's `reorderCvSections`; injectable because importing
 *   generate-pdf.mjs loads Playwright, which unit tests have no use for.
 * @returns {{html: string, applied: string[]}}
 */
export function buildThemedHtml(html, style, { reorder = null } = {}) {
  const applied = [];
  let out = html;

  const tokens = styleToTokens(style);
  if (Object.keys(tokens).length) {
    out = injectThemeStyle(out, tokens);
    applied.push(...Object.keys(tokens));
  }

  const rules = fontFaces(style.font_family, style.heading_font_family);
  const density = DENSITIES[style.density] ?? DENSITIES.normal;
  if (density.lineHeight) {
    rules.push(`body { line-height: ${density.lineHeight}; }`);
    rules.push(`section, .section, .job, .entry, .project, .role { margin-bottom: ${density.blockGap}; }`);
    applied.push(`density:${style.density}`);
  }
  if (style.heading_font_family) {
    rules.push(`h1, h2, h3, .name, .section-title { font-family: ${style.heading_font_family}; }`);
    applied.push('heading_font_family');
  }
  if (rules.length) {
    const block = `<style id="jsc-style">\n${rules.join('\n')}\n</style>`;
    // A replacer function, never a string: a `$'` in a font name would
    // otherwise splice the document into itself (see theme-style.mjs).
    out = /<\/head>/i.test(out) ? out.replace(/<\/head>/i, () => `${block}\n</head>`) : `${block}\n${out}`;
  }

  if (style.sections?.length >= 2 && reorder) {
    out = reorder(out, style.sections);
    applied.push(`sections:${style.sections.join('>')}`);
  }
  return { html: out, applied };
}

/**
 * Which template file renders the CV.
 *
 * @param {object} style
 * @param {{root: string, repoRoot: string}} paths
 * @returns {{path: string, name: string, source: 'custom'|'upstream'|'default'}}
 */
export function resolveTemplatePath(style, { root, repoRoot }) {
  const name = style.template || 'standard';
  const custom = join(customTemplatesDir(root), `${name}.html`);
  if (existsSync(custom)) return { path: custom, name, source: 'custom' };
  if (name === 'standard') return { path: join(repoRoot, 'templates', 'cv-template.html'), name, source: 'default' };
  return { path: resolveTemplate('cv', name, { dir: join(repoRoot, 'templates') }), name, source: 'upstream' };
}

/** Every template the picker can offer: upstream's by name, plus the user's own files. */
export function listCvTemplates({ root, repoRoot }) {
  const upstream = listTemplates('cv', { dir: join(repoRoot, 'templates') }).map((t) => ({
    name: t.name,
    displayName: t.displayName ?? t.name,
    source: 'upstream',
    path: t.path,
  }));
  const dir = customTemplatesDir(root);
  const custom = existsSync(dir)
    ? readdirSync(dir)
        .filter((f) => f.endsWith('.html'))
        .map((f) => ({ name: basename(f, '.html'), displayName: basename(f, '.html'), source: 'custom', path: join(dir, f) }))
    : [];
  // A custom file shadows an upstream template of the same name, as resolveTemplatePath does.
  const shadowed = new Set(custom.map((t) => t.name));
  return [...custom, ...upstream.filter((t) => !shadowed.has(t.name))];
}
