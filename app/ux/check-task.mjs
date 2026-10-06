#!/usr/bin/env node

/**
 * check-task.mjs — the objective verdict for one simulated persona run.
 *
 *   node app/ux/check-task.mjs --task T3 --url http://127.0.0.1:4400/ --info '<SANDBOX_READY json>'
 *                              [--answer-file app/ux/runs/P2-T3/transcript.md] [--out app/ux/runs/P2-T3/verdict.md]
 *
 * Checks the success criterion in app/ux/tasks.md against the sandbox's API (and
 * its data root, from the SANDBOX_READY line) after the tester has finished.
 * Testers over-report success (PROJECT_PLAN.md §12.3); this is what the
 * scorecard counts. For tasks that ask the tester to tell us something, the
 * transcript is searched for the facts the answer must contain. That part is
 * marked "answer". A human or the synthesizer can overrule it with a reason.
 */

import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const here = dirname(fileURLToPath(import.meta.url));
const { values: opts } = parseArgs({
  options: {
    task: { type: 'string' },
    url: { type: 'string', default: 'http://127.0.0.1:4400/' },
    info: { type: 'string', default: '{}' },
    'answer-file': { type: 'string' },
    out: { type: 'string' },
  },
});

const info = JSON.parse(opts.info);
const base = opts.url.replace(/\/$/, '');
const startedAt = info.startedAt ?? 0;
const answer = opts['answer-file'] && existsSync(opts['answer-file']) ? readFileSync(opts['answer-file'], 'utf-8') : '';
const api = async (path) => {
  const res = await fetch(`${base}${path}`);
  return res.ok ? res.json() : null;
};
const allRuns = async () => {
  const r = await api('/api/runs');
  return [...(r?.active ?? []), ...(r?.queued ?? []), ...(r?.recent ?? [])];
};

/** Seed statuses by row number, for "nothing else changed". */
function seedStatuses() {
  const text = readFileSync(join(here, 'sandbox', 'seeds', 'populated', 'data', 'applications.md'), 'utf-8');
  const map = new Map();
  for (const line of text.split(/\r?\n/)) {
    const cells = line.split('|').map((c) => c.trim());
    if (/^\d+$/.test(cells[1] ?? '')) map.set(Number(cells[1]), cells[7]);
  }
  return map;
}

const T8_URL = 'https://job-boards.greenhouse.io/driftwoodanalytics/jobs/4109592';
const T2_URL = 'https://job-boards.greenhouse.io/kestrelmedia/jobs/4134913';

