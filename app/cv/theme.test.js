import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { buildThemedHtml, CV_SECTION_KEYS, listCvTemplates, loadStyle, resolveTemplatePath, styleToTokens, validateStyle } from './theme.js';
import { generateArgs, main, parseArgs } from './render-cv.js';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

const HTML = '<html><head><title>cv</title></head><body><h1>Ada</h1><div class="section">x</div></body></html>';

test('validateStyle keeps good values, names bad ones, drops unknown keys', () => {
  const ok = validateStyle({
    accent_color: ' #1f4e79 ',
    font_family: 'DM Sans, Arial, sans-serif',
    font_size: '10.5pt',
    margin: '0.6in 0.5in',
    density: 'compact',
    template: 'modern',
    sections: ['Skills', 'experience'],
    bogus: 'ignored',
  });
  assert.deepEqual(ok.errors, []);
  assert.equal(ok.style.accent_color, '#1f4e79');
  assert.deepEqual(ok.style.sections, ['skills', 'experience']);
  assert.equal(ok.style.bogus, undefined);

  const bad = validateStyle({
    accent_color: 'red; } body { display:none',
    font_family: 'x</style>',
    font_size: 'big',
    margin: '1 inch',
    density: 'dense',
    template: '../../etc',
    sections: ['skills', 'skills', 'nope'],
  });
  assert.deepEqual(bad.errors.map((e) => e.key).sort(), ['accent_color', 'density', 'font_family', 'font_size', 'margin', 'sections', 'sections', 'sections', 'template'].sort());
  // Nothing invalid survives into the style.
  assert.equal(bad.style.accent_color, null);
  assert.equal(bad.style.template, 'standard');

  assert.equal(validateStyle({ sections: ['skills'] }).errors[0].key, 'sections');
  assert.deepEqual(validateStyle(null).errors, []);
});

test('tokens map onto the four custom properties upstream templates read', () => {
  const { style } = validateStyle({ accent_color: '#123', font_family: 'Arial', font_size: '11px', margin: '1cm', heading_font_family: 'Georgia' });
  assert.deepEqual(styleToTokens(style), {
    '--accent-color': '#123',
    '--font-family': 'Arial',
    '--font-size': '11px',
    '--page-margin': '1cm',
  });
});

