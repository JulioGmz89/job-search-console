import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';

import { getCvDocument, importRunPayloads, isCvPayload, listCvDocuments, SAMPLE_ID, SAMPLE_PATH } from './cvdocs.js';

const RUN = '26a0bbaa-65e4-451b-a7cf-451b78fa1eec';
const payload = (name) => JSON.stringify({ candidate: { name, email: 'a@b.co' }, experience: [] });

let root;
before(() => {
  root = mkdtempSync(join(tmpdir(), 'jsc-cvdocs-'));
  mkdirSync(join(root, 'output'), { recursive: true });
  mkdirSync(join(root, 'data', 'jsc', 'tmp'), { recursive: true });
  mkdirSync(join(root, 'data', 'jsc', 'prompts'), { recursive: true });
  writeFileSync(join(root, 'output', 'cv-ana-acme.json'), payload('Ana'));
  writeFileSync(join(root, 'output', 'cv-ana-acme.html'), '<html></html>');
  writeFileSync(join(root, 'output', 'cv-ana-acme-2026-01-05.pdf'), '%PDF');
  writeFileSync(join(root, 'output', 'cv-ana-loose.json'), payload('Ana'));
  writeFileSync(join(root, 'output', 'cv-ana-themed.json'), payload('Ana'));
  writeFileSync(join(root, 'output', 'cover-payload-acme.json'), JSON.stringify({ company: 'Acme', paragraphs: [] }));
  writeFileSync(join(root, 'output', 'broken.json'), '{ not json');
  writeFileSync(
    join(root, 'data', 'pdf-index.tsv'),
    '# report\tpdf\thtml\tformat\tdate\n004\toutput/cv-ana-acme-2026-01-05.pdf\toutput/cv-ana-acme.html\ta4\t2026-01-05\n'
      + '009\toutput/cv-ana-themed-2026-01-06.pdf\toutput/cv-ana-themed.themed.html\ta4\t2026-01-06\n',
  );
  // An M3 run: payload in tmp, the prompt names the HTML it built.
  writeFileSync(join(root, 'data', 'jsc', 'tmp', `cv-${RUN}.json`), payload('Ana'));
  writeFileSync(
    join(root, 'data', 'jsc', 'prompts', `${RUN}.md`),
    `run exactly\n  \`node build-cv-html.mjs data/jsc/tmp/cv-${RUN}.json output/cv-candidate-globex.html templates/cv-template.html\`\n`,
  );
});
after(() => rmSync(root, { recursive: true, force: true }));

test('payload shape: a named candidate with a CV body; cover payloads are not CVs', () => {
  assert.equal(isCvPayload({ candidate: { name: 'A' }, experience: [] }), true);
  assert.equal(isCvPayload({ candidate: { name: 'A' }, summary: 'x' }), true);
  assert.equal(isCvPayload({ candidate: { name: '' }, experience: [] }), false);
  assert.equal(isCvPayload({ company: 'Acme', paragraphs: [] }), false);
  assert.equal(isCvPayload([]), false);
});

test('lists payloads in output/, joined to pdf-index through the HTML basename, sample last', () => {
  const docs = listCvDocuments({ root });
  const ids = docs.map((d) => d.id);
  assert.deepEqual(ids.slice(-1), [SAMPLE_ID]);
  assert.ok(ids.includes('cv-ana-acme'));
  assert.ok(ids.includes('cv-ana-loose'));
  assert.ok(!ids.includes('cover-payload-acme'));
  assert.ok(!ids.includes('broken'));
  const acme = docs.find((d) => d.id === 'cv-ana-acme');
  assert.equal(acme.reportId, 4);
  assert.equal(acme.pdf, 'cv-ana-acme-2026-01-05.pdf');
  assert.equal(docs.find((d) => d.id === 'cv-ana-loose').reportId, null);
  assert.equal(docs.find((d) => d.id === 'cv-ana-themed').reportId, 9, 'a console render records the .themed.html copy');
});

test('M3 run payloads are imported next to the HTML their run built, once', () => {
  assert.ok(existsSync(join(root, 'output', 'cv-candidate-globex.json')));
  writeFileSync(join(root, 'output', 'cv-candidate-globex.json'), payload('Edited'));
  assert.deepEqual(importRunPayloads({ root }), []);
  assert.match(readFileSync(join(root, 'output', 'cv-candidate-globex.json'), 'utf-8'), /Edited/);
});

test('documents resolve by id only from the listing', () => {
  assert.equal(getCvDocument('cv-ana-acme', { root }).payload.candidate.name, 'Ana');
  assert.equal(getCvDocument(SAMPLE_ID, { root }).path, SAMPLE_PATH);
  assert.throws(() => getCvDocument('../cv.md', { root }), (e) => e.code === 'document-invalid');
  assert.throws(() => getCvDocument('nope', { root }), (e) => e.code === 'document-missing' && e.status === 404);
});

test('the bundled sample is a valid payload', () => {
  assert.equal(isCvPayload(JSON.parse(readFileSync(SAMPLE_PATH, 'utf-8'))), true);
});
