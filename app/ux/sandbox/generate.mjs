#!/usr/bin/env node

/**
 * generate.mjs — builds the UX sandbox's seed workspaces (PROJECT_PLAN.md §12.1).
 *
 *   node app/ux/sandbox/generate.mjs [--no-pdf]
 *
 * Writes three data roots under `seeds/`, plus the fake job market that
 * `fake-net.mjs` serves:
 *
 *   seeds/empty      a first run: no cv.md, no portals.yml, nothing tracked
 *   seeds/populated  one fictional candidate (Alex Rivera, the CV in
 *                    app/cv/sample-payload.json) a few weeks into a search:
 *                    40 tracker rows across every status and score band,
 *                    their reports, rendered CVs and cover letters, an inbox,
 *                    scan history, a Skills cache and CV Studio settings
 *   seeds/broken     populated, plus a malformed tracker row and a theme that
 *                    fails the ATS check (sandbox.mjs adds the failed run)
 *   net/greenhouse.json  twelve fictional companies' boards: the postings
 *                    already seen plus some new ones, so a scan finds something
 *
 * Everything is fictional and deterministic (one seeded PRNG, fixed dates), so
 * screenshots are committable and a re-run changes nothing but the PDFs'
 * embedded timestamps. The seeds are committed; re-run this only to change them.
 *
 * PDFs go through the console's real renderer (app/cv/render-cv.js, confined to
 * the seed) and need Playwright's Chromium; `--no-pdf` skips them.
 */

import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { confineTo } from '../../server/queue/runner.js';
import { dedupeSkills, normalizeSkill } from '../../server/skills/extract-spec.js';
import { textHash, writeCvSkills, writeExtraction, writeOverride, writePosting } from '../../server/skills/store.js';

const here = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(here, '..', '..');
const repoRoot = resolve(appRoot, '..');
const SEEDS = join(here, 'seeds');
const NET = join(here, 'net');
const withPdf = !process.argv.includes('--no-pdf');

// ── determinism ───────────────────────────────────────────────────────

/** mulberry32: a tiny seeded PRNG, so every run builds the same market. */
function prng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = prng(20261004);
const pick = (list) => list[Math.floor(rand() * list.length)];
/** Weighted sample without replacement. */
function sample(pool, n, boost = []) {
  const items = pool.map((s) => ({ ...s, w: s.w * (boost.includes(s.name) ? 6 : 1) }));
  const out = [];
  while (out.length < n && items.length) {
    const total = items.reduce((sum, s) => sum + s.w, 0);
    let r = rand() * total;
    const i = items.findIndex((s) => (r -= s.w) <= 0);
    out.push(items.splice(i === -1 ? items.length - 1 : i, 1)[0].name);
  }
  return out;
}
const pad = (n) => String(n).padStart(3, '0');
/** A date `days` after 2026-08-10, the start of the fictional search. */
const day = (days) => new Date(Date.UTC(2026, 7, 10 + days)).toISOString().slice(0, 10);

// ── the candidate ─────────────────────────────────────────────────────

const payload = JSON.parse(readFileSync(join(appRoot, 'cv', 'sample-payload.json'), 'utf-8'));
const CANDIDATE = payload.candidate.name; // Alex Rivera
const CANDIDATE_SLUG = 'alex-rivera';

const items = (v) => (Array.isArray(v) ? v.join(', ') : String(v));

/** cv.md written from the same payload the CVs render, so the fact gate finds every claim. */
function cvMarkdown() {
  const c = payload.candidate;
  return [
    `# ${c.name}`,
    '',
    `${c.location} · ${c.email} · ${c.phone} · ${c.linkedin.display} · ${c.github.display}`,
    '',
    '## Summary',
    '',
    payload.summary.replace(/\*\*/g, ''),
    '',
    '## Core competencies',
    '',
    payload.competencies.join(' · '),
    '',
    '## Experience',
    '',
    ...payload.experience.flatMap((e) => [
      `### ${e.role} — ${e.company}`,
      '',
      `${e.dates} · ${e.location ?? ''}`.trim(),
      '',
      ...e.bullets.map((b) => `- ${b.replace(/\*\*/g, '')}`),
      '',
    ]),
    '## Projects',
    '',
    ...(payload.projects ?? []).flatMap((p) => [`### ${p.name}`, '', `${p.description} (${p.tech})`, '', p.url, '']),
    '## Education',
    '',
    ...(payload.education ?? []).map((e) => `- ${e.title}, ${e.org} (${e.year})`),
    '',
    ...(payload.certifications?.length
      ? ['## Certifications', '', ...payload.certifications.map((x) => `- ${typeof x === 'string' ? x : [x.title, x.org, x.year].filter(Boolean).join(', ')}`), '']
      : []),
    '## Skills',
    '',
    ...payload.skills.map((s) => `- **${s.category}:** ${items(s.items)}`),
    '',
  ].join('\n');
}

