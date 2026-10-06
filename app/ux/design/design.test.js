/**
 * design.test.js — PROJECT_PLAN.md §8 M7 acceptance, checked from the files in app/ux/design/.
 *
 *   1. The sitemap places every inventory capability, or gives the reason it has no UI.
 *   2. The brief and the sitemap cover every open severity-3/4 finding of the M6 backlog.
 *   3. tokens.css defines its colours in both schemes, and every listed pair meets
 *      WCAG contrast: 4.5:1 for text, 3:1 for UI. This is pure luminance maths, no browser.
 *   4. A clickable prototype exists for every top task, and every local link resolves.
 *   5. The walkthrough re-run on the prototypes finds no severity-3 or -4 issue.
 *   6. decisions.md records the maintainer's approval of one direction.
 */

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const ux = resolve(here, '..');
const read = (p) => readFileSync(join(here, p), 'utf-8');
const TASKS = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9'];

/** Row ids of the inventory's four measured tables (R-, K-, C-, UI-). */
function inventoryIds() {
  const text = readFileSync(join(ux, 'inventory.md'), 'utf-8');
  return [...text.matchAll(/^\| ((?:R|K|C|UI)-[a-z0-9-]+) \|/gm)].map((m) => m[1]);
}

test('the sitemap places every inventory capability exactly once', () => {
  const ids = inventoryIds();
  assert.equal(ids.length, 191, 'inventory row count changed; update the sitemap with it');
  const rows = new Map();
  for (const line of read('sitemap.md').split(/\r?\n/)) {
    const m = /^\| ((?:R|K|C|UI)-[a-z0-9-]+) \|(.*)\|\s*$/.exec(line);
    if (!m) continue;
    assert.ok(!rows.has(m[1]), `${m[1]} appears twice in sitemap.md`);
    rows.set(m[1], m[2].split('|').map((c) => c.trim()));
  }
  for (const id of ids) {
    const cells = rows.get(id);
    assert.ok(cells, `${id} is missing from sitemap.md`);
    const [, place, steps, , closes] = cells;
    const noUi = /No UI by design/.test(cells.join(' '));
    if (noUi) {
      assert.match(closes, /No UI by design\*?:\s*\S/, `${id}: "no UI by design" needs a reason`);
    } else {
      assert.ok(place && place !== '—', `${id} has no place`);
      const max = Math.max(...(steps.match(/\d+/g) ?? ['99']).map(Number));
      assert.ok(max <= 3, `${id} takes ${steps} steps; the target is ≤ 3`);
    }
  }
  for (const id of rows.keys()) assert.ok(ids.includes(id), `${id} is in sitemap.md but not in the inventory`);
});

