#!/usr/bin/env node

/**
 * audit.mjs — the scripted half of the accessibility audit (PROJECT_PLAN.md §12.2 #6).
 *
 *   node app/ux/a11y/audit.mjs [--port 4410] [--out app/ux/a11y]
 *
 * Starts the UX sandbox in each state, opens every page (and the states a page
 * only reaches through a click: an open report, the cover-letter dialog, an
 * open run log), and runs axe-core with the WCAG 2.2 AA rule set in both colour
 * schemes, at 100% and at 200% zoom (a viewport half as wide, which is what
 * browser zoom does to the layout). Writes:
 *
 *   axe-results.json   every violation, per view
 *   axe-summary.md     counts by impact per scheme, and each rule once with the
 *                      views it fails on
 *   shots/             one screenshot per view, for evidence
 *
 * M8 re-runs this unchanged; the keyboard, focus and screen-reader passes are
 * the a11y-auditor agent's, not this script's.
 */

import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import AxeBuilder from '@axe-core/playwright';
import { chromium } from 'playwright';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..', '..', '..');
const { values: opts } = parseArgs({
  options: {
    port: { type: 'string', default: '4410' },
    out: { type: 'string', default: here },
  },
});
const out = resolve(opts.out);
const shots = join(out, 'shots');
mkdirSync(shots, { recursive: true });

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const SCHEMES = ['light', 'dark'];
const ZOOMS = [
  { id: '100', viewport: { width: 1280, height: 800 } },
  { id: '200', viewport: { width: 640, height: 400 } },
];

/**
 * The views per sandbox state. `open` drives the page into the state; a view
 * whose control is missing is recorded as skipped rather than failing the run.
 */
const VIEWS = {
  populated: [
    { id: 'pipeline', hash: '#/pipeline' },
    { id: 'report-detail', hash: '#/pipeline', open: async (page) => page.locator('tbody tr').first().click() },
    {
      id: 'report-pdf-tab',
      hash: '#/pipeline',
      open: async (page) => {
        await page.locator('tbody tr').first().click();
        await page.getByRole('tab', { name: /PDF/ }).click();
      },
    },
    {
      id: 'cover-dialog',
      hash: '#/pipeline',
      open: async (page) => {
        await page.locator('tbody tr').first().click();
        await page.getByRole('button', { name: /^Cover letter$/ }).first().click();
      },
    },
    { id: 'sources', hash: '#/sources' },
    { id: 'sources-add-form', hash: '#/sources', open: async (page) => page.getByRole('button', { name: /^Add$/ }).first().click() },
    { id: 'skills', hash: '#/skills' },
    { id: 'skills-expanded', hash: '#/skills', open: async (page) => page.locator('button[aria-expanded]').first().click() },
    { id: 'runs', hash: '#/runs' },
    { id: 'cv-studio', hash: '#/cv' },
  ],
  empty: [
    { id: 'pipeline', hash: '#/pipeline' },
    { id: 'sources', hash: '#/sources' },
    { id: 'skills', hash: '#/skills' },
    { id: 'runs', hash: '#/runs' },
    { id: 'cv-studio', hash: '#/cv' },
  ],
  broken: [
    { id: 'pipeline-issues', hash: '#/pipeline' },
    { id: 'runs-failed', hash: '#/runs', open: async (page) => page.locator('tbody tr').first().click() },
    { id: 'cv-studio-ats-fail', hash: '#/cv' },
  ],
};

/** Start one sandbox and resolve with its URL once it prints SANDBOX_READY. */
function startSandbox(state, port) {
  return new Promise((resolveStart, reject) => {
    const child = spawn(process.execPath, [join(repoRoot, 'app', 'ux', 'sandbox.mjs'), '--state', state, '--port', String(port), '--delay', '0'], {
      cwd: repoRoot,
      stdio: ['ignore', 'pipe', 'inherit'],
      windowsHide: true,
    });
    let buffer = '';
    child.stdout.on('data', (chunk) => {
      buffer += chunk;
      const line = /SANDBOX_READY (.+)/.exec(buffer)?.[1];
      if (line) resolveStart({ child, info: JSON.parse(line) });
    });
    child.on('exit', (code) => reject(new Error(`sandbox ${state} exited with ${code} before it was ready`)));
  });
}

function stopSandbox(child) {
  return new Promise((done) => {
    child.removeAllListeners('exit');
    child.on('exit', () => done());
    child.kill('SIGTERM');
    setTimeout(done, 3000);
  });
}

/** Let the SPA finish its first loads: network idle, then a beat for the event stream's first render. */
async function settle(page) {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(400);
}

