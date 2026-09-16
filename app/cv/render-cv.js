#!/usr/bin/env node

/**
 * render-cv.js — render a built CV with the console's style applied.
 *
 *   node app/cv/render-cv.js <in.html> <out.pdf> [--format=letter|a4] [--report=NNN] [--keep]
 *
 * The fork-owned step between `build-cv-html.mjs` and `generate-pdf.mjs`: it
 * reads `config/cv/style.yml`, applies the tokens, the density rules and the
 * section order to the HTML (`theme.js`), writes the themed copy next to the
 * original inside `output/`, and then runs upstream's `generate-pdf.mjs` on
 * that copy — so Chromium, the fact/section guards, the page budget and
 * `data/pdf-index.tsv` all stay upstream's. `--allow-reorder` is passed
 * because a reordered CV is exactly what the section tokens ask for.
 *
 * Upstream's renderer re-applies profile.yml's own `style:` block *after* this
 * one, so a token set there still wins; the console warns about that in CV
 * Studio rather than fighting it here.
 *
 * Exit code is generate-pdf.mjs's. Nothing here needs Playwright until the
 * child runs, which keeps `theme.js` unit-testable.
 */

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getCareerOpsRoot } from '../../path-resolver.mjs';
import { buildThemedHtml, loadStyle } from './theme.js';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

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
 * @param {string[]} argv
 * @param {{spawnFn?: Function, root?: string, reorder?: Function, log?: Function}} [deps]
 * @returns {Promise<number>} Exit code.
 */
export async function main(argv, { spawnFn = spawn, root = getCareerOpsRoot(), reorder, log = console.log } = {}) {
  const args = parseArgs(argv);
  if (!args.input || !args.output) {
    console.error('Usage: node app/cv/render-cv.js <in.html> <out.pdf> [--format=letter|a4] [--report=NNN] [--keep]');
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
  for (const e of errors) console.warn(`⚠️  config/cv/style.yml ${e.key ? `${e.key}: ` : ''}${e.message}`);

  // Lazy: this is the only place Playwright gets loaded, and only when a
  // section order actually needs upstream's reorder.
  const reorderFn = reorder ?? (style.sections?.length >= 2 ? (await import('../../generate-pdf.mjs')).reorderCvSections : null);
  const { html, applied } = buildThemedHtml(readFileSync(input, 'utf-8'), style, { reorder: reorderFn });
  log(exists ? `🎨 Style applied: ${applied.length ? applied.join(', ') : 'nothing set — template defaults'}` : '🎨 No config/cv/style.yml — template defaults');

  // Beside the original, so generate-pdf.mjs's "inside the workspace" guard and
  // its relative font paths both hold.
  const themedPath = join(dirname(input), `${basename(input, '.html')}.themed.html`);
  mkdirSync(dirname(themedPath), { recursive: true });
  writeFileSync(themedPath, html, 'utf-8');

  const childArgs = generateArgs({ themedPath, output: resolve(args.output), ...args });
  const code = await new Promise((done) => {
    const child = spawnFn(process.execPath, childArgs, { cwd: repoRoot, stdio: 'inherit', windowsHide: true });
    child.on('error', (error) => {
      console.error(`Could not run generate-pdf.mjs: ${error.message}`);
      done(1);
    });
    child.on('close', (exit) => done(exit ?? 1));
  });

  if (code === 0 && !args.keep) rmSync(themedPath, { force: true });
  return code;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await main(process.argv.slice(2));
}
