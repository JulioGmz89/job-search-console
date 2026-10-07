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
 *   FAKE_CLAUDE_DELAY_MS  stream progress lines for this long before acting (default 0), so
 *                         the UX sandbox can show what waiting on a real session is like
 *   FAKE_CLAUDE_ARGV      when set, the argv is written to this file for inspection
 *   FAKE_CLAUDE_VERSION   what `--version` prints (default 2.1.0), or `fail` to exit 1
 *   CAREER_OPS_ROOT       the data root (set by the runner's confineTo)
 *
 * Scenario queue: when `<root>/data/jsc/fake-scenarios` exists, each session
 * takes its first non-empty line as the scenario and removes it, falling back
 * to FAKE_CLAUDE_SCENARIO once the file is empty. The UX sandbox uses it to
 * script "this run fails, the retry succeeds" without restarting the server.
 * Two sessions starting at the same instant could read the same line; the
 * sandbox never needs that.
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join } from 'node:path';

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? null : args[i + 1];
};

if (process.env.FAKE_CLAUDE_ARGV) writeFileSync(process.env.FAKE_CLAUDE_ARGV, JSON.stringify(args));

// The console's first-run check (`claude --version`). Answered before the
// scenario queue is read, so a check never uses up a scripted session.
if (args[0] === '--version') {
  if (process.env.FAKE_CLAUDE_VERSION === 'fail') {
    process.stderr.write('fake-claude: cannot start\n');
    process.exit(1);
  }
  process.stdout.write(`${process.env.FAKE_CLAUDE_VERSION || '2.1.0'} (Claude Code)\n`);
  process.exit(0);
}

const root = process.env.CAREER_OPS_ROOT ?? process.cwd();

/** The next scripted scenario, removed from the queue file; null when there is none. */
function nextQueuedScenario() {
  const file = join(root, 'data', 'jsc', 'fake-scenarios');
  if (!existsSync(file)) return null;
  const lines = readFileSync(file, 'utf-8').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;
  writeFileSync(file, lines.slice(1).map((l) => `${l}\n`).join(''), 'utf-8');
  return lines[0];
}

const requested = nextQueuedScenario() ?? process.env.FAKE_CLAUDE_SCENARIO ?? 'evaluate-ok';
const delayMs = Math.max(0, Number.parseInt(process.env.FAKE_CLAUDE_DELAY_MS ?? '', 10) || 0);
const systemPrompt = flag('--append-system-prompt-file') ? readFileSync(flag('--append-system-prompt-file'), 'utf-8') : '';
const userPrompt = flag('-p') ?? '';

/**
 * `auto` (the UX sandbox's default) succeeds at whatever the session was
 * assembled for, read from the overlay's own markers, so one server can run
 * every agent flow the console offers.
 */
