/**
 * claude-bin.js — find the Claude Code CLI and decide how to spawn it.
 *
 * The runner never uses a shell (see queue/runner.js), which on Windows rules
 * out spawning an npm `claude.cmd` shim directly: Node ≥ 20.12 refuses `.cmd`
 * files without `shell: true` (CVE-2024-27980). The native installer's
 * `claude.exe` spawns fine, and a shim can be unwrapped to the script it
 * launches, so this module tries, in order:
 *
 *   1. `JSC_CLAUDE_BIN` — an explicit path or name from the environment
 *   2. `claude.exe` / `claude` on PATH
 *   3. `claude.cmd` on PATH, unwrapped to `node …/@anthropic-ai/claude-code/cli.js`
 *
 * Only when none of those work does it fall back to a shell, and it says so.
 */

import { existsSync } from 'node:fs';
import { posix, win32 } from 'node:path';

/** Model per `spend_tier` in config/profile.yml, mirroring batch/batch-runner.sh. */
export const AGENT_MODELS = Object.freeze({
  economy: 'claude-haiku-4-5',
  standard: 'claude-sonnet-5',
  premium: 'claude-opus-5',
});

/**
 * Pick the model for a run. `null` means "do not pass --model": the CLI's own
 * default applies, which is what a user with no spend tier configured expects.
 *
 * @param {{spendTier?: string|null, override?: string|null, env?: object}} options
 * @returns {string|null}
 */
export function modelFor({ spendTier = null, override = null, env = process.env } = {}) {
  const chosen = override?.trim() || env.JSC_CLAUDE_MODEL?.trim();
  if (chosen) return chosen;
  return AGENT_MODELS[spendTier] ?? null;
}

const SHIM_CLI = ['node_modules', '@anthropic-ai', 'claude-code', 'cli.js'].join('/');

function describe(file, source, { platform, exists, path }) {
  const ext = path.extname(file).toLowerCase();
  if (ext === '.js' || ext === '.mjs' || ext === '.cjs') {
    return { file: process.execPath, args: [file], source, display: file, found: true, shell: false };
  }
  if (platform === 'win32' && (ext === '.cmd' || ext === '.bat')) {
    const cli = path.join(path.dirname(file), SHIM_CLI);
    if (exists(cli)) {
      return { file: process.execPath, args: [cli], source: 'shim', display: `node ${cli}`, found: true, shell: false };
    }
    // No script to unwrap to; a shell is the only way to run a .cmd file.
    return { file, args: [], source, display: file, found: true, shell: true };
  }
  return { file, args: [], source, display: file, found: true, shell: false };
}

/**
 * Resolve how to spawn Claude Code.
 *
 * @param {{env?: object, platform?: string, exists?: (path: string) => boolean}} [options]
 * @returns {{file: string, args: string[], source: 'env'|'path'|'shim'|'missing', display: string, found: boolean, shell: boolean}}
 */
export function resolveClaudeCommand({ env = process.env, platform = process.platform, exists = existsSync } = {}) {
  const wanted = env.JSC_CLAUDE_BIN?.trim() || 'claude';
  // Path flavour follows the platform being resolved for, not the host: tests
  // simulate both, and a POSIX PATH joined with backslashes matches nothing.
  const path = platform === 'win32' ? win32 : posix;
  const ctx = { platform, exists, path };

  // An explicit path is used as-is; a bare name is looked up on PATH.
  if (path.isAbsolute(wanted) || /[\\/]/.test(wanted)) {
    if (exists(wanted)) return describe(wanted, 'env', ctx);
    return { file: wanted, args: [], source: 'missing', display: wanted, found: false, shell: false };
  }

  const dirs = (env.PATH ?? env.Path ?? '').split(path.delimiter).filter(Boolean);
  // Native binaries first across the whole PATH, shims only when nothing else
  // exists — a `claude.cmd` earlier on PATH must not shadow a spawnable .exe.
  const extensions = platform === 'win32' ? ['.exe', '', '.cmd', '.bat'] : [''];
  for (const ext of extensions) {
    for (const dir of dirs) {
      const candidate = path.join(dir, wanted + ext);
      if (exists(candidate)) return describe(candidate, env.JSC_CLAUDE_BIN ? 'env' : 'path', ctx);
    }
  }
  return { file: wanted, args: [], source: 'missing', display: wanted, found: false, shell: false };
}