const PROFILE_YML = `# Fictional UX-sandbox profile. Not a real person.
candidate:
  full_name: "${CANDIDATE}"
  email: "${payload.candidate.email}"
  phone: "${payload.candidate.phone}"
  location: "Austin, TX (remote)"
  linkedin: "${payload.candidate.linkedin.display}"
  github: "${payload.candidate.github.display}"

target_roles:
  primary:
    - "Senior Backend Engineer"
    - "Platform Engineer"
  archetypes:
    - name: "Backend / Platform Engineer"
      level: "Senior"
      fit: "primary"
    - name: "Site Reliability Engineer"
      level: "Senior"
      fit: "secondary"

narrative:
  headline: "Backend engineer who makes payment and data platforms boring to operate"
  superpowers:
    - "Event-driven services in Go"
    - "Turning incidents into runbooks"

compensation:
  target_range: "$165K-190K"
  currency: "USD"
  minimum: "$150K"
  location_flexibility: "Remote in the US; a week a quarter on site is fine"

location:
  country: "United States"
  city: "Austin"
  timezone: "CST"
  visa_status: "No sponsorship needed"

language: en
spend_tier: standard

cv:
  auto_pdf_score_threshold: 3.5
`;

/** What the candidate actually has, as a CV extraction would record it. */
const CV_SKILLS = [
  ['Go', 'expert'], ['TypeScript', 'solid'], ['SQL', 'expert'], ['Python', 'basic'],
  ['Kubernetes', 'solid'], ['Docker', 'solid'], ['Terraform', 'basic'], ['AWS', 'solid'],
  ['PostgreSQL', 'expert'], ['Kafka', 'solid'], ['Redis', 'solid'], ['OpenTelemetry', 'solid'],
  ['Distributed Systems', 'solid'], ['Event-Driven Architecture', 'expert'], ['Observability', 'solid'],
  ['REST APIs', 'expert'], ['Node.js', 'basic'], ['CI/CD', 'basic'],
];
const HAS = new Map(CV_SKILLS.map(([s, d]) => [s, d]));

const STYLE_YML = `# CV Studio settings for the UX sandbox.
accent_color: "#1f6f5c"
font_family: "DM Sans, Arial, sans-serif"
heading_font_family: "Space Grotesk, sans-serif"
font_size: "10.5pt"
margin: "0.6in"
density: normal
template: standard
sections: [summary, experience, projects, skills, education]
`;

const VOICE_MD = `# Voice DNA — ${CANDIDATE} (fictional)

## Tone
Plain, specific, a little dry. Numbers over adjectives. First person is fine in a
cover letter, never in the CV.

## Never write
- spearheaded
- leveraged
- passionate about
- results-driven
- synergy

## Bullets
Start with the verb. One idea per bullet. Say what changed and by how much.
`;

const WRITING_SAMPLES = {
  'postmortem-settlement-delay.md': `# Postmortem: settlement file arrived 3 hours late

The nightly settlement job waited on a lock that a migration never released. We
noticed at 06:10 when the reconciliation dashboard stayed flat. The fix was a
timeout on the lock and an alert on the dashboard itself, not on the job.

What I would do differently: page on the absence of data, not on errors. The job
never errored. It just waited.
`,
  'design-note-idempotent-retries.md': `# Design note: idempotent retries for payouts

Every payout request now carries a key the client generates. The service stores
the key with the outcome, and a retry with the same key returns the stored
outcome instead of paying twice. It costs one table and one index. It removed a
whole class of incident.
`,
};

// ── the market ────────────────────────────────────────────────────────

const COMPANIES = [
  { name: 'Brightwater Health', slug: 'brightwaterhealth', about: 'builds the scheduling and records platform behind 300 community clinics' },
  { name: 'Cobalt Freight', slug: 'cobaltfreight', about: 'runs a digital freight marketplace for regional carriers' },
  { name: 'Driftwood Analytics', slug: 'driftwoodanalytics', about: 'sells product analytics to mid-size e-commerce teams' },
  { name: 'Ember Payments', slug: 'emberpayments', about: 'moves money for marketplaces in eleven countries' },
  { name: 'Fernhill Robotics', slug: 'fernhillrobotics', about: 'makes fleet software for warehouse robots' },
  { name: 'Granite Cloud', slug: 'granitecloud', about: 'offers managed Postgres for teams that do not want a DBA' },
  { name: 'Harbor Learning', slug: 'harborlearning', about: 'builds a tutoring platform used by 4,000 schools' },
  { name: 'Ironleaf Security', slug: 'ironleafsecurity', about: 'detects account takeover for consumer apps' },
  { name: 'Juniper Mobility', slug: 'junipermobility', about: 'runs ride-pooling software for city transit agencies' },
  { name: 'Kestrel Media', slug: 'kestrelmedia', about: 'streams local sports to 2 million subscribers' },
  { name: 'Lumen Grid', slug: 'lumengrid', about: 'forecasts demand for utilities moving to renewables' },
  { name: 'Mosaic Retail', slug: 'mosaicretail', about: 'powers checkout and inventory for 900 independent stores' },
];
/** Juniper's board "moved": the fake network has no board for it, so a scan reports it gone. */
const GONE_BOARD = 'junipermobility';
/** Kestrel is in portals.yml but switched off. */
const DISABLED = 'kestrelmedia';

