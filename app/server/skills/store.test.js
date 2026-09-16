import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';

import {
  postingId,
  readCvSkills,
  readExtraction,
  readExtractions,
  readOverrides,
  readPosting,
  readPostings,
  skillsDir,
  textHash,
  writeCvSkills,
  writeExtraction,
  writeOverride,
  writePosting,
} from './store.js';

const root = mkdtempSync(join(tmpdir(), 'jsc-skills-store-'));
after(() => rmSync(root, { recursive: true, force: true }));

test('postingId folds tracking params, scheme and trailing slashes into one key', () => {
  const a = postingId('http://Jobs.Lever.co/acme/123/?utm_source=x');
  const b = postingId('https://jobs.lever.co/acme/123');
  assert.equal(a, b);
  assert.equal(postingId('not a url'), null);
  assert.equal(postingId('local:jds/acme.md'), null);
});

test('textHash ignores whitespace and case', () => {
  assert.equal(textHash('Python  and\n Kubernetes'), textHash('python and kubernetes'));
  assert.notEqual(textHash('Python'), textHash('Go'));
});

test('a posting round-trips, and a later failure keeps the text it had', () => {
  const url = 'https://jobs.lever.co/acme/123';
  const first = writePosting({ root, url, source: 'lever-api', title: 'Engineer', text: 'We need Go and Kafka.' });
  assert.equal(first.textHash, textHash('We need Go and Kafka.'));
  assert.equal(first.error, null);

  const failed = writePosting({ root, url, error: { code: 'http-503', message: 'Service Unavailable' } });
  assert.equal(failed.text, 'We need Go and Kafka.', 'the old text survives a failed refetch');
  assert.equal(failed.source, 'lever-api');
  assert.equal(failed.error.code, 'http-503');

  const stored = readPosting({ root, id: postingId(url) });
  assert.equal(stored.textHash, first.textHash);
  assert.equal(readPostings({ root }).size, 1);
  assert.ok(!readdirSync(join(skillsDir(root), 'postings')).some((n) => n.endsWith('.tmp')), 'no temp file left behind');
});

test('a posting that never had text records the failure without inventing a source', () => {
  const entry = writePosting({ root, url: 'https://example.com/jobs/never', error: new Error('boom') });
  assert.equal(entry.text, null);
  assert.equal(entry.source, null);
  assert.equal(entry.error.code, 'fetch-failed');
});

test('extractions are keyed by text hash', () => {
  const hash = textHash('anything');
  writeExtraction({ root, textHash: hash, engine: 'llm', model: 'fake', runId: 'r1', skills: [{ skill: 'Go', canonical: 'Go', category: 'language', level: 'required' }] });
  assert.equal(readExtraction({ root, hash }).engine, 'llm');
  assert.equal(readExtractions({ root }).get(hash).skills[0].canonical, 'Go');
  assert.equal(readExtraction({ root, hash: 'nope' }), null);
});

test('a corrupt cache file reads as absent', () => {
  writeFileSync(join(skillsDir(root), 'extractions', 'broken.json'), '{not json');
  assert.equal(readExtractions({ root }).size, 1, 'the good one is still listed');
});

test('cv skills and overrides round-trip', () => {
  assert.equal(readCvSkills({ root }), null);
  writeCvSkills({ root, cvHash: 'abc', engine: 'llm', skills: [{ skill: 'Python', canonical: 'Python', category: 'language', depth: 'expert' }] });
  assert.equal(readCvSkills({ root }).cvHash, 'abc');

  assert.deepEqual(readOverrides({ root }), {});
  writeOverride({ root, id: 'kubernetes', status: 'partial' });
  writeOverride({ root, id: 'bachelor', status: 'ignore' });
  assert.deepEqual(readOverrides({ root }), { kubernetes: 'partial', bachelor: 'ignore' });
  writeOverride({ root, id: 'kubernetes', status: null });
  assert.deepEqual(readOverrides({ root }), { bachelor: 'ignore' });
  assert.throws(() => writeOverride({ root, id: 'x', status: 'expert' }), /status must be one of/);
  assert.ok(existsSync(join(skillsDir(root), 'overrides.json')));
});
