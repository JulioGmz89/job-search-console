import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';

import { readProfile } from './profile.js';
import { assemblePrompt, fillTemplate, PromptError, writePromptFile } from './prompts/assemble.js';
import { ALLOWED_TOOLS, createAgentCommand, TIMEOUTS } from './runner.js';

/**
 * A tiny fake repository: just enough of upstream's modes/ for the assembler
 * to have something to read. The real modes are 70 KB each and would make the
 * assertions about ordering unreadable.
 */
let repo;
let root;
before(() => {
  repo = mkdtempSync(join(tmpdir(), 'jsc-assemble-'));
  root = repo;
  mkdirSync(join(repo, 'modes', 'es'), { recursive: true });
  mkdirSync(join(repo, 'config'), { recursive: true });
  writeFileSync(join(repo, 'modes', '_shared.md'), '# shared rubric\n');
  writeFileSync(join(repo, 'modes', '_profile.md'), '# my profile\n');
  writeFileSync(join(repo, 'modes', '_writing.md'), '# writing rules\n');
  writeFileSync(join(repo, 'modes', 'oferta.md'), '# oferta mode {{NAME}} stays literal\n');
  writeFileSync(join(repo, 'modes', 'pdf.md'), '# pdf mode\n');
  writeFileSync(join(repo, 'modes', 'cover.md'), '# cover mode\n');
  writeFileSync(join(repo, 'modes', 'es', 'oferta.md'), '# oferta en español\n');
  writeFileSync(
    join(repo, 'config', 'profile.yml'),
    'candidate:\n  name: "Ada Lovelace"\nlanguage:\n  output: es\n  modes_dir: es\nspend_tier: premium\ncv:\n  auto_pdf_score_threshold: 3.5\n  sections: [skills, education]\nstyle:\n  accent_color: "#123456"\n',
  );
  writeFileSync(join(repo, 'voice-dna.md'), '# VOICE DNA\nNo em dashes.\n');
});
after(() => rmSync(repo, { recursive: true, force: true }));

const order = (text, ...needles) => {
  const positions = needles.map((n) => text.indexOf(n));
  positions.forEach((pos, i) => assert.notEqual(pos, -1, `missing: ${needles[i]}`));
  assert.deepEqual([...positions].sort((a, b) => a - b), positions, `out of order: ${needles.join(' < ')}`);
};

test('readProfile extracts what the runner needs and never throws', () => {
  const p = readProfile({ root });
  assert.equal(p.exists, true);
  assert.equal(p.language, 'es');
  assert.equal(p.spendTier, 'premium');
  assert.equal(p.autoPdfThreshold, 3.5);
  assert.equal(p.candidateSlug, 'ada-lovelace');
  assert.equal(p.hasStyle, true);
  assert.equal(p.hasCvSections, true);

  const none = readProfile({ root: join(root, 'nope') });
  assert.equal(none.exists, false);
  assert.equal(none.autoPdfThreshold, 3.0);
  assert.equal(none.candidateSlug, null);
});

test('the evaluate prompt stacks the files in the skill router order', () => {
  const { system, sections, warnings } = assemblePrompt({
    mode: 'evaluate',
    repoRoot: repo,
    root,
    vars: { URL: 'https://jobs.example/1', REPORT_NUM: '009', DATE: '2026-09-15' },
  });
  order(system, 'Write all human-facing output in', '# shared rubric', '# my profile', '# oferta', 'Runtime personalization', 'Headless run', 'Report number:** `009`');
  // The Spanish mode replaced the English one, and the mode's own {{NAME}} is not our placeholder.
  assert.match(system, /oferta en español/);
  assert.doesNotMatch(system, /oferta mode \{\{NAME\}\}/);
  assert.deepEqual(sections, ['language', 'modes/_shared.md', 'modes/_profile.md', 'modes/es/oferta.md', 'config/profile.yml', 'overlay:evaluate']);
  assert.deepEqual(warnings, []);
  // Evaluations do not carry the voice file; it is for candidate-facing prose.
  assert.doesNotMatch(system, /VOICE DNA/);
});