test('buildThemedHtml injects tokens, density rules, heading font and bundled fonts, and reorders', () => {
  const { style } = validateStyle({ accent_color: '#123', density: 'compact', heading_font_family: 'Space Grotesk, sans-serif', sections: ['skills', 'experience'] });
  const calls = [];
  const { html, applied } = buildThemedHtml(HTML, style, {
    reorder: (input, order) => {
      calls.push(order);
      return `${input}<!-- reordered -->`;
    },
  });
  assert.match(html, /id="career-ops-dynamic-theme">:root \{ --accent-color: #123; \}/);
  assert.match(html, /id="jsc-style"/);
  assert.match(html, /line-height: 1\.25/);
  assert.match(html, /h1, h2, h3, \.name, \.section-title \{ font-family: Space Grotesk, sans-serif; \}/);
  assert.match(html, /@font-face \{ font-family: "Space Grotesk"; src: url\('\.\/fonts\/space-grotesk-latin\.woff2'\)/);
  assert.ok(html.endsWith('<!-- reordered -->'));
  assert.deepEqual(calls, [['skills', 'experience']]);
  assert.deepEqual(applied, ['--accent-color', 'density:compact', 'heading_font_family', 'sections:skills>experience']);
  // Both style blocks sit inside <head>.
  assert.ok(html.indexOf('jsc-style') < html.indexOf('</head>'));
});

test('an empty style leaves the HTML byte-identical; a `$` in a font is refused outright', () => {
  const { style } = validateStyle({});
  assert.equal(buildThemedHtml(HTML, style).html, HTML);

  // `$'` in a String.replace pattern splices the document into itself; the
  // validator refuses `$` and the injector uses a replacer function anyway.
  const tricky = validateStyle({ heading_font_family: "A$' B" });
  assert.equal(tricky.errors[0].key, 'heading_font_family');
  const { html } = buildThemedHtml(HTML, validateStyle({ heading_font_family: "A' B" }).style);
  assert.equal(html.match(/<body>/g).length, 1);
  assert.match(html, /font-family: A' B;/);
});

let root;
before(() => {
  root = mkdtempSync(join(tmpdir(), 'jsc-theme-'));
  mkdirSync(join(root, 'config', 'cv', 'templates'), { recursive: true });
});
after(() => rmSync(root, { recursive: true, force: true }));

test('loadStyle never throws and reports a broken file', () => {
  const missing = loadStyle({ root });
  assert.equal(missing.exists, false);
  assert.equal(missing.style.template, 'standard');

  writeFileSync(join(root, 'config', 'cv', 'style.yml'), 'accent_color: [not\n');
  const broken = loadStyle({ root });
  assert.equal(broken.exists, true);
  assert.match(broken.errors[0].message, /does not parse/);

  writeFileSync(join(root, 'config', 'cv', 'style.yml'), 'accent_color: "#abc"\ntemplate: modern\nsections: [skills, education]\n');
  const good = loadStyle({ root });
  assert.deepEqual(good.errors, []);
  assert.equal(good.style.accent_color, '#abc');
});

test('templates resolve custom > upstream > default, and list both', () => {
  const custom = join(root, 'config', 'cv', 'templates', 'mine.html');
  writeFileSync(custom, '<html>{{NAME}}{{EXPERIENCE}}{{EDUCATION}}</html>');

  assert.deepEqual(resolveTemplatePath({ template: 'mine' }, { root, repoRoot }), { path: custom, name: 'mine', source: 'custom' });
  assert.equal(resolveTemplatePath({ template: 'standard' }, { root, repoRoot }).source, 'default');
  assert.equal(resolveTemplatePath({}, { root, repoRoot }).path, join(repoRoot, 'templates', 'cv-template.html'));
  const modern = resolveTemplatePath({ template: 'modern' }, { root, repoRoot });
  assert.equal(modern.source, 'upstream');
  assert.match(modern.path, /cv-template\.modern\.html$/);
  assert.throws(() => resolveTemplatePath({ template: 'no-such' }, { root, repoRoot }), /Template not found/);

  const listed = listCvTemplates({ root, repoRoot });
  assert.equal(listed[0].name, 'mine');
  assert.equal(listed[0].source, 'custom');
  assert.ok(listed.some((t) => t.name === 'modern' && t.source === 'upstream'));
  assert.ok(listed.some((t) => t.name === 'standard'));
  assert.ok(CV_SECTION_KEYS.includes('experience'));
});

test('render-cv.js writes a themed copy beside the input and pins the generate-pdf.mjs argv', async () => {
  const output = join(root, 'output');
  mkdirSync(output, { recursive: true });
  const input = join(output, 'cv-ada-acme.html');
  writeFileSync(input, HTML);
  writeFileSync(join(root, 'config', 'cv', 'style.yml'), 'accent_color: "#abc"\n');

  const spawned = [];
  const fakeSpawn = (file, args) => {
    spawned.push({ file, args });
    const listeners = {};
    const child = { on: (event, fn) => ((listeners[event] = fn), child) };
    setImmediate(() => listeners.close(0));
    return child;
  };
  const logs = [];
  const code = await main([input, join(output, 'cv-ada-acme-2026-09-15.pdf'), '--format=letter', '--report=009', '--keep'], {
    spawnFn: fakeSpawn,
    root,
    log: (l) => logs.push(l),
  });
  assert.equal(code, 0);
  assert.equal(spawned.length, 1);
  assert.equal(spawned[0].file, process.execPath);
  const themed = join(output, 'cv-ada-acme.themed.html');
  assert.deepEqual(spawned[0].args, [
    join(repoRoot, 'generate-pdf.mjs'),
    themed,
    join(output, 'cv-ada-acme-2026-09-15.pdf'),
    '--format=letter',
    '--report=009',
    '--allow-reorder',
  ]);
  assert.match(logs[0], /Style applied: --accent-color/);

  assert.deepEqual(parseArgs(['a.html', 'b.pdf']), { input: 'a.html', output: 'b.pdf', format: 'a4', report: null, keep: false, maxPages: null, strictPages: false });
  assert.deepEqual(generateArgs({ themedPath: 't', output: 'o', format: 'a4', report: null }), [join(repoRoot, 'generate-pdf.mjs'), 't', 'o', '--format=a4', '--allow-reorder']);
  assert.equal(await main([], { spawnFn: fakeSpawn, root }), 2);
  assert.equal(await main([input, 'x.pdf', '--format=legal'], { spawnFn: fakeSpawn, root }), 2);
});
