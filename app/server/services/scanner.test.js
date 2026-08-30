import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { portalHealthPath, repoRoot, scanRunsPath } from './paths.js';
import { parseProgress, readLastScanRun, readPortalHealth, scanArgs } from './scanner.js';

const here = dirname(fileURLToPath(import.meta.url));
const WORKSPACE = join(here, '__fixtures__', 'workspace');

test('scanArgs builds only flags scan.mjs declares', () => {
  assert.deepEqual(scanArgs(), []);
  assert.deepEqual(scanArgs({ dryRun: true }), ['--dry-run']);
  assert.deepEqual(scanArgs({ verify: true }), ['--verify']);
  assert.deepEqual(
    scanArgs({ dryRun: true, verify: true, company: 'GitLab', since: 7 }),
    ['--dry-run', '--verify', '--company', 'GitLab', '--since', '7'],
  );
});

test('a company filter stays one argv element, however it is written', () => {
  // The value is never concatenated into a command, so shell metacharacters are
  // inert — but they must also not be able to look like a second flag.
  const args = scanArgs({ company: 'Foo && rm -rf / #' });
  assert.deepEqual(args, ['--company', 'Foo && rm -rf / #']);
  assert.equal(args.filter((a) => a.startsWith('--')).length, 1);
});

test('scanArgs rejects values scan.mjs would reject', () => {
  assert.throws(() => scanArgs({ company: 'Foo\n--verify' }), TypeError);
  assert.throws(() => scanArgs({ since: 0 }), TypeError);
  assert.throws(() => scanArgs({ since: -3 }), TypeError);
  assert.throws(() => scanArgs({ since: 1.5 }), TypeError);
  assert.throws(() => scanArgs({ since: 'lots' }), TypeError);
  // Empty means "not set", not "invalid" — an untouched form field sends ''.
  assert.deepEqual(scanArgs({ company: '', since: '' }), []);
});

test('parseProgress finds the one phase scan.mjs actually counts', () => {
  assert.deepEqual(
    parseProgress('Verifying liveness of 47 new offer(s) with Playwright (sequential)...'),
    { type: 'verify-start', total: 47 },
  );

  assert.deepEqual(parseProgress('  ✅ active    GitLab | Senior Backend Engineer'), {
    type: 'verify-result',
    icon: '✅',
    result: 'active',
    company: 'GitLab',
    title: 'Senior Backend Engineer',
    reason: null,
  });

  assert.deepEqual(parseProgress('  ❌ expired   Foo | Bar (http 404)'), {
    type: 'verify-result',
    icon: '❌',
    result: 'expired',
    company: 'Foo',
    title: 'Bar',
    reason: 'http 404',
  });

  assert.equal(
    parseProgress('Scanning 12 companies; 3 job boards; 0 local parser; 2 skipped — no provider matched via providers').type,
    'sweep-start',
  );

  assert.deepEqual(parseProgress('  + GitLab | AI Engineer | Remote, US'), {
    type: 'offer',
    company: 'GitLab',
    title: 'AI Engineer',
    location: 'Remote, US',
  });

  // The summary block is deliberately not parsed — its lines are conditional on
  // which filters are configured, so scan-runs.tsv is the structured source.
  assert.equal(parseProgress('Filtered by title:     178 removed'), null);
  assert.equal(parseProgress('Total jobs found:      217'), null);
  assert.equal(parseProgress(''), null);
});

test('readLastScanRun takes the newest row and types the counts', () => {
  const run = readLastScanRun({ root: WORKSPACE });

  assert.equal(run.status, 'completed');
  assert.equal(run.timestamp, '2026-08-29T09:20:11.002Z');
  assert.equal(run.found, 190);
  assert.equal(run.new_added, 5);
  assert.equal(run.errors, 1);
  // Counts arrive as numbers, not the strings the TSV holds.
  assert.equal(typeof run.companies, 'number');
});

test('a row with more cells than the header does not shift the columns', () => {
  // Upstream appends columns to scan-runs.tsv over time; the newest row in the
  // fixture carries one the header does not name. Reading by header index means
  // the extra cell is ignored rather than pushing every value one place over.
  const run = readLastScanRun({ root: WORKSPACE });
  assert.equal(run.dupes, 2);
  assert.equal(run.filtered_location, 30);
});

test('readLastScanRun is null before anything has been scanned', () => {
  assert.equal(readLastScanRun({ root: join(here, '__fixtures__', 'portals') }), null);
});

test('the scan bookkeeping files are read from where scan.mjs actually writes them', () => {
  // scan.mjs anchors these two to bare relative constants (scan.mjs:2037, 2110),
  // so they resolve against the working directory the scan was launched from —
  // the repository root, since queue/runner.js spawns with `cwd: repoRoot`.
  // Every other data file comes from the data root. Resolving these under the
  // data root works fine when the two are the same directory and then silently
  // reports "never scanned" for everything as soon as they are not.
  assert.equal(scanRunsPath(), join(repoRoot, 'data', 'scan-runs.tsv'));
  assert.equal(portalHealthPath(), join(repoRoot, 'data', 'portal-health.tsv'));

  // An explicit root still wins, so fixtures work.
  assert.equal(scanRunsPath(WORKSPACE), join(WORKSPACE, 'data', 'scan-runs.tsv'));
});

test('readPortalHealth keeps only the current verdict per company', () => {
  const health = readPortalHealth({ root: WORKSPACE });

  assert.deepEqual(Object.keys(health).sort(), ['Acme', 'Globex']);
  // Acme appears twice; the later row wins.
  assert.equal(health.Acme.status, 'slug_gone');
  assert.equal(health.Globex.status, 'empty');
});