/** Each returns a list of {check, kind: 'data'|'answer', pass, detail}. */
const CHECKS = {
  async T1() {
    const status = await api('/api/agent/status');
    const portals = await api('/api/portals');
    const cv = info.root && existsSync(join(info.root, 'cv.md')) ? readFileSync(join(info.root, 'cv.md'), 'utf-8') : '';
    const enabled = (portals?.companies ?? []).filter((c) => c.enabled !== false);
    return [
      { check: 'cv.md holds the CV', kind: 'data', pass: /Alex Rivera/.test(cv) && /Northwind Payments/.test(cv), detail: `cvPresent=${status?.cvPresent}` },
      { check: 'portals.yml has an enabled company', kind: 'data', pass: Boolean(portals?.exists) && enabled.length > 0, detail: `exists=${portals?.exists}, enabled=${enabled.map((c) => c.name).join(', ') || 'none'}` },
    ];
  },
  async T2() {
    const { rows = [] } = (await api('/api/pipeline')) ?? {};
    const row = rows.find((r) => r.company === 'Kestrel Media' && r.hasReport);
    const report = row ? await api(`/api/reports/${row.reportId}`) : null;
    return [
      { check: 'a Kestrel Media row with a report for the URL', kind: 'data', pass: Boolean(row) && report?.url === T2_URL, detail: row ? `row ${row.id}, ${row.role}, score ${row.score}, report url ${report?.url}` : 'no row' },
      { check: 'the answer gives the score or decision', kind: 'answer', pass: /4\.1|\bapply\b/i.test(answer), detail: 'looks for "4.1" or "apply"' },
    ];
  },
  async T3() {
    const { rows = [] } = (await api('/api/pipeline')) ?? {};
    const seed = seedStatuses();
    const target = rows.filter((r) => [12, 13].includes(r.id));
    const changed = rows.filter((r) => ![12, 13].includes(r.id) && seed.has(r.id) && seed.get(r.id) !== r.status);
    return [
      { check: 'rows 12 and 13 are Applied', kind: 'data', pass: target.length === 2 && target.every((r) => r.status === 'Applied'), detail: target.map((r) => `${r.id}: ${r.status}`).join(', ') },
      { check: 'no other row changed status', kind: 'data', pass: changed.length === 0, detail: changed.map((r) => `${r.id}: ${seed.get(r.id)} → ${r.status}`).join(', ') || 'none changed' },
    ];
  },
  async T4() {
    const runs = await allRuns();
    const scan = runs.filter((r) => r.kind === 'scan' && r.status === 'succeeded');
    return [
      { check: 'a scan run succeeded', kind: 'data', pass: scan.length > 0, detail: `${scan.length} succeeded scan run(s)${scan.some((r) => r.dryRun) ? ' (incl. dry run)' : ''}` },
      { check: 'the answer says 4 new postings', kind: 'answer', pass: /\b(4|four)\b[^.\n]{0,40}(new|posting|opening|job)/i.test(answer), detail: 'looks for "4/four … new/postings"' },
      { check: 'the answer names Juniper Mobility as unreachable', kind: 'answer', pass: /juniper/i.test(answer), detail: 'looks for "Juniper"' },
    ];
  },
  async T5() {
    const report = await api('/api/reports/6');
    const runs = await allRuns();
    const ok = (kind) => runs.some((r) => r.kind === kind && Number(r.meta?.reportId ?? r.meta?.reportNum) === 6 && r.status === 'succeeded');
    return [
      { check: 'report 6 has a PDF', kind: 'data', pass: report?.pdf?.exists === true, detail: report?.pdf?.path ?? 'none' },
      { check: 'report 6 has a cover letter', kind: 'data', pass: Boolean(report?.cover), detail: report?.cover?.path ?? 'none' },
      { check: 'pdf and cover runs for report 6 succeeded', kind: 'data', pass: ok('pdf') && ok('cover'), detail: `pdf=${ok('pdf')}, cover=${ok('cover')}` },
    ];
  },
  async T6() {
    const skills = await api('/api/skills');
    const top = (skills?.lists?.learn ?? []).slice(0, 3).map((id) => skills.skills.find((s) => s.id === id)).filter(Boolean);
    const named = top.find((s) => new RegExp(`\\b${s.name.replace(/[.+]/g, '\\$&')}\\b`, 'i').test(answer));
    let evidence = false;
    let detail = `top 3: ${top.map((s) => `${s.name} (demand ${s.demand})`).join(', ')}`;
    if (named) {
      const companies = new Set(named.postings.map((p) => skills.postings[p.id]?.company).filter(Boolean));
      const numbers = [...answer.matchAll(/\b(\d{1,3})\b/g)].map((m) => Number(m[1]));
      evidence = numbers.some((n) => Math.abs(n - named.demand) <= 1) || [...companies].some((c) => answer.includes(c));
      detail += `; named ${named.name}; companies wanting it: ${[...companies].slice(0, 6).join(', ')}`;
    }
    return [
      { check: 'the answer names one of the top three skills to learn', kind: 'answer', pass: Boolean(named), detail },
      { check: 'the answer cites matching evidence (demand ±1 or a company)', kind: 'answer', pass: evidence, detail: 'demand count or a company from its postings' },
    ];
  },
  async T7() {
    const style = await api('/api/cv/style');
    const runs = await allRuns();
    const report = await api('/api/reports/12');
    const render = runs.find((r) => r.kind === 'cv-render' && r.meta?.documentId === 'cv-alex-rivera-cobaltfreight-012' && r.status === 'succeeded');
    const checked = Date.parse(report?.ats?.checkedAt ?? '') || 0;
    return [
      { check: 'the saved theme is not the broken one', kind: 'data', pass: Boolean(style?.style?.template) && style.style.template !== 'broken', detail: `template=${style?.style?.template}` },
      { check: 'the Cobalt Freight (012) CV was re-rendered', kind: 'data', pass: Boolean(render), detail: render ? `run ${render.id}` : 'no succeeded cv-render for that document' },
      { check: 'its new ATS verdict is pass or warn', kind: 'data', pass: ['pass', 'warn'].includes(report?.ats?.verdict) && checked > startedAt, detail: `verdict=${report?.ats?.verdict}, checkedAt=${report?.ats?.checkedAt}` },
    ];
  },
  async T8() {
    const runs = await allRuns();
    const failed = runs.find((r) => r.id === info.failedRun?.id);
    const retry = runs.find((r) => r.kind === 'evaluate' && r.meta?.url === T8_URL && r.status === 'succeeded' && (!failed || r.queuedAt > failed.queuedAt));
    const { rows = [] } = (await api('/api/pipeline')) ?? {};
    const candidates = rows.filter((r) => r.id >= 41 && r.company === 'Driftwood Analytics');
    let linked = null;
    for (const row of candidates) {
      const report = await api(`/api/reports/${row.reportId}`);
      if (report?.url === T8_URL) linked = row;
    }
    return [
      { check: 'the evaluation was retried and succeeded', kind: 'data', pass: Boolean(retry), detail: retry ? `run ${retry.id}` : 'no succeeded retry' },
      { check: 'a new tracker row links a report for that URL', kind: 'data', pass: Boolean(linked), detail: linked ? `row ${linked.id}` : 'none' },
      { check: 'the answer explains no report was written', kind: 'answer', pass: /report/i.test(answer) && /(without|no |not |never|didn.t|did not|wasn.t)/i.test(answer), detail: 'looks for "report" with a negation' },
    ];
  },
  async T9() {
    const voice = await api('/api/cv/voice');
    const text = String(voice?.text ?? '').toLowerCase();
    const runs = await allRuns();
    const mtime = info.root && existsSync(join(info.root, 'voice-dna.md')) ? statSync(join(info.root, 'voice-dna.md')).mtimeMs : 0;
    const pdf = runs.find((r) => r.kind === 'pdf' && Number(r.meta?.reportId ?? r.meta?.reportNum) === 12 && r.status === 'succeeded' && r.queuedAt > mtime);
    return [
      { check: 'the voice rules ban seamless, cutting-edge and robust', kind: 'data', pass: ['seamless', 'cutting-edge', 'robust'].every((w) => text.includes(w)), detail: ['seamless', 'cutting-edge', 'robust'].map((w) => `${w}:${text.includes(w)}`).join(' ') },
      { check: 'the seed rule "spearheaded" is still there', kind: 'data', pass: text.includes('spearheaded'), detail: '' },
      { check: 'a CV for report 12 was regenerated after the change', kind: 'data', pass: Boolean(pdf), detail: pdf ? `run ${pdf.id}` : 'no succeeded pdf run for report 12 after the edit' },
    ];
  },
};