/** Demand weights: roughly how often a posting in this market asks for the skill. */
const SKILL_POOL = [
  ['Kubernetes', 7], ['Go', 5], ['AWS', 6], ['PostgreSQL', 5], ['Terraform', 5], ['TypeScript', 4],
  ['Python', 4], ['Kafka', 3], ['Distributed Systems', 5], ['Docker', 3], ['Rust', 3], ['gRPC', 3],
  ['GraphQL', 2], ['Observability', 3], ['Prometheus', 2], ['Redis', 2], ['CI/CD', 3], ['GCP', 2],
  ['React', 1.5], ['Java', 1.5], ['Spark', 1], ['Snowflake', 1], ['Airflow', 1], ['Elasticsearch', 1.5],
  ['Helm', 1.5], ['OpenTelemetry', 1.5], ['Machine Learning', 1], ['Kotlin', 0.7], ['Datadog', 1],
].map(([name, w]) => ({ name, w }));

/** Titles the scan keeps, each with the skills it leans on. */
const ROLES = [
  { title: 'Senior Backend Engineer', boost: ['Go', 'PostgreSQL', 'Kafka'] },
  { title: 'Platform Engineer', boost: ['Kubernetes', 'Terraform', 'AWS', 'Helm'] },
  { title: 'Site Reliability Engineer', boost: ['Kubernetes', 'Prometheus', 'Observability', 'Terraform'] },
  { title: 'Staff Software Engineer', boost: ['Distributed Systems', 'Go', 'gRPC', 'Rust'] },
  { title: 'Data Engineer', boost: ['Python', 'Spark', 'Airflow', 'Snowflake'] },
  { title: 'Backend Engineer (Go)', boost: ['Go', 'gRPC', 'PostgreSQL'] },
  { title: 'Infrastructure Engineer', boost: ['Terraform', 'AWS', 'Kubernetes', 'GCP'] },
  { title: 'Full Stack Engineer', boost: ['TypeScript', 'React', 'GraphQL'] },
  { title: 'Machine Learning Engineer', boost: ['Python', 'Machine Learning', 'Kubernetes'] },
  { title: 'Software Engineer, Payments', boost: ['Java', 'Kafka', 'PostgreSQL', 'Kotlin'] },
];
/** Titles the scan's title filter drops. */
const FILTERED_TITLES = ['Account Executive', 'Engineering Intern', 'Technical Recruiter'];
const LOCATIONS = ['Remote (US)', 'Remote (US)', 'Remote (Americas)', 'Austin, TX', 'New York, NY · Hybrid', 'Remote (US) · EST overlap'];

const escapeEntities = (html) => html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** A posting body in Greenhouse's shape: entity-escaped HTML. */
function postingHtml(company, title, required, nice) {
  const years = (i) => ['3+', '4+', '5+', '2+', 'several'][i % 5];
  return [
    `<h2>About ${company.name}</h2>`,
    `<p>${company.name} ${company.about}. We are a small, remote-first engineering team that ships every day and keeps on-call quiet.</p>`,
    `<h2>The role</h2>`,
    `<p>As a ${title} you will own services end to end: design reviews, the code, the dashboards and the pager. You will work closely with product and with the other engineers on the team.</p>`,
    '<h3>What you will need</h3>',
    '<ul>',
    ...required.map((s, i) => `<li>${years(i)} years of hands-on experience with ${s}</li>`),
    '<li>Clear written communication; we decide things in documents</li>',
    '</ul>',
    '<h3>Nice to have</h3>',
    '<ul>',
    ...nice.map((s) => `<li>Exposure to ${s}</li>`),
    '</ul>',
    '<h3>Benefits</h3>',
    '<p>Competitive salary and equity, a learning budget, and four weeks of vacation that people actually take.</p>',
  ].join('\n');
}

let jobId = 4_100_000;
const market = [];
for (const company of COMPANIES) {
  for (let i = 0; i < 8; i += 1) {
    const filtered = i === 7 && rand() < 0.5;
    const role = filtered ? null : pick(ROLES);
    const title = filtered ? pick(FILTERED_TITLES) : role.title;
    const required = filtered ? [] : sample(SKILL_POOL, 4 + Math.floor(rand() * 3), role.boost);
    const nice = filtered ? [] : sample(SKILL_POOL.filter((s) => !required.includes(s.name)), 2 + Math.floor(rand() * 2));
    jobId += 1 + Math.floor(rand() * 900);
    market.push({
      company,
      id: jobId,
      title,
      filtered,
      required,
      nice,
      location: pick(LOCATIONS),
      url: `https://job-boards.greenhouse.io/${company.slug}/jobs/${jobId}`,
      html: filtered
        ? `<h2>About ${company.name}</h2><p>${company.name} ${company.about}.</p><h2>The role</h2><p>We are hiring a ${title}. This is not an engineering role.</p>`
        : postingHtml(company, title, required, nice),
    });
  }
}

