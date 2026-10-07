import { test } from 'node:test';
import assert from 'node:assert/strict';

import { dateTime, duration, fit, jobName, shortDate, statusLabel } from './labels.js';
import { destinationOf, documentTitle, parseHash } from './routes.js';
import { activitySummary, explainFailure, followUps, needsAttention, outcome, runTitle, waitingText } from './runs.js';

test('status labels follow the glossary; stored values pass through unchanged', () => {
  assert.equal(statusLabel('Evaluated'), 'Reviewed — not applied');
  assert.equal(statusLabel('evaluated'), 'Reviewed — not applied');
  assert.equal(statusLabel('SKIP'), "Skipped — don't apply");
  assert.equal(statusLabel('Responded'), 'They replied');
  assert.equal(statusLabel('Something new'), 'Something new');
  assert.equal(fit(4.1), '4.1');
  assert.equal(fit(null), '—');
});

test('dates and durations read like a person wrote them', () => {
  const now = new Date('2026-10-06T12:00:00');
  assert.equal(shortDate('2026-10-06', now), 'Oct 6');
  assert.equal(shortDate('2025-12-31', now), 'Dec 31, 2025');
  assert.equal(dateTime(new Date('2026-10-06T10:42:00'), now), 'Oct 6, 10:42');
  assert.equal(duration(45_000), '45 s');
  assert.equal(duration(3 * 60_000), '3 min');
  assert.equal(jobName({ company: 'Granite Cloud', role: 'Software Engineer' }), 'Granite Cloud — Software Engineer');
});

test('routes: every page has a URL, old ones redirect', () => {
  assert.deepEqual(parseHash(''), { page: 'today', params: {} });
  assert.deepEqual(parseHash('#/applications/12'), { page: 'job', params: { id: 12 } });
  assert.deepEqual(parseHash('#/skills/strengthen'), { page: 'skills', params: { view: 'strengthen' } });
  assert.equal(parseHash('#/skills').redirect, '#/skills/learn');
  assert.equal(parseHash('#/my-cv/nope').redirect, '#/my-cv/content');
  assert.equal(parseHash('#/pipeline/7').redirect, '#/applications/report/7');
  assert.deepEqual(parseHash('#/applications/report/7'), { page: 'job', params: { reportId: 7 } });
  assert.equal(parseHash('#/runs/abc').redirect, '#/activity/abc');
  assert.equal(parseHash('#/sources').redirect, '#/companies');
  assert.equal(parseHash('#/cv').redirect, '#/my-cv/design');
  assert.equal(parseHash('#/nonsense').page, 'not-found');
  assert.equal(destinationOf('job'), 'applications');
  assert.equal(documentTitle('job', 'Granite Cloud — Software Engineer'), 'Granite Cloud — Software Engineer — Job Search Console');
});

const failed = { id: 'f1', kind: 'evaluate', status: 'failed', subject: 'Driftwood Analytics — Data Engineer', error: 'the agent exited without writing reports/041-*.md' };

test('runs are named after their job and failures explained in words', () => {
  assert.equal(runTitle(failed), 'Check fit · Driftwood Analytics — Data Engineer');
  assert.equal(runTitle({ kind: 'scan' }), 'Check for new openings');
  const why = explainFailure(failed);
  assert.match(why.what, /stopped before writing the fit report/);
  assert.equal(why.retry, true);
  assert.equal(explainFailure({ kind: 'evaluate', error: 'company is on the blacklist' }).retry, false);
  assert.equal(waitingText(2), 'Waiting — 2 others are running');
  assert.equal(waitingText(1), 'Waiting — 1 other is running');
});

test('a failure needs attention until it is retried or dismissed', () => {
  const retry = { id: 'r1', kind: 'evaluate', status: 'running', retryOf: 'f1' };
  assert.equal(needsAttention(failed, [failed]), true);
  assert.equal(needsAttention(failed, [failed, retry]), false);
  assert.equal(needsAttention(failed, [failed], ['f1']), false);
  assert.deepEqual(activitySummary([failed]).label, 'Activity · 1 failed');
  assert.deepEqual(activitySummary([failed, retry]).label, 'Activity · 1 working');
  assert.deepEqual(activitySummary([{ id: 'd', kind: 'pdf', status: 'succeeded', endedAt: 10 }], { lastOpened: 5 }).label, 'Activity · 1 done');
  assert.deepEqual(activitySummary([]).state, 'quiet');
});

