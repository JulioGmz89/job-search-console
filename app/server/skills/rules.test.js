import assert from 'node:assert/strict';
import { test } from 'node:test';

import { canonicalSkill, categoryOf, isKnownSkill, skillId } from './aliases.js';
import { extractCvRules, extractRules, findSkills, splitCvSections } from './rules.js';

test('canonicalSkill layers the fork aliases over upstream', () => {
  assert.equal(canonicalSkill('k8s'), 'Kubernetes', 'upstream alias');
  assert.equal(canonicalSkill('JS'), 'JavaScript', 'fork alias');
  assert.equal(canonicalSkill('Node JS'), 'Node.js');
  assert.equal(canonicalSkill('google cloud platform'), 'GCP');
  assert.equal(canonicalSkill('graphql'), 'GraphQL', 'upstream display casing');
  assert.equal(canonicalSkill('Something Else'), 'Something Else', 'unknown passes through');
  assert.equal(skillId('Node.js'), 'node-js');
  assert.equal(skillId('C#'), 'csharp');
  assert.equal(skillId('C++'), 'cplusplus');
  assert.equal(skillId('.NET'), 'dotnet');
  assert.equal(skillId('CI/CD'), 'ci-cd');
  assert.equal(categoryOf('Kafka'), 'data');
  assert.equal(categoryOf('Bachelor'), 'other');
  assert.ok(isKnownSkill('REST APIs'));
  assert.ok(!isKnownSkill('Excellent'));
});

test('findSkills unions upstream tokens, fork aliases and vocabulary-known bullet tokens', () => {
  const found = findSkills('We use JS, node js and Postgres. Requirements:\n- Experience with Kafka and Bachelor degree\n- ci/cd pipelines');
  assert.deepEqual([...found.keys()].sort(), ['CI/CD', 'JavaScript', 'Kafka', 'Node.js', 'PostgreSQL']);
  assert.equal(found.get('JavaScript'), 'JS', 'the spelling found is kept');
});

test('everyday-word aliases match only as written', () => {
  assert.ok(findSkills('Built services with Express and Unity.').has('Express'));
  assert.ok(findSkills('Built services with Express and Unity.').has('Unity'));
  assert.ok(!findSkills('express your ideas; team unity matters; the git of it').has('Express'));
  assert.ok(!findSkills('express your ideas; team unity matters').has('Unity'));
  assert.ok(findSkills('Go and Rust').has('Go'));
  assert.ok(!findSkills('go the extra mile').has('Go'));
  assert.ok(findSkills('C# and .NET 8').has('C#'));
  assert.ok(findSkills('C# and .NET 8').has('.NET'));
});

test('extractRules reads required vs nice-to-have from sections and inline hints', () => {
  const text = [
    '# Senior Backend Engineer',
    'We build Payments infrastructure in Python.',
    '',
    'Requirements:',
    '- 5+ years of Python',
    '- PostgreSQL and Redis',
    '- Kubernetes (preferred)',
    '',
    'Nice to have',
    '- Terraform',
    '- Python for data pipelines',
    '',
    'Benefits',
    '- Remote work',
  ].join('\n');
  const skills = extractRules(text);
  const byName = Object.fromEntries(skills.map((s) => [s.canonical, s]));
  assert.equal(byName.Python.level, 'required', 'required in one block and nice in another → required');
  assert.equal(byName.PostgreSQL.level, 'required');
  assert.equal(byName.Redis.level, 'required');
  assert.equal(byName.Kubernetes.level, 'nice-to-have', 'inline (preferred)');
  assert.equal(byName.Terraform.level, 'nice-to-have', 'under the Nice to have heading');
  assert.equal(byName.Payments.category, 'domain');
  assert.equal(byName.Python.id, 'python');
  assert.equal(byName.Python.category, 'language');
  assert.ok(!('Remote' in byName));
  assert.deepEqual(extractRules(''), []);
});

test('a heading after the nice-to-have block resets to required', () => {
  const text = 'Bonus points:\n- Go\n\nWhat you will do:\n- Ship Rust services\n\nMUST HAVE\n- Kafka';
  const byName = Object.fromEntries(extractRules(text).map((s) => [s.canonical, s.level]));
  assert.equal(byName.Go, 'nice-to-have');
  assert.equal(byName.Rust, 'required');
  assert.equal(byName.Kafka, 'required');
});

test('the CV splits into a skills section and prose, with depth', () => {
  const cv = [
    '# Ada Lovelace',
    '<!-- Python is only a comment here -->',
    '## Experience',
    '- Built the engine in C++ and mentioned Kafka once',
    '## Skills',
    '- Languages: JavaScript, TypeScript',
    '- Cloud: AWS',
    '## Education',
    '- Maths',
  ].join('\n');
  const { namedSkillsText, proseText } = splitCvSections(cv);
  assert.match(namedSkillsText, /JavaScript/);
  assert.ok(!/JavaScript/.test(proseText));

  const skills = extractCvRules({ cvText: cv, profileText: 'skills:\n  - Docker\n# not Kubernetes\n' });
  const depth = Object.fromEntries(skills.map((s) => [s.canonical, s.depth]));
  assert.deepEqual(depth, { AWS: 'solid', 'C++': 'basic', Docker: 'solid', JavaScript: 'solid', Kafka: 'basic', TypeScript: 'solid' });
});
