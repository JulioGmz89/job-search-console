import assert from 'node:assert/strict';
import { delimiter, join } from 'node:path';
import { test } from 'node:test';

import { AGENT_MODELS, modelFor, resolveClaudeCommand } from './claude-bin.js';

const fakeFs = (paths) => (path) => paths.has(path);

test('a native binary on PATH is spawned directly', () => {
  const bin = join('C:\\tools', 'claude.exe');
  const found = resolveClaudeCommand({
    env: { PATH: ['C:\\other', 'C:\\tools'].join(delimiter) },
    platform: 'win32',
    exists: fakeFs(new Set([bin])),
  });
  assert.deepEqual(found, { file: bin, args: [], source: 'path', display: bin, found: true, shell: false });
});

test('an npm .cmd shim is unwrapped to node + cli.js, and a .exe elsewhere on PATH wins over it', () => {
  const shim = join('C:\\npm', 'claude.cmd');
  const cli = join('C:\\npm', 'node_modules', '@anthropic-ai', 'claude-code', 'cli.js');
  const unwrapped = resolveClaudeCommand({
    env: { PATH: 'C:\\npm' },
    platform: 'win32',
    exists: fakeFs(new Set([shim, cli])),
  });
  assert.equal(unwrapped.file, process.execPath);
  assert.deepEqual(unwrapped.args, [cli]);
  assert.equal(unwrapped.source, 'shim');
  assert.equal(unwrapped.shell, false);

  const exe = join('C:\\native', 'claude.exe');
  const preferred = resolveClaudeCommand({
    env: { PATH: ['C:\\npm', 'C:\\native'].join(delimiter) },
    platform: 'win32',
    exists: fakeFs(new Set([shim, cli, exe])),
  });
  assert.equal(preferred.file, exe);
});

test('a .cmd with nothing to unwrap falls back to a shell, and says so', () => {
  const shim = join('C:\\npm', 'claude.cmd');
  const found = resolveClaudeCommand({ env: { PATH: 'C:\\npm' }, platform: 'win32', exists: fakeFs(new Set([shim])) });
  assert.equal(found.file, shim);
  assert.equal(found.shell, true);
});

test('JSC_CLAUDE_BIN overrides the lookup, as a path or a name', () => {
  const custom = '/opt/claude/bin/claude';
  const byPath = resolveClaudeCommand({ env: { JSC_CLAUDE_BIN: custom, PATH: '/usr/bin' }, platform: 'linux', exists: fakeFs(new Set([custom])) });
  assert.equal(byPath.file, custom);
  assert.equal(byPath.source, 'env');

  const script = 'C:\\dev\\cli.js';
  const byScript = resolveClaudeCommand({ env: { JSC_CLAUDE_BIN: script }, platform: 'win32', exists: fakeFs(new Set([script])) });
  assert.equal(byScript.file, process.execPath);
  assert.deepEqual(byScript.args, [script]);

  const byName = resolveClaudeCommand({
    env: { JSC_CLAUDE_BIN: 'claude-nightly', PATH: '/usr/local/bin' },
    platform: 'linux',
    exists: fakeFs(new Set(['/usr/local/bin/claude-nightly'])),
  });
  assert.equal(byName.file, '/usr/local/bin/claude-nightly');
  assert.equal(byName.source, 'env');
});

test('a missing CLI is reported, not thrown', () => {
  const missing = resolveClaudeCommand({ env: { PATH: '/nowhere' }, platform: 'linux', exists: () => false });
  assert.equal(missing.found, false);
  assert.equal(missing.source, 'missing');
});

test('the model follows the spend tier unless overridden', () => {
  assert.equal(modelFor({ spendTier: 'economy', env: {} }), AGENT_MODELS.economy);
  assert.equal(modelFor({ spendTier: 'premium', env: {} }), AGENT_MODELS.premium);
  assert.equal(modelFor({ spendTier: null, env: {} }), null);
  assert.equal(modelFor({ spendTier: 'standard', override: 'claude-opus-5', env: {} }), 'claude-opus-5');
  assert.equal(modelFor({ spendTier: 'standard', env: { JSC_CLAUDE_MODEL: 'x' } }), 'x');
});