test('the brief and the sitemap cover every open severity-3/4 finding', () => {
  const backlog = readFileSync(join(ux, 'backlog.md'), 'utf-8');
  const severe = [...backlog.matchAll(/^### (F-\d{3}):[\s\S]*?^- \*\*Severity:\*\* (\d)/gm)].filter((m) => Number(m[2]) >= 3).map((m) => m[1]);
  assert.equal(severe.length, 22, 'the M6 backlog lists 22 severity-3/4 findings');
  const brief = read('brief.md');
  const needs = brief.slice(brief.indexOf('## Requirements by theme'), brief.indexOf('### Severity-1'));
  const sitemap = read('sitemap.md');
  for (const id of severe) {
    assert.ok(needs.includes(id), `${id} is not answered by a need in brief.md`);
    assert.ok(sitemap.includes(id), `${id} is not closed by any placement in sitemap.md`);
  }
});

// ── contrast ──────────────────────────────────────────────────────────

const css = read('tokens.css');
const hexVars = (block) => Object.fromEntries([...block.matchAll(/(--[\w-]+):\s*(#[0-9a-f]{6})\b/gi)].map((m) => [m[1], m[2].toLowerCase()]));
const light = hexVars(/^:root \{([\s\S]*?)^\}/m.exec(css)[1]);
const darkMedia = hexVars(/:root:not\(\[data-theme="light"\]\) \{([\s\S]*?)^ {2}\}/m.exec(css)[1]);
const darkPinned = hexVars(/^:root\[data-theme="dark"\] \{([\s\S]*?)^\}/m.exec(css)[1]);
const dark = { ...light, ...darkPinned };

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
/** The pairs listed in tokens.css's CONTRAST PAIRS comment: [fg, bg, min]. */
function pairs() {
  const out = [];
  for (const m of css.matchAll(/^ \*\s+(?:text:|ui:)?\s*(--[\w-]+) on (.+?)\s{2,}([\d.]+)$/gm)) {
    for (const bg of m[2].split(',').map((s) => s.trim())) out.push([m[1], bg, Number(m[3])]);
  }
  return out;
}

test('tokens.css defines the same colour variables in both schemes', () => {
  const lightColours = Object.keys(light);
  assert.ok(lightColours.length >= 30, 'expected a full colour set');
  const darkKeys = Object.keys(darkPinned).sort();
  assert.deepEqual(Object.keys(darkMedia).sort(), darkKeys, 'the prefers-color-scheme block and data-theme="dark" must match');
  assert.deepEqual(darkMedia, darkPinned, 'the two dark blocks must hold the same values');
  for (const name of ['--bg', '--surface', '--text', '--text-muted', '--accent', '--on-accent', '--danger', '--on-danger', '--success', '--focus', '--border-strong']) {
    assert.ok(light[name], `${name} missing in light`);
    assert.ok(darkPinned[name], `${name} missing in dark`);
  }
  for (const name of ['--font-sans', '--text-md', '--space-4', '--radius-md', '--control-height', '--focus-width', '--duration-normal']) {
    assert.match(css, new RegExp(`${name}:`), `${name} missing`);
  }
});

test('every listed colour pair meets WCAG contrast in both schemes', () => {
  const list = pairs();
  assert.ok(list.length >= 25, 'CONTRAST PAIRS lists too few pairs');
  const failures = [];
  for (const [scheme, t] of [['light', light], ['dark', dark]]) {
    for (const [fg, bg, min] of list) {
      assert.ok(t[fg] && t[bg], `${scheme}: ${fg} or ${bg} is not a colour`);
      const r = contrast(t[fg], t[bg]);
      if (r < min) failures.push(`${scheme}: ${fg} on ${bg} is ${r.toFixed(2)}:1 (needs ${min})`);
    }
  }
  assert.deepEqual(failures, []);
  // The M6 failure that must not come back (A-08): text on the dark-mode accent.
  assert.ok(contrast(dark['--on-accent'], dark['--accent']) >= 4.5);
});

// ── prototypes ────────────────────────────────────────────────────────

test('a clickable prototype exists for every top task and its local links resolve', () => {
  const dir = join(here, 'prototypes');
  const pages = [...TASKS.map((t) => `${t}.html`), 'index.html'];
  for (const page of pages) {
    const file = join(dir, page);
    assert.ok(existsSync(file), `prototypes/${page} is missing`);
    const html = readFileSync(file, 'utf-8');
    for (const m of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
      const ref = m[1];
      if (/^(#|https?:|data:|mailto:)/.test(ref)) continue;
      assert.ok(existsSync(resolve(dir, ref.split('#')[0])), `prototypes/${page} links to ${ref}, which does not exist`);
    }
    if (page !== 'index.html') {
      assert.match(html, /data-scenario="(empty|populated|broken)"/, `${page} has no start state`);
      assert.match(html, /src="app\.js"/, `${page} does not load the prototype`);
    }
  }
  // Hash routes the engine links to must be routes it renders.
  const app = readFileSync(join(dir, 'app.js'), 'utf-8');
  const routes = new Set([...app.matchAll(/href="#\/([a-z-]+)/g)].map((m) => m[1]));
  const handled = new Set([...app.matchAll(/page === '([a-z-]+)'/g)].map((m) => m[1]));
  for (const r of routes) assert.ok(handled.has(r), `app.js links to #/${r} but renders no such page`);
});

test('the prototypes hold only fictional data', () => {
  const data = readFileSync(join(here, 'prototypes', 'data.js'), 'utf-8');
  assert.match(data, /Fictional data only/);
  assert.match(data, /Alex Rivera/);
  assert.doesNotMatch(data, /[A-Z]:\\Users\\|\/home\/|\/Users\//, 'a local path leaked into data.js');
});

// ── walkthrough and approval ──────────────────────────────────────────

test('the walkthrough re-run finds no severity-3 or -4 issue on any top task', () => {
  for (const t of TASKS) {
    const file = join(here, 'walkthroughs', `${t}.md`);
    assert.ok(existsSync(file), `walkthroughs/${t}.md is missing`);
    const text = readFileSync(file, 'utf-8');
    const severe = [...text.matchAll(/^- \*\*Severity:\*\* ([34])\b/gm)];
    assert.equal(severe.length, 0, `walkthroughs/${t}.md still has ${severe.length} severity-3/4 finding(s)`);
    assert.match(text, /^## /m, `walkthroughs/${t}.md has no steps`);
  }
});

test('decisions.md records the maintainer approving one direction', () => {
  const text = read('decisions.md');
  const approval = text.slice(text.indexOf('## Approval'));
  assert.doesNotMatch(approval, /_Pending/, 'approval is still pending');
  assert.match(approval, /Approved by the maintainer on \d{4}-\d{2}-\d{2}/);
  assert.match(approval, /Direction:\**\s+\S/);
});
