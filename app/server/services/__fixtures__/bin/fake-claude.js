#!/usr/bin/env node

/**
 * A stand-in for `claude -p`, so the agent runs can be tested end to end —
 * queue, prompt assembly, verification, and the upstream post-steps — without
 * a real session. It speaks stream-json like the CLI, reads the report number
 * out of the assembled system prompt (which doubles as a check that the
 * placeholders were substituted), and writes what the scenario says.
 *
 * Environment:
 *   FAKE_CLAUDE_SCENARIO  evaluate-ok (default) | evaluate-no-report | evaluate-is-error |
 *                         evaluate-wrong-number | evaluate-blacklisted | hang |
 *                         pdf-ok | cover-ok | skills-ok | skills-partial |
 *                         skills-no-output | skills-cv-ok
 *   FAKE_CLAUDE_SCORE     score for evaluate-ok (default 4.1)
 *   FAKE_CLAUDE_ARGV      when set, the argv is written to this file for inspection
 *   CAREER_OPS_ROOT       the data root (set by the runner's confineTo)
 */

import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join } from 'node:path';

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? null : args[i + 1];
};

if (process.env.FAKE_CLAUDE_ARGV) writeFileSync(process.env.FAKE_CLAUDE_ARGV, JSON.stringify(args));

const root = process.env.CAREER_OPS_ROOT ?? process.cwd();
const scenario = process.env.FAKE_CLAUDE_SCENARIO ?? 'evaluate-ok';
const systemPrompt = flag('--append-system-prompt-file') ? readFileSync(flag('--append-system-prompt-file'), 'utf-8') : '';
const userPrompt = flag('-p') ?? '';

const grab = (re, text = systemPrompt) => re.exec(text)?.[1] ?? null;
const reportNum = grab(/\*\*Report number:\*\* `(\d{3,})`/) ?? grab(/report number `(\d{3,})`/);
const date = grab(/\*\*Date:\*\* (\d{4}-\d{2}-\d{2})/) ?? new Date().toISOString().slice(0, 10);
const url = grab(/\*\*Job URL:\*\* (\S+)/) ?? 'https://example.invalid/';

const emit = (obj) => process.stdout.write(`${JSON.stringify(obj)}\n`);
const say = (text) => emit({ type: 'stream_event', event: { type: 'content_block_delta', delta: { type: 'text_delta', text } } });
const tool = (name, input) => emit({ type: 'assistant', message: { content: [{ type: 'tool_use', name, input }] } });
const toolResult = (text) => emit({ type: 'user', message: { content: [{ type: 'tool_result', content: text }] } });
const finish = ({ isError = false, text = '', subtype = isError ? 'error_during_execution' : 'success' } = {}) =>
  emit({
    type: 'result',
    subtype,
    is_error: isError,
    duration_ms: 1234,
    num_turns: 3,
    total_cost_usd: 0.05,
    result: text,
    usage: { input_tokens: 100, output_tokens: 50, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
  });

/** A path the overlay printed: relative to the cwd (the repo) when inside it, absolute otherwise. */
const resolveFromCwd = (p) => (isAbsolute(p) ? p : join(process.cwd(), p));

const write = (relative, text) => {
  const path = join(root, relative);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text, 'utf-8');
  return path;
};

emit({ type: 'system', subtype: 'init', model: 'fake-claude', tools: ['Read', 'Write', 'Bash'] });
say(`Received: ${userPrompt.slice(0, 60)}\n`);

const writeReport = (num, score) => {
  const file = `reports/${num}-fake-co-${date}.md`;
  write(
    file,
    [
      '# Evaluation: Fake Co — Test Engineer',
      '',
      `**Date:** ${date}`,
      `**URL:** ${url}`,
      '**Via:** —',
      '**Archetype:** Test Engineer',
      `**Score:** ${score}/5`,
      '**Legitimacy:** High Confidence',
      '**Verification:** unconfirmed (headless)',
      '**PDF:** not generated — use the console',
      '',
      '---',
      '',
      '## Machine Summary',
      '',
      '```yaml',
      'company: "Fake Co"',
      'role: "Test Engineer"',
      `score: ${score}`,
      'legitimacy_tier: "High Confidence"',
      'final_decision: "Apply"',
      'hard_stops: []',
      'soft_gaps: []',
      'top_strengths: []',
      'risk_level: "Low"',
      'confidence: "High"',
      'next_action: "Apply"',
      '```',
      '',
      '## A) Role Summary',
      '',
      'A fixture report written by fake-claude.js.',
      '',
      '## Cover Letter Draft',
      '',
      'Dear Fake Co, I am the fixture.',
      '',
    ].join('\n'),
  );
  write(
    `batch/tracker-additions/${num}-fake-co.tsv`,
    `${num}\t${date}\tFake Co\tTest Engineer\tEvaluated\t${score}/5\t❌\t[${num}](reports/${num}-fake-co-${date}.md)\tFixture evaluation\t${url}\n`,
  );
  return file;
};