// Interleave companies so "the first N postings" spans the whole market.
const byCompany = COMPANIES.map((c) => market.filter((p) => p.company === c));
const ordered = [];
for (let i = 0; i < 8; i += 1) for (const list of byCompany) ordered.push(list[i]);
const visible = ordered.filter((p) => p.company.slug !== GONE_BOARD && p.company.slug !== DISABLED);

// The first 66 kept postings were seen by earlier scans; the rest are new on the boards.
const kept = visible.filter((p) => !p.filtered);
const seen = kept.slice(0, 66);
const fresh = kept.slice(66);
const seenFiltered = visible.filter((p) => p.filtered).slice(0, 4);
// Juniper's postings were seen before its board moved; they stay in history.
const juniper = ordered.filter((p) => p.company.slug === GONE_BOARD && !p.filtered).slice(0, 3);
const history = [...seen, ...juniper];
history.forEach((p, i) => {
  p.firstSeen = day(Math.floor((i / history.length) * 48));
});
seenFiltered.forEach((p, i) => {
  p.firstSeen = day(5 + i * 9);
});

// ── the tracker ───────────────────────────────────────────────────────

/** [status, score] for the 40 tracked rows: every canonical status, every score band. */
const PLAN = [
  ['Hired', 4.6], ['Offer', 4.5], ['Interview', 4.4], ['Interview', 4.2], ['Interview', 3.9],
  ['Responded', 4.1], ['Responded', 3.6], ['Applied', 4.3], ['Applied', 4.0], ['Applied', 3.8],
  ['Applied', 3.7], ['Evaluated', 4.2], ['Evaluated', 3.9], ['Evaluated', 3.5],
  ['Evaluated', 3.4], ['Evaluated', 3.3], ['Evaluated', 3.2], ['Evaluated', 3.1], ['Evaluated', 3.0],
  ['Evaluated', 3.4], ['Applied', 3.3], ['Applied', 3.1], ['Rejected', 3.4], ['Rejected', 3.2],
  ['Discarded', 3.0], ['Discarded', 3.3],
  ['SKIP', 2.9], ['SKIP', 2.6], ['SKIP', 2.4], ['SKIP', 2.1], ['SKIP', 1.8], ['SKIP', 2.7],
  ['SKIP', 2.3], ['SKIP', 1.5], ['Discarded', 2.8], ['Discarded', 2.2], ['Rejected', 2.9], ['Evaluated', 2.5],
  ['Rejected', null], ['Discarded', null],
];
/** Rows whose CV was rendered (strong, and far enough along to have needed one). */
const WITH_PDF = new Set([0, 1, 2, 3, 7, 11]);
/** Rows with a cover letter. */
const WITH_COVER = new Set([1, 3]);

const decision = (s) => (s === null ? null : s >= 3.5 ? 'Apply' : s >= 3.0 ? 'Consider' : 'Skip');
const NOTES = {
  Hired: 'Accepted. Start date in November',
  Offer: 'Offer in hand; negotiating equity',
  Interview: 'System design round next',
  Responded: 'Recruiter screen booked',
  Applied: 'Applied through the careers page',
  Evaluated: '',
  Rejected: 'Rejected after the screen',
  Discarded: 'Role closed before I applied',
  SKIP: 'Not a fit',
};

const tracked = seen.slice(0, PLAN.length).map((p, i) => {
  const [status, score] = PLAN[i];
  const num = i + 1;
  const date = day(Math.min(52, 2 + Math.floor(i * 1.25)));
  const companySlug = p.company.slug.replace(/[^a-z0-9]+/g, '-');
  return {
    p, num, status, score, date,
    report: `${pad(num)}-${companySlug}-${date}.md`,
    pdf: WITH_PDF.has(i),
    cover: WITH_COVER.has(i),
    note: score === null ? 'Backfilled from an old spreadsheet; never evaluated' : NOTES[status],
  };
});

function trackerMarkdown(rows, extraLines = []) {
  const lines = rows.map((r) =>
    `| ${r.num} | ${r.date} | ${r.p.company.name} | ${r.num % 5 === 0 ? 'LinkedIn' : '—'} | ${r.p.title} | ${r.score === null ? 'N/A' : `${r.score.toFixed(1)}/5`} | ${r.status} | ${r.pdf ? '✅' : '❌'} | [${pad(r.num)}](../reports/${r.report}) | ${r.note} |`,
  );
  return [
    '# Applications Tracker',
    '',
    '| # | Date | Company | Via | Role | Score | Status | PDF | Report | Notes |',
    '|---|------|---------|-----|------|-------|--------|-----|--------|-------|',
    ...lines,
    ...extraLines,
    '',
  ].join('\n');
}

