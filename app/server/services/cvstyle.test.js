import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';

import { readCovers, recordCover, resolveReportCover } from './covers.js';
import { listCvTemplates, listWritingSamples, readStyle, readVoice, writeStyle, writeVoice } from './cvstyle.js';

let root;
before(() => {
  root = mkdtempSync(join(tmpdir(), 'jsc-cvstyle-'));
  mkdirSync(join(root, 'config'), { recursive: true });
});
after(() => rmSync(root, { recursive: true, force: true }));

test('style round-trips through style.yml and only recognized, non-default keys are written', () => {
  const fresh = readStyle({ root });
  assert.equal(fresh.exists, false);
  assert.equal(fresh.style.template, 'standard');
  assert.ok(fresh.fields.accent_color);
  assert.deepEqual(fresh.profileWarnings, { style: false, cvSections: false, cvTemplate: null });

  writeStyle({ root, style: { accent_color: '#1f4e79', density: 'normal', template: 'standard', sections: [], bogus: 1, font_size: '' } });
  const text = readFileSync(join(root, 'config', 'cv', 'style.yml'), 'utf-8');
  assert.match(text, /^# Job Search Console/);
  const body = text.split('\n').filter((l) => !l.startsWith('#')).join('\n');
  assert.equal(body.trim(), "accent_color: '#1f4e79'");

  writeStyle({ root, style: { accent_color: '#000', template: 'modern', sections: ['skills', 'education'], density: 'compact' } });
  const saved = readStyle({ root });
  assert.equal(saved.exists, true);
  assert.deepEqual(saved.errors, []);
  assert.equal(saved.style.template, 'modern');
  assert.deepEqual(saved.style.sections, ['skills', 'education']);
  assert.ok(existsSync(join(root, 'config', 'cv', 'style.yml.bak')));
});

test('an invalid style is refused with the offending keys, and nothing is written', () => {
  const before = readFileSync(join(root, 'config', 'cv', 'style.yml'), 'utf-8');
  assert.throws(
    () => writeStyle({ root, style: { font_size: 'huge', sections: ['skills'] } }),
    (e) => e.code === 'style-invalid' && e.status === 400 && e.detail.map((d) => d.key).sort().join() === 'font_size,sections',
  );
  assert.equal(readFileSync(join(root, 'config', 'cv', 'style.yml'), 'utf-8'), before);
});

test('profile.yml settings that override ours are surfaced as warnings', () => {
  writeFileSync(join(root, 'config', 'profile.yml'), 'style:\n  accent_color: "#fff"\ncv:\n  template: jake\n  sections: [skills, education]\n');
  assert.deepEqual(readStyle({ root }).profileWarnings, { style: true, cvSections: true, cvTemplate: 'jake' });
  rmSync(join(root, 'config', 'profile.yml'));
});

test('voice-dna.md is read, seeded from the template and written normalized', () => {
  const missing = readVoice({ root });
  assert.equal(missing.exists, false);
  assert.equal(missing.text, '');
  assert.match(missing.templateText, /VOICE DNA/);

  writeVoice({ root, text: '# Mine\r\nNo em dashes.' });
  const saved = readVoice({ root });
  assert.equal(saved.exists, true);
  assert.equal(saved.text, '# Mine\nNo em dashes.\n');

  assert.throws(() => writeVoice({ root, text: 42 }), (e) => e.code === 'voice-invalid');
  assert.throws(() => writeVoice({ root, text: 'x'.repeat(300 * 1024) }), (e) => e.code === 'voice-too-large');
});

test('writing samples skip the README and dotfiles; templates list custom and upstream', () => {
  assert.deepEqual(listWritingSamples({ root }).samples, []);
  mkdirSync(join(root, 'writing-samples'));
  writeFileSync(join(root, 'writing-samples', 'README.md'), 'upstream');
  writeFileSync(join(root, 'writing-samples', '.DS_Store'), '');
  writeFileSync(join(root, 'writing-samples', 'cover-2025.md'), 'my letter');
  const { samples } = listWritingSamples({ root });
  assert.deepEqual(samples.map((s) => s.name), ['cover-2025.md']);
  assert.equal(samples[0].size, 9);

  const { templates, current, customDir } = listCvTemplates({ root });
  assert.equal(current, 'modern');
  assert.ok(templates.some((t) => t.name === 'modern' && t.source === 'upstream'));
  assert.ok(customDir.endsWith(join('config', 'cv', 'templates')));
});

test('cover letters are recorded per report and resolved only inside output/', () => {
  assert.deepEqual(readCovers({ root }), {});
  assert.equal(resolveReportCover(9, { root }), null);

  mkdirSync(join(root, 'output'), { recursive: true });
  writeFileSync(join(root, 'output', 'cover-acme-009.pdf'), '%PDF');
  const entry = recordCover({ root, reportId: '009', path: 'output/cover-acme-009.pdf' });
  assert.equal(entry.path, 'output/cover-acme-009.pdf');
  const found = resolveReportCover('9', { root });
  assert.equal(found.fileName, 'cover-acme-009.pdf');
  assert.ok(found.absolutePath.endsWith(join('output', 'cover-acme-009.pdf')));

  // An entry that escapes output/ — hand-edited or planted — resolves to nothing.
  recordCover({ root, reportId: 10, path: 'output/../cv.md' });
  assert.equal(resolveReportCover(10, { root }), null);
});