if (!CHECKS[opts.task]) {
  console.error(`--task must be one of ${Object.keys(CHECKS).join(', ')}`);
  process.exit(2);
}

const results = await CHECKS[opts.task]();
const dataPass = results.filter((r) => r.kind === 'data').every((r) => r.pass);
const answerChecks = results.filter((r) => r.kind === 'answer');
const answerPass = answerChecks.every((r) => r.pass);
// Partial: the work was done but the answer missed, or more than half of the
// work was done. A check that holds trivially ("nothing else changed") cannot
// lift an untouched run out of failure on its own.
const data = results.filter((r) => r.kind === 'data');
const dataPassed = data.filter((r) => r.pass).length;
const outcome = dataPass && answerPass ? 'success' : (dataPass && data.length > 0) || dataPassed > data.length / 2 ? 'partial' : 'failure';

const markdown = [
  `# Verdict: ${opts['answer-file'] ? opts['answer-file'].replace(/\\/g, '/').split('/').slice(-2, -1)[0] : opts.task}`,
  '',
  `Checked by \`app/ux/check-task.mjs --task ${opts.task}\` against ${base}/ (state ${info.state ?? '?'}) on ${new Date().toISOString()}.`,
  '',
  `**Verified outcome:** ${outcome}`,
  '',
  '| Check | Kind | Result | Detail |',
  '|---|---|---|---|',
  ...results.map((r) => `| ${r.check} | ${r.kind} | ${r.pass ? 'pass' : 'FAIL'} | ${r.detail.replace(/\|/g, '/')} |`),
  '',
];
if (opts.out) writeFileSync(resolve(opts.out), `${markdown.join('\n')}\n`);
console.log(markdown.join('\n'));