const results = [];
const browser = await chromium.launch();
let port = Number.parseInt(opts.port, 10);

try {
  for (const [state, views] of Object.entries(VIEWS)) {
    const { child, info } = await startSandbox(state, port++);
    console.log(`${state}: ${info.url}`);
    try {
      for (const scheme of SCHEMES) {
        for (const zoom of ZOOMS) {
          const context = await browser.newContext({ colorScheme: scheme, viewport: zoom.viewport });
          const page = await context.newPage();
          for (const view of views) {
            const key = `${state}/${view.id}/${scheme}/${zoom.id}`;
            await page.goto(`${info.url}${view.hash}`);
            await settle(page);
            if (view.open) {
              try {
                await view.open(page);
                await settle(page);
              } catch (error) {
                results.push({ key, state, view: view.id, scheme, zoom: zoom.id, skipped: `could not open: ${error.message.split('\n')[0]}` });
                console.log(`  ${key}: skipped`);
                continue;
              }
            }
            const shot = join(shots, `${state}-${view.id}-${scheme}-${zoom.id}.png`);
            await page.screenshot({ path: shot, fullPage: zoom.id === '100' });
            const axe = await new AxeBuilder({ page }).withTags(TAGS).analyze();
            const violations = axe.violations.map((v) => ({
              id: v.id,
              impact: v.impact,
              help: v.help,
              helpUrl: v.helpUrl,
              nodes: v.nodes.length,
              targets: v.nodes.slice(0, 6).map((n) => n.target.join(' ')),
              summary: v.nodes[0]?.failureSummary ?? null,
            }));
            results.push({ key, state, view: view.id, scheme, zoom: zoom.id, screenshot: relative(out, shot).replace(/\\/g, '/'), violations });
            console.log(`  ${key}: ${violations.length} rule(s) violated`);
          }
          await context.close();
        }
      }
    } finally {
      await stopSandbox(child);
    }
  }
} finally {
  await browser.close();
}

// ── summary ───────────────────────────────────────────────────────────

const IMPACTS = ['critical', 'serious', 'moderate', 'minor'];
const rules = new Map();
const counts = Object.fromEntries(SCHEMES.map((s) => [s, Object.fromEntries(IMPACTS.map((i) => [i, new Set()]))]));
for (const r of results) {
  for (const v of r.violations ?? []) {
    // A rule failing on a view counts once per scheme, whatever the zoom.
    counts[r.scheme][v.impact]?.add(`${v.id}@${r.state}/${r.view}`);
    if (!rules.has(v.id)) rules.set(v.id, { ...v, views: new Set() });
    rules.get(v.id).views.add(`${r.state}/${r.view} (${r.scheme}, ${r.zoom}%)`);
  }
}

const lines = [
  '# axe-core results',
  '',
  `Generated by \`app/ux/a11y/audit.mjs\` on ${new Date().toISOString().slice(0, 10)}. Rule set: ${TAGS.join(', ')}.`,
  'Counts are distinct (rule, view) pairs per colour scheme, at any zoom.',
  '',
  '| Scheme | Critical | Serious | Moderate | Minor |',
  '|---|---|---|---|---|',
  ...SCHEMES.map((s) => `| ${s} | ${IMPACTS.map((i) => counts[s][i].size).join(' | ')} |`),
  '',
  '## Rules violated',
  '',
  ...[...rules.values()]
    .sort((a, b) => IMPACTS.indexOf(a.impact) - IMPACTS.indexOf(b.impact) || a.id.localeCompare(b.id))
    .flatMap((r) => [
      `### ${r.id} (${r.impact})`,
      '',
      `${r.help}. ${r.helpUrl}`,
      '',
      `Example targets: ${r.targets.map((t) => `\`${t}\``).join(', ')}`,
      '',
      `Fails on: ${[...r.views].sort().join('; ')}`,
      '',
    ]),
  '## Views skipped',
  '',
  ...(results.filter((r) => r.skipped).map((r) => `- ${r.key}: ${r.skipped}`).concat(results.some((r) => r.skipped) ? [] : ['None.'])),
  '',
];

writeFileSync(join(out, 'axe-results.json'), `${JSON.stringify(results, null, 2)}\n`);
writeFileSync(join(out, 'axe-summary.md'), lines.join('\n'));
console.log(`\n${SCHEMES.map((s) => `${s}: ${counts[s].critical.size} critical, ${counts[s].serious.size} serious`).join(' · ')}`);
console.log(`Wrote ${relative(process.cwd(), join(out, 'axe-summary.md'))}`);