/** The skills-cv session: a fixed list with a duplicate and an alias, for the validator to fold. */
const writeCvSkills = () => {
  const output = resolveFromCwd(grab(/\*\*Output file:\*\* `([^`]+)`/));
  writeFileSync(output, JSON.stringify({ skills: [
    { skill: 'Python', category: 'language', depth: 'expert' },
    { skill: 'Postgres', category: 'data', depth: 'solid' },
    { skill: 'Terraform', category: 'cloud-infra', depth: 'basic' },
    { skill: 'Terraform', category: 'cloud-infra', depth: 'expert' },
  ] }));
  tool('Write', { file_path: output });
  finish({ text: 'done' });
};

switch (scenario) {
  case 'evaluate-ok': {
    const score = process.env.FAKE_CLAUDE_SCORE ?? '4.1';
    tool('WebFetch', { url });
    toolResult('Fake Co is hiring a Test Engineer.');
    const file = writeReport(reportNum, score);
    tool('Write', { file_path: file });
    say('Report written.\n');
    finish({ text: `\`\`\`json\n${JSON.stringify({ status: 'completed', report_num: reportNum, score: Number(score) })}\n\`\`\`` });
    break;
  }
  case 'evaluate-wrong-number': {
    writeReport(String(Number(reportNum) + 3).padStart(3, '0'), '4.0');
    finish();
    break;
  }
  case 'evaluate-no-report':
    say('I looked at the page but wrote nothing.\n');
    finish();
    break;
  case 'evaluate-blacklisted':
    finish({ text: '```json\n{"status":"failed","error":"blacklisted: never again"}\n```' });
    break;
  case 'evaluate-is-error':
    writeReport(reportNum, '4.4');
    finish({ isError: true, subtype: 'error_max_turns' });
    break;
  case 'hang':
    say('working…\n');
    setInterval(() => {}, 1000);
    break;
  case 'pdf-ok': {
    const pdf = grab(/`node app\/cv\/render-cv\.js \S+ (\S+)/) ?? `output/cv-fixture-${reportNum}.pdf`;
    write(pdf, '%PDF-1.4 fake');
    const index = join(root, 'data', 'pdf-index.tsv');
    mkdirSync(dirname(index), { recursive: true });
    appendFileSync(index, `${reportNum}\t${pdf}\t${pdf.replace(/\.pdf$/, '.html')}\ta4\t${date}\n`);
    tool('Bash', { command: `node app/cv/render-cv.js … ${pdf}` });
    toolResult(`✅ PDF generated: ${pdf}`);
    finish({ text: `PDF at ${pdf}` });
    break;
  }
  case 'cover-ok': {
    const cover = grab(/exactly \*\*`(output\/cover-[^`]+\.pdf)`\*\*/);
    write(cover, '%PDF-1.4 fake cover');
    finish({ text: `Cover letter at ${cover}` });
    break;
  }
  case 'skills-ok':
  case 'skills-partial': {
    // One scenario serves both session kinds the Skills page queues together.
    if (/^# CV skill extraction/m.test(systemPrompt)) {
      writeCvSkills();
      break;
    }
    // The overlay names both files (relative to the cwd when inside the repo,
    // absolute otherwise); the input lists the postings. Each posting gets
    // Kubernetes twice under two spellings, Go when its text mentions it, and
    // two unusable entries — so the tests can see canonicalization, dedupe
    // and validation happen, not just a file appear.
    const input = resolveFromCwd(grab(/\*\*Input file:\*\* `([^`]+)`/));
    const output = resolveFromCwd(grab(/\*\*Output file:\*\* `([^`]+)`/));
    const postings = JSON.parse(readFileSync(input, 'utf-8'));
    tool('Read', { file_path: input });
    const items = postings.map((p) => ({
      id: p.id,
      skills: [
        { skill: 'k8s', category: 'cloud-infra', level: 'required' },
        { skill: 'Kubernetes', category: 'cloud-infra', level: 'nice-to-have' },
        ...(/\bGo\b/.test(p.text) ? [{ skill: 'Go', category: 'language', level: 'nice-to-have' }] : []),
        { skill: 'Fake Skill', category: 'not-a-category', level: 'sometimes' },
        { skill: '', category: 'other', level: 'required' },
      ],
    }));
    if (scenario === 'skills-partial') items.pop();
    writeFileSync(output, JSON.stringify(items));
    tool('Write', { file_path: output });
    finish({ text: 'done' });
    break;
  }
  case 'skills-no-output':
    say('I read the postings but wrote nothing.\n');
    finish({ text: 'done' });
    break;
  case 'skills-cv-ok':
    writeCvSkills();
    break;
  default:
    process.stderr.write(`fake-claude: unknown scenario ${scenario}\n`);
    process.exit(2);
}
