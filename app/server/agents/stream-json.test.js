import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createStreamParser } from './stream-json.js';

const line = (obj) => JSON.stringify(obj);
const delta = (text) => line({ type: 'stream_event', event: { type: 'content_block_delta', delta: { type: 'text_delta', text } } });

test('text deltas are re-assembled into whole lines', () => {
  const p = createStreamParser();
  assert.deepEqual(p.parse(delta('Reading ')), { display: null });
  assert.deepEqual(p.parse(delta('the CV')), { display: null });
  assert.deepEqual(p.parse(delta('\nNext')), { display: 'Reading the CV' });
  // The trailing partial waits for the next boundary or a flush.
  assert.equal(p.flush(), 'Next');
  assert.equal(p.flush(), null);
});

test('tool calls and their results become one line each', () => {
  const p = createStreamParser();
  const call = p.parse(line({
    type: 'assistant',
    message: { content: [{ type: 'text', text: 'ignored: already streamed' }, { type: 'tool_use', name: 'Bash', input: { command: 'node reserve-report-num.mjs' } }] },
  }));
  assert.equal(call.display, '🔧 Bash: node reserve-report-num.mjs');

  const result = p.parse(line({
    type: 'user',
    message: { content: [{ type: 'tool_result', content: [{ type: 'text', text: '009\n' }] }] },
  }));
  assert.equal(result.display, '   ↳ 009');

  const failed = p.parse(line({ type: 'user', message: { content: [{ type: 'tool_result', is_error: true, content: 'ENOENT' }] } }));
  assert.equal(failed.display, '   ↳ ✖ ENOENT');
});

test('the final result carries usage and the error flag', () => {
  const p = createStreamParser();
  p.parse(delta('pending text'));
  const ok = p.parse(line({
    type: 'result',
    subtype: 'success',
    is_error: false,
    duration_ms: 12_400,
    num_turns: 7,
    total_cost_usd: 0.42,
    result: '```json\n{"status":"completed"}\n```',
    usage: { input_tokens: 10, output_tokens: 20, cache_creation_input_tokens: 5, cache_read_input_tokens: 100 },
  }));
  // Buffered text is flushed ahead of the closing line.
  assert.equal(ok.display, 'pending text\n■ Claude finished in 12s · 7 turns · $0.42');
  assert.equal(ok.result.isError, false);
  assert.deepEqual(ok.result.usage, { input: 10, output: 20, cacheCreate: 5, cacheRead: 100 });
  assert.match(ok.result.text, /completed/);

  const bad = p.parse(line({ type: 'result', subtype: 'error_max_turns', is_error: true, usage: {} }));
  assert.equal(bad.result.isError, true);
  assert.equal(bad.result.error, 'error_max_turns');
  assert.match(bad.display, /stopped with an error/);

  // `is_error` wins even with a success-looking subtype.
  const sneaky = p.parse(line({ type: 'result', subtype: 'success', is_error: true, error: 'rate limited' }));
  assert.equal(sneaky.result.error, 'rate limited');
});

test('session init is announced and unknown or non-JSON lines are handled', () => {
  const p = createStreamParser();
  assert.equal(p.parse(line({ type: 'system', subtype: 'init', model: 'claude-sonnet-5', tools: ['Read', 'Bash'] })).display, '▶ Claude session started · claude-sonnet-5 · 2 tools');
  // Not stream-json: the caller shows it raw.
  assert.equal(p.parse('Warning: something on stderr'), null);
  assert.equal(p.parse('null'), null);
  assert.equal(p.parse('[1,2]'), null);
  // Stream-json we do not care about: silently dropped.
  assert.deepEqual(p.parse(line({ type: 'rate_limit_event' })), { display: null });
});
