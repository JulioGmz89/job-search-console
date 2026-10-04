# Project Plan — Job Search Console

> **Project name:** Job Search Console. **Repo name:** `job-search-console`.
> This document is the source of truth for what we are building and why. It is written
> for both human contributors and AI developer agents. Read it fully before making
> architectural changes.

## 1. What this project is

**Job Search Console** (repo: `job-search-console`) is a standalone, open-source **fork of
[santifer/career-ops](https://github.com/santifer/career-ops)** (MIT licensed) that
replaces its fragmented CLI-command workflow with a **single local web application**
covering the entire job-search loop:

1. Upload/edit your resume (`cv.md`) and configure job board sources
2. Run automated job discovery across multiple platforms
3. Trigger AI evaluations and tailored CV/PDF generation from the UI
4. **Skills gap analysis** (new feature, does not exist upstream): aggregate all
   scanned job postings to report which skills are most in demand, which the user
   fully has, partially has, and lacks entirely
5. **CV customization** (new feature): control how generated CV PDFs look (themes,
   fonts, layout) and how they are written (voice/style rules), so output is not
   identifiable as the default career-ops template shared by all upstream users
6. Track application statuses and review generated documents (reports, PDFs)

Everything runs **locally on the user's machine**. No hosted service, no telemetry,
no data collection. The user's CV and personal data go only to the AI provider they
configure.

### Why fork instead of contribute upstream

Full control over product direction and velocity. Upstream remains the engine
supplier (providers, modes, templates); this project owns the interface and the
skills-analysis layer.

### Naming and trademark (IMPORTANT)

Upstream's code is MIT, but the **"career-ops" name is covered by their
[TRADEMARK.md](https://github.com/santifer/career-ops/blob/main/TRADEMARK.md)**.
This fork MUST:
- Use its own name, README, and branding
- Credit upstream ("built on career-ops") in README and docs
- Never present itself as career-ops or an official career-ops product

## 2. Understanding the upstream architecture (read this before coding)

career-ops is **not a conventional program — it is an agent harness**. Two kinds of
logic coexist:

| Layer | What it is | Examples |
|---|---|---|
| **Deterministic Node scripts** (`*.mjs`) | Ordinary code, callable directly | `scan.mjs` (portal scanning, 55+ provider modules in `providers/`), dedup/merge/integrity scripts, `analyze-patterns.mjs`, `stats.mjs`, `salary-gap.mjs` |
| **Agent modes** (`modes/*.md`) | Markdown prompts executed by an AI coding CLI reasoning over the user's `cv.md` + a job description | `oferta.md` (A–H evaluation), `pdf.md` (tailored CV), `cover.md`, `email.md`, `deep.md`, `contacto.md` |

There is **no `evaluate()` function to call**. Evaluations happen when an agent
session runs a mode. Upstream already demonstrates headless invocation in
`batch/batch-runner.sh` + `batch/batch-prompt.md` (spawning `claude -p` workers).
Our backend generalizes that pattern.

**State lives in files, governed by upstream's `DATA_CONTRACT.md`:**
- `cv.md` — the user's resume (markdown)
- `config/profile.yml` — user profile
- `portals.yml` — scanner configuration (companies + search queries)
- `data/` incl. `applications.md` — the application tracker (markdown tables).
  `data/pipeline.md` is a separate file: the inbox of pending job URLs.
- `reports/` — A–H evaluation reports (markdown)
- `output/` — generated PDFs

## 3. Confirmed technical decisions

These are settled. Do not relitigate them without explicit user approval.

| Decision | Choice | Rationale |
|---|---|---|
| Interface | **Local web app** (no TUI work) | PDF preview, gap-analysis charts, and config forms all need a browser |
| Backend | **Node.js** | Reuse upstream `.mjs` scripts as-is by importing/spawning them; one language across the repo |
| Agent runner (v1) | **Claude Code headless only** (`claude -p`) | Simplest reliable path; the maintainer uses Claude Code. Multi-CLI support (opencode, codex, etc.) is a post-v1 goal — keep the runner behind an interface so adding CLIs later is additive |
| Source of truth | **Upstream's data files, unchanged** (through v1) | Upstream scripts keep working; existing career-ops users can point this UI at their setup; user can still drop into Claude Code in the same directory. SQLite may be added later ONLY as a derived, regenerable index (e.g., for skills analytics) — never as the primary store |
| Distribution | Open source, MIT, own name | Portfolio piece + useful to other job seekers |

## 4. Fork & upstream-sync strategy

Upstream is very active. We deliberately partition the repo so merges stay cheap:

- **Keep mergeable — do not edit:** `providers/`, `modes/`, `templates/`,
  `scripts/`, scanner and integrity `.mjs` files, `batch/`. Job board providers
  break often; upstream's community fixes them. Add upstream as a git remote and
  periodically merge these paths.
- **Ours — new code lives here:** `app/` (see layout below). Nothing upstream
  touches this directory.
- **Removable later:** upstream's Go TUI (`dashboard/`), per-CLI wrapper files,
  and the alpha `web/` UI. Leave them untouched initially (conflict-free merges);
  prune once our UI fully covers them.
- **The seam:** `app/server/services/` is the only place that calls upstream
  code and parses upstream files. All knowledge of upstream's formats is
  concentrated there. If upstream changes a format, only the service layer changes.

## 5. Target architecture

```
job-search-console/
├── PROJECT_PLAN.md            # this file
├── app/
│   ├── server/                # Node backend (Fastify or Express), binds 127.0.0.1 only
│   │   ├── services/          # SEAM: wraps upstream .mjs + parses data files
│   │   │   ├── pipeline.js    #   parse/write data/applications.md (the tracker)
│   │   │   ├── reports.js     #   parse reports/, resolve output/ PDFs
│   │   │   ├── scanner.js     #   invoke scan.mjs (incl. --verify), portals.yml CRUD
│   │   │   └── profile.js     #   cv.md + profile.yml read/write
│   │   ├── agents/            # headless Claude Code runner (claude -p)
│   │   │   └── runner.js      #   interface: run(mode, input) → stream; keep CLI-agnostic
│   │   ├── queue/             # job queue: statuses, log capture, cancel, SSE streaming
│   │   └── skills/            # NEW FEATURE: extraction, aggregation, gap diff
│   └── ui/                    # SPA (React + Vite): dashboard, config, gap view, PDF viewer
├── providers/ modes/ templates/ batch/ ...   # upstream, kept mergeable
└── cv.md  portals.yml  data/  reports/  output/   # unchanged data contract
```

### Backend responsibilities
- REST endpoints over the service layer (pipeline, reports, portals, profile)
- Job queue for long-running work; every long task (scan, evaluate, pdf) is a
  queued job with id, status (`queued/running/succeeded/failed/cancelled`),
  captured logs, and cancellation. Progress streams to the UI via **SSE**
- Agent runner spawns `claude -p` with a self-contained prompt assembled from the
  relevant `modes/*.md` (mirror `batch/batch-prompt.md`'s approach). Capture
  stdout/stderr, enforce a timeout, surface exit status. Never run more than a
  configurable number of concurrent workers (default 2)
- File watching on `reports/`, `output/`, `data/` so UI refreshes when the agent
  (or a manual CLI session) writes results

### Frontend responsibilities (v1 pages)
1. **Dashboard** — pipeline table: filter by status/score, sort, inline status
   changes, links to report + PDF. (Feature-parity target: upstream's Go TUI —
   6 filter tabs, 4 sort modes, grouped/flat views)
2. **Job detail** — rendered A–H report, PDF preview (iframe/embed), status
   history, action buttons (re-evaluate, generate PDF, generate cover letter)
3. **Sources / Portals** — form-based CRUD over `portals.yml` (companies,
   queries, board types), "Scan now" button with live progress
4. **Profile** — edit `cv.md` (markdown editor) and `profile.yml`
5. **Skills Gap** — see §6
6. **CV Studio** — see §7: theme picker, style tokens, writing-style rules,
   live preview
7. **Runs** — queue view: running/finished jobs with live logs

## 6. New feature spec: Skills Gap Analysis

The differentiating feature; nothing upstream provides it. Lives in
`app/server/skills/` + the Skills Gap UI page.

**Pipeline:**
1. **Extraction (per posting, cached):** for each scanned JD, one small LLM call
   (via the agent runner or direct API) returning structured JSON:
   `[{ skill, category, level: required|nice-to-have }]`. Cache by posting
   content hash — a posting is never extracted twice. Normalize skill names
   against a small alias map (e.g. "JS" → "JavaScript"; grow it over time).
2. **CV skill extraction (once, re-run on cv.md change):** same schema plus a
   self-assessed depth where inferable.
3. **Aggregation (pure code, no LLM):** demand frequency per skill, co-occurrence,
   trend over successive scans, and weighting by evaluation score band — a skill
   demanded by the user's 4.5+ matches counts more than one from 2.0 listings.
   Mine existing A–H reports for their per-job gap notes as an additional signal.
4. **Gap classification:** each in-demand skill →
   `have | partial | missing`, producing three ranked lists:
   most-demanded skills overall, skills to learn (missing, high demand in
   high-score jobs), skills to deepen (partial).

**UI:** ranked bar charts + a table with drill-down to the postings that demand
each skill. Storage: JSON cache files under `data/skills/` (v1); optional SQLite
index later.

## 7. New feature spec: CV Customization ("CV Studio")

Problem: upstream ships one HTML template (`templates/cv-template.html`, Space
Grotesk + DM Sans) and one writing prompt (`modes/pdf.md`). Every upstream user's
PDF therefore looks and reads the same — visually generic and identifiable as
AI-generated. Two independent layers fix this:

### 7a. Visual layer (themes & tokens)
- **Design tokens** in `config/cv/style.yml` (fork-owned, gitignored like other
  user config): font pair, accent color, page margins, density, section order,
  layout variant. Injected as CSS variables at render time.
- **Theme system:** multiple full HTML templates in `config/cv/templates/`;
  upstream's template is registered read-only as theme `classic`. Users can drop
  in their own template file (advanced mode).
- **NEVER edit** `templates/cv-template.html` or `modes/pdf.md` — they must stay
  upstream-mergeable (§4). All overrides live in fork-owned paths.

### 7b. Voice layer (writing style)
- **Writing style config** (`config/cv/voice.yml` + free-text rules): banned
  words/phrases (e.g. "spearheaded", "leveraged"), tone notes, bullet
  conventions, language/locale.
- The agent runner appends these rules to the prompt whenever it assembles a
  PDF or cover-letter job. Also surface upstream's existing `writing-samples/`
  directory in the UI — samples of the user's real writing are the strongest
  de-AI signal and are currently underused.

### 7c. Content/presentation separation (the architectural core)
- New fork-owned mode (as built: the headless overlay
  `app/server/agents/prompts/pdf-structured.md` on top of upstream's `modes/pdf.md`): the agent outputs
  **structured CV data (JSON)** — tailored content, keyword injection included —
  instead of final HTML. Prefer the open JSON Resume schema
  (https://jsonresume.org) unless a blocker emerges, to inherit its theme
  ecosystem.
- Deterministic renderer in `app/server/services/cvrender.js`:
  `data + theme + tokens → HTML → Playwright → PDF`.
- Payoff: **zero-token live preview** (re-render on token change in <1s, no
  agent call), bulk re-theming of past CVs, community-shareable themes.
- Upstream's original agent-writes-HTML path remains available as a fallback.

### 7d. ATS guardrail (non-negotiable within this feature)
Any theme must produce ATS-parseable output: real selectable text, sane reading
order, standard section headings, no text-in-images. Add an automated check that
extracts text back out of the generated PDF and verifies sections/keywords
survived. Warn loudly in the UI when a custom theme fails it.

## 8. Milestones (build in this order)

Each milestone ships something usable. Do not start N+1 before N works end-to-end.

- **M0 — Fork hygiene:** fork, rename repo to `job-search-console`, new README
  crediting upstream, add `upstream` remote, CI lint/test skeleton, this
  document committed.
- **M1 — Read-only dashboard:** `app/server` parses `data/applications.md` + `reports/`
  into JSON endpoints; UI shows pipeline table, rendered reports, PDF preview.
  *No agents, no queue.* This forces the data-contract parsing everything else
  builds on. Acceptance: point it at a populated career-ops directory and browse
  the pipeline without touching a terminal.
- **M2 — Deterministic actions:** portals CRUD, "Scan now" (spawns `scan.mjs`,
  streams progress), inline status changes written back to tracker files,
  dedup/integrity buttons. Acceptance: full scan-to-tracker loop from the UI.
- **M3 — Agent orchestration:** queue + Claude Code headless runner; Evaluate /
  Generate PDF / Cover letter buttons; live log streaming; results appear in
  dashboard via file watching. Acceptance: paste a job URL in the UI → evaluation
  report + tailored PDF, no CLI commands typed. Include CV customization
  phase A (§7a tokens on the existing template + §7b voice rules), since both
  plug into the same prompt-assembly and render path built here.
- **M4 — Skills Gap:** extraction cache, aggregation, gap classification, Skills
  Gap page. Acceptance: after a scan of ≥50 postings, the page answers "what
  should I learn next?" with evidence links.
- **M5 — CV Studio:** structured-data mode (§7c), deterministic renderer,
  live-preview UI, theme gallery, ATS guardrail check (§7d). Acceptance: change
  theme/tokens and see the PDF preview update without an agent call; a past CV
  can be re-rendered in a new theme; a deliberately broken theme triggers the
  ATS warning.
- **M6 — UX evaluation baseline (analysis only, no UI changes):** build the UX
  sandbox, then write the capability inventory, personas and top tasks. Run the
  heuristic evaluation, cognitive walkthroughs, simulated persona tests and the
  accessibility audit. Method, agents and artifacts in §12. Acceptance:
  `app/ux/` holds a capability inventory that covers every server route and UI
  action. It also holds a baseline scorecard for every top task and persona, and
  one deduplicated findings backlog ranked by severity (0–4), with a screenshot
  and a reproduction for each finding. No file under `app/ui/src/` changed.
- **M7 — Information architecture & design direction:** use the M6 findings to
  settle the navigation model, page structure and the visual design system. This
  closes the component-library and styling question in §11. Explore 2–3
  alternatives as prototypes (Claude Design, §12.4) before writing any code.
  Acceptance: an IA document and a sitemap mapping every inventory capability to
  a place in the UI. Design tokens are recorded as code-ready CSS variables.
  Clickable prototypes of the chosen direction exist for every top task. A
  cognitive walkthrough, re-run on those prototypes, finds no severity-3 or -4
  issue on any top task. The user approves one direction.
- **M8 — UX implementation & validation:** build the approved direction. This
  covers navigation, the first-run onboarding flow (import CV, seed portals,
  check the agent CLI; moved here from the old release milestone) and empty
  states. It also covers in-context help, the missing Profile page (§5 page 4)
  and the accessibility fixes. Re-run the full M6 suite against the result.
  Acceptance: every severity-3 and -4 finding is closed. Every top task meets its
  §12.6 target. axe reports zero serious or critical violations. In a fresh
  sandbox, a simulated first-time persona gets from an empty workspace to a first
  evaluated job without leaving the app. At least 3 real people complete the
  §12.5 moderated sessions.
- **M9 — Polish & release:** settings UI for the agent CLI path and concurrency,
  docs, screenshots (taken from the UX sandbox, never real data), tag v1.0.

## 9. Non-negotiable constraints

1. **Human-in-the-loop.** Like upstream: the system NEVER submits applications,
   sends emails, or clicks anything on the user's behalf. It drafts and evaluates;
   the user acts. Do not add auto-apply features.
2. **Local-only by default.** Server binds `127.0.0.1`. No analytics, no external
   calls except the AI provider and the job boards being scanned.
3. **Respect third-party ToS.** Keep upstream's rate-limiting/scanning behavior;
   no changes that enable spamming boards or ATS systems.
4. **Data contract compatibility (v1).** Upstream CLI usage in the same directory
   must keep working. Any file format we write must round-trip through upstream's
   own scripts.
5. **Secrets stay in `.env`** (gitignored), never in code or data files.
6. **Trademark:** see §1 — own name, credit upstream, never impersonate.

## 10. Out of scope (for now)

- Multi-CLI agent runners (post-v1; keep `agents/runner.js` behind an interface)
- Hosted/multi-user deployment, auth, accounts
- Mobile UI
- Replacing markdown/YAML state with a database as source of truth
- A hosted community theme marketplace (themes are shareable as files; no service)
- Auto-apply / automated submission of any kind (permanently out of scope)

## 11. Open questions (resolve with the user before implementing)

- UI framework details beyond React + Vite (component library, styling).
  **To be resolved in M7** using the M6 evidence (§12.4). Until then, keep plain
  CSS custom properties in `app/ui/src/styles.css`.
- ~~Whether skill extraction (§6 step 1) runs through `claude -p` (no extra API key,
  reuses the user's Claude subscription) or a direct API call (faster for bulk,
  needs a key). Default assumption: through the agent runner, batched.~~
  **Resolved in M4 (2026-09-16): hybrid.** A rules pass over upstream's
  `skill-extract.mjs` vocabulary plus a fork alias map runs instantly and free
  when a posting's text is fetched; a batched `claude -p` pass (ten postings per
  session, cached by content hash) replaces it per posting with category and
  required/nice-to-have, and is started by the user from the Skills page. No
  direct API call. Posting text is fetched by a fork worker (`skills-fetch`,
  chained after every real scan) because `scan.mjs` never persists it.
- License header/NOTICE format for crediting upstream files
- ~~Confirm JSON Resume as the CV data schema (§7c) after checking it can carry
  everything upstream's tailoring produces (keyword injection, per-job ordering);
  otherwise define a minimal fork-owned schema with a JSON Resume export~~
  **Resolved in M5 (2026-10-01): upstream's `build-cv-html.mjs` payload.** Upstream
  already separates content from presentation: `modes/pdf.md` step 17 has the agent
  write a JSON payload, and `build-cv-html.mjs` fills any `templates/cv-template*.html`
  from it. That payload carries what JSON Resume cannot without extensions
  (competencies, localized section titles, page format, photo style), every upstream
  template renders it, and past CVs already exist in it (`output/cv-*.json`). Adopting
  JSON Resume would have meant a converter and a parallel renderer. A JSON Resume
  *export* remains a possible later addition.

## 12. UX/UI analysis method (M6–M8)

The goal for M6–M8 is that a first-time user can understand and use **every**
capability of the console without reading docs or opening a terminal. Today the
app grew one milestone at a time: five tab pages, actions spread across rows,
bars and dialogs, and no Profile page. Nobody has checked it as a whole from a
user's point of view.

The order is fixed: **measure → design → build → re-measure**. Do not change UI
code before M6 has produced evidence, and do not start code before M7 has a
validated direction.

### 12.1 The UX sandbox (prerequisite for everything below)

All UX work runs against fictional data, never the maintainer's real `cv.md`,
tracker or reports. That rule protects privacy, keeps screenshots committable,
and makes runs reproducible.

- `app/ux/sandbox/` holds seed workspaces for three states. **`empty`** is a
  first run: no `cv.md` and no `portals.yml`. **`populated`** has a fictional
  persona's CV, about 40 tracker rows across every status and score band,
  reports, PDFs and a Skills cache. **`broken`** has a failed run, a malformed
  tracker row and a theme that fails the ATS check. Build them from the existing
  test fixtures (`app/server/services/__fixtures__/workspace`, `themes/broken.html`).
- `app/ux/sandbox.mjs --state <name> --port <n>` copies a seed into a temp
  directory and starts the server against it. It uses the data-root override
  (`CAREER_OPS_ROOT`) and `JSC_CLAUDE_BIN` pointed at
  `__fixtures__/bin/fake-claude.js`. Agent flows (evaluate, PDF, cover letter,
  skills) then run end to end **at zero token cost**. `FAKE_CLAUDE_SCENARIO`
  selects failure states. Add a delay option to the fake so the long-run waiting
  experience can be tested; real evaluations take minutes.

### 12.2 Analysis methods (M6)

Each method answers a different question. Together they cover "can users find
it", "can users do it" and "can everyone do it".

| # | Method | Question it answers | Output |
|---|---|---|---|
| 1 | **Capability inventory** | What can the tool actually do, and where does the UI expose it? | `app/ux/inventory.md` lists every server route, queued job kind, config file and UI action. For each one it records where it is surfaced, how many interactions it takes to reach, the label used, and whether it is discoverable. Capabilities with no UI surface (e.g. `cv.md` editing, `writing-samples/`, `profile.yml`) are flagged. |
| 2 | **Personas & top tasks** | Who uses it, and for what? | `app/ux/personas.md` and `app/ux/tasks.md` (see below). Tasks are written as goals in the user's own words, never as UI labels, so the tests do not lead the tester. |
| 3 | **Heuristic evaluation** | Where does the UI break known usability principles? | Each page is reviewed against Nielsen's 10 heuristics, rated on the 0–4 severity scale (0 none … 4 catastrophe). |
| 4 | **Cognitive walkthrough** | At each step of each task, would a new user know what to do next? | For every step, four questions: will the user try to reach this effect, notice the control, connect the control to the effect, and see that progress was made? |
| 5 | **Simulated persona tests** | Where do users get stuck, lost or misled in practice? | One transcript per persona × task: steps, wrong turns, moments of confusion, success or failure, and a self-rated Single Ease Question score (1–7). |
| 6 | **Accessibility audit** | Can keyboard, screen-reader and low-vision users do the same tasks? | WCAG 2.2 AA via axe-core (through Playwright), a keyboard-only pass through every top task, focus visibility, contrast in **both** colour schemes (`styles.css` has a dark mode), 200% zoom, accessible names from the accessibility snapshot. |
| 7 | **Synthesis** | What should we fix first? | `app/ux/backlog.md` is one deduplicated list. Each finding records severity, the affected tasks and capabilities, evidence (screenshot plus reproduction steps) and the methods that found it. `app/ux/scorecard.md` holds the baseline metrics from §12.6. |

**Personas** (fictional; add more only with evidence):
- **P1, the career-ops migrant.** Knows the upstream CLI and modes and expects
  parity. Risk: cannot find where a familiar command lives.
- **P2, the first-timer.** Installed Node and Claude Code by following the README
  and has never seen career-ops. Risk: does not understand the A–H evaluation,
  score bands, or why there is a queue.
- **P3, the career-changer.** Comes mainly for the Skills Gap and CV Studio. Risk:
  never finds out that the scan → evaluate loop feeds those pages.

**Top tasks** (initial list; M6 may revise it):
- T1: first run from an empty workspace (CV in, sources set up).
- T2: add one job by URL and get it evaluated.
- T3: find the best matches and update their status.
- T4: run a scan and understand what came back.
- T5: get a tailored CV PDF and a cover letter for one job.
- T6: decide what to learn next, with evidence.
- T7: change how the CV looks and confirm it is still ATS-safe.
- T8: work out why a run failed and recover.
- T9: change the writing voice so the CV does not read as AI-generated.

### 12.3 Agent roster

Dedicated Claude Code subagents are defined as `.claude/agents/*.md`. These are
new fork-owned files; do not edit upstream's `.claude/skills/`. The main Claude
Code session orchestrates them. The agents are split this way so that **no agent
grades its own work**, and so the tester that simulates a user **cannot see the
code**. An agent that has read `SkillsPage.jsx` already knows where the button
is.

| Agent | Milestones | Tools | Job |
|---|---|---|---|
| `ux-researcher` | M6 | Read, Grep, Glob, Write | Builds the capability inventory from the server routes, the queue job kinds, the UI and upstream's `AGENTS.md`/`modes/`. Drafts personas and tasks. |
| `heuristic-evaluator` | M6, M7, M8 | Playwright MCP, Read, Grep, Write | Runs the heuristic evaluation and the cognitive walkthroughs against the running sandbox, then against the M7 prototypes. May read code only to name the component behind a finding. |
| `persona-tester` | M6, M8 | Playwright MCP, Write (to `app/ux/runs/` only) | Is **blind**: it gets no Read, Grep or Bash. It receives one persona card and one task goal, uses only what is on screen, thinks aloud into its transcript, and stops after a step budget. Every persona × task pair runs in a fresh context and a fresh sandbox. |
| `a11y-auditor` | M6, M8 | Bash, Playwright MCP, Read, Grep, Write | Runs the axe-core scans and the keyboard, contrast and zoom passes from §12.2 #6. |
| `ux-synthesizer` | M6, M8 | Read, Glob, Write | Merges every agent's output into the backlog and scorecard, deduplicates findings and assigns severity. It produces no findings of its own. |
| `ux-reviewer` | M8 | Playwright MCP, Read, Grep, Glob | A gate on each UI PR. It checks the change against the IA document, the tokens and the findings the PR claims to close, and re-runs the affected persona tasks as a regression check. |

Operational rules:
- The Playwright MCP server (`.mcp.json`) is a single shared browser. Run browser
  agents **one at a time**, or give each its own isolated browser instance and
  sandbox port.
- Simulated testers have known biases: they read every word, never get bored,
  and over-report success. Use them to find blockers cheaply and to run
  regressions repeatedly. **They never certify usability on their own**; real
  people do that (§12.5).
- Agent definitions name their model in frontmatter. Use opus for judgment-heavy
  roles (researcher, evaluator, synthesizer, reviewer) and sonnet for high-volume
  persona runs.

### 12.4 Tool choice: Claude Design and its alternatives

[Claude Design](https://www.anthropic.com/news/claude-design-anthropic-labs)
(claude.ai/design, Anthropic Labs research preview) is a **generative**
tool. It turns prompts into designs and clickable prototypes, can import a
codebase's design system (`/design-sync` from Claude Code), and hands off to
Claude Code as a bundle of HTML/CSS/JS, screenshots and a README. It cannot drive
our running app, run accessibility checks, or simulate users. That makes it the
right tool for M7 and the wrong one for M6.

| Need | Tool | Why |
|---|---|---|
| Evaluate the existing UI (M6) and re-measure (M8) | Claude Code subagents + Playwright MCP + axe-core against the sandbox | Local, reproducible and scriptable, and no data leaves the machine. Fits §9.2. |
| Explore IA and visual alternatives, and build clickable prototypes (M7) | **Claude Design.** Sync only `app/ui/` and its `styles.css` tokens, not the whole repo (large repos make it lag). The `/design` flow or a Design artifact from Claude Code does the same job. | Gets 2–3 divergent directions in front of the user quickly, and prototypes can be walked through before any code exists. |
| Implement (M8) | Main Claude Code session, with the handoff bundle as a **spec** | Handoff output is generic HTML/CSS/JS. It is rewritten into our React components, hash router and token file, never pasted in. |
| Certify usability | Real people (§12.5) | No tool replaces this. |

Claude Design constraints:
- It needs a Pro, Max, Team or Enterprise plan, and it shares usage limits with
  Claude Code, so design iterations and evaluation runs draw on the same budget.
- Prototypes live on claude.ai. They may only contain sandbox personas' fictional
  data.
- Fallback if it is unavailable: Claude Code writes static prototypes to
  `app/ux/prototypes/`, and the same walkthrough applies to them.

Figma is not adopted. This is a one-maintainer project with no design-to-dev
handoff that justifies it.

### 12.5 Real-user validation (M8)

- Hold 3–5 moderated think-aloud sessions on the participant's own machine or
  the maintainer's, using the sandbox and the same task list. Five users
  typically surface most usability problems; 3 is the minimum.
- Record per-task success, time and the Single Ease Question score, plus a System
  Usability Scale (SUS) questionnaire at the end. Keep anonymized notes in
  `app/ux/sessions/`. Recordings are never committed.
- **No telemetry or analytics, ever (§9.2).** All measurement happens in these
  sessions or in sandbox runs.

### 12.6 Metrics and targets

The baseline is recorded in M6. The targets below are M8 acceptance criteria.

| Metric | Source | Target |
|---|---|---|
| Task success, simulated | persona-tester, every persona × top task | ≥ 90% |
| Task success, real | §12.5 sessions | ≥ 80% per task |
| Single Ease Question score | real sessions | mean ≥ 5.5/7 per task |
| SUS | real sessions | ≥ 75 (the industry average is 68) |
| Discoverability | inventory | every capability reachable in ≤ 3 interactions from the page where a user would look for it, labelled in the user's own words |
| Open severity-3/4 findings | backlog | 0 |
| axe serious/critical violations | a11y-auditor | 0, in both colour schemes |

### 12.7 Constraints specific to UX work

- §4 still applies: UX changes live in `app/ui/` and `app/ux/`. Upstream paths
  and the data contract stay untouched. A better UX is never a reason to change
  a file format.
- The maintainer approves the IA and design direction at the end of M7. Agents
  propose; they do not decide.
- Human-in-the-loop (§9.1) is a design constraint, not a usability defect.
  Findings like "applying should be one click" are recorded as out of scope.
