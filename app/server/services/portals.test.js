/**
 * The point of these tests is not that the edits work — it is that everything
 * they do NOT touch comes back byte-identical. A YAML editor that silently
 * reflows a hand-annotated 16 KB config has destroyed the file even when the
 * one value it was asked to change is correct.
 */

import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { createEntry, deleteEntry, normalizeEntry, PortalsError, readPortals, updateEntry } from './portals.js';

const here = dirname(fileURLToPath(import.meta.url));
const FIXTURE = join(here, '__fixtures__', 'portals', 'portals.yml');
const scratches = [];

/** A throwaway data root holding a copy of the fixture, so no test edits the original. */
function workspace() {
  const root = mkdtempSync(join(tmpdir(), 'jsc-portals-test-'));
  scratches.push(root);
  cpSync(FIXTURE, join(root, 'portals.yml'));
  return root;
}

const read = (root) => readFileSync(join(root, 'portals.yml'), 'utf-8');

/**
 * A real line diff, so "nothing else changed" is an exact claim.
 *
 * Comparing line *sets* is not good enough here: `    enabled: true` appears on
 * several entries, so a set comparison reports no change when one of them flips.
 * This is the standard LCS backtrack; the files involved are tens of lines, so
 * the quadratic table costs nothing.
 *
 * @returns {{removed: string[], added: string[]}}
 */
function diffLines(before, afterText) {
  const a = before.split('\n');
  const b = afterText.split('\n');
  const lcs = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  const removed = [];
  const added = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i += 1; j += 1; }
    else if (lcs[i + 1][j] >= lcs[i][j + 1]) removed.push(a[i++]);
    else added.push(b[j++]);
  }
  while (i < a.length) removed.push(a[i++]);
  while (j < b.length) added.push(b[j++]);
  return { removed, added };
}

after(() => {
  for (const dir of scratches) rmSync(dir, { recursive: true, force: true });
});

test('readPortals parses both sections and keeps unknown keys visible', () => {
  const root = workspace();
  const portals = readPortals({ root });

  assert.equal(portals.exists, true);
  assert.equal(portals.editable, true);
  assert.equal(portals.issues.length, 0);
  assert.deepEqual(portals.companies.map((c) => c.name), ['Acme', 'Globex', 'Initech', 'Umbrella']);
  assert.deepEqual(portals.boards.map((b) => b.name), ['RemoteOK']);

  const acme = portals.companies[0];
  assert.equal(acme.provider, 'greenhouse');
  assert.equal(acme.notes, "Quoted note with an apostrophe: Acme's board.");
  assert.equal(acme.enabled, true);

  // An explicit `false` is the only thing that disables an entry upstream.
  assert.equal(portals.companies[1].enabled, false);

  // `max_pages` is not editable in the form, so it must at least be advertised.
  assert.deepEqual(portals.companies[3].extraKeys, ['max_pages']);

  // Filters are read-only in M2 but still returned, so the page can show them.
  assert.deepEqual(Object.keys(portals.filters), ['location_filter', 'title_filter']);
});

test('toggling enabled changes exactly one line and no comment moves', () => {
  const root = workspace();
  const before = read(root);
  const { etag } = readPortals({ root });

  updateEntry({ root, kind: 'company', index: 0, name: 'Acme', entry: { enabled: false }, etag });

  const afterText = read(root);
  const { removed, added } = diffLines(before, afterText);
  assert.deepEqual(removed, ['    enabled: true']);
  assert.deepEqual(added, ['    enabled: false']);
  assert.equal(afterText.split('\n').length, before.split('\n').length);
  assert.ok(afterText.includes('# always_allow is checked BEFORE block'));
  assert.ok(afterText.includes('  # -- Group two: websearch lane --'));
});

