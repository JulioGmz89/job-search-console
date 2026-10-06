import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';

import { readProfile } from '../agents/profile.js';
import { readCvContent, readProfileForm, summarizeCv, writeCvContent, writeProfileForm } from './profile.js';

const scratches = [];
after(() => scratches.forEach((dir) => rmSync(dir, { recursive: true, force: true })));
const workspace = () => {
  const root = mkdtempSync(join(tmpdir(), 'jsc-profile-test-'));
  scratches.push(root);
  return root;
};

const CV = '# Alex Rivera\nAustin\r\n\n## Summary\nBackend.\n\n## Experience\n### Senior — Northwind\n- a\n### Backend — Contoso\n- b\n\n## Education\nB.S.\n\n## Skills\nGo';

test('a CV is saved as given, with a summary the set-up step can confirm', () => {
  const root = workspace();
  assert.equal(readCvContent({ root }).exists, false);
  const saved = writeCvContent({ root, text: CV });
  assert.equal(saved.exists, true);
  assert.equal(readFileSync(join(root, 'cv.md'), 'utf-8'), `${CV.replace(/\r\n/g, '\n')}\n`);
  assert.deepEqual(saved.summary, {
    name: 'Alex Rivera',
    sections: [
      { title: 'Summary', entries: 0 },
      { title: 'Experience', entries: 2 },
      { title: 'Education', entries: 0 },
      { title: 'Skills', entries: 0 },
    ],
  });
  writeCvContent({ root, text: '# Changed' });
  assert.equal(readFileSync(join(root, 'cv.md.bak'), 'utf-8'), saved.text, 'the previous CV is kept');
});

test('an empty CV is refused, not saved', () => {
  const root = workspace();
  assert.throws(() => writeCvContent({ root, text: '  \n' }), (e) => e.code === 'cv-empty' && e.status === 400);
  assert.equal(existsSync(join(root, 'cv.md')), false);
  assert.equal(summarizeCv('').name, null);
});

const PROFILE = `# Fictional profile. Keep this comment.
candidate:
  full_name: "Alex Rivera"   # as on the CV
  phone: "+1 555 010 0199"

target_roles:
  primary:
    - "Senior Backend Engineer"
  archetypes:
    - name: "Backend"
      fit: "primary"

language: en
spend_tier: standard
`;

test('profile fields are edited in place: comments, order and unknown keys survive', () => {
  const root = workspace();
  mkdirSync(join(root, 'config'));
  writeFileSync(join(root, 'config', 'profile.yml'), PROFILE);

  const before = readProfileForm({ root });
  assert.equal(before.fields.fullName, 'Alex Rivera');
  assert.deepEqual(before.fields.targetRoles, ['Senior Backend Engineer']);
  assert.equal(before.fields.language, 'en');
  assert.equal(before.fields.autoPdfThreshold, 3, 'the runner default is shown when unset');

  writeProfileForm({ root, fields: { location: 'Austin, TX', targetRoles: 'Senior Backend Engineer\nPlatform Engineer', autoPdfThreshold: '3.5', language: 'es' } });
  const text = readFileSync(join(root, 'config', 'profile.yml'), 'utf-8');
  assert.match(text, /^# Fictional profile\. Keep this comment\.$/m);
  assert.match(text, /full_name: "Alex Rivera" +# as on the CV/);
  assert.match(text, /phone: "\+1 555 010 0199"/);
  assert.match(text, /archetypes:\n {4}- name: "Backend"/);
  assert.match(text, /^language: es$/m, 'the scalar spelling is kept');

  const after = readProfileForm({ root });
  assert.equal(after.fields.location, 'Austin, TX');
  assert.deepEqual(after.fields.targetRoles, ['Senior Backend Engineer', 'Platform Engineer']);
  assert.equal(readProfile({ root }).autoPdfThreshold, 3.5, 'the runner reads what the form wrote');
  assert.equal(readProfile({ root }).candidateName, 'Alex Rivera');
});

test('a missing profile.yml is created with only what was filled in', () => {
  const root = workspace();
  writeProfileForm({ root, fields: { fullName: 'Alex Rivera', spendTier: 'economy' } });
  const text = readFileSync(join(root, 'config', 'profile.yml'), 'utf-8');
  assert.match(text, /^# Your profile/);
  assert.match(text, /candidate:\n {2}full_name: Alex Rivera/);
  assert.doesNotMatch(text, /Jane Smith/);
  assert.equal(readProfile({ root }).spendTier, 'economy');
});

test('invalid values are refused with the field named', () => {
  const root = workspace();
  assert.throws(() => writeProfileForm({ root, fields: { autoPdfThreshold: '7' } }), (e) => e.code === 'profile-invalid' && e.detail[0].field === 'autoPdfThreshold');
  assert.throws(() => writeProfileForm({ root, fields: { spendTier: 'max' } }), (e) => e.code === 'profile-invalid');
  assert.throws(() => writeProfileForm({ root, fields: { password: 'x' } }), (e) => e.code === 'profile-invalid');
});
