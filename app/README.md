# `app/` — the Job Search Console application

Everything this fork owns lives here: the Node backend, the headless agent runner, the
CV style layer, and the web UI. Nothing upstream touches this directory, which is what
keeps merges from [career-ops](https://github.com/santifer/career-ops) cheap. See
[PROJECT_PLAN.md §5](../PROJECT_PLAN.md) for the target layout.

It is a **separate npm package** with its own lockfile — the same pattern upstream uses
for `web/` — so the root `package.json` stays mergeable. Source files are `.js`, not
`.mjs`, so upstream's root `npm run lint` (which syntax-checks every `.mjs` in the
repository) never reaches into this tree.

```sh
npm install
npm run lint     # eslint, flat config
npm test         # node --test — every suite runs against fixtures or a temp workspace
npm start        # builds the UI, then serves it on http://127.0.0.1:4317
npm run dev      # server with --watch; pair with `npm run ui:dev` (Vite on :4318, proxies /api)
```

CI (`.github/workflows/app-ci.yml`) runs lint, build and tests on Node 22 and 24 for any
PR touching `app/**`.

## Layout

```
server/
  app.js               every route; thin — all format knowledge lives in services/
  index.js             loopback-only entry point (PROJECT_PLAN.md §9.2); housekeeping at boot
  watch.js             fs.watch on reports/, output/, data/ → the /api/events feed
  services/            THE SEAM: the only code that reads/writes upstream's files or calls its scripts
    pipeline.js        data/applications.md (the tracker), read
    status.js          tracker status writes, through upstream's set-status.mjs
    reports.js         reports/*.md + data/pdf-index.tsv
    inbox.js           data/pipeline.md (the URL inbox): read, and the one write (a pasted URL)
    portals.js         portals.yml CRUD, comment-preserving
    scanner.js         scan.mjs argv and its bookkeeping files
    batch-state.js     batch/batch-state.tsv rows for finished evaluations
    report-numbers.js  reserve-report-num.mjs, and cleanup after a failed worker
    cvstyle.js         config/cv/style.yml, voice-dna.md, template and sample listings
    covers.js          which report has which cover-letter PDF (data/jsc/covers.json)
  queue/
    runner.js          the job queue: lanes, exclusive runs, timeouts, hooks, chained follow-ups
    specs.js           the allowlist of run kinds — the browser names a kind, never a command
    agent-specs.js     evaluate / pdf / cover: the specs that spawn a Claude Code session
  agents/
    runner.js          the exact `claude -p` command line (CLI-agnostic by construction)
    claude-bin.js      finding the CLI on each platform
    stream-json.js     the CLI's stream-json → a readable log + a structured result
    profile.js         the few facts the runner needs from config/profile.yml
    prompts/           prompt assembly + the fork's headless overlays (evaluate.md, pdf.md, cover.md)
cv/
  theme.js             style tokens → CSS on upstream's templates (pure)
  render-cv.js         CLI the pdf session runs: apply the style, then upstream's generate-pdf.mjs
ui/                    React + Vite SPA, plain CSS, hash routing, no router or state library
```

## How an agent run works

Every long task is a **run**: a kind from `queue/specs.js`, a status
(`queued → running → succeeded | failed | cancelled`), a captured log streamed over SSE,
and cancellation. M2's scans and maintenance scripts are runs; M3 adds three kinds that
spawn a headless Claude Code session:

| Kind | What it does | Verified by |
|---|---|---|
| `evaluate` | `modes/oferta.md` on a job URL: A–G report + tracker row | `reports/NNN-*.md` exists for the number the console reserved |
| `pdf` | `modes/pdf.md` for a report: tailored CV, built and rendered with your style | a fresh entry for the report in `data/pdf-index.tsv` |
| `cover` | `modes/cover.md` (slug mode) with your four answers: letter + PDF | `output/cover-<slug>-<NNN>.pdf` exists |