function autoScenario() {
  if (/exactly \*\*`output\/cover-/.test(systemPrompt)) return 'cover-ok';
  if (/\*\*Input file:\*\*/.test(systemPrompt)) return 'skills-ok';
  if (/\*\*Step 17\*\* \(payload\)/.test(systemPrompt)) return 'pdf-ok';
  return 'evaluate-ok';
}
const scenario = requested === 'auto' ? autoScenario() : requested;

const grab = (re, text = systemPrompt) => re.exec(text)?.[1] ?? null;
const reportNum = grab(/\*\*Report number:\*\* `(\d{3,})`/) ?? grab(/report number `(\d{3,})`/);
const date = grab(/\*\*Date:\*\* (\d{4}-\d{2}-\d{2})/) ?? new Date().toISOString().slice(0, 10);
const url = grab(/\*\*Job URL:\*\* (\S+)/) ?? 'https://example.invalid/';

/**
 * FAKE_CLAUDE_MARKET names the UX sandbox's fake job boards; when the URL is one
 * of their postings, the report is about that company and role rather than the
 * fixture's "Fake Co", so a sandbox user sees the job they asked about.
 */
function lookUpPosting() {
  if (!process.env.FAKE_CLAUDE_MARKET) return null;
  try {
    const boards = JSON.parse(readFileSync(process.env.FAKE_CLAUDE_MARKET, 'utf-8'));
    for (const board of Object.values(boards)) {
      const job = board.jobs.find((j) => j.absolute_url === url);
      if (job) return { company: board.name, role: job.title };
    }
  } catch {
    // An unreadable market file falls back to the fixture's names.
  }
  return null;
}
const posting = lookUpPosting();
const company = posting?.company ?? 'Fake Co';
const role = posting?.role ?? 'Test Engineer';
const companySlug = company.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

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

// In the UX sandbox the log names a plausible model, so testers do not judge the stand-in.
emit({ type: 'system', subtype: 'init', model: process.env.FAKE_CLAUDE_MARKET ? 'claude-sonnet-5-5' : 'fake-claude', tools: ['Read', 'Write', 'Bash'] });
say(`Received: ${userPrompt.slice(0, 60)}\n`);

const writeReport = (num, score) => {
  const file = `reports/${num}-${companySlug}-${date}.md`;
  write(
    file,
    [
      `# Evaluation: ${company} — ${role}`,
      '',
      `**Date:** ${date}`,
      `**URL:** ${url}`,
      '**Via:** —',
      `**Archetype:** ${role}`,
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
      `company: "${company}"`,
      `role: "${role}"`,
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
      ...(posting
        ? [
            // The UX sandbox: a report that reads like one, so testers judge the
            // console rather than a placeholder.
            '## A) Role Summary',
            '',
            `${company} is hiring a ${role}: a small remote team that owns its services end to end, on call included.`,
            '',
            '## B) CV Match',
            '',
            '| JD Requirement | CV Match | Source |',
            '|----------------|----------|--------|',
            '| Production backend services | Settlement pipeline rebuilt as an event-driven Go service | cv.md: Northwind Payments |',
            '| Reliability and on-call ownership | Queue-backed scheduler with idempotent retries; incidents down 60% | cv.md: Northwind Payments |',
            '| PostgreSQL | Public REST API on PostgreSQL | cv.md: Contoso Analytics |',
            '',
            '### Gaps',
            '',
            '| Gap | Severity | Mitigation |',
            '|-----|----------|------------|',
            '| gRPC | Medium | Name the internal service APIs; plan a small side project |',
            '',
            '## C) Level and Strategy',
            '',
            'Senior level matches. Lead with the settlement pipeline and the incident reduction.',
            '',
            '## D) Comp and Demand',
            '',
            'Advertised: not stated. Target: $165K-190K.',
            '',
            '## E) Personalization Plan',
            '',
            "Move Go and event-driven work to the top of the summary; mirror the posting's wording.",
            '',
            '## F) Interview Plan',
            '',
            'Settlement pipeline rebuild (STAR), queue-backed scheduler (STAR), tracing rollout (STAR).',
            '',
          ]
        : ['## A) Role Summary', '', 'A fixture report written by fake-claude.js.', '', '## Cover Letter Draft', '', `Dear ${company}, I am the fixture.`, '']),
    ].join('\n'),
  );
  write(
    `batch/tracker-additions/${num}-${companySlug}.tsv`,
    `${num}\t${date}\t${company}\t${role}\tEvaluated\t${score}/5\t❌\t[${num}](reports/${num}-${companySlug}-${date}.md)\tFixture evaluation\t${url}\n`,
  );
  return file;
};

