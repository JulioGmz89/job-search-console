/**
 * runner.js — the headless Claude Code runner (PROJECT_PLAN.md §3, §5).
 *
 * Builds the exact command line for one `claude -p` session. It is the only
 * place that knows the CLI's flags, so swapping in another CLI later (§10)
 * means adding a sibling module, not touching the queue or the specs.
 *
 * The flags mirror what upstream already relies on for headless work
 * (`batch/batch-runner.sh`, `web/src/lib/claude-invocation.mjs`), with one
 * deliberate difference: instead of `--dangerously-skip-permissions` the
 * session gets an allowlist. The modes only ever need to read and write files
 * in this repository, fetch a job page, search the web, and run `node …`
 * scripts — so that is all it may do. `Task` (subagents) is denied outright,
 * and `--strict-mcp-config` with no MCP config means no Playwright server:
 * two parallel workers sharing one browser deadlock (upstream #506), and the
 * modes already know to fall back to WebFetch without it.
 */

import { join } from 'node:path';

/** Per-mode wall-clock limits, after which the queue kills the session. */
export const TIMEOUTS = Object.freeze({
  evaluate: 780_000,
  pdf: 600_000,
  cover: 600_000,
});

/** Everything a mode legitimately needs; nothing that could reach outside the repo. */
export const ALLOWED_TOOLS = Object.freeze([
  'Read',
  'Write',
  'Edit',
  'Glob',
  'Grep',
  'WebFetch',
  'WebSearch',
  'Bash(node:*)',
]);

export const DISALLOWED_TOOLS = Object.freeze(['Task']);

/**
 * Quote one argument for cmd.exe. Only used on the shell fallback (a
 * `claude.cmd` shim with nothing to unwrap to), where Node hands the argv to
 * the shell as one string.
 */
function cmdQuote(arg) {
  if (/[\s"&|<>^%]/.test(arg)) return `"${arg.replace(/"/g, '\\"')}"`;
  return arg;
}

/**
 * Build the spawn command for one session.
 *
 * @param {object} options
 * @param {{file: string, args: string[], shell?: boolean}} options.bin - From `resolveClaudeCommand()`.
 * @param {string} options.userPrompt - The short task statement. Single line.
 * @param {string} options.systemPromptPath - The assembled prompt file (`writePromptFile`).
 * @param {string|null} [options.model]
 * @param {string} options.cwd - The repository root; the modes use relative paths.
 * @param {object} [options.env] - Extra environment for the child.
 * @returns {{file: string, args: string[], cwd: string, env: object, shell: boolean}}
 */
export function createAgentCommand({ bin, userPrompt, systemPromptPath, model = null, cwd, env = {} }) {
  if (!bin?.found) throw new Error('Claude Code CLI not found');
  if (/[\r\n]/.test(userPrompt)) throw new Error('The user prompt must be a single line');

  const args = [
    ...bin.args,
    '-p',
    userPrompt,
    '--output-format',
    'stream-json',
    '--verbose',
    '--include-partial-messages',
    '--permission-mode',
    'acceptEdits',
    '--allowedTools',
    ALLOWED_TOOLS.join(','),
    '--disallowedTools',
    DISALLOWED_TOOLS.join(','),
    '--strict-mcp-config',
    ...(model ? ['--model', model] : []),
    '--append-system-prompt-file',
    systemPromptPath,
  ];

  if (bin.shell) {
    return { file: cmdQuote(bin.file), args: args.map(cmdQuote), cwd, env, shell: true };
  }
  return { file: bin.file, args, cwd, env, shell: false };
}

/** Where a run's raw stream-json is mirrored, for debugging a bad session. */
export function agentLogPath(root, runId) {
  return join(root, 'data', 'jsc', 'logs', `${runId}.jsonl`);
}
