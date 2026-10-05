#!/usr/bin/env node

/**
 * render-cv.js — render a CV to PDF with the console's style applied.
 *
 *   node app/cv/render-cv.js <in.html> <out.pdf> [--format=letter|a4] [--report=NNN] [--keep]
 *   node app/cv/render-cv.js --document=<id> [--template=<name>] [--report=NNN] [--date=YYYY-MM-DD]
 *
 * **HTML mode** (M3) is the fork-owned step between `build-cv-html.mjs` and
 * `generate-pdf.mjs`: it reads `config/cv/style.yml`, applies the tokens, the
 * density rules and the section order to the HTML (`theme.js`), writes the
 * themed copy next to the original inside `output/`, and then runs upstream's
 * `generate-pdf.mjs` on that copy — so Chromium, the fact/section guards, the
 * page budget and `data/pdf-index.tsv` all stay upstream's. `--allow-reorder`
 * is passed because a reordered CV is exactly what the section tokens ask for.
 *
 * **Document mode** (M5, PROJECT_PLAN.md §7c) renders a structured CV — a
 * `build-cv-html.mjs` payload in `output/`, named by its id in the CV library —
 * with no agent at all:
 *
 *   build-cv-html.mjs payload → output/<id>.html   in the chosen theme
 *   verify-cv-facts.mjs        the fact gate, a hard stop as in every PDF run
 *   HTML mode                  → output/<id>-<date>.pdf, recorded in pdf-index
 *   ATS guardrail (§7d)        verdict printed and saved to data/jsc/cv/ats/
 *
 * which is how a past CV is re-rendered in a new theme, and how the console
 * renders the payload a structured PDF run's agent wrote. A failing ATS check
 * is reported loudly but does not fail the render: the PDF is the user's to
 * judge, and the warning is what §7d requires.
 *
 * Upstream's renderer re-applies profile.yml's own `style:` block *after* this
 * one, so a token set there still wins; the console warns about that in CV
 * Studio rather than fighting it here.
 *
 * Exit code is the first failing step's. Nothing here needs Playwright until a
 * child runs, which keeps `theme.js` unit-testable.
 */

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getCareerOpsRoot } from '../../path-resolver.mjs';
import { checkAts, writeAtsRecord } from '../server/services/ats.js';
import { getCvDocument } from '../server/services/cvdocs.js';
import { buildThemedHtml, loadStyle, resolveTemplatePath, validateStyle } from './theme.js';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Parse argv; exported so the test can pin the child's command line without Chromium. */
export function parseArgs(argv) {
  const positional = argv.filter((a) => !a.startsWith('--'));
  const flag = (name) => argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? null;
  return {
    input: positional[0] ?? null,
    output: positional[1] ?? null,
    format: flag('format') ?? 'a4',
    report: flag('report'),
    keep: argv.includes('--keep'),
    maxPages: flag('max-pages'),
    strictPages: argv.includes('--strict-pages'),
    document: flag('document'),
    template: flag('template'),
    date: flag('date'),
  };
}

/** The exact generate-pdf.mjs invocation for a themed copy. */
export function generateArgs({ themedPath, output, format, report, maxPages, strictPages }) {
  return [
    join(repoRoot, 'generate-pdf.mjs'),
    themedPath,
    output,
    `--format=${format}`,
    ...(report ? [`--report=${report}`] : []),
    '--allow-reorder',
    ...(maxPages ? [`--max-pages=${maxPages}`] : []),
    ...(strictPages ? ['--strict-pages'] : []),
  ];
}

/**
 * The fact gate's argv, with its sources named under the data root.
 *
 * verify-cv-facts.mjs resolves its default sources (`cv.md`,
 * `article-digest.md`) against its cwd and its config against its own
 * directory — the repository either way. That is the data root in the usual
 * setup, but a render confined to another root (the UX sandbox, a test) would
 * otherwise check that root's CV against the repository's cv.md. Naming the
 * paths keeps the usual setup identical and the confined one honest.
 */