test('editing a URL rewrites its line and leaves the rest of the entry alone', () => {
  const root = workspace();
  const before = read(root);
  const { etag } = readPortals({ root });

  updateEntry({
    root,
    kind: 'company',
    index: 1,
    name: 'Globex',
    entry: { careersUrl: 'https://jobs.eu.lever.co/globex' },
    etag,
  });

  const { removed, added } = diffLines(before, read(root));
  assert.deepEqual(removed, ['    careers_url: https://jobs.lever.co/globex']);
  assert.deepEqual(added, ['    careers_url: https://jobs.eu.lever.co/globex']);
});

test('clearing a field removes its line; adding one appends inside the entry', () => {
  const root = workspace();
  let { etag } = readPortals({ root });

  ({ etag } = updateEntry({ root, kind: 'company', index: 0, name: 'Acme', entry: { api: null }, etag }));
  assert.ok(!read(root).includes('boards-api.greenhouse.io'));

  updateEntry({ root, kind: 'company', index: 1, name: 'Globex', entry: { notes: 'Added later' }, etag });

  const portals = readPortals({ root });
  assert.equal(portals.companies[0].api, null);
  assert.equal(portals.companies[1].notes, 'Added later');
  // The new line landed inside Globex, not in the group heading below it.
  const lines = read(root).split('\n');
  const notesLine = lines.findIndex((l) => l.includes('Added later'));
  assert.ok(lines[notesLine - 1].includes('enabled: false'));
  assert.equal(lines[notesLine + 1], '');
});

test('a name with YAML-significant characters is quoted, not corrupted', () => {
  const root = workspace();
  const { etag } = readPortals({ root });

  const tricky = 'Foo: Bar #1 "quoted"';
  updateEntry({ root, kind: 'company', index: 1, name: 'Globex', entry: { name: tricky }, etag });

  assert.equal(readPortals({ root }).companies[1].name, tricky);
});

test('creating an entry appends it and preserves the file above it', () => {
  const root = workspace();
  const before = read(root);
  const { etag } = readPortals({ root });

  const result = createEntry({
    root,
    kind: 'company',
    entry: { name: 'Soylent', careersUrl: 'https://jobs.ashbyhq.com/soylent', notes: 'New lane' },
    etag,
  });
  assert.equal(result.index, 4);

  const portals = readPortals({ root });
  assert.deepEqual(portals.companies.map((c) => c.name), ['Acme', 'Globex', 'Initech', 'Umbrella', 'Soylent']);
  assert.equal(portals.companies[4].enabled, true);
  // Everything that was already in the file is still in the file.
  assert.deepEqual(diffLines(before, read(root)).removed, []);
});

test('deleting an entry keeps the comment that introduces the next group', () => {
  const root = workspace();
  const { etag } = readPortals({ root });

  deleteEntry({ root, kind: 'company', index: 1, name: 'Globex', etag });

  const afterText = read(root);
  assert.ok(!afterText.includes('Globex'));
  assert.ok(afterText.includes('  # -- Group two: websearch lane --'));
  assert.ok(afterText.includes('  # This heading must survive a delete of the entry above it.'));
  assert.deepEqual(readPortals({ root }).companies.map((c) => c.name), ['Acme', 'Initech', 'Umbrella']);
});

test('a board is addressed independently of the companies list', () => {
  const root = workspace();
  const { etag } = readPortals({ root });

  updateEntry({ root, kind: 'board', index: 0, name: 'RemoteOK', entry: { enabled: false }, etag });

  const portals = readPortals({ root });
  assert.equal(portals.boards[0].enabled, false);
  assert.deepEqual(portals.companies.map((c) => c.enabled), [true, false, true, true]);
});

test('a stale etag is refused and nothing is written', () => {
  const root = workspace();
  const { etag } = readPortals({ root });

  // Someone edits the file by hand — or fix-slugs.mjs runs — after the page loaded.
  writeFileSync(join(root, 'portals.yml'), `${read(root)}\n# touched by hand\n`);
  const before = read(root);

  assert.throws(
    () => updateEntry({ root, kind: 'company', index: 0, name: 'Acme', entry: { enabled: false }, etag }),
    (error) => error instanceof PortalsError && error.code === 'stale-etag' && error.status === 409,
  );
  assert.equal(read(root), before);
});