/** The skills-cv session: a fixed list with a duplicate and an alias, for the validator to fold. */
const writeCvSkills = () => {
  const output = resolveFromCwd(grab(/\*\*Output file:\*\* `([^`]+)`/));
  if (process.env.FAKE_CLAUDE_MARKET) {
    // The UX sandbox: read the CV's "- **Category:** a, b" skill lines, so the
    // Skills page shows the sandbox candidate's skills, not the fixture's.
    const input = JSON.parse(readFileSync(resolveFromCwd(grab(/\*\*Input file:\*\* `([^`]+)`/)), 'utf-8'));
    const skills = [...String(input.cv ?? '').matchAll(/^- \*\*[^*]+:\*\* (.+)$/gm)]
      .flatMap((m) => m[1].split(',').map((s) => s.trim()).filter(Boolean))
      .map((skill) => ({ skill, category: 'other', depth: 'solid' }));
    writeFileSync(output, JSON.stringify({ skills }));
    tool('Write', { file_path: output });
    finish({ text: 'done' });
    return;
  }
  writeFileSync(output, JSON.stringify({ skills: [
    { skill: 'Python', category: 'language', depth: 'expert' },
    { skill: 'Postgres', category: 'data', depth: 'solid' },
    { skill: 'Terraform', category: 'cloud-infra', depth: 'basic' },
    { skill: 'Terraform', category: 'cloud-infra', depth: 'expert' },
  ] }));
  tool('Write', { file_path: output });
  finish({ text: 'done' });
};

if (delayMs > 0) {
  // What a real session prints while it works, one line every two seconds.
  const progress = ['Reading the instructions…', 'Looking at the posting…', 'Comparing it with the CV…', 'Weighing the gaps…', 'Drafting the output…'];
  let step = 0;
  const ticker = setInterval(() => say(`${progress[step++ % progress.length]}\n`), Math.min(2000, delayMs));
  await new Promise((resolve) => setTimeout(resolve, delayMs));
  clearInterval(ticker);
}

switch (scenario) {
  case 'evaluate-ok': {
    const score = process.env.FAKE_CLAUDE_SCORE ?? '4.1';
    tool('WebFetch', { url });
    toolResult(`${company} is hiring a ${role}.`);
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
    // A structured run (M5) stops at the payload; the console renders it.
    const payload = grab(/write the JSON payload to exactly \*\*`(output\/[^`]+\.json)`\*\*/);
    if (payload && process.env.FAKE_CLAUDE_MARKET) {
      // The UX sandbox's candidate is the bundled sample CV; tailor nothing, but
      // write their payload rather than the fixture's, so CV Studio stays truthful.
      write(payload, readFileSync(new URL('../../../../cv/sample-payload.json', import.meta.url), 'utf-8'));
      tool('Write', { file_path: payload });
      finish({ text: `Payload at ${payload}` });
      break;
    }
    if (payload) {
      write(payload, JSON.stringify({
        lang: 'en',
        page_format: 'a4',
        candidate: { name: 'Ada Lovelace', email: 'ada@example.com' },
        summary: 'Built the engine.',
        experience: [{ company: 'Analytical Engine', role: 'Engineer', dates: '1843', bullets: ['Built the engine'] }],
        skills: [{ category: 'Core', items: 'Mathematics' }],
      }));
      tool('Write', { file_path: payload });
      finish({ text: `Payload at ${payload}` });
      break;
    }
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
    if (process.env.FAKE_CLAUDE_MARKET) {
      // The UX sandbox shows the letter in a PDF viewer, so it must be a real
      // PDF: one of the seed's rendered letters stands in for the new one.
      const seedLetter = new URL('../../../../ux/sandbox/seeds/populated/output/cover-alex-rivera-cobaltfreight-2026-08-13.pdf', import.meta.url);
      const path = join(root, cover);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, readFileSync(seedLetter));
    } else {
      write(cover, '%PDF-1.4 fake cover');
    }
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
    // In the UX sandbox the postings are the generator's, which phrase every
    // requirement the same way; read them back so the Skills page stays truthful.
    const fromMarket = (p) => [
      ...[...p.text.matchAll(/experience with (.+)$/gm)].map((m) => ({ skill: m[1].trim(), category: 'other', level: 'required' })),
      ...[...p.text.matchAll(/Exposure to (.+)$/gm)].map((m) => ({ skill: m[1].trim(), category: 'other', level: 'nice-to-have' })),
    ];
    const items = postings.map((p) => ({
      id: p.id,
      skills: process.env.FAKE_CLAUDE_MARKET ? fromMarket(p) : [
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