export function factGateArgs(html, root) {
  return [
    join(repoRoot, 'verify-cv-facts.mjs'),
    html,
    '--source', join(root, 'cv.md'),
    '--source', join(root, 'article-digest.md'),
    '--config', join(root, 'config', 'cv-facts.json'),
  ];
}

/** Run a Node script with output passed through; resolves with its exit code. */
function runNode(spawnFn, args, label) {
  return new Promise((done) => {
    const child = spawnFn(process.execPath, args, { cwd: repoRoot, stdio: 'inherit', windowsHide: true });
    child.on('error', (error) => {
      console.error(`Could not run ${label}: ${error.message}`);
      done(1);
    });
    child.on('close', (exit) => done(exit ?? 1));
  });
}

/**
 * Theme one built HTML file and render it through generate-pdf.mjs.
 *
 * @returns {Promise<{code: number, themedHtml: string, themedPath: string}>}
 */
async function renderHtml({ input, output, format, report, maxPages, strictPages, style, spawnFn, reorder, log }) {
  const reorderFn = reorder ?? (style.sections?.length >= 2 ? (await import('../../generate-pdf.mjs')).reorderCvSections : null);
  const { html, applied } = buildThemedHtml(readFileSync(input, 'utf-8'), style, { reorder: reorderFn });
  log(`🎨 Style applied: ${applied.length ? applied.join(', ') : 'nothing set — template defaults'}`);

  // Beside the original, so generate-pdf.mjs's "inside the workspace" guard and
  // its relative font paths both hold.
  const themedPath = join(dirname(input), `${basename(input, '.html')}.themed.html`);
  mkdirSync(dirname(themedPath), { recursive: true });
  writeFileSync(themedPath, html, 'utf-8');

  const code = await runNode(spawnFn, generateArgs({ themedPath, output, format, report, maxPages, strictPages }), 'generate-pdf.mjs');
  return { code, themedHtml: html, themedPath };
}

const warnStyle = (errors) => {
  for (const e of errors) console.warn(`⚠️  config/cv/style.yml ${e.key ? `${e.key}: ` : ''}${e.message}`);
};

/**
 * @param {string[]} argv
 * @param {{spawnFn?: Function, root?: string, reorder?: Function, log?: Function, ats?: Function}} [deps]
 * @returns {Promise<number>} Exit code.
 */
export async function main(argv, deps = {}) {
  const args = parseArgs(argv);
  if (args.document) return renderDocument(args, deps);

  const { spawnFn = spawn, root = getCareerOpsRoot(), reorder, log = console.log } = deps;
  if (!args.input || !args.output) {
    console.error('Usage: node app/cv/render-cv.js <in.html> <out.pdf> [--format=letter|a4] [--report=NNN] [--keep]');
    console.error('       node app/cv/render-cv.js --document=<id> [--template=<name>] [--report=NNN] [--date=YYYY-MM-DD]');
    return 2;
  }
  if (!['letter', 'a4'].includes(args.format)) {
    console.error(`--format must be letter or a4, not "${args.format}"`);
    return 2;
  }
  const input = resolve(args.input);
  if (!existsSync(input)) {
    console.error(`No such file: ${input}`);
    return 2;
  }

  const { style, errors, exists } = loadStyle({ root });
  warnStyle(errors);
  if (!exists) log('🎨 No config/cv/style.yml — template defaults');

  const { code, themedPath } = await renderHtml({ ...args, input, output: resolve(args.output), style, spawnFn, reorder, log });
  if (code === 0 && !args.keep) rmSync(themedPath, { force: true });
  return code;
}