test('outcomes say what came of a run and link to it', () => {
  const done = { id: 'e', kind: 'evaluate', status: 'succeeded', result: { reportId: 41, score: 4.1 } };
  const got = outcome(done, { rowForReport: (id) => (id === 41 ? { id: 41 } : null) });
  assert.equal(got.text, 'Fit 4.1 / 5. The fit report is ready.');
  assert.deepEqual(got.open, { href: '#/applications/41', label: 'Open the job' });
  const children = [done, { id: 'm', kind: 'merge-tracker', parentId: 'e', status: 'succeeded' }, { id: 'p', kind: 'pdf', parentId: 'e', status: 'running' }];
  assert.equal(followUps(done, children), 'then: added to Applications, made the tailored CV (working)');
  // Bookkeeping is not told; a layout that fails screening is, here and in the CV's outcome.
  const pdf = { id: 'p', kind: 'pdf', status: 'succeeded', parentId: 'e', result: { reportId: 41 } };
  const render = { id: 'r', kind: 'cv-render', status: 'succeeded', parentId: 'p', result: { ats: { verdict: 'fail' } } };
  const ready = { id: 'm2', kind: 'mark-pdf-ready', status: 'succeeded', parentId: 'r' };
  assert.equal(followUps(pdf, [pdf, render, ready]), 'then: laid out the PDF (it fails the screening check)');
  assert.match(outcome(pdf, { all: [pdf, render] }).text, /fails the screening check/);
  assert.equal(activitySummary([done, pdf, render], { lastOpened: 0 }).done, 0, 'chained runs are not counted on their own');

  // A check merged into an application that already existed says so (F-015).
  const merged = { id: 'e2', kind: 'evaluate', status: 'succeeded', result: { reportId: 44, score: 4.1, trackerBefore: [{ id: 21, score: 3.3, status: 'Applied' }] } };
  const rows = [{ id: 21, reportId: 44, score: 4.1, company: 'Brightwater Health', role: 'Data Engineer' }];
  assert.match(outcome(merged, { rows }).text, /Merged into your application #21 \(Brightwater Health — Data Engineer\): fit 3\.3 → 4\.1/);
  assert.equal(followUps(merged, [merged, { id: 'm3', kind: 'merge-tracker', parentId: 'e2', status: 'succeeded' }], rows), 'then: updated application #21');
  assert.equal(outcome({ ...merged, result: { ...merged.result, trackerBefore: [] } }, { rows }).text, 'Fit 4.1 / 5. The fit report is ready.');
});

test('today: new openings are the ones a check added since the user last looked', async () => {
  const { newFromChecks, todayCards, brokenBoards } = await import('./today.js');
  const pending = [
    { url: 'a', company: 'Lumen Grid', title: 'Platform Engineer' },
    { url: 'b', company: 'Mosaic Retail', title: 'Platform Engineer' },
    { url: 'c', company: 'Old Co', title: 'Engineer' },
  ];
  const scan = (endedAt, added, extra = {}) => ({ kind: 'scan', status: 'succeeded', endedAt, result: { added, ...extra } });
  const runs = [
    scan(Date.parse('2026-10-06T23:30:00Z'), [{ company: 'Lumen Grid', title: 'Platform Engineer' }]),
    scan(Date.parse('2026-10-05T10:00:00Z'), [{ company: 'Old Co', title: 'Engineer' }]),
    scan(Date.parse('2026-10-07T00:10:00Z'), [{ company: 'Mosaic Retail', title: 'Platform Engineer' }], { preview: true }),
  ];
  assert.deepEqual(newFromChecks(pending, runs, '2026-10-06T22:00:00Z').map((p) => p.url), ['a'], 'across midnight, and not from a preview');
  assert.deepEqual(newFromChecks(pending, runs, null).map((p) => p.url), ['a', 'c']);
  assert.deepEqual(newFromChecks(pending, [], null), []);

  const companies = [{ name: 'Juniper Mobility', enabled: true }, { name: 'Kestrel Media', enabled: true }];
  const health = { 'Juniper Mobility': { status: 'slug_gone', timestamp: '2026-10-02T08:00:00Z' }, 'Kestrel Media': { status: 'reachable' } };
  assert.deepEqual(brokenBoards(companies, health).map((c) => c.name), ['Juniper Mobility']);

  const cards = todayCards({
    runs: [{ id: 'f', kind: 'evaluate', status: 'failed' }],
    rows: [
      { id: 1, statusId: 'evaluated', score: 3.9 },
      { id: 2, statusId: 'evaluated', score: 4.4 },
      { id: 3, statusId: 'responded', pdf: { format: 'a4' }, cover: false },
    ],
    issues: [{ code: 'row-unparseable', line: 45 }],
    design: { verdict: 'fail' },
    companies,
    health,
  });
  assert.equal(cards.needs.count, 4);
  assert.deepEqual(cards.fresh, []);
  assert.deepEqual(cards.waiting.reviewed.map((r) => r.id), [2, 1]);
  assert.deepEqual(cards.waiting.replied.map((r) => r.id), [3]);
});

test('a check that found problems is done, with its findings, not failed', async () => {
  const { runState, outcome, needsAttention } = await import('./runs.js');
  const found = { id: 'v', kind: 'verify-pipeline', status: 'failed', exitCode: 1, reportsFindings: true };
  assert.equal(runState(found), 'done');
  assert.equal(needsAttention(found, [found]), false);
  assert.match(outcome(found).text, /Found problems/);
  assert.equal(runState({ ...found, exitCode: 2 }), 'failed', 'a crash is still a failure');
  const { designName } = await import('./designs.js');
  assert.equal(designName('ats', [{ name: 'ats', displayName: 'ATS Friendly' }]), 'ATS Friendly');
  assert.equal(designName('two-column'), 'Two column');
});

test('outcomes never claim more than the run knows (H8-today-02, H8-activity-01)', async () => {
  const { outcome } = await import('./runs.js');
  const scan = (result) => outcome({ kind: 'scan', status: 'succeeded', result });
  assert.match(scan({ added: [], unreachable: [], checked: 0 }).text, /No company could be checked/);
  assert.doesNotMatch(scan({ added: [], unreachable: [], checked: 0 }).text, /Every board answered/);
  assert.match(scan({ added: [], unreachable: [], checked: 12 }).text, /Every board answered/);
  assert.match(scan({ added: [], unreachable: [{ company: 'Juniper Mobility', status: 'slug_gone' }], checked: 12 }).text, /Juniper Mobility: the job board couldn’t be reached \(board not found\)/);
  assert.equal(outcome({ kind: 'dedup', status: 'succeeded', dryRun: true }).text, 'Preview only: nothing was changed.');
  assert.doesNotMatch(outcome({ kind: 'verify-portals', status: 'succeeded', exitCode: 0 }).text, /No problems/);
  const { isBoard } = await import('./boards.js');
  assert.equal(isBoard({ careersUrl: 'https://job-boards.greenhouse.io/kestrelmedia' }), true);
  assert.equal(isBoard({ careersUrl: 'https://kestrelmedia.example.com/careers' }), false);
});
