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
  skills/              M4, the skills gap analysis (PROJECT_PLAN.md §6) — see below
    corpus.js          which postings: scan-history.tsv ∪ the inbox ∪ the tracker/reports, keyed by URL
    fetch.js           one URL → posting text: jds/ capture, the ATS API (upstream's resolveAtsApi), browser-extract.mjs
    cli.js             the fetch worker the queue spawns (`skills-fetch`)
    store.js           data/skills/: postings, extractions by text hash, cv.json, overrides.json
    aliases.js         the fork's alias map and categories, layered over upstream's skill-extract.mjs
    rules.js           deterministic extraction; required vs nice-to-have from the section a mention sits in
    extract-spec.js    the Claude sessions: skills-extract (batches of ten) and skills-cv
    prompts/           their fork-owned prompts
    aggregate.js       pure: demand, score-band weighting, co-occurrence, trend, have/partial/missing, the lists
    service.js         GET /api/skills: everything joined
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

M4 adds the skills layer's runs. `skills-fetch` (a fork script, `app/server/skills/cli.js`)
reads the text of every posting not yet cached and is chained automatically after a real
scan; `skills-extract` and `skills-cv` are agent kinds, queued from the Skills page:

| Kind | What it does | Verified by |
|---|---|---|
| `skills-fetch` | posting text: jds/ capture → ATS public API → `browser-extract.mjs` | one `data/skills/postings/<id>.json` per posting, failures included |
| `skills-extract` | up to ten cached postings → `{ skill, category, level }` each | the output JSON names the postings sent; each becomes `data/skills/extractions/<textHash>.json` |
| `skills-cv` | cv.md + profile.yml → `{ skill, category, depth }` | `data/skills/cv.json`, keyed by cv.md's hash |

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
- `data/jsc/tmp/skills-*.json` — the batch a skills session was given and the JSON it wrote back
- `data/skills/` — the skills cache: `postings/` (text by normalized URL), `extractions/` (by
  text hash, so a posting is never sent to Claude twice), `cv.json`, `overrides.json` (your
  have / partial / missing / ignore corrections). Delete the directory to rebuild from scratch.
- `config/cv/style.yml` — CV Studio's style tokens (`config/cv/style.example.yml` documents every key)
- `config/cv/templates/` — your own CV templates (see the README there)

`voice-dna.md` and `writing-samples/` are upstream's own user-layer files; CV Studio
edits and lists them in place.

## The skills gap analysis

The Skills page answers "what should I learn next?" from the postings the scanner found.
Upstream never keeps a posting's text, so the layer reads each one once (`skills-fetch`),
then extracts skills in two tiers: a rules pass the moment the text lands — upstream's
`skill-extract.mjs` vocabulary plus `aliases.js`, with required vs nice-to-have read from
the section a mention sits in — and a Claude pass (`skills-extract`) that replaces it per
posting, cached by content hash. The CV goes through the same two tiers with a depth per
skill. `aggregate.js` then counts demand once per posting, weights it by the posting's
score band (4.5+ double, under 3.0 half) and by level (nice-to-have half), mines the A–H
reports' gap notes through upstream's `parseReportGaps`, and classifies each skill
have / partial / missing — the user's overrides first, then the CV. Three lists come out:
learn next (missing, asked for by ≥2 postings), deepen (partial), most demanded. Every row
expands to the postings that ask for it, each linked to the posting and, when evaluated,
to its report.

Upstream code it leans on, all imported and none edited: `skill-extract.mjs`,
`jd-skill-gap.mjs`, `upskill.mjs`, `liveness-api.mjs`, `browser-extract.mjs`,
`jd-capture.mjs`, `url-key.mjs`.

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