/** Check the finished PDF against the guardrail, record the verdict, and say it loudly. */
async function defaultAts({ root, pdfPath, html, payload, log }) {
  const result = await checkAts({ html, pdf: readFileSync(pdfPath), payload });
  writeAtsRecord(root, basename(pdfPath), result);
  const critical = result.issues.filter((i) => i.severity === 'critical');
  const warnings = result.issues.filter((i) => i.severity === 'warning');
  if (result.verdict === 'fail') {
    console.error(`🚨 ATS CHECK FAILED (score ${result.score}): an applicant-tracking system will lose part of this CV.`);
    for (const i of [...critical, ...warnings]) console.error(`   • ${i.message}`);
  } else {
    log(`🛡️  ATS check: ${result.verdict} (score ${result.score}, keywords ${result.keywords.percent}%, ${result.pages ?? '?'} page(s))`);
    for (const i of warnings) log(`   ⚠️  ${i.message}`);
  }
  return result;
}

/**
 * Document mode: payload → themed HTML → fact gate → PDF → ATS verdict.
 *
 * @returns {Promise<number>}
 */
export async function renderDocument(args, { spawnFn = spawn, root = getCareerOpsRoot(), reorder, log = console.log, ats = defaultAts } = {}) {
  let doc;
  try {
    doc = getCvDocument(args.document, { root });
  } catch (error) {
    console.error(error.message);
    return 2;
  }
  if (doc.sample) {
    console.error('The sample CV is for previews only; it cannot be rendered into output/.');
    return 2;
  }
  const date = args.date ?? new Date().toISOString().slice(0, 10);
  if (!DATE_RE.test(date)) {
    console.error(`--date must be YYYY-MM-DD, not "${date}"`);
    return 2;
  }
  if (args.report !== null && !/^\d{1,6}$/.test(args.report)) {
    console.error(`--report must be a report number, not "${args.report}"`);
    return 2;
  }

  const loaded = loadStyle({ root });
  warnStyle(loaded.errors);
  const { style, errors } = validateStyle({ ...loaded.style, template: args.template ?? loaded.style.template });
  if (errors.length) {
    console.error(`--template: ${errors[0].message}`);
    return 2;
  }
  let template;
  try {
    template = resolveTemplatePath(style, { root, repoRoot });
  } catch (error) {
    console.error(`Template "${style.template}" is not available: ${error.message}`);
    return 2;
  }

  const dir = dirname(doc.path);
  const html = join(dir, `${doc.id}.html`);
  const pdf = join(dir, `${doc.id}-${date}.pdf`);
  const format = doc.payload.page_format === 'letter' ? 'letter' : 'a4';
  const report = args.report ?? (doc.reportId === null ? null : String(doc.reportId).padStart(3, '0'));
  log(`📄 ${doc.id} → theme ${template.name} (${template.source}) · ${format}${report ? ` · report ${report}` : ''}`);

  let code = await runNode(spawnFn, [join(repoRoot, 'build-cv-html.mjs'), doc.path, html, template.path], 'build-cv-html.mjs');
  if (code !== 0) {
    console.error('❌ build-cv-html.mjs could not build the CV from its payload.');
    return code;
  }
  code = await runNode(spawnFn, factGateArgs(html, root), 'verify-cv-facts.mjs');
  if (code !== 0) {
    console.error('❌ The fact gate (verify-cv-facts.mjs) failed — nothing was rendered.');
    return code;
  }

  const rendered = await renderHtml({ input: html, output: pdf, format, report, style, spawnFn, reorder, log });
  try {
    if (rendered.code !== 0) return rendered.code;
    if (!existsSync(pdf)) {
      console.error(`❌ generate-pdf.mjs exited 0 but ${basename(pdf)} is not there.`);
      return 1;
    }
    try {
      await ats({ root, pdfPath: pdf, html: rendered.themedHtml, payload: doc.payload, log });
    } catch (error) {
      console.error(`⚠️  The ATS check could not run: ${error.message}`);
    }
    return 0;
  } finally {
    rmSync(rendered.themedPath, { force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await main(process.argv.slice(2));
}
