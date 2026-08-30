import { test } from 'node:test';
import assert from 'node:assert/strict';

import { defaultConfig } from './config.js';

test('the server binds loopback only (PROJECT_PLAN.md §9.2)', () => {
  assert.equal(defaultConfig.host, '127.0.0.1');
});

test('the default port is a usable, non-privileged port', () => {
  assert.ok(Number.isInteger(defaultConfig.port));
  assert.ok(defaultConfig.port > 1023 && defaultConfig.port < 65536);
});