The session is `claude -p` with `--output-format stream-json`, an **allowlist** of tools
(`Read Write Edit Glob Grep WebFetch WebSearch Bash(node:*)`, never `Task`), no MCP
servers, and a system prompt assembled from upstream's own files in the order the skill
router loads them — language directive, `modes/_shared.md`, `_profile.md`, `_custom.md`,
the mode file (localized when `language.modes_dir` says so), `config/profile.yml` — plus a
fork-owned **headless overlay** (`server/agents/prompts/<kind>.md`) saying what changes
when nobody can answer a question: no browser tools (WebFetch instead, header marked
`unconfirmed (headless)`), the report number is already reserved, write a tracker TSV
rather than editing `applications.md`, which fork command replaces upstream's render
step. Upstream's mode files are read verbatim and never edited (PROJECT_PLAN.md §4). For
`pdf` and `cover` the user's `voice-dna.md` is inlined.

An **evaluation is a chain of runs**: the server reserves a report number just before
spawning (`reserve-report-num.mjs`), verifies the report on disk when the session exits,
records a `completed` row in `batch/batch-state.tsv`, and queues `merge-tracker.mjs`
(the tracker row) → `reconcile-pipeline.mjs` (the inbox) — both upstream's scripts,
both run **exclusively** — and, when the score reaches `cv.auto_pdf_score_threshold`, a
`pdf` run, which queues `mark-pdf-ready.mjs` on success. A failed or cancelled session
releases its number and deletes the stray tracker TSV; nothing downstream runs.

**Lanes.** `script` runs go one at a time. `agent` runs may overlap (`JSC_MAX_AGENTS`,
default 2). An exclusive run waits for silence and blocks everything while it runs.

**Success is a file on disk**, never the model's prose: exit 0 with no report, a report
under another number, or a `result` event with `is_error` all fail the run.

## Environment

| Variable | Meaning |
|---|---|
| `PORT` | Listen port (default 4317). The bind address is always 127.0.0.1. |
| `JSC_CLAUDE_BIN` | Path or name of the Claude Code CLI. Default: `claude` on PATH — `claude.exe`/`claude` first, then an npm `claude.cmd` shim unwrapped to `node …/cli.js` (Node refuses to spawn `.cmd` without a shell). |
| `JSC_CLAUDE_MODEL` | Model for every session. Default: from `spend_tier` in profile.yml (`economy` → haiku 4.5, `standard` → sonnet 5, `premium` → opus 5); unset tier → the CLI's default. |
| `JSC_MAX_AGENTS` | Concurrent Claude sessions (default 2). |
| `CAREER_OPS_ROOT` … | Upstream's data-root overrides are honoured, as in a terminal session. |

Timeouts: evaluate 13 min, pdf and cover 10 min; a run past its limit is killed
(`taskkill /T` on Windows) and fails with a reason.

## Where the console keeps its own files

All under the data root and gitignored:

- `data/jsc/prompts/<run>.md` — the exact system prompt a session was given
- `data/jsc/logs/<run>.jsonl` — the raw stream-json transcript
- `data/jsc/tmp/` — payloads the pdf/cover sessions write for upstream's builders
- `data/jsc/covers.json` — report → cover-letter PDF
- `config/cv/style.yml` — CV Studio's style tokens (`config/cv/style.example.yml` documents every key)
- `config/cv/templates/` — your own CV templates (see the README there)

`voice-dna.md` and `writing-samples/` are upstream's own user-layer files; CV Studio
edits and lists them in place.

## Three upstream behaviours worth knowing

- `generate-pdf.mjs --report NNN` **replaces** every `pdf-index.tsv` row for that number.
  That is right for a regenerated CV and would evict the CV when a cover letter is
  rendered, so cover letters are rendered without `--report` and tracked in
  `data/jsc/covers.json` instead.
- `merge-tracker.mjs` refuses a tracker TSV whose report number has a `failed` row in
  `batch/batch-state.tsv`. Released numbers are reused, so the console never writes
  `failed` rows — a retry on the same number would otherwise be blocked. Failures are
  cleaned up by deleting the stray TSV.
- Upstream's renderer applies profile.yml's own `style:` and `cv.sections` **after** the
  console's tokens; CV Studio warns when those keys exist.