function reportMarkdown(r) {
  const { p } = r;
  const missingReq = p.required.filter((s) => !HAS.has(s));
  const partialReq = p.required.filter((s) => HAS.get(s) === 'basic');
  const matched = p.required.filter((s) => HAS.has(s) && HAS.get(s) !== 'basic');
  const comp = ['$160K-185K', '$170K-200K', '$150K-175K', 'not stated'][r.num % 4];
  const header = [
    `# Evaluation: ${p.company.name} — ${p.title}`,
    '',
    `**Date:** ${r.date}`,
    `**URL:** ${p.url}`,
    '**Archetype:** Backend / Platform Engineer',
    `**Score:** ${r.score === null ? 'N/A' : `${r.score.toFixed(1)}/5`}`,
    `**Legitimacy:** ${r.score !== null && r.score < 2 ? 'Proceed with Caution' : 'High Confidence'}`,
    `**PDF:** ${r.pdf ? 'generated — see the console' : 'not generated'}`,
    '',
    '---',
    '',
  ];
  if (r.score === null) {
    return [
      ...header,
      '## Machine Summary',
      '',
      '```yaml',
      `company: "${p.company.name}"`,
      `role: "${p.title}"`,
      'score: null',
      'final_decision: "Not evaluated"',
      'hard_stops: []',
      'soft_gaps: []',
      'top_strengths: []',
      '```',
      '',
      '## A) Role Summary',
      '',
      `Imported from an old spreadsheet. ${p.company.name} ${p.company.about}; the posting was never evaluated.`,
      '',
    ].join('\n');
  }
  return [
    ...header,
    '## Machine Summary',
    '',
    '```yaml',
    `company: "${p.company.name}"`,
    `role: "${p.title}"`,
    `score: ${r.score}`,
    `legitimacy_tier: "${r.score < 2 ? 'Proceed with Caution' : 'High Confidence'}"`,
    `final_decision: "${decision(r.score)}"`,
    `advertised_comp: "${comp}"`,
    `hard_stops: [${r.score < 2.5 && missingReq[0] ? `"No production ${missingReq[0]} experience"` : ''}]`,
    `soft_gaps: [${[...missingReq, ...partialReq].map((s) => `"${s}"`).join(', ')}]`,
    `top_strengths: [${matched.slice(0, 3).map((s) => `"${s}"`).join(', ')}]`,
    `risk_level: "${r.score >= 3.5 ? 'Low' : r.score >= 3 ? 'Medium' : 'High'}"`,
    `confidence: "${r.score >= 3 ? 'High' : 'Medium'}"`,
    `next_action: "${decision(r.score) === 'Apply' ? 'Tailor the CV and apply' : decision(r.score) === 'Consider' ? 'Read the gaps, then decide' : 'Skip'}"`,
    '```',
    '',
    '## A) Role Summary',
    '',
    '| Field | Value |',
    '|-------|-------|',
    `| **Company** | ${p.company.name} — ${p.company.about} |`,
    `| **Role** | ${p.title} |`,
    `| **Location** | ${p.location} |`,
    `| **TL;DR** | Owns backend services end to end on a small remote team |`,
    '',
    '## B) CV Match',
    '',
    '| JD Requirement | CV Match | Source |',
    '|----------------|----------|--------|',
    ...p.required.map((s) =>
      `| ${s} | ${HAS.has(s) ? (HAS.get(s) === 'basic' ? 'Some exposure; not production depth' : 'Direct production experience') : 'Not on the CV'} | cv.md${HAS.has(s) ? ': Skills' : ''} |`,
    ),
    '',
    '### Gaps',
    '',
    '| Gap | Severity | Mitigation |',
    '|-----|----------|------------|',
    ...(missingReq.length || partialReq.length
      ? [...missingReq.map((s) => `| ${s} | ${r.score < 3 ? 'High' : 'Medium'} | Name an adjacent project; plan a small side project |`),
        ...partialReq.map((s) => `| ${s} | Low | Describe the exposure honestly |`)]
      : ['| None significant | — | — |']),
    '',
    '## C) Level and Strategy',
    '',
    `Senior level matches. ${r.score >= 3.5 ? 'Lead with the settlement pipeline and the incident reduction.' : 'The gaps above decide this one.'}`,
    '',
    '## D) Comp and Demand',
    '',
    `Advertised: ${comp}. Target: $165K-190K.`,
    '',
    '## E) Personalization Plan',
    '',
    `Move ${matched[0] ?? 'Go'} to the top of the summary; mirror the posting's wording for ${p.required.slice(0, 2).join(' and ')}.`,
    '',
    '## F) Interview Plan',
    '',
    'Settlement pipeline rebuild (STAR), queue-backed scheduler (STAR), tracing rollout (STAR).',
    '',
    '---',
    '',
    '## Keywords Extracted',
    '',
    [...p.required, ...p.nice].join(', '),
    '',
  ].join('\n');
}

