import assert from 'node:assert/strict';
import { test } from 'node:test';

import { aggregate, monthAxis, postingWeight } from './aggregate.js';

const s = (canonical, level = 'required', category) => ({ canonical, id: canonical.toLowerCase().replace(/[^a-z0-9]+/g, '-'), level, category });
const NOW = new Date('2026-03-15T12:00:00Z');

test('postingWeight follows the score bands', () => {
  assert.equal(postingWeight(4.7), 2.0);
  assert.equal(postingWeight(4.0), 1.5);
  assert.equal(postingWeight(3.2), 1.0);
  assert.equal(postingWeight(2.1), 0.5);
  assert.equal(postingWeight(null), 1.0);
});

test('monthAxis is the last six months, oldest first', () => {
  assert.deepEqual(monthAxis(NOW), ['2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03']);
  assert.deepEqual(monthAxis(new Date('2026-01-05T00:00:00Z'), 3), ['2025-11', '2025-12', '2026-01']);
});

const postings = [
  { id: 'p1', firstSeen: '2026-03-01', score: 4.6, skills: [s('Kubernetes'), s('Go'), s('Terraform', 'nice-to-have')] },
  { id: 'p2', firstSeen: '2026-02-10', score: 2.0, skills: [s('Kubernetes'), s('Python')] },
  { id: 'p3', firstSeen: '2026-03-20', score: null, skills: [s('Go'), s('Kubernetes', 'nice-to-have'), s('Kubernetes', 'required'), s('Zig', 'required', 'language')] },
  { id: 'p4', firstSeen: null, score: 3.5, skills: [s('Python'), s('Terraform')] },
];

test('aggregate counts demand once per posting and weights by score band', () => {
  const { skills, months } = aggregate({ postings, now: NOW });
  const by = Object.fromEntries(skills.map((k) => [k.name, k]));

  assert.equal(by.Kubernetes.demand, 3, 'p3 listed it twice; counted once');
  assert.equal(by.Kubernetes.required, 3, 'required beats nice-to-have within one posting');
  assert.equal(by.Kubernetes.weighted, 2.0 + 0.5 + 1.0);
  assert.equal(by.Kubernetes.strong, 1);
  assert.equal(by.Terraform.nice, 1);
  assert.equal(by.Terraform.weighted, 2.0 * 0.5 + 1.0);
  assert.equal(by.Zig.category, 'language', 'an out-of-vocabulary skill takes the extractor\'s category');
  assert.equal(by.Kubernetes.category, 'cloud-infra', 'the vocabulary wins for known names');

  assert.deepEqual(months.at(-1), '2026-03');
  assert.deepEqual(by.Kubernetes.trend, [0, 0, 0, 0, 1, 2]);
  assert.deepEqual(by.Python.trend, [0, 0, 0, 0, 1, 0], 'a posting without firstSeen is outside the trend');

  assert.deepEqual(by.Kubernetes.cooccur.map((c) => c.name), ['Go', 'Python', 'Terraform', 'Zig']);
  assert.deepEqual(by.Kubernetes.postings.map((p) => `${p.id}:${p.level}`), ['p1:required', 'p2:required', 'p3:required']);
  assert.equal(skills[0].name, 'Kubernetes', 'sorted by demand');
});

test('classification: override > CV > missing, and the three lists', () => {
  const cv = { engine: 'llm', skills: [{ id: 'go', canonical: 'Go', depth: 'expert' }, { id: 'python', canonical: 'Python', depth: 'basic' }] };
  const gapMentions = new Map([['terraform', new Set([5, 7])], ['kubernetes', new Set([5])]]);
  const overrides = { zig: 'ignore', terraform: 'partial' };
  const { skills, lists } = aggregate({ postings, cv, gapMentions, overrides, now: NOW });
  const by = Object.fromEntries(skills.map((k) => [k.name, k]));

  assert.equal(by.Go.status, 'have');
  assert.equal(by.Go.statusSource, 'cv-llm');
  assert.equal(by.Python.status, 'partial');
  assert.equal(by.Terraform.status, 'partial');
  assert.equal(by.Terraform.statusSource, 'override');
  assert.equal(by.Kubernetes.status, 'missing');
  assert.equal(by.Kubernetes.gapMentions, 1);
  assert.deepEqual(by.Terraform.gapReports, [5, 7]);
  assert.equal(by.Zig.status, 'ignore');

  assert.deepEqual(lists.learn, ['kubernetes'], 'missing, demanded by ≥2 postings');
  assert.deepEqual(lists.deepen, ['terraform', 'python'], 'partial, by weight: Terraform 2.0 > Python 1.5');
  assert.ok(!lists.demanded.includes('zig'), 'ignored skills leave every list');
  assert.equal(lists.demanded[0], 'kubernetes');
});

test('a rules-only CV classifies by depth', () => {
  const cv = { engine: 'rules', skills: [{ id: 'go', canonical: 'Go', depth: 'solid' }, { id: 'kubernetes', canonical: 'Kubernetes', depth: 'basic' }] };
  const { skills } = aggregate({ postings, cv, now: NOW });
  const by = Object.fromEntries(skills.map((k) => [k.name, k]));
  assert.equal(by.Go.status, 'have');
  assert.equal(by.Go.statusSource, 'cv-rules');
  assert.equal(by.Kubernetes.status, 'partial');
});

test('aggregate with nothing is empty, not broken', () => {
  const out = aggregate({ postings: [], now: NOW });
  assert.deepEqual(out.skills, []);
  assert.deepEqual(out.lists, { demanded: [], learn: [], deepen: [] });
});
