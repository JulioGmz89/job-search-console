import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { safeResolve } from './paths.js';
import {
  listReports,
  readPdfIndex,
  readReport,
  renderMarkdown,
  resolveReportPdf,
} from './reports.js';

const here = dirname(fileURLToPath(import.meta.url));
const WORKSPACE = join(here, '__fixtures__', 'workspace');

test('lists every report on disk, in id order', () => {
  const { reports } = listReports({ root: WORKSPACE });

  assert.deepEqual(reports.map((r) => r.id), [1, 2, 3, 5, 6, 7]);
  assert.equal(reports[0].title, 'Evaluation: Acme Corp — Backend Engineer');
  assert.equal(reports[0].url, 'https://example.invalid/jobs/acme-backend');
});

test('the Machine Summary YAML becomes structured fields', () => {
  const report = readReport(1, { root: WORKSPACE });

  assert.equal(report.machine.score, 4.2);
  assert.equal(typeof report.machine.score, 'number', 'score is a number, not "4.2/5"');
  assert.equal(report.machine.final_decision, 'Apply');
  assert.equal(report.machine.legitimacy_tier, 'High Confidence');
  assert.equal(report.machine.advertised_comp, '$90,000 - $110,000 a year');
  assert.deepEqual(report.machine.hard_stops, []);
  assert.equal(report.machine.soft_gaps.length, 1);
});

test('header fields are read from the header block only', () => {
  const report = readReport(1, { root: WORKSPACE });

  assert.equal(report.header.date, '2026-01-05');
  assert.equal(report.header.legitimacy, 'High Confidence');
  // "**Gaps flagged:**" lives inside section A and must not be hoisted into the
  // header, or every bold label in the prose becomes a phantom header field.
  assert.equal(report.header.gaps_flagged, undefined);
});

test('prose sections keep document order and exclude the Machine Summary', () => {
  const report = readReport(1, { root: WORKSPACE });

  assert.deepEqual(
    report.sections.map((s) => s.title),
    ['A) Role Summary', 'B) Match with CV', 'Keywords extracted'],
  );
  assert.ok(report.sections[1].html.includes('<li>Owns backend services</li>'));
});

test('a report with no Machine Summary still renders its prose', () => {
  const report = readReport(3, { root: WORKSPACE });

  assert.equal(report.machine, null);
  assert.equal(report.sections.length, 2);
  assert.ok(report.issues.some((i) => i.code === 'machine-summary-missing'));
});

test('malformed Machine Summary YAML is an issue, not a throw', () => {
  const report = readReport(7, { root: WORKSPACE });

  assert.equal(report.machine, null);
  assert.ok(report.issues.some((i) => i.code === 'machine-summary-invalid'));
  assert.ok(report.sections[0].html.includes('deliberately malformed'));
});

/**
 * The tags actually present in a rendered fragment.
 *
 * Substring checks cannot tell live markup from escaped text: a report that
 * quotes `<script>` renders it as `&lt;script&gt;`, which is inert but still
 * *contains* the substring "script". Asserting on parsed tags is the assertion
 * that matches the actual threat.
 */
const liveTags = (html) => [...html.matchAll(/<\s*\/?\s*([a-zA-Z][\w-]*)([^>]*)>/g)]
  .map((m) => ({ name: m[1].toLowerCase(), attrs: m[2] }));

const ALLOWED = new Set([
  'p', 'br', 'hr', 'blockquote', 'pre', 'code', 'span',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'dl', 'dt', 'dd',
  'strong', 'em', 'del', 'sup', 'sub',
  'table', 'thead', 'tbody', 'tr', 'th', 'td', 'a',
]);

