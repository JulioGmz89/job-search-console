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
    cvdocs.js          M5: the CV library — payloads in output/, joined to pdf-index, plus a sample
    cvrender.js        M5: payload + theme + tokens → HTML → PDF, no agent; previews and the gallery
    browser.js         M5: one warm Chromium for previews (fresh JS-off context per render)
    ats.js             M5: the ATS guardrail — upstream's verify-ats.mjs + text read back from the PDF
  queue/
    runner.js          the job queue: lanes, exclusive runs, timeouts, hooks, chained follow-ups
    specs.js           the allowlist of run kinds — the browser names a kind, never a command
    agent-specs.js     evaluate / pdf / cover: the specs that spawn a Claude Code session
    cv-specs.js        cv-render: the deterministic render of one structured CV (M5)
  agents/
    runner.js          the exact `claude -p` command line (CLI-agnostic by construction)
    claude-bin.js      finding the CLI on each platform
    stream-json.js     the CLI's stream-json → a readable log + a structured result
    profile.js         the few facts the runner needs from config/profile.yml
    prompts/           prompt assembly + the fork's headless overlays (evaluate, pdf-structured, pdf, cover)
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
  render-cv.js         CLI: style + generate-pdf.mjs on built HTML (M3), or --document: payload →
                       build → fact gate → PDF → ATS verdict (M5, what cv-render runs)
  sample-payload.json  a fictional CV, so the gallery works before you have generated one
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
| `pdf` | `modes/pdf.md` for a report: the tailored CV as structured data (`output/cv-<candidate>-<slug>.json`); chains `cv-render`. With `structured: false`, M3's path where the session renders | a fresh, payload-shaped JSON (classic: a fresh `data/pdf-index.tsv` entry) |
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

M5 adds one deterministic kind, queued from CV Studio or chained after a `pdf` session:

| Kind | What it does | Verified by |
|---|---|---|
| `cv-render` | `render-cv.js --document`: payload → `build-cv-html.mjs` in the chosen theme → `verify-cv-facts.mjs` (hard gate) → `generate-pdf.mjs` → ATS check | exit 0 and the PDF on disk; the ATS verdict is saved, a fail is logged loudly but does not fail the run |

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
- `data/jsc/tmp/` — payloads the cover sessions (and M3's pdf sessions) write for upstream's builders
- `data/jsc/cache/cv/` — built CV HTML by payload/template hash, and the gallery's thumbnails; safe to delete
- `data/jsc/cv/ats/<pdf>.json` — the ATS verdict recorded when the console rendered that PDF
- `data/jsc/covers.json` — report → cover-letter PDF
- `data/jsc/tmp/skills-*.json` — the batch a skills session was given and the JSON it wrote back
- `data/skills/` — the skills cache: `postings/` (text by normalized URL), `extractions/` (by
  text hash, so a posting is never sent to Claude twice), `cv.json`, `overrides.json` (your
  have / partial / missing / ignore corrections). Delete the directory to rebuild from scratch.
- `config/cv/style.yml` — CV Studio's style tokens (`config/cv/style.example.yml` documents every key)
- `config/cv/templates/` — your own CV templates (see the README there)

`voice-dna.md` and `writing-samples/` are upstream's own user-layer files; CV Studio
edits and lists them in place.

## CV Studio: structured CVs, the renderer, the ATS guardrail (M5)

A CV's content and its look are separate (PROJECT_PLAN.md §7c). The **content** is upstream's
`build-cv-html.mjs` payload — the JSON `modes/pdf.md` step 17 already has the agent write. A
`pdf` run's session now stops there: it writes `output/cv-<candidate>-<slug>.json`, passes the
fact gate, and the console renders it. Upstream's interactive sessions leave their payloads in
the same place, and M3's runs' payloads are copied there from `data/jsc/tmp/` on first use, so
every past CV with a payload is in the library.

The **render** is deterministic and costs no tokens. `cvrender.js` runs upstream's builder
(spawned; cached by payload + template hash, so a token change never rebuilds), then repeats
what `generate-pdf.mjs` does to a CV, with its own exported functions and in its order — the
console's tokens, profile.yml's section order, `normalizeTextForATS`, profile.yml's `style:`,
page CSS, inlined fonts. A preview is printed on one warm Chromium into memory (~0.3–0.7 s once
warm) and touches neither `output/` nor `data/pdf-index.tsv`; a final render (`cv-render`) goes
through `generate-pdf.mjs`, which owns the manifest and the page budget.

A **theme** is a template file: upstream's `templates/cv-template*.html` or yours in
`config/cv/templates/`. Upstream's `templates/ats/cv-template.ats.html` cannot currently be
filled by `build-cv-html.mjs` (its contact row does not match the builder's); the gallery says
so rather than hiding it.

The **ATS guardrail** (§7d, `ats.js`) runs on every preview, every gallery thumbnail and every
final render. It merges upstream's structural audit (`verify-ats.mjs`: tables, columns, hidden
text, images, headings, contact) with a check of the text pdfjs reads back out of the PDF:
enough real text, the name and email present, every non-empty section's heading present and
in document order, and the share of the CV's own keywords (competencies, skills) still
findable. Any critical finding is a `fail`, shown in red in CV Studio and the report's PDF tab
and logged loudly by the render. Upstream's font and image warnings are kept as advisory
notes, since the PDF half measures what they estimate.
`server/services/__fixtures__/themes/broken.html` is a theme built to fail it.

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
