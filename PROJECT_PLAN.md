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
- `data/` incl. `pipeline.md` — the application tracker (markdown tables)
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
│   │   │   ├── pipeline.js    #   parse/write pipeline.md & tracker data
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
- New fork-owned mode `app/modes/pdf-structured.md`: the agent outputs
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
- **M1 — Read-only dashboard:** `app/server` parses `pipeline.md` + `reports/`
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
- **M6 — Polish & release:** onboarding flow (first-run: import CV, seed
  portals), config for agent CLI path/concurrency, docs, screenshots, tag v1.0.

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

- UI framework details beyond React + Vite (component library, styling)
- Whether skill extraction (§6 step 1) runs through `claude -p` (no extra API key,
  reuses the user's Claude subscription) or a direct API call (faster for bulk,
  needs a key). Default assumption: through the agent runner, batched.
- License header/NOTICE format for crediting upstream files
- Confirm JSON Resume as the CV data schema (§7c) after checking it can carry
  everything upstream's tailoring produces (keyword injection, per-job ordering);
  otherwise define a minimal fork-owned schema with a JSON Resume export