test('untrusted report markup is rendered inert, not executed', () => {
  const report = readReport(2, { root: WORKSPACE });
  const html = report.sections.map((s) => s.html).join('');
  const tags = liveTags(html);

  for (const tag of tags) {
    assert.ok(ALLOWED.has(tag.name), `unexpected live tag <${tag.name}>`);
    assert.ok(!/\son\w+\s*=/i.test(tag.attrs), `event handler on <${tag.name}>`);
  }
  assert.ok(!tags.some((t) => ['script', 'iframe', 'img', 'object'].includes(t.name)));
  assert.ok(!/href\s*=\s*["']?\s*javascript:/i.test(html), 'no javascript: URL survives');

  // The payloads must still be visible as escaped text: the point is to show the
  // user what the posting contained, not to silently delete part of the report.
  assert.ok(html.includes('&lt;script&gt;'), 'the script tag is escaped, not dropped');
  assert.ok(html.includes('&lt;iframe'), 'the iframe is escaped, not dropped');

  const anchors = tags.filter((t) => t.name === 'a' && t.attrs.includes('href'));
  assert.equal(anchors.length, 1, 'only the one legitimate link becomes an anchor');
  assert.ok(anchors[0].attrs.includes('https://example.invalid/apply'));
  assert.ok(anchors[0].attrs.includes('rel="noopener noreferrer"'));

  assert.ok(html.includes('Text after the payloads must survive'), 'prose survives');
});

test('renderMarkdown never emits raw HTML from its input', () => {
  const html = renderMarkdown('<script>alert(1)</script>\n\n<b onclick="x()">hi</b>');

  for (const tag of liveTags(html)) {
    assert.ok(ALLOWED.has(tag.name), `unexpected live tag <${tag.name}>`);
    assert.ok(!/\son\w+\s*=/i.test(tag.attrs), 'no event handler attribute');
  }
  assert.ok(html.includes('&lt;script&gt;'), 'escaped rather than passed through');
});

test('the PDF index joins on report id and checks the file exists', () => {
  const index = readPdfIndex(WORKSPACE);

  assert.equal(index.get(1).exists, true);
  assert.equal(index.get(1).format, 'a4');
  assert.equal(index.get(6).exists, false, 'indexed but absent from output/');
});

test('an indexed but missing PDF is surfaced as an issue', () => {
  const report = readReport(6, { root: WORKSPACE });

  assert.equal(report.pdf.exists, false);
  assert.ok(report.issues.some((i) => i.code === 'pdf-missing'));
  assert.equal(resolveReportPdf(6, { root: WORKSPACE }), null, 'never served');
});

test('a resolvable PDF is served from inside output/', () => {
  const pdf = resolveReportPdf(1, { root: WORKSPACE });

  assert.ok(pdf.absolutePath.startsWith(join(WORKSPACE, 'output')));
  assert.equal(pdf.fileName, 'cv-fixture-acme-2026-01-05.pdf');
});

test('a pdf-index path that escapes output/ is refused', () => {
  // Fixture row 009 is `output/../../../escape-attempt.pdf`.
  assert.equal(readPdfIndex(WORKSPACE).get(9).absolutePath, null);
  assert.equal(resolveReportPdf(9, { root: WORKSPACE }), null);
});

test('safeResolve rejects traversal, absolute paths, and NUL bytes', () => {
  const base = join(WORKSPACE, 'reports');

  assert.equal(safeResolve('../data/applications.md', base), null);
  assert.equal(safeResolve('../../../../etc/passwd', base), null);
  assert.equal(safeResolve('/etc/passwd', base), null);
  assert.equal(safeResolve('C:\\Windows\\win.ini', base), null);
  assert.equal(safeResolve('001-acme\0.md', base), null);
  assert.equal(safeResolve('', base), null);

  assert.ok(safeResolve('001-acme-2026-01-05.md', base), 'a real report resolves');
});

test('a non-numeric or traversing report id resolves to nothing', () => {
  assert.equal(readReport('../../../etc/passwd', { root: WORKSPACE }), null);
  assert.equal(readReport('abc', { root: WORKSPACE }), null);
  assert.equal(readReport(-1, { root: WORKSPACE }), null);
  assert.equal(readReport(999, { root: WORKSPACE }), null, 'no such report');
});

test('html rendering can be skipped for structured-only consumers', () => {
  const report = readReport(1, { root: WORKSPACE, html: false });

  assert.equal(report.sections[0].html, undefined);
  assert.ok(report.sections[0].markdown.length > 0);
  assert.equal(report.machine.score, 4.2);
});