test('pdf and cover prompts inline voice-dna.md and the writing rules', () => {
  const vars = {
    REPORT_PATH: 'reports/009-acme-2026-09-15.md',
    REPORT_NUM: '009',
    URL: 'https://jobs.example/1',
    DATE: '2026-09-15',
    CANDIDATE: 'ada-lovelace',
    COMPANY_SLUG: 'acme',
    FORMAT: 'a4',
    PAYLOAD_PATH: 'data/jsc/tmp/cv-1.json',
    CV_HTML_PATH: 'output/cv-ada-lovelace-acme.html',
    CV_PDF_PATH: 'output/cv-ada-lovelace-acme-2026-09-15.pdf',
    TEMPLATE_PATH: 'templates/cv-template.html',
  };
  const pdf = assemblePrompt({ mode: 'pdf', repoRoot: repo, root, vars });
  order(pdf.system, '# shared rubric', '# writing rules', '# pdf mode', 'Headless run', 'node app/cv/render-cv.js', 'Voice DNA (apply)', 'No em dashes.');
  assert.ok(pdf.sections.includes('voice-dna.md'));

  const cover = assemblePrompt({
    mode: 'cover',
    repoRoot: repo,
    root,
    vars: { REPORT_PATH: vars.REPORT_PATH, REPORT_NUM: '009', URL: vars.URL, DATE: vars.DATE, ANSWERS: '- **A.** Because', PAYLOAD_PATH: 'x.json', COVER_PDF_PATH: 'output/cover-acme-009.pdf' },
  });
  // cover.md does not load _shared.md (SKILL.md "Context Loading by Mode").
  assert.doesNotMatch(cover.system, /# shared rubric/);
  order(cover.system, '# writing rules', '# cover mode', '- **A.** Because', 'no** `--report` flag', 'Voice DNA (apply)');
});

test('a missing profile is a warning; a leftover placeholder is an error', () => {
  const bare = mkdtempSync(join(tmpdir(), 'jsc-assemble-bare-'));
  try {
    const { warnings } = assemblePrompt({
      mode: 'evaluate',
      repoRoot: repo,
      root: bare,
      vars: { URL: 'u', REPORT_NUM: '001', DATE: 'd' },
    });
    assert.match(warnings[0], /profile\.yml is missing/);
  } finally {
    rmSync(bare, { recursive: true, force: true });
  }

  assert.throws(
    () => assemblePrompt({ mode: 'evaluate', repoRoot: repo, root, vars: { URL: 'u' } }),
    (e) => e instanceof PromptError && e.code === 'prompt-placeholder' && /REPORT_NUM/.test(e.message),
  );
  assert.throws(() => fillTemplate('{{A}} {{B}}', { A: 1 }), /\{\{B\}\}/);
  assert.equal(fillTemplate('{{A}}-{{A}}', { A: 'x' }), 'x-x');
});

test('the prompt file lands under data/jsc/prompts', () => {
  const path = writePromptFile({ root, runId: 'run-1', text: 'hello' });
  assert.equal(path, join(root, 'data', 'jsc', 'prompts', 'run-1.md'));
  assert.equal(readFileSync(path, 'utf-8'), 'hello');
});

test('the claude command line is pinned', () => {
  const command = createAgentCommand({
    bin: { file: '/usr/bin/claude', args: [], found: true, shell: false },
    userPrompt: 'Evaluate https://x — report 009',
    systemPromptPath: '/tmp/p.md',
    model: 'claude-sonnet-5',
    cwd: '/repo',
  });
  assert.deepEqual(command.args, [
    '-p',
    'Evaluate https://x — report 009',
    '--output-format',
    'stream-json',
    '--verbose',
    '--include-partial-messages',
    '--permission-mode',
    'acceptEdits',
    '--allowedTools',
    ALLOWED_TOOLS.join(','),
    '--disallowedTools',
    'Task',
    '--strict-mcp-config',
    '--model',
    'claude-sonnet-5',
    '--append-system-prompt-file',
    '/tmp/p.md',
  ]);
  assert.equal(command.cwd, '/repo');
  assert.equal(command.shell, false);

  // An unwrapped shim keeps its own leading args; no model means no --model.
  const shim = createAgentCommand({
    bin: { file: process.execPath, args: ['cli.js'], found: true, shell: false },
    userPrompt: 'x',
    systemPromptPath: 'p',
    cwd: '.',
  });
  assert.equal(shim.args[0], 'cli.js');
  assert.ok(!shim.args.includes('--model'));

  assert.throws(() => createAgentCommand({ bin: { found: false }, userPrompt: 'x', systemPromptPath: 'p', cwd: '.' }), /not found/);
  assert.throws(
    () => createAgentCommand({ bin: { file: 'c', args: [], found: true }, userPrompt: 'two\nlines', systemPromptPath: 'p', cwd: '.' }),
    /single line/,
  );
  assert.ok(TIMEOUTS.evaluate > TIMEOUTS.pdf);
});
