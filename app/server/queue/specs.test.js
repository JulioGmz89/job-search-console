import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

import { repoRoot } from '../services/paths.js';
import { buildSpec, describeKinds, internalSpec, RUN_KINDS, SpecError } from './specs.js';

test('every script kind names a script that exists upstream', () => {
  for (const [kind, def] of Object.entries(RUN_KINDS)) {
    if (def.build) {
      // Agent kinds have no script; the whole spec comes from agent-specs.js.
      assert.equal(def.script, undefined, `${kind} must not also name a script`);
      continue;
    }
    assert.ok(existsSync(join(repoRoot, def.script)), `${kind} points at a missing ${def.script}`);
  }
});

test('internal post-steps are pinned to no arguments and hidden from requests', () => {
  for (const kind of ['merge-tracker', 'reconcile-auto']) {
    assert.throws(() => buildSpec(kind), (e) => e.code === 'kind-unknown');
    const spec = internalSpec(kind);
    assert.deepEqual(spec.args, []);
    assert.equal(spec.exclusive, true);
    assert.equal(spec.lane, 'script');
  }
  // merge-tracker hands over to reconcile-auto, and only on success.
  const merge = internalSpec('merge-tracker');
  const chained = merge.hooks.after({}, { provisional: { status: 'succeeded' } });
  assert.deepEqual(chained.next.map((s) => s.kind), ['reconcile-auto']);
  assert.deepEqual(merge.hooks.after({}, { provisional: { status: 'failed' } }), {});
});

test('the argv of every spec is pinned', () => {
  // This is the assertion that matters most in this file. `merge-tracker.mjs`
  // and `normalize-statuses.mjs` read their flags with a bare
  // `process.argv.includes`, so upstream has scripts where a mistyped
  // `--dry-run` runs live and writes. Those two are not in the table at all, and
  // pinning the exact argv here means a typo in one of the flags below shows up
  // as a failing test rather than as a rewritten tracker.
  const argv = (kind, options) => {
    const spec = buildSpec(kind, options);
    return [spec.script, ...spec.args];
  };

  assert.deepEqual(argv('scan', {}), ['scan.mjs']);
  assert.deepEqual(argv('scan', { dryRun: true }), ['scan.mjs', '--dry-run']);
  assert.deepEqual(argv('scan', { verify: true, since: 7 }), ['scan.mjs', '--verify', '--since', '7']);
  assert.deepEqual(argv('dedup', { dryRun: true }), ['dedup-tracker.mjs', '--dry-run']);
  assert.deepEqual(argv('dedup', {}), ['dedup-tracker.mjs']);
  assert.deepEqual(argv('reconcile', { dryRun: true }), ['reconcile-pipeline.mjs', '--dry-run']);
  assert.deepEqual(argv('reconcile', {}), ['reconcile-pipeline.mjs']);
  assert.deepEqual(argv('verify-pipeline', {}), ['verify-pipeline.mjs']);
  assert.deepEqual(argv('validate-portals', {}), ['validate-portals.mjs']);
  assert.deepEqual(argv('verify-portals', {}), ['verify-portals.mjs']);
  assert.deepEqual(argv('skills-fetch', {}), ['app/server/skills/cli.js', 'fetch']);
  assert.deepEqual(argv('skills-fetch', { retryFailed: true, limit: 25 }), ['app/server/skills/cli.js', 'fetch', '--retry-failed', '--limit', '25']);
  assert.throws(() => buildSpec('skills-fetch', { limit: 0 }), (e) => e.code === 'options-invalid');
  assert.deepEqual([internalSpec('skills-fetch-auto').script, ...internalSpec('skills-fetch-auto').args], ['app/server/skills/cli.js', 'fetch']);
});

test('a real scan chains the skills fetch; a dry run does not', () => {
  const real = buildSpec('scan', {});
  const chained = real.hooks.after({ dryRun: false }, { provisional: { status: 'succeeded' } });
  assert.deepEqual(chained.next.map((s) => s.kind), ['skills-fetch-auto']);
  assert.equal(chained.next[0].lane, 'script');
  assert.deepEqual(real.hooks.after({ dryRun: false }, { provisional: { status: 'failed' } }), {});
  const dry = buildSpec('scan', { dryRun: true });
  assert.deepEqual(dry.hooks.after({ dryRun: true }, { provisional: { status: 'succeeded' } }).next, []);
  assert.throws(() => buildSpec('skills-fetch-auto'), (e) => e.code === 'kind-unknown');
});

test('scripts that rewrite the tracker are the ones that need confirming', () => {
  assert.equal(buildSpec('dedup', {}).confirmRequired, true);
  assert.equal(buildSpec('reconcile', {}).confirmRequired, true);
  // A dry run writes nothing, so it needs no permission of its own — it is the
  // permission.
  assert.equal(buildSpec('dedup', { dryRun: true }).confirmRequired, false);
  assert.equal(buildSpec('dedup', { dryRun: true }).writes, false);
  // Scanning only appends; gating the milestone's main action every time would
  // be friction without a matching risk.
  assert.equal(buildSpec('scan', {}).confirmRequired, false);
  // Read-only checks never write and never need confirming. They also exit
  // non-zero when they FIND something (verify-pipeline returns 1 for "one error
  // in the tracker"), so they are flagged for the UI to call that a finding
  // rather than a failure.
  for (const kind of ['verify-pipeline', 'validate-portals', 'verify-portals']) {
    assert.equal(buildSpec(kind, {}).writes, false);
    assert.equal(buildSpec(kind, {}).confirmRequired, false);
    assert.equal(buildSpec(kind, {}).reportsFindings, true);
  }
  // A non-zero exit from a script that writes is a real failure.
  assert.equal(buildSpec('scan', {}).reportsFindings, false);
  assert.equal(buildSpec('dedup', {}).reportsFindings, false);
});

test('an unknown kind or a bad option is refused, never guessed at', () => {
  assert.throws(() => buildSpec('rm'), (e) => e instanceof SpecError && e.code === 'kind-unknown');
  assert.throws(() => buildSpec('scan', 'not an object'), (e) => e.code === 'options-invalid');
  assert.throws(() => buildSpec('scan', { since: -1 }), (e) => e.code === 'options-invalid');
  assert.throws(() => buildSpec('verify-pipeline', { dryRun: true }), (e) => e.code === 'dry-run-unsupported');
});

test('options the client invents cannot reach argv', () => {
  const spec = buildSpec('scan', { dryRun: true, '--force': true, extra: 'ignored', args: ['--wat'] });
  assert.deepEqual(spec.args, ['--dry-run']);
});

test('describeKinds is the UI vocabulary and carries no argv builders', () => {
  const kinds = describeKinds();
  const visible = Object.entries(RUN_KINDS).filter(([, def]) => !def.internal).map(([kind]) => kind);
  assert.deepEqual(kinds.map((k) => k.kind).sort(), visible.sort());
  assert.ok(!kinds.some((k) => k.kind === 'merge-tracker'));
  for (const kind of kinds) {
    assert.equal(typeof kind.label, 'string');
    assert.equal(kind.args, undefined);
    assert.equal(kind.parseProgress, undefined);
  }
});
