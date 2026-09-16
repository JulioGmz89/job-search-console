/**
 * stream-json.js — turn Claude Code's `--output-format stream-json` into a
 * readable log and one structured result.
 *
 * With `--include-partial-messages` the CLI prints one JSON object per line:
 * session init, streamed text deltas, complete assistant turns (with tool
 * calls), tool results, and a final `result` carrying usage and `is_error`.
 * Shown raw, that is a wall of JSON; shown as text only, the tool calls that
 * explain what the agent is doing disappear. This keeps both: text is
 * re-assembled into lines, each tool call becomes one line, and the final
 * result is captured as data for the spec's `after` hook.
 *
 * Ported from upstream's alpha web UI (`web/src/lib/run-cli-support.mjs`), which
 * is TypeScript/ESM outside `app/` and not importable from here.
 */

/** Longest tool argument or tool result shown in the log. */
const SNIPPET = 160;

const snippet = (value) => {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  return text.length > SNIPPET ? `${text.slice(0, SNIPPET - 1)}…` : text;
};

/** The one argument worth showing for each tool. */
function describeToolUse(name, input = {}) {
  const arg =
    input.command ?? input.file_path ?? input.path ?? input.url ?? input.query ?? input.pattern ?? input.prompt ?? '';
  return arg ? `${name}: ${snippet(arg)}` : name;
}

function textOf(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content.map((part) => (typeof part === 'string' ? part : part?.text ?? '')).join('');
  }
  return '';
}

/**
 * Pull usage and failure out of the final `result` event.
 *
 * `is_error` is the authoritative flag; `subtype` is checked by prefix because
 * the real values are `error_max_turns` / `error_during_execution`. A run that
 * exits 0 with `is_error: true` must never count as a success.
 */
function summarizeResult(ev) {
  const usage = ev.usage ?? {};
  const isError = ev.is_error === true || (typeof ev.subtype === 'string' && ev.subtype.startsWith('error'));
  const diagnostic =
    (typeof ev.error === 'string' && ev.error) ||
    (isError && typeof ev.result === 'string' && ev.result) ||
    (isError && typeof ev.subtype === 'string' && ev.subtype) ||
    null;
  return {
    isError,
    error: isError ? diagnostic ?? 'Claude failed before finishing' : null,
    subtype: ev.subtype ?? null,
    text: typeof ev.result === 'string' ? ev.result : '',
    usage: {
      input: usage.input_tokens ?? 0,
      output: usage.output_tokens ?? 0,
      cacheCreate: usage.cache_creation_input_tokens ?? 0,
      cacheRead: usage.cache_read_input_tokens ?? 0,
    },
    costUsd: typeof ev.total_cost_usd === 'number' ? ev.total_cost_usd : null,
    durationMs: typeof ev.duration_ms === 'number' ? ev.duration_ms : null,
    numTurns: typeof ev.num_turns === 'number' ? ev.num_turns : null,
  };
}

/**
 * Create a parser for one run. Stateful, because streamed text arrives as
 * token-sized deltas and has to be buffered into whole lines.
 *
 * `parse(text)` returns `null` for a line that is not stream-json (show it raw),
 * or `{ display, result? }` where `display` is what to log (`null` = nothing).
 */
export function createStreamParser() {
  let buffer = '';

  /** Emit the complete lines in the text buffer, keeping a trailing partial. */
  const drain = ({ all = false } = {}) => {
    if (all) {
      const rest = buffer;
      buffer = '';
      return rest.trim() ? rest : null;
    }
    const cut = buffer.lastIndexOf('\n');
    if (cut === -1) return null;
    const complete = buffer.slice(0, cut);
    buffer = buffer.slice(cut + 1);
    return complete.trim() ? complete : null;
  };

  const withFlush = (display) => {
    const pending = drain({ all: true });
    if (pending === null) return display;
    return display === null ? pending : `${pending}\n${display}`;
  };

  return {
    parse(text) {
      let ev;
      try {
        ev = JSON.parse(text);
      } catch {
        return null;
      }
      if (!ev || typeof ev !== 'object' || typeof ev.type !== 'string') return null;

      if (ev.type === 'stream_event') {
        const e = ev.event;
        if (e?.type === 'content_block_delta' && typeof e.delta?.text === 'string') {
          buffer += e.delta.text;
          return { display: drain() };
        }
        return { display: null };
      }

      if (ev.type === 'system' && ev.subtype === 'init') {
        const tools = Array.isArray(ev.tools) ? ev.tools.length : null;
        const model = ev.model ? ` · ${ev.model}` : '';
        return { display: `▶ Claude session started${model}${tools === null ? '' : ` · ${tools} tools`}` };
      }

      if (ev.type === 'assistant') {
        // Text was already streamed as deltas; only the tool calls are new here.
        const calls = (ev.message?.content ?? [])
          .filter((part) => part?.type === 'tool_use')
          .map((part) => `🔧 ${describeToolUse(part.name, part.input)}`);
        return { display: withFlush(calls.length ? calls.join('\n') : null) };
      }

      if (ev.type === 'user') {
        const results = (ev.message?.content ?? [])
          .filter((part) => part?.type === 'tool_result')
          .map((part) => {
            const body = snippet(textOf(part.content));
            if (!body) return null;
            return part.is_error ? `   ↳ ✖ ${body}` : `   ↳ ${body}`;
          })
          .filter(Boolean);
        return { display: results.length ? results.join('\n') : null };
      }

      if (ev.type === 'result') {
        const result = summarizeResult(ev);
        const seconds = result.durationMs === null ? '' : ` in ${Math.round(result.durationMs / 1000)}s`;
        const cost = result.costUsd === null ? '' : ` · $${result.costUsd.toFixed(2)}`;
        const turns = result.numTurns === null ? '' : ` · ${result.numTurns} turns`;
        const head = result.isError ? `■ Claude stopped with an error${seconds}` : `■ Claude finished${seconds}`;
        const line = `${head}${turns}${cost}${result.error ? ` — ${snippet(result.error)}` : ''}`;
        return { display: withFlush(line), result };
      }

      // Anything else in the stream (rate-limit notices, ping frames) is noise.
      return { display: null };
    },

    /** Whatever text is still buffered, for the end of the stream. */
    flush() {
      return drain({ all: true });
    },
  };
}
