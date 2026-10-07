import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readSkillsOverview } from '../../../server/skills/service.js';
import { GOOD_FIT, rankSkills } from './skills.js';

const seed = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'ux', 'sandbox', 'seeds', 'populated');
const data = readSkillsOverview({ root: seed, now: new Date('2026-10-06T12:00:00Z') });

test('Learn next ranks by the count shown, more required first on a tie', () => {
  const { rows } = rankSkills(data, { view: 'learn' });
  assert.ok(rows.length >= 3);
  for (let i = 1; i < rows.length; i++) {
    const [a, b] = [rows[i - 1], rows[i]];
    assert.ok(a.count > b.count || (a.count === b.count && a.required >= b.required), `${a.name} before ${b.name}`);
  }
  for (const r of rows) assert.equal(r.count, r.demand, `${r.name}: unfiltered count is the demand`);
});

test('the good-fit filter applies to the count, the split, the evidence and the order', () => {
  const all = rankSkills(data, { view: 'learn' });
  const good = rankSkills(data, { view: 'learn', goodFitOnly: true });
  assert.ok(good.counted < all.counted, 'fewer postings are counted');
  for (const r of good.rows) {
    assert.ok(r.count > 0);
    assert.equal(r.required + r.nice, r.count);
    assert.ok(r.postings.every((p) => p.score >= GOOD_FIT), `${r.name}: only good-fit postings`);
  }
  assert.equal(good.rows.length + good.hidden, all.rows.length + all.hidden);
});

test('ignored skills are hidden unless asked for, and a local change applies at once', () => {
  const first = rankSkills(data, { view: 'asked' }).rows[0];
  const hidden = rankSkills(data, { view: 'asked', statusById: { [first.id]: 'ignore' } });
  assert.ok(!hidden.rows.some((r) => r.id === first.id));
  const shown = rankSkills(data, { view: 'asked', statusById: { [first.id]: 'ignore' }, showIgnored: true });
  assert.equal(shown.rows.find((r) => r.id === first.id)?.status, 'ignore');
});
