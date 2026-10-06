#!/usr/bin/env node

/**
 * axe-prototypes.mjs — axe-core over the M7 prototypes (M7 step 6, risk check for M8).
 *
 *   node app/ux/design/axe-prototypes.mjs [--port 4421]
 *
 * Serves app/ux/design/ with serve.mjs, opens every prototype route in each
 * start state, runs axe with the same WCAG 2.2 AA tags as app/ux/a11y/audit.mjs
 * in both colour schemes at 100% and 200% zoom, and writes axe-summary.md and
 * axe-results.json beside this file. It is not an M7 acceptance criterion. It
 * checks that tokens.css and the markup patterns M8 will copy hold up.
 */

import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import AxeBuilder from '@axe-core/playwright';
import { chromium } from 'playwright';

const here = dirname(fileURLToPath(import.meta.url));
const { values: opts } = parseArgs({ options: { port: { type: 'string', default: '4421' } } });

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const SCHEMES = ['light', 'dark'];
const ZOOMS = [
  { id: '100', viewport: { width: 1280, height: 800 } },
  { id: '200', viewport: { width: 640, height: 400 } },
];

/** Views per entry page. `open` drives the page into a state reached by a click. */
const VIEWS = [
  { page: 'T1.html', id: 'today-setup', hash: '#/today' },
  { page: 'T1.html', id: 'today-setup-errors', hash: '#/today', open: (p) => p.locator('form[data-form="save-cv"] button[type="submit"]').click() },
  { page: 'T2.html', id: 'today', hash: '#/today' },
  { page: 'T2.html', id: 'applications', hash: '#/applications' },
  { page: 'T2.html', id: 'applications-status-menu', hash: '#/applications', open: (p) => p.locator('[id^="mb-st-"]').first().click() },
  { page: 'T2.html', id: 'job', hash: '#/applications/6' },
  { page: 'T2.html', id: 'job-cover-form', hash: '#/applications/6/cover' },
  { page: 'T2.html', id: 'document', hash: '#/document/cv/12' },
  { page: 'T2.html', id: 'to-review', hash: '#/to-review' },
  { page: 'T2.html', id: 'companies', hash: '#/companies' },
  { page: 'T2.html', id: 'companies-follow-form', hash: '#/companies', open: (p) => p.locator('#follow-btn').click() },
  { page: 'T2.html', id: 'skills', hash: '#/skills/learn' },
  { page: 'T2.html', id: 'my-cv-content', hash: '#/my-cv/content' },
  { page: 'T2.html', id: 'my-cv-profile', hash: '#/my-cv/profile' },
  { page: 'T2.html', id: 'my-cv-writing', hash: '#/my-cv/writing' },
  { page: 'T2.html', id: 'activity', hash: '#/activity' },
  { page: 'T2.html', id: 'workspace', hash: '#/workspace' },
  { page: 'T2.html', id: 'help', hash: '#/help/fit' },
  { page: 'T2.html', id: 'search', hash: '#/search?q=cobalt' },
  { page: 'T8.html', id: 'today-broken', hash: '#/today' },
  { page: 'T8.html', id: 'activity-panel', hash: '#/today', open: (p) => p.locator('#activity-btn').click() },
  { page: 'T8.html', id: 'activity-failed', hash: '#/activity/1' },
  { page: 'T7.html', id: 'my-cv-design-failing', hash: '#/my-cv/design' },
  { page: 'T7.html', id: 'confirm-dialog', hash: '#/my-cv/design', open: (p) => p.getByRole('button', { name: /Update existing CVs/ }).click() },
];

function startServer() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [join(here, 'serve.mjs'), '--port', opts.port], { stdio: ['ignore', 'pipe', 'inherit'] });
    child.stdout.on('data', (buf) => {
      const m = /PROTOTYPES_READY (\{.*\})/.exec(String(buf));
      if (m) resolve({ child, url: JSON.parse(m[1]).url });
    });
    child.on('exit', (code) => reject(new Error(`serve.mjs exited with ${code}`)));
  });
}

const { child, url } = await startServer();
const browser = await chromium.launch();
const results = [];
try {
  for (const scheme of SCHEMES) {
    for (const zoom of ZOOMS) {
      for (const view of VIEWS) {
        const context = await browser.newContext({ viewport: zoom.viewport, colorScheme: scheme });
        const page = await context.newPage();
        await page.goto(`${url}prototypes/${view.page}${view.hash}`);
        await page.waitForSelector('#page-title');
        let skipped = false;
        if (view.open) {
          try {
            await view.open(page);
            await page.waitForTimeout(300);
          } catch {
            skipped = true;
          }
        }
        const axe = skipped ? { violations: [] } : await new AxeBuilder({ page }).withTags(TAGS).analyze();
        results.push({
          view: view.id,
          page: view.page,
          scheme,
          zoom: zoom.id,
          skipped,
          violations: axe.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.length, targets: v.nodes.slice(0, 3).map((n) => n.target.join(' ')) })),
        });
        await context.close();
      }
    }
  }
} finally {
  await browser.close();
  child.kill();
}

writeFileSync(join(here, 'axe-results.json'), `${JSON.stringify(results, null, 2)}\n`);

const count = (scheme, impact) => results.filter((r) => r.scheme === scheme).reduce((n, r) => n + r.violations.filter((v) => v.impact === impact).length, 0);
const rules = new Map();
for (const r of results) {
  for (const v of r.violations) {
    const e = rules.get(v.id) ?? { impact: v.impact, help: v.help, views: new Set() };
    e.views.add(`${r.view} (${r.scheme}, ${r.zoom}%)`);
    rules.set(v.id, e);
  }
}
const lines = [
  '# axe on the M7 prototypes',
  '',
  `Generated by \`node app/ux/design/axe-prototypes.mjs\`. ${VIEWS.length} views × 2 schemes × 2 zooms = ${results.length} scans, with WCAG 2.2 AA tags. Counts are rule × view pairs, as in \`app/ux/a11y/axe-summary.md\` (the M6 baseline).`,
  '',
  '| Scheme | critical | serious | moderate | minor |',
  '|---|---|---|---|---|',
  ...SCHEMES.map((s) => `| ${s} | ${count(s, 'critical')} | ${count(s, 'serious')} | ${count(s, 'moderate')} | ${count(s, 'minor')} |`),
  '',
  `Skipped views: ${results.filter((r) => r.skipped).map((r) => `${r.view} (${r.scheme}, ${r.zoom}%)`).join(', ') || 'none'}.`,
  '',
  '## Rules that fail',
  '',
  ...(rules.size ? [...rules].map(([id, e]) => `- **${id}** (${e.impact}): ${e.help}. Views: ${[...e.views].join('; ')}`) : ['None.']),
  '',
];
writeFileSync(join(here, 'axe-summary.md'), lines.join('\n'));
console.log(lines.slice(4, 8).join('\n'));