/** One CV document per tracked job; the report number keeps two jobs at one company apart. */
const cvId = (r) => `cv-${CANDIDATE_SLUG}-${r.p.company.slug}-${pad(r.num)}`;

/** A tailored CV payload for one job: same facts, the job's skills first. */
function tailoredPayload(r) {
  const front = r.p.required.filter((s) => payload.competencies.includes(s));
  return {
    ...payload,
    competencies: [...front, ...payload.competencies.filter((c) => !front.includes(c))],
  };
}

// ── writers ───────────────────────────────────────────────────────────

function write(root, relative, text) {
  const path = join(root, relative);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text, 'utf-8');
  return path;
}

const tsv = (rows) => `${rows.map((r) => r.join('\t')).join('\n')}\n`;

function writeNet() {
  rmSync(NET, { recursive: true, force: true });
  const boards = {};
  for (const company of COMPANIES) {
    if (company.slug === GONE_BOARD) continue;
    boards[company.slug] = {
      name: company.name,
      jobs: market
        .filter((p) => p.company === company)
        .map((p) => ({
          id: p.id,
          internal_job_id: p.id - 1_000_000,
          title: p.title,
          absolute_url: p.url,
          location: { name: p.location },
          updated_at: `${p.firstSeen ?? day(50)}T09:00:00-05:00`,
          first_published: `${p.firstSeen ?? day(50)}T09:00:00-05:00`,
          content: escapeEntities(p.html),
        })),
    };
  }
  write(NET, 'greenhouse.json', `${JSON.stringify(boards, null, 1)}\n`);
}

