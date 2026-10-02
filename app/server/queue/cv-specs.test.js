import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';

import { writeAtsRecord } from '../services/ats.js';
import { repoRoot } from '../services/paths.js';
import { buildSpec } from './specs.js';

let root;
let ctx;
const today = new Date().toISOString().slice(0, 10);

before(() => {
  root = mkdtempSync(join(tmpdir(), 'jsc-cvspec-'));
  mkdirSync(join(root, 'output'), { recursive: true });
  mkdirSync(join(root, 'data'), { recursive: true });
  const payload = JSON.stringify({ candidate: { name: 'Ana' }, experience: [] });
  writeFileSync(join(root, 'output', 'cv-ana-acme.json'), payload);
  writeFileSync(join(root, 'output', 'cv-ana-loose.json'), payload);
  writeFileSync(join(root, 'data', 'pdf-index.tsv'), '# header\n7\toutput/cv-ana-acme-2026-01-01.pdf\toutput/cv-ana-acme.html\ta4\t2026-01-01\n');
  ctx = { root, repoRoot };
});
after(() => rmSync(root, { recursive: true, force: true }));

test('cv-render pins its argv from a library id and a known theme', () => {
  const spec = buildSpec('cv-render', { documentId: 'cv-ana-acme', template: 'modern' }, ctx);
  assert.equal(spec.script, 'app/cv/render-cv.js');
  assert.deepEqual(spec.args, ['--document=cv-ana-acme', '--template=modern', `--date=${today}`]);
  assert.equal(spec.lane, 'script');
  assert.equal(spec.dedupeKey, 'cv-render:cv-ana-acme');

  // No theme named: the saved style's, which defaults to standard.
  assert.deepEqual(buildSpec('cv-render', { documentId: 'cv-ana-loose' }, ctx).args[1], '--template=standard');
});

test('cv-render refuses paths, the sample, unknown documents and unknown themes', () => {
  const refuses = (options, code) => assert.throws(() => buildSpec('cv-render', options, ctx), (e) => e.name === 'SpecError' && e.code === code);
  refuses({ documentId: '../cv.md' }, 'document-invalid');
  refuses({ documentId: 'nope' }, 'document-missing');
  refuses({ documentId: 'sample' }, 'document-sample');
  refuses({ documentId: 'cv-ana-acme', template: '../../x' }, 'style-invalid');
  refuses({ documentId: 'cv-ana-acme', template: 'no-such-theme' }, 'template-missing');
});

test('a successful render reports the ATS verdict and flips the PDF flag only when there is a report', () => {
  const spec = buildSpec('cv-render', { documentId: 'cv-ana-acme', template: 'modern' }, ctx);
  writeAtsRecord(root, spec.meta.pdf, { verdict: 'fail', score: 40, issues: [{ severity: 'critical', message: 'x' }] });
  const recorded = [];
  const outcome = spec.hooks.after({}, { provisional: { status: 'succeeded' }, record: (text, stream) => recorded.push([stream, text]) });
  assert.equal(outcome.result.ats.verdict, 'fail');
  assert.equal(recorded[0][0], 'stderr');
  assert.deepEqual(outcome.next.map((s) => [s.kind, s.args]), [['mark-pdf-ready', ['007']]]);

  const loose = buildSpec('cv-render', { documentId: 'cv-ana-loose' }, ctx);
  assert.deepEqual(loose.hooks.after({}, { provisional: { status: 'succeeded' }, record() {} }).next, []);
  assert.deepEqual(loose.hooks.after({}, { provisional: { status: 'failed' }, record() {} }), {});
});
