import assert from 'node:assert/strict';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, before, test } from 'node:test';

import { checkPdfText, fold, payloadKeywords } from './ats.js';
import { createBrowserPool } from './browser.js';
import { renderPreview } from './cvrender.js';
import { SAMPLE_PATH } from './cvdocs.js';

const here = dirname(fileURLToPath(import.meta.url));

/** Chromium is installed by the root package's postinstall; CI for app/ does not run it. */
const chromium = await import('playwright')
  .then((m) => existsSync(m.chromium.executablePath()))
  .catch(() => false);
const needsChromium = chromium ? false : 'Playwright Chromium is not installed';

const payload = {
  candidate: { name: 'José Núñez', email: 'jose@example.com' },
  summary: 'Builds things.',
  competencies: ['Go', 'PostgreSQL'],
  experience: [{ company: 'Acme', role: 'Engineer', dates: '2020', bullets: ['Did work'] }],
  skills: [{ category: 'Languages', items: 'Go, SQL' }, { category: 'Data', items: ['Kafka'] }],
};
const html = '<h1>José Núñez</h1><div class="section-title">Professional Summary</div><div class="section-title">Core Competencies</div><div class="section-title">Work Experience</div><div class="section-title">Skills</div>';
const longText = (body) => `${body}\n${'filler text '.repeat(40)}`;

test('fold ignores case, accents, typographic punctuation and whitespace', () => {
  assert.equal(fold('José  Núñez'), fold('jose nunez'));
  assert.equal(fold('Awards & Honors'), fold('AWARDS &amp; HONORS'));
  assert.equal(fold('Event‑Driven'), fold('event-driven'));
});

test('keywords come from competencies and every skills item, de-duplicated', () => {
  assert.deepEqual(payloadKeywords(payload), ['Go', 'PostgreSQL', 'SQL', 'Kafka']);
});

test('a PDF that kept everything has no findings', () => {
  const text = longText('JOSE NUNEZ jose@example.com Professional Summary Builds things. Core Competencies Go PostgreSQL Work Experience Acme Skills Go, SQL Kafka');
  const result = checkPdfText({ text, payload, html });
  assert.deepEqual(result.issues, []);
  assert.equal(result.keywords.percent, 100);
});

test('lost name, email, heading and keywords are critical; scrambled order is critical', () => {
  const text = longText('Skills Go Professional Summary Work Experience');
  const result = checkPdfText({ text, payload, html });
  const messages = result.issues.map((i) => `${i.severity}: ${i.message}`).join('\n');
  assert.match(messages, /critical: The candidate name/);
  assert.match(messages, /critical: The email/);
  assert.match(messages, /critical: The "Core Competencies" heading/);
  assert.match(messages, /critical: .*out of place/);
  assert.match(messages, /critical: Only 25% of the CV's own keywords/);
});

test('a section the template never renders is a warning, not a failure', () => {
  const text = longText('Jose Nunez jose@example.com Professional Summary Work Experience Skills Go PostgreSQL SQL Kafka');
  const result = checkPdfText({ text, payload, html: html.replace('Core Competencies', '') });
  assert.deepEqual(result.issues.map((i) => i.severity), ['warning']);
});

test('too little text is critical', () => {
  const result = checkPdfText({ text: 'Jose Nunez', payload: { candidate: { name: 'Jose Nunez' } }, html: '' });
  assert.equal(result.issues[0].severity, 'critical');
});

// ── end to end, through the real renderer ─────────────────────────────

let root;
let pool;
before(() => {
  root = mkdtempSync(join(tmpdir(), 'jsc-ats-'));
  mkdirSync(join(root, 'output'), { recursive: true });
  mkdirSync(join(root, 'config', 'cv', 'templates'), { recursive: true });
  copyFileSync(SAMPLE_PATH, join(root, 'output', 'cv-alex-sample.json'));
  copyFileSync(join(here, '__fixtures__', 'themes', 'broken.html'), join(root, 'config', 'cv', 'templates', 'broken.html'));
  pool = createBrowserPool();
});
after(async () => {
  await pool.close();
  rmSync(root, { recursive: true, force: true });
});

test('upstream\'s standard theme passes the guardrail', { skip: needsChromium, timeout: 60_000 }, async () => {
  const result = await renderPreview({ documentId: 'cv-alex-sample', style: { template: 'standard' }, root, pool });
  assert.equal(result.ats.verdict, 'pass', JSON.stringify(result.ats.issues));
  assert.equal(result.pages, 1);
  assert.equal(result.ats.keywords.percent, 100);
});

test('the deliberately broken theme fails it, naming what an ATS loses', { skip: needsChromium, timeout: 60_000 }, async () => {
  const result = await renderPreview({ documentId: 'cv-alex-sample', style: { template: 'broken' }, root, pool });
  assert.equal(result.template.source, 'custom');
  assert.equal(result.ats.verdict, 'fail');
  const messages = result.ats.issues.filter((i) => i.severity === 'critical').map((i) => i.message).join('\n');
  assert.match(messages, /<table>/);
  assert.match(messages, /email alex\.rivera@example\.com is not in the PDF text/);
  assert.match(messages, /"Work Experience" heading is in the document but not in the PDF text/);
});
