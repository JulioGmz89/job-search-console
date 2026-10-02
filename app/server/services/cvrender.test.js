import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';

import { createBrowserPool } from './browser.js';
import { buildCvHtml, finalizeCvHtml, resolveRequestStyle } from './cvrender.js';

let root;
before(() => {
  root = mkdtempSync(join(tmpdir(), 'jsc-cvrender-'));
  mkdirSync(join(root, 'config', 'cv', 'templates'), { recursive: true });
  writeFileSync(join(root, 'payload.json'), '{"candidate":{"name":"A"}}');
  writeFileSync(join(root, 'config', 'cv', 'templates', 'mine.html'), '<html><head></head><body>{{NAME}}</body></html>');
});
after(() => rmSync(root, { recursive: true, force: true }));

test('built HTML is cached by payload and template; a change to either rebuilds', async () => {
  let builds = 0;
  const builder = async (payloadPath, out) => {
    builds += 1;
    writeFileSync(out, `<html>build ${builds}</html>`);
  };
  const templatePath = join(root, 'config', 'cv', 'templates', 'mine.html');
  const payloadPath = join(root, 'payload.json');

  const first = await buildCvHtml({ payloadPath, templatePath, root, builder });
  const again = await buildCvHtml({ payloadPath, templatePath, root, builder });
  assert.equal(first.cached, false);
  assert.equal(again.cached, true);
  assert.equal(again.html, first.html);
  assert.equal(builds, 1);

  writeFileSync(payloadPath, '{"candidate":{"name":"B"}}');
  const changed = await buildCvHtml({ payloadPath, templatePath, root, builder });
  assert.equal(changed.cached, false);
  assert.equal(builds, 2);
});

test('a failed build leaves nothing in the cache', async () => {
  const builder = async () => {
    throw new Error('boom');
  };
  writeFileSync(join(root, 'payload.json'), '{"candidate":{"name":"C"}}');
  const input = { payloadPath: join(root, 'payload.json'), templatePath: join(root, 'config', 'cv', 'templates', 'mine.html'), root, builder };
  await assert.rejects(buildCvHtml(input), /boom/);
  let builds = 0;
  const ok = await buildCvHtml({ ...input, builder: async (_p, out) => { builds += 1; writeFileSync(out, 'x'); } });
  assert.equal(ok.cached, false);
  assert.equal(builds, 1);
});

test('finalize applies our style, then upstream\'s steps in generate-pdf.mjs order', async () => {
  writeFileSync(join(root, 'config', 'profile.yml'), 'style:\n  accent_color: "#111111"\ncv:\n  sections: [skills, education]\n');
  const calls = [];
  const helpers = {
    reorderCvSections: (html, order) => {
      calls.push(`reorder:${order.join('>')}`);
      return html;
    },
    normalizeTextForATS: (html) => {
      calls.push('normalize');
      return { html, replacements: {} };
    },
    injectPrintPageCss: (html, format) => {
      calls.push(`page:${format}`);
      return html;
    },
    inlineLocalFonts: async (html) => {
      calls.push('fonts');
      return html;
    },
  };
  const { html, applied } = await finalizeCvHtml('<html><head></head><body></body></html>', { template: 'standard', density: 'compact', sections: ['summary', 'skills'], accent_color: '#222222' }, { root, format: 'letter', helpers });
  assert.deepEqual(calls, ['reorder:summary>skills', 'reorder:skills>education', 'normalize', 'page:letter', 'fonts']);
  assert.ok(applied.includes('density:compact'));
  // Ours first, profile.yml's after it — the later declaration wins, as in upstream's renderer.
  assert.ok(html.indexOf('#222222') < html.indexOf('#111111'));
  rmSync(join(root, 'config', 'profile.yml'));
});

test('request styles are validated and the template must exist', () => {
  assert.equal(resolveRequestStyle({ template: 'mine' }, { root }).template.source, 'custom');
  assert.throws(() => resolveRequestStyle({ font_size: 'huge' }, { root }), (e) => e.code === 'style-invalid' && e.detail[0].key === 'font_size');
  assert.throws(() => resolveRequestStyle({ template: 'no-such-theme' }, { root }), (e) => e.code === 'template-missing');
});

test('the browser pool launches once, serializes pages, isolates them and closes on demand', async () => {
  let launches = 0;
  let active = 0;
  let maxActive = 0;
  const contexts = [];
  const fakeBrowser = {
    isConnected: () => true,
    on() {},
    close: async () => {},
    newContext: async (options) => {
      contexts.push(options);
      return {
        close: async () => {},
        newPage: async () => ({
          route: async () => {},
          goto: async (url) => assert.match(url, /^file:/),
          evaluate: async () => {},
          close: async () => {},
        }),
      };
    },
  };
  const pool = createBrowserPool({ launch: async () => { launches += 1; return fakeBrowser; } });
  const job = (n) => pool.withPage('<html></html>', { dir: join(root, 'render') }, async () => {
    active += 1;
    maxActive = Math.max(maxActive, active);
    await new Promise((r) => setTimeout(r, 5));
    active -= 1;
    return n;
  });
  const failing = pool.withPage('<html></html>', { dir: join(root, 'render') }, async () => { throw new Error('page failed'); });
  const results = await Promise.all([job(1), job(2), failing.catch((e) => e.message), job(3)]);
  assert.deepEqual(results, [1, 2, 'page failed', 3]);
  assert.equal(launches, 1);
  assert.equal(maxActive, 1);
  assert.ok(contexts.every((c) => c.javaScriptEnabled === false));
  await pool.close();
});
