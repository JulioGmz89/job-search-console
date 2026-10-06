/**
 * ux.test.js — M6's acceptance criteria, checked mechanically (PROJECT_PLAN.md §8).
 *
 *   - the capability inventory covers every server route, every run kind and
 *     every UI component that has an action, and cites only files that exist;
 *   - personas and tasks exist for P1–P3 and T1–T9;
 *   - the scorecard has a filled cell for every persona × task;
 *   - every backlog finding has a severity 0–4, a screenshot that exists and a
 *     reproduction that starts from the sandbox, and no ID appears twice.
 *
 * Browser-free, so it runs in CI with the rest of `npm test`. Whether a finding
 * is *right* is the evaluators' job; this only proves the artifacts are complete.
 */

import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { RUN_KINDS } from '../server/queue/specs.js';

const here = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(here, '..');
const repoRoot = resolve(appRoot, '..');
const read = (name) => readFileSync(join(here, name), 'utf-8');

/**
 * M8 re-measures into app/ux/m8/ and keeps the M6 baseline as history. The
 * coverage checks accept a capability listed in either inventory; only the
 * current one (M8's once it exists) must cite files that are still there.
 */
const M8_INVENTORY = join('m8', 'inventory.md');
const currentInventory = () => read(existsSync(join(here, M8_INVENTORY)) ? M8_INVENTORY : 'inventory.md');
const allInventories = () => [read('inventory.md'), ...(existsSync(join(here, M8_INVENTORY)) ? [read(M8_INVENTORY)] : [])].join('\n');

/** Every table cell in a markdown file, trimmed, with backticks removed. */
function cells(markdown) {
  return markdown
    .split(/\r?\n/)
    .filter((line) => line.trim().startsWith('|'))
    .flatMap((line) => line.split('|').map((c) => c.trim().replace(/`/g, '')))
    .filter(Boolean);
}

/** `METHOD /path` for every route app.js registers. */
function serverRoutes() {
  const source = readFileSync(join(appRoot, 'server', 'app.js'), 'utf-8');
  return [...source.matchAll(/\bapp\.(get|post|put|patch|delete)\(\s*'([^']+)'/g)].map((m) => `${m[1].toUpperCase()} ${m[2]}`);
}

/** UI source files that offer the user something to do. */
function interactiveComponents() {
  const files = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (/\.jsx$/.test(entry.name) && /\bon(Click|Change|Submit)=/.test(readFileSync(path, 'utf-8'))) files.push(path);
    }
  };
  walk(join(appRoot, 'ui', 'src'));
  return files.map((f) => f.slice(repoRoot.length + 1).replace(/\\/g, '/'));
}

test('the inventory names every server route in a table cell', () => {
  const inventory = cells(allInventories());
  const routes = serverRoutes();
  assert.ok(routes.length > 30, `parsed only ${routes.length} routes from app.js`);
  const missing = routes.filter((r) => !inventory.some((c) => c === r || c.includes(r)));
  assert.deepEqual(missing, [], `routes missing from inventory.md: ${missing.join(', ')}`);
});

test('the inventory names every run kind in a table cell', () => {
  const inventory = cells(allInventories());
  const missing = Object.keys(RUN_KINDS).filter((k) => !inventory.some((c) => c === k || c.split(/[\s,()]+/).includes(k)));
  assert.deepEqual(missing, [], `run kinds missing from inventory.md: ${missing.join(', ')}`);
});

test('the inventory covers every UI component with an action, and cites only real files', () => {
  const inventory = allInventories();
  const missing = interactiveComponents().filter((f) => !inventory.includes(f) && !inventory.includes(f.split('/').pop()));
  assert.deepEqual(missing, [], `UI components never cited in inventory.md: ${missing.join(', ')}`);
  const cited = [...new Set([...currentInventory().matchAll(/app\/ui\/src\/[\w./-]+\.(?:jsx?|css)/g)].map((m) => m[0]))];
  const absent = cited.filter((p) => !existsSync(join(repoRoot, p)));
  assert.deepEqual(absent, [], `inventory.md cites files that do not exist: ${absent.join(', ')}`);
});

test('personas P1–P3 and tasks T1–T9 are written, each task with a success criterion', () => {
  const personas = read('personas.md');
  for (const p of ['P1', 'P2', 'P3']) assert.match(personas, new RegExp(`\\b${p}\\b`), `${p} missing from personas.md`);
  const tasks = read('tasks.md');
  for (let n = 1; n <= 9; n += 1) assert.match(tasks, new RegExp(`\\bT${n}\\b`), `T${n} missing from tasks.md`);
  assert.ok((tasks.match(/success criterion/gi) ?? []).length >= 9, 'every task needs a success criterion');
});

test('the scorecard has a result for every persona × task', () => {
  const lines = read('scorecard.md').split(/\r?\n/);
  const header = lines.findIndex((l) => l.startsWith('|') && ['T1', 'T5', 'T9'].every((t) => l.includes(t)));
  assert.notEqual(header, -1, 'no persona × task table (a header row naming T1…T9) in scorecard.md');
  const columns = lines[header].split('|').map((c) => c.trim());
  for (const persona of ['P1', 'P2', 'P3']) {
    const row = lines.slice(header + 2).find((l) => l.startsWith('|') && l.split('|')[1]?.includes(persona));
    assert.ok(row, `no scorecard row for ${persona}`);
    const values = row.split('|').map((c) => c.trim());
    for (let n = 1; n <= 9; n += 1) {
      const col = columns.findIndex((c) => new RegExp(`^T${n}\\b`).test(c));
      assert.notEqual(col, -1, `no T${n} column`);
      assert.ok(values[col] && values[col] !== '—' && values[col] !== '-', `${persona} × T${n} is empty`);
    }
  }
});

test('every backlog finding has a severity, an existing screenshot and a sandbox reproduction', () => {
  const backlog = read('backlog.md');
  const sections = backlog.split(/^### /m).slice(1).filter((s) => /^F-\d{3}\b/.test(s));
  assert.ok(sections.length > 0, 'backlog.md has no F-NNN findings');
  const ids = sections.map((s) => s.slice(0, 5));
  assert.equal(new Set(ids).size, ids.length, `duplicate finding IDs: ${ids.filter((id, i) => ids.indexOf(id) !== i).join(', ')}`);

  let previous = 4;
  for (const section of sections) {
    const id = section.slice(0, 5);
    const severity = /\*\*Severity:\*\*\s*([0-4])\b/.exec(section)?.[1];
    assert.ok(severity !== undefined, `${id}: no severity 0–4`);
    // Ranked by severity: an inversion means the list is not ordered.
    assert.ok(Number(severity) <= previous, `${id}: severity ${severity} listed below a lower one; rank by severity`);
    previous = Number(severity);

    const evidence = /\*\*Evidence:\*\*\s*(.+)/.exec(section)?.[1] ?? '';
    const shots = [...evidence.matchAll(/app\/ux\/[\w./-]+\.(?:png|jpe?g|webp)/g)].map((m) => m[0]);
    assert.ok(shots.length > 0, `${id}: no screenshot under app/ux/ cited as evidence`);
    for (const shot of shots) assert.ok(existsSync(join(repoRoot, shot)), `${id}: evidence ${shot} does not exist`);

    assert.match(section, /\*\*Reproduction:\*\*/, `${id}: no reproduction`);
    assert.match(section, /^\s*1\.\s.*sandbox\.mjs --state (empty|populated|broken)/m, `${id}: reproduction does not start from a sandbox command`);
  }
});