function writePopulated(root) {
  write(root, 'cv.md', cvMarkdown());
  write(root, 'config/profile.yml', PROFILE_YML);
  write(root, 'config/cv/style.yml', STYLE_YML);
  write(root, 'voice-dna.md', VOICE_MD);
  for (const [name, text] of Object.entries(WRITING_SAMPLES)) write(root, `writing-samples/${name}`, text);

  write(root, 'portals.yml', [
    '# Sources for the UX sandbox. Every company here is fictional; the sandbox',
    '# serves their boards from app/ux/sandbox/net/ and never touches the network.',
    '',
    'title_filter:',
    '  positive:',
    '    - Engineer',
    '    - SRE',
    '    - Developer',
    '  negative:',
    '    - Intern',
    '    - Recruiter',
    '    - Account Executive',
    '',
    'tracked_companies:',
    '',
    ...COMPANIES.flatMap((c) => [
      `  - name: ${c.name}`,
      `    careers_url: https://job-boards.greenhouse.io/${c.slug}`,
      `    api: https://boards-api.greenhouse.io/v1/boards/${c.slug}/jobs`,
      '    provider: greenhouse',
      ...(c.slug === DISABLED ? ['    notes: "Paused: hiring freeze until January"'] : []),
      `    enabled: ${c.slug !== DISABLED}`,
      '',
    ]),
  ].join('\n'));

  // Scan history: everything earlier scans recorded, kept and filtered.
  const historyRows = [
    ...history.map((p) => [p.url, p.firstSeen, 'greenhouse-api', p.title, p.company.name, 'added', p.location, '', p.firstSeen, '', '', p.company.slug]),
    ...seenFiltered.map((p) => [p.url, p.firstSeen, 'greenhouse-api', p.title, p.company.name, 'skipped_title', p.location, '', p.firstSeen, '', '', p.company.slug]),
  ].sort((a, b) => a[1].localeCompare(b[1]));
  write(root, 'data/scan-history.tsv', tsv([
    ['url', 'first_seen', 'portal', 'title', 'company', 'status', 'location', 'fingerprint', 'posted_at', 'trust_score', 'trust_flags', 'normalized_company'],
    ...historyRows,
  ]));
  // scan.mjs's SCAN_RUNS_HEADER, as of the current upstream.
  const zeros = (n) => Array(n).fill(0);
  write(root, 'data/scan-runs.tsv', tsv([
    ['timestamp', 'status', 'companies', 'boards', 'found', 'filtered_title', 'filtered_tier', 'filtered_location',
      'filtered_posting_age', 'filtered_salary', 'filtered_content', 'filtered_cooldown', 'dupes', 'new_added', 'errors',
      'filtered_blacklist', 'filtered_visa', 'filtered_posted_date', 'filtered_country_eligibility'],
    [`${day(14)}T14:02:11.000Z`, 'completed', 11, 0, 61, 3, ...zeros(6), 0, 30, 0, ...zeros(4)],
    [`${day(31)}T14:05:40.000Z`, 'completed', 11, 0, 74, 4, ...zeros(6), 30, 21, 0, ...zeros(4)],
    [`${day(45)}T14:01:09.000Z`, 'completed', 11, 0, 83, 4, ...zeros(6), 51, 18, 1, ...zeros(4)],
  ]));
  write(root, 'data/portal-health.tsv', tsv([
    ['timestamp', 'company', 'status'],
    ...COMPANIES.filter((c) => c.slug !== DISABLED).map((c) => [`${day(45)}T14:01:08.000Z`, c.name, c.slug === GONE_BOARD ? 'slug_gone' : 'reachable']),
  ]));

  // Tracker and reports.
  write(root, 'data/applications.md', trackerMarkdown(tracked));
  for (const r of tracked) write(root, `reports/${r.report}`, reportMarkdown(r));

  // A fit report whose job never reached Applications (its merge failed), for
  // Workspace › "Fit reports not in Applications". Number 41 follows the rows.
  const loosePosting = seen[PLAN.length + 13];
  const loose = { p: loosePosting, num: PLAN.length + 1, status: 'Evaluated', score: 3.7, date: day(54), note: '' };
  write(root, `reports/${pad(loose.num)}-${loosePosting.company.slug.replace(/[^a-z0-9]+/g, '-')}-${loose.date}.md`, reportMarkdown(loose));

  // set-status.mjs's transition ledger, beside the tracker, for Job › History:
  // each row that moved on walked the usual path from Evaluated, three days a step.
  const PATH = ['Evaluated', 'Applied', 'Responded', 'Interview', 'Offer', 'Hired'];
  const ledger = [];
  for (const r of tracked) {
    const end = r.status === 'Rejected' ? 2 : PATH.indexOf(r.status);
    if (end < 1) continue;
    const steps = [...PATH.slice(0, end + 1), ...(r.status === 'Rejected' ? ['Rejected'] : [])];
    const added = Math.round((Date.parse(r.date) - Date.parse(day(0))) / 86_400_000);
    for (let s = 1; s < steps.length; s += 1) ledger.push(`${r.num}\t${day(Math.min(56, added + s * 3))}\t${steps[s - 1]}\t${steps[s]}\tset-status\t`);
  }
  write(root, 'data/status-log.tsv', `${ledger.join('\n')}\n`);

  // scan.mjs's do-not-apply list (fictional companies, none of them followed).
  write(root, 'data/blacklist.md', [
    '# Companies to skip',
    '',
    '| Company | Since | Scope | Reason |',
    '|---|---|---|---|',
    `| Quarry Logistics | ${day(60).slice(0, 7)} | all | Withdrew an offer last year |`,
    `| Tallow & Finch | ${day(30).slice(0, 7)} | all | Asked for unpaid take-home work |`,
    '',
  ].join('\n'));

  // Inbox: postings seen but not yet evaluated, one that failed, and the processed log.
  const pending = seen.slice(PLAN.length, PLAN.length + 12);
  const failed = seen[PLAN.length + 12];
  write(root, 'data/pipeline.md', [
    '# Pipeline — Pending URLs',
    '',
    'Paste job URLs below as `- [ ] {url}` then run `/career-ops pipeline`.',
    '',
    '## Pending',
    '',
    ...pending.map((p) => `- [ ] ${p.url} | ${p.company.name} | ${p.title} | ${p.location} | posted: ${p.firstSeen}`),
    `- [!] ${failed.url} | ${failed.company.name} | ${failed.title} — Error: posting could not be read`,
    '',
    '## Processed',
    '',
    ...tracked
      .filter((r) => r.score !== null)
      .slice(0, 30)
      .map((r) => `- [x] #${pad(r.num)} | ${r.p.url} | ${r.p.company.name} | ${r.p.title} | ${r.score.toFixed(1)}/5 | PDF ${r.pdf ? '✅' : '❌'}`),
    '',
  ].join('\n'));

  // Skills cache: posting text for what earlier scans saw, Claude's reading of
  // the first 30, the CV's skills, and one override.
  const at = (i) => `${day(46)}T15:${String(i % 60).padStart(2, '0')}:00.000Z`;
  history.forEach((p, i) => {
    if (p.company.slug === GONE_BOARD) {
      writePosting({ root, url: p.url, error: { code: 'gone', message: 'greenhouse API says the posting is gone (404)' }, fetchedAt: at(i) });
      return;
    }
    const text = p.html.replace(/<li>/g, '- ').replace(/<[^>]+>/g, '\n').replace(/\n{2,}/g, '\n').trim();
    writePosting({ root, url: p.url, source: 'greenhouse-api', title: p.title, text, fetchedAt: at(i) });
    if (i < 30) {
      const skills = dedupeSkills([
        ...p.required.map((skill) => normalizeSkill({ skill, level: 'required' })),
        ...p.nice.map((skill) => normalizeSkill({ skill, level: 'nice-to-have' })),
      ]);
      writeExtraction({ root, textHash: textHash(text), engine: 'llm', model: 'claude-sonnet-5-5', runId: null, skills, extractedAt: at(i) });
    }
  });
  writeCvSkills({
    root,
    cvHash: textHash(cvMarkdown()),
    engine: 'llm',
    model: 'claude-sonnet-5-5',
    runId: null,
    extractedAt: `${day(46)}T15:30:00.000Z`,
    skills: dedupeSkills(CV_SKILLS.map(([skill, depth]) => normalizeSkill({ skill, depth }, { withLevel: false, withDepth: true }))),
  });
  writeOverride({ root, id: 'java', status: 'ignore' });

  // CV payloads for the jobs that got one, so CV Studio lists them.
  for (const r of tracked.filter((t) => t.pdf)) {
    write(root, `output/${cvId(r)}.json`, `${JSON.stringify(tailoredPayload(r), null, 2)}\n`);
  }
  for (const dir of ['reports', 'output', 'data']) write(root, `${dir}/.gitkeep`, '');
}