test('a name that no longer sits at that index is refused', () => {
  const root = workspace();
  const { etag } = readPortals({ root });

  assert.throws(
    () => updateEntry({ root, kind: 'company', index: 0, name: 'Globex', entry: { enabled: false }, etag }),
    (error) => error.code === 'entry-moved' && error.status === 409,
  );
});

test('an entry upstream could never scan is refused before anything is written', () => {
  const root = workspace();
  const before = read(root);
  const { etag } = readPortals({ root });

  assert.throws(
    () => createEntry({ root, kind: 'company', entry: { name: 'Nowhere' }, etag }),
    (error) => error.code === 'entry-unreachable',
  );
  assert.throws(
    () => createEntry({ root, kind: 'company', entry: { name: 'Bad', careersUrl: 'javascript:alert(1)' }, etag }),
    (error) => error.code === 'url-invalid',
  );
  assert.throws(
    () => createEntry({ root, kind: 'company', entry: { name: 'Bad', provider: 'not-a-provider' }, etag }),
    (error) => error.code === 'provider-unknown',
  );
  assert.equal(read(root), before);
});

test('a duplicate name is refused in both directions', () => {
  const root = workspace();
  const { etag } = readPortals({ root });

  assert.throws(
    () => createEntry({ root, kind: 'company', entry: { name: 'Acme', provider: 'greenhouse' }, etag }),
    (error) => error.code === 'name-duplicate' && error.status === 409,
  );
  assert.throws(
    () => updateEntry({ root, kind: 'company', index: 1, name: 'Globex', entry: { name: 'Acme' }, etag }),
    (error) => error.code === 'name-duplicate',
  );
});

test('a write leaves a backup of what was there before', () => {
  const root = workspace();
  const before = read(root);
  const { etag } = readPortals({ root });

  updateEntry({ root, kind: 'company', index: 0, name: 'Acme', entry: { enabled: false }, etag });

  assert.equal(readFileSync(join(root, 'portals.yml.bak'), 'utf-8'), before);
});

test('an unparseable file is reported, not thrown, and cannot be edited', () => {
  const root = mkdtempSync(join(tmpdir(), 'jsc-portals-test-'));
  scratches.push(root);
  writeFileSync(join(root, 'portals.yml'), 'tracked_companies:\n  - name: [unclosed\n');

  const portals = readPortals({ root });
  assert.equal(portals.editable, false);
  assert.ok(portals.issues.some((i) => i.code === 'portals-unparseable'));

  assert.throws(
    () => updateEntry({ root, kind: 'company', index: 0, entry: { enabled: false }, etag: portals.etag }),
    (error) => error.code === 'portals-unparseable' && error.status === 422,
  );
});

test('a missing portals.yml is an empty page, not a crash', () => {
  const root = mkdtempSync(join(tmpdir(), 'jsc-portals-test-'));
  scratches.push(root);
  mkdirSync(join(root, 'data'), { recursive: true });

  const portals = readPortals({ root });
  assert.equal(portals.exists, false);
  assert.equal(portals.etag, null);
  assert.deepEqual(portals.companies, []);
  assert.equal(portals.issues[0].code, 'portals-missing');
});

test('normalizeEntry maps the wire shape onto upstream keys', () => {
  const fields = normalizeEntry({
    name: '  Spaced  ',
    careersUrl: 'https://example.com/careers',
    scanMethod: 'websearch',
    scanQuery: 'site:example.com jobs',
    notes: '',
    api: null,
  });
  assert.deepEqual(fields, {
    name: 'Spaced',
    enabled: true,
    careers_url: 'https://example.com/careers',
    api: null,
    provider: null,
    scan_method: 'websearch',
    scan_query: 'site:example.com jobs',
    notes: null,
  });

  // A partial patch touches only the keys it names.
  assert.deepEqual(normalizeEntry({ enabled: false }, { partial: true }), { enabled: false });
});
