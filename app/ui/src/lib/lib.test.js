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
  assert.equal(followUps(done, children), 'then: added to Applications, made tailored CV (working)');
});

test('today: new openings are the ones first seen after the user last looked', async () => {
  const { newSince, todayCards, brokenBoards } = await import('./today.js');
  const pending = [
    { url: 'a', firstSeen: '2026-10-04' },
    { url: 'b', firstSeen: '2026-10-06' },
    { url: 'c', firstSeen: null },
  ];
  assert.deepEqual(newSince(pending, null).map((p) => p.url), ['a', 'b']);
  assert.deepEqual(newSince(pending, '2026-10-05T09:00:00Z').map((p) => p.url), ['b']);
  assert.deepEqual(newSince(pending, '2026-10-06T09:00:00Z', { timestamp: '2026-10-06T08:00:00Z' }).map((p) => p.url), []);
  assert.deepEqual(newSince(pending, '2026-10-06T09:00:00Z', { timestamp: '2026-10-06T10:00:00Z' }).map((p) => p.url), ['b']);

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
  assert.deepEqual(cards.waiting.reviewed.map((r) => r.id), [2, 1]);
  assert.deepEqual(cards.waiting.replied.map((r) => r.id), [3]);
});