/** Render the tailored CVs through the console's own renderer, confined to this seed. */
function renderPdfs(root) {
  const env = { ...process.env, ...confineTo(root) };
  for (const r of tracked.filter((t) => t.pdf)) {
    const id = cvId(r);
    const result = spawnSync(process.execPath, [join(appRoot, 'cv', 'render-cv.js'), `--document=${id}`, `--report=${pad(r.num)}`, `--date=${r.date}`], {
      cwd: repoRoot,
      env,
      encoding: 'utf-8',
      windowsHide: true,
    });
    if (result.status !== 0) throw new Error(`render-cv failed for ${id}:\n${result.stdout}\n${result.stderr}`);
    console.log(`  rendered ${id}-${r.date}.pdf`);
  }
}

/** Cover letters: a plain one-page PDF each, printed by Chromium, recorded in covers.json. */
async function renderCovers(root) {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch();
  const covers = {};
  try {
    const page = await browser.newPage();
    for (const r of tracked.filter((t) => t.cover)) {
      const file = `output/cover-${CANDIDATE_SLUG}-${r.p.company.slug}-${r.date}.pdf`;
      await page.setContent(`<!doctype html><html><body style="font:11pt/1.5 Georgia,serif;margin:1in">
        <p>${CANDIDATE}<br>${payload.candidate.email}</p>
        <p>${r.date}</p>
        <p>Dear ${r.p.company.name} hiring team,</p>
        <p>I am applying for the ${r.p.title} role. At Northwind Payments I rebuilt the settlement pipeline as an event-driven service in Go and moved our cron jobs to a queue-backed scheduler with idempotent retries. Your posting asks for ${r.p.required.slice(0, 3).join(', ')}; that is the work I have been doing for the last three years.</p>
        <p>I would like to talk about how ${r.p.company.name} keeps its services quiet on call.</p>
        <p>Regards,<br>${CANDIDATE}</p></body></html>`);
      mkdirSync(join(root, 'output'), { recursive: true });
      await page.pdf({ path: join(root, file), format: 'Letter' });
      covers[String(r.num)] = { path: file, date: r.date };
      console.log(`  rendered ${file}`);
    }
  } finally {
    await browser.close();
  }
  write(root, 'data/jsc/covers.json', `${JSON.stringify(covers, null, 2)}\n`);
}

function writeEmpty(root) {
  // A fresh clone: the three directories upstream ships with a .gitkeep, nothing else.
  for (const dir of ['reports', 'output', 'data']) write(root, `${dir}/.gitkeep`, '');
}

function writeBroken(root, populated) {
  cpSync(populated, root, { recursive: true });
  // A row a hand edit mangled: a score without "/5", a status upstream does not
  // know, a report that was never written, and no Notes cell. Its company is not
  // on any board and its number is not the next one, so upstream's merge never
  // folds a new evaluation into it.
  const tracker = readFileSync(join(root, 'data', 'applications.md'), 'utf-8').trimEnd();
  writeFileSync(
    join(root, 'data', 'applications.md'),
    `${tracker}\n| 57 | ${day(52)} | Quarry Systems | — | Backend Engineer | 4.0 | Waiting on recruiter | ❌ | [057](../reports/057-quarry-systems-${day(52)}.md) |\n`,
    'utf-8',
  );
  // A custom theme that fails the ATS check, selected as the current template.
  cpSync(join(appRoot, 'server', 'services', '__fixtures__', 'themes', 'broken.html'), join(root, 'config', 'cv', 'templates', 'broken.html'));
  writeFileSync(join(root, 'config', 'cv', 'style.yml'), STYLE_YML.replace('template: standard', 'template: broken'), 'utf-8');
}

// ── main ──────────────────────────────────────────────────────────────

rmSync(SEEDS, { recursive: true, force: true });
writeNet();
console.log(`net/greenhouse.json: ${market.length} postings on ${COMPANIES.length - 1} boards (${fresh.length} not yet scanned)`);

writeEmpty(join(SEEDS, 'empty'));
console.log('seeds/empty');

const populated = join(SEEDS, 'populated');
writePopulated(populated);
if (withPdf) {
  renderPdfs(populated);
  await renderCovers(populated);
}
// Renders leave intermediate HTML beside the PDFs; the payload and PDF are what the console reads.
console.log(`seeds/populated: ${tracked.length} tracker rows, ${history.length} postings seen`);

writeBroken(join(SEEDS, 'broken'), populated);
console.log('seeds/broken');
