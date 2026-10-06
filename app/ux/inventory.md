# Capability inventory (M6, method 1)

What the console can do, and where the UI exposes each capability. Measured against the
code on branch `feat/m6-ux-baseline` (PROJECT_PLAN.md §12.2 #1). Nothing here judges the
design; the heuristic evaluation does that.

## How to read this file

- **Row ids** are stable and are cited by findings (`R-…` route, `K-…` run kind, `C-…`
  config/data file, `UI-<page>-<action>` UI action, `U-…` upstream capability).
- **Surfaced at** is `page › area`. Pages are the five nav tabs in
  `app/ui/src/App.jsx` (`PAGES`): Pipeline (the landing page, `#/pipeline`), Sources,
  Skills, Runs, CV Studio.
- **Interactions** count from the landing page (Pipeline), because there is one nav row
  and every page is one click away: each click, each field typed into, and each scroll
  needed to bring an off-screen control into view counts as one. Where the natural place
  to look differs from where the control is, the Notes say so.
- **Discoverable** (the §12.6 metric): **yes** = reachable in ≤ 3 interactions *and*
  labelled in words a job seeker uses; **partly** = one of the two holds; **no** = not
  surfaced in the UI at all.
- Rows marked *plumbing* are mechanisms (streams, thumbnails) that a user never asks for
  by name; they inherit the discoverability of the feature they serve.
- Landing page facts that several rows depend on: with 40 tracker rows the report detail
  (`app/ui/src/components/ReportDetail.jsx`) renders **below** the table, and the
  Maintenance bar (`app/ui/src/components/MaintenanceBar.jsx`) below that
  (`app/ui/src/App.jsx` lines 311–336), so both need a scroll.

## 1. Server routes

Source: `app/server/app.js`. Every route is listed with its exact method and path.

| ID | Route | What it does | Surfaced at | Interactions | Label | Discoverable | Notes |
|---|---|---|---|---|---|---|---|
| R-health | GET /api/health | Data root path, tracker path, row/report/PDF counts, all parse issues | not surfaced | — | — | no — `fetchHealth` in `app/ui/src/api.js` is never called | The UI never shows **which directory** it is reading. A user pointing the console at an existing career-ops folder cannot confirm it. |
| R-pipeline | GET /api/pipeline | Tracker rows joined to reports, status vocabulary, score bands, issues | Pipeline › table | 0 | "Pipeline" (nav), table headers | yes — the landing page | Refreshed on file change via R-events (`REFRESH_ON` in `app/ui/src/App.jsx`). |
| R-reports-list | GET /api/reports | Every report on disk with its Machine Summary | not surfaced | — | — | no — the UI only reaches reports through tracker rows | A report with **no tracker row** (e.g. a manual session that wrote a report but no TSV) is invisible in the UI. |
| R-report | GET /api/reports/:id | One report: header, Machine Summary, rendered A–G prose, PDF/cover/ATS facts, tracker row | Pipeline › click a row › detail below the table | 2 (click row, scroll) | none: the whole row is the control | partly — no visible "open" affordance; detail opens out of view below 40 rows | Also opened by `#/pipeline/<reportId>` deep links from Skills evidence (`app/ui/src/App.jsx` lines 106–116), which auto-scroll. |
| R-report-pdf | GET /api/reports/:id/pdf | Streams the report's tailored CV PDF inline | Pipeline › row › detail › "PDF" tab | 3 | "PDF" ("PDF —" when none) | partly — 3 interactions, but only after finding the hidden detail | Browser PDF viewer only; no explicit download button. |
| R-report-cover | GET /api/reports/:id/cover | Streams the cover-letter PDF inline | Pipeline › row › detail › "Cover letter" tab | 3 | "Cover letter" ("Cover letter —" when none) | partly — same as R-report-pdf | |
| R-cv-style-get | GET /api/cv/style | Saved style tokens, field help, densities, section keys, profile.yml override warnings | CV Studio › "Look — style tokens" form | 1 | "Accent colour", "Body font", … | yes — field labels are plain | |
| R-cv-style-put | PUT /api/cv/style | Validates and saves `config/cv/style.yml` | CV Studio › "Save as default" | 2 | "Save as default" | yes | Also saved implicitly by "Save & render this CV" and "Re-render all in this theme". |
| R-cv-voice-get | GET /api/cv/voice | `voice-dna.md` text, path, upstream template text | CV Studio › "Voice — writing rules" (bottom of page) | 2 (nav, scroll) | "Voice — writing rules" | partly — below the two-column style form and preview; raw markdown in a textarea | §7b's structured `voice.yml` (banned words list, tone, locale) was not built; the file is free text. |
| R-cv-voice-put | PUT /api/cv/voice | Writes `voice-dna.md` | CV Studio › "Save voice rules" | 3 (nav, scroll, click) | "Save voice rules" | partly — reachable, but the user edits raw rule text with no structure | |
| R-cv-templates | GET /api/cv/templates | Lists custom theme files in `config/cv/templates/` | not surfaced | — | — | no — `fetchCvTemplates` is never called | Custom themes still reach the user through the gallery (R-cv-themes), marked "yours". |
| R-cv-writing-samples | GET /api/cv/writing-samples | Lists `writing-samples/` files | CV Studio › Voice › "Writing samples" list | 2 (nav, scroll) | "Writing samples" | partly — read-only list at the bottom of the page | No add/remove/view; see C-writing-samples. |
| R-cv-documents | GET /api/cv/documents | Every structured CV payload in `output/` plus the built-in sample | CV Studio › "CV" select | 2 | "CV" | yes | Labels come from the server (`doc.label`). |
| R-cv-preview | POST /api/cv/preview | Renders a document with unsaved tokens to an in-memory PDF and runs the ATS check | CV Studio › preview pane (automatic on every change) | 1 | theme name + "Rendered in N ms · no agent call" | yes — happens by itself | |
| R-cv-preview-pdf | GET /api/cv/preview/:id | Streams a preview PDF | CV Studio › preview iframe | 1 | — | yes — *plumbing* for R-cv-preview | Expires; the message says "render it again". |
| R-cv-themes | POST /api/cv/themes | Renders every theme with this document and tokens, each with an ATS verdict | CV Studio › "Themes" gallery | 1 | "Themes", "Refresh with these tokens" | yes | Read-only despite POST. |
| R-cv-render-all | POST /api/cv/render-all | Queues one `cv-render` per CV that belongs to a report | CV Studio › "Re-render all in this theme" | 2 | "Re-render all in this theme" | partly — clear label, but outcomes only appear on the Runs page ("follow them on the Runs page") | Browser `confirm()` dialog first. |
| R-cv-thumbs | GET /api/cv/thumbs/:key | Theme thumbnail PNGs | CV Studio › gallery images | 1 | — | yes — *plumbing* for R-cv-themes | |
| R-skills | GET /api/skills | Coverage, ranked skills with evidence, learn/deepen/demanded lists, CV skills | Skills page | 1 | "Skills" (nav), "Learn next" | yes | |
| R-skills-extract | POST /api/skills/extract | Queues up to 5 `skills-extract` batches plus `skills-cv` when stale | Skills › extract button | 2 | "Read N postings with Claude (N sessions)" / "Read the CV with Claude" | partly — label changes with state; cost and effect explained only in a tooltip | The `max` option (0–50) is fixed at the default 5 by the UI; "click again when these finish". |
| R-skills-overrides | PUT /api/skills/overrides | Sets or clears a skill's have/partial/missing/ignore status | Skills › row status select, "reset" | 2 | "Have" / "Partial" / "Missing" / "Ignore" | yes | |
| R-status | PATCH /api/pipeline/rows/:id/status | Changes a tracker row's status through upstream `set-status.mjs` | Pipeline › Status cell select | 1 | status name (aria: "Status for <company>") | yes | The route also accepts `note` and `on` (date); the UI sends neither, so a status change cannot carry a note or a back-dated date. |
| R-inbox | GET /api/inbox | Pending/processed inbox entries plus the last scan's counters | Sources › "N URL(s) waiting to be evaluated" › "Show the inbox" | 2–3 | "Show the inbox" | partly — the inbox is filled from the Pipeline page but shown only on Sources, collapsed | The Processed section is never shown. |
| R-inbox-add | POST /api/inbox/urls | Appends a URL to `data/pipeline.md`; with `evaluate` also queues `evaluate` | Pipeline › paste box | 2 (type, click) | "Paste a job posting URL…", "Evaluate now", "Add to inbox" | yes | |
| R-agent-status | GET /api/agent/status | Whether the Claude CLI was found, cv.md present, profile facts, max agents | everywhere agent buttons are | 0 | disabled-button reasons, "PDF if score ≥ 3.5" | yes — *plumbing* | The CLI path, spend tier, language and concurrency are fetched but never displayed; they only surface as a disabled-button tooltip or a warning notice. |
| R-portals | GET /api/portals | Companies, boards, filters, providers, scan methods, health, issues | Sources › "Tracked companies", "Job boards" | 1 | "Sources" (nav) | yes | |
| R-portals-create | POST /api/portals/entries | Adds a company or board to `portals.yml` | Sources › "Add" › form › "Add source" | 3 (nav, Add, submit) + typing | "Add", "Add source" | yes | Refused when `portals.yml` does not exist (`editable: false` in `app/server/services/portals.js` line 273): the first-run user cannot add a source. |
| R-portals-update | PATCH /api/portals/entries/:kind/:index | Edits or enables/disables one entry | Sources › "On" checkbox, "Edit" › "Save" | 2 | "On", "Edit", "Save" | yes | |
| R-portals-delete | DELETE /api/portals/entries/:kind/:index | Removes one entry | Sources › "Remove" | 2 | "Remove" | yes | No confirmation; `portals.yml.bak` keeps the previous file. |
| R-runs | GET /api/runs | Queued/active/recent runs plus the non-internal kind table | Runs page | 1 | "Runs" (nav) | partly — "Runs" is engineering vocabulary | The kind table feeds every run button's label and help. |
| R-runs-start | POST /api/runs | Starts any non-internal kind (with dry-run and confirm token) | every run button (see table 2) | 1–3 | per kind | yes — through the kind's own button | |
| R-run | GET /api/runs/:id | One run's record | not surfaced | — | — | no — the UI follows runs through R-run-events instead | Used only by `app/ux/sandbox.mjs`. Redundant for the UI. |
| R-run-cancel | POST /api/runs/:id/cancel | Cancels a queued or running run | run panel "Cancel"; Runs › row "Cancel" | 1–2 | "Cancel" | yes | |
| R-run-events | GET /api/runs/:id/events | SSE: replayed then live log, progress, done | every run panel | 0 | — | yes — *plumbing* | |
| R-events | GET /api/events | SSE: file changes and run transitions | whole app (`app/ui/src/useServerEvents.js`) | 0 | "Not connected to the server’s event feed…" (Runs page, only when down) | yes — *plumbing* | |
| R-scan-summary | GET /api/scan/summary | Last scan's structured counters | not surfaced | — | — | no — the same counters arrive through R-inbox | Shown on Sources as "last scan …: N found, N added, N duplicate(s)". |
| R-static | GET /* (static files and SPA fallback) | Serves `app/ui/dist` and `index.html` for client routes; JSON 404 under `/api/` | the app itself | 0 | — | yes — *plumbing* | Hash routes: `#/pipeline/<reportId>`, `#/runs/<id>`. |

## 2. Run kinds

Source: `RUN_KINDS` in `app/server/queue/specs.js`. "Internal" kinds are queued by the
server after another run and refused from a request.

| ID | Kind | Internal | Spec label | UI label | Surfaced at | Interactions | Discoverable | Notes |
|---|---|---|---|---|---|---|---|---|
| K-scan | scan | no | Scan portals | "Scan now" | Sources › scan box | 2 | yes — plain verb on the page that lists the companies | Options: "Preview only", "Verify each posting is live", "Only this company…", "Last N days". Chains `skills-fetch-auto`. |
| K-dedup | dedup | no | Dedup tracker | "Dedup tracker · preview first" | Pipeline › Maintenance bar (below table and detail) | 2 (scroll, click) + confirm | partly — buried below 40 rows; "Dedup tracker" is tool vocabulary | Dry run first; real run via "Run dedup tracker for real". |
| K-reconcile | reconcile | no | Reconcile inbox | "Reconcile inbox · preview first" | Pipeline › Maintenance bar | 2 + confirm | partly — buried; jargon | Dry run first. |
| K-verify-pipeline | verify-pipeline | no | Check integrity | "Check integrity" | Pipeline › Maintenance bar | 2 | partly — buried | "Found problems" outcome means it worked. |
| K-validate-portals | validate-portals | no | Validate sources | "Validate sources" | Pipeline › Maintenance bar | 3 from Sources (nav, scroll, click) | partly — about sources but not on the Sources page | |
| K-verify-portals | verify-portals | no | Probe sources | "Probe sources" | Pipeline › Maintenance bar | 3 from Sources | partly — Sources' help text says "Run Probe sources" for a gone board, yet the button is on another page | |
| K-skills-fetch | skills-fetch | no | Fetch posting text | "Fetch posting text", "Retry N failed" | Skills › toolbar | 2 | yes | `limit` option not surfaced. |
| K-cv-render | cv-render | no | Render CV | "Render this CV" / "Save & render this CV"; "Re-render all in this theme" | CV Studio › preview actions | 2 | yes | Also chained after every `pdf` run. ATS verdict shown in the run log and on the report's PDF tab. |
| K-evaluate | evaluate | no | Evaluate posting | "Evaluate now"; row "Evaluate"/"Re-evaluate"; inbox "Evaluate" | Pipeline › paste box and rows; Sources › inbox | 1–2 | yes — though "evaluate" is not explained for a first-timer except in the "What happens…" disclosure | `model` option not surfaced. Run label is "Evaluate <hostname>". |
| K-pdf | pdf | no | Generate PDF | row "PDF" / "PDF ↻"; detail "Generate PDF" / "Regenerate PDF"; "PDF if score ≥ 3.5" | Pipeline › row actions, detail | 1 | partly — the row label "PDF" does not say it writes a *tailored CV* | `format` (letter/A4), `model` and the legacy HTML path (`structured: false`) are not surfaced. |
| K-cover | cover | no | Cover letter | row "Cover"; detail "Cover letter" | Pipeline › row actions, detail › dialog | 1 + dialog | yes | Four answers required; submitting jumps to the Runs page. |
| K-skills-extract | skills-extract | no | Extract skills | "Read N postings with Claude (N sessions)" | Skills › toolbar | 2 | partly — label varies with state; disabled with no visible reason when nothing is pending | Started through R-skills-extract, not R-runs-start. |
| K-skills-cv | skills-cv | no | Extract CV skills | "Read the CV with Claude" (only when no posting is pending); otherwise folded into the extract button | Skills › toolbar | 2 | partly — not separately addressable | |
| K-merge-tracker | merge-tracker | yes | Merge tracker additions | Runs row "Merge tracker additions" | Runs › Finished | 1 (to see it) | partly — automatic by design; visible only as a Runs row | Queued after a successful `evaluate`. |
| K-reconcile-auto | reconcile-auto | yes | Reconcile inbox | Runs row "Reconcile inbox" | Runs › Finished | 1 | partly — automatic; shares its label with the manual `reconcile` | Queued after `merge-tracker`. |
| K-skills-fetch-auto | skills-fetch-auto | yes | Fetch posting text | Runs row "Fetch posting text"; Skills button shows "Fetching… n/N" | Runs; Skills | 1 | partly — automatic | Queued after every real scan. |
| K-mark-pdf-ready | mark-pdf-ready | yes | Mark PDF ready | Runs row "Mark PDF ready" | Runs › Finished | 1 | partly — automatic | Flips the tracker's PDF column after a render. |

## 3. Config and data files

Sources: `app/server/services/`, `app/server/agents/profile.js`, `app/server/skills/store.js`,
upstream `AGENTS.md` ("Main Files", "Data Contract") and `DATA_CONTRACT.md`.

| ID | File | What it is for | Read by the UI | Written by the UI | Surfaced at | Interactions | Discoverable | Notes |
|---|---|---|---|---|---|---|---|---|
| C-cv-md | cv.md | The canonical CV; source of every fact in reports, PDFs, letters, skills | only its presence and skill count | **no** | Skills › coverage line "CV: N skills…" / "no cv.md found"; agent buttons' disabled reason "No cv.md in the data directory yet" | — | no — **unsurfaced**: cannot be created, viewed or edited | No Profile page (§5 page 4; moved to M8). A first-run user has no way to put a CV in. |
| C-profile-yml | config/profile.yml | Identity, target roles, comp, location, `cv.auto_pdf_score_threshold`, `spend_tier`, `language` | threshold, override warnings | **no** | Pipeline › "PDF if score ≥ 3.5"; CV Studio › warning "config/profile.yml overrides some of these settings." | — | no — **unsurfaced** | The CV Studio warning tells the user to remove keys from a file the UI cannot edit. |
| C-portals-yml | portals.yml | Companies, job boards, title/location/salary filters for the scanner | yes | entries only | Sources | 1 | partly — entries editable; **filters read-only** ("Filters (N blocks, read-only)"); file cannot be created when missing | Writes are surgical and validated by `validate-portals.mjs`; `.bak` kept. |
| C-style-yml | config/cv/style.yml | CV Studio tokens and selected theme | yes | yes | CV Studio › "Look — style tokens", "Themes" | 1 | yes | |
| C-voice-dna-md | voice-dna.md | Writing guardrail inlined into PDF and cover sessions | yes | yes | CV Studio › "Voice — writing rules" | 2 | partly — bottom of CV Studio, raw markdown | A user thinking about cover letters may not look in "CV Studio". |
| C-writing-samples | writing-samples/ | The user's own writing, for tone calibration | names, sizes, dates | **no** | CV Studio › "Writing samples" list | 2 | no — **unsurfaced** for adding, viewing or removing; the page says to drop files into the folder | |
| C-cv-templates | config/cv/templates/ | User-supplied HTML themes | through the gallery | **no** | CV Studio › gallery card badge "yours"; hint text | 1 | partly — advanced mode by design (§7a); file system only | |
| C-applications-md | data/applications.md | The tracker | yes | status only | Pipeline › table, Status cell | 0 | yes | Notes, manual rows (upstream `add`), deletion: **unsurfaced**. |
| C-pipeline-md | data/pipeline.md | The inbox of pending URLs | pending only | append only | Pipeline › "Add to inbox"; Sources › "Show the inbox" | 2–3 | partly — written on one page, read on another, collapsed | Removing an entry and seeing Processed: **unsurfaced**. |
| C-reports | reports/ | A–G evaluation reports | yes | via `evaluate` | Pipeline › row › detail | 2 | partly — detail opens out of view | Reports without a tracker row are invisible (R-reports-list). |
| C-output | output/ | Tailored CV PDFs and JSON payloads, cover letters | yes | via `pdf`, `cv-render`, `cover` | Pipeline › detail tabs; CV Studio › "CV" select | 3 | partly — viewer only, no download/list of files | |
| C-data-skills | data/skills/ | Posting text cache, extractions, CV skills, overrides | yes | overrides, runs | Skills | 1 | yes | Nothing upstream reads it. |
| C-modes-profile-md | modes/_profile.md | Archetypes, narrative, scoring targeting read by every evaluation | no | no | not surfaced | — | no — **unsurfaced** | Upstream says an unedited one scores offers "against a stranger's targeting" (AGENTS.md, First Run). |
| C-article-digest-md | article-digest.md | Proof points that are a primary fact source | no | no | only named in CV Studio's help text | — | no — **unsurfaced** | |
| C-blacklist-md | data/blacklist.md | Do-not-apply companies respected by scan and evaluate | no | no | not surfaced | — | no — **unsurfaced** | |
| C-scan-data | data/scan-history.tsv, data/scan-runs.tsv, data/portal-health.tsv | Scan dedup history, per-run counters, per-board health | counters, health | via `scan` | Sources › "last scan …" line, "Last seen" column | 1 | partly — last scan only; no history | |
| C-data-jsc | data/jsc/ | Console's own state: run transcripts and prompts, covers index, ATS records | covers, ATS records | yes | Runs › log; detail ATS verdict; paths named in "How runs work" | 2 | partly — transcripts and prompts only as file paths | |
| C-status-log | data/status-log.tsv | Status-change ledger appended by `set-status.mjs` | no | indirectly | not surfaced | — | no — **unsurfaced** | §5 page 2 asks for "status history" on the job detail. |

## 4. UI actions

Source: `app/ui/src/`. Labels are exactly as rendered (`<n>` = a number, `<name>` = data).

### Global (navigation, toast)

| ID | Label | Type | Component | Surfaced at | Interactions | Discoverable | Notes |
|---|---|---|---|---|---|---|---|
| UI-nav-pipeline | "Pipeline" | tab | app/ui/src/App.jsx | masthead | 0–1 | yes — landing page | Header title "Job Search Console" is not a home link. |
| UI-nav-sources | "Sources" | tab | app/ui/src/App.jsx | masthead | 1 | yes | |
| UI-nav-skills | "Skills" | tab | app/ui/src/App.jsx | masthead | 1 | yes | |
| UI-nav-runs | "Runs" | tab | app/ui/src/App.jsx | masthead | 1 | partly — engineering word | |
| UI-nav-cv | "CV Studio" | tab | app/ui/src/App.jsx | masthead | 1 | yes | |
| UI-global-toast-open-log | "Open log" | button | app/ui/src/App.jsx | toast after a run starts (Pipeline, Sources, Skills) | 1 | partly — disappears after 6 s | Not shown on Runs or CV Studio. |
| UI-global-toast-dismiss | "×" | button | app/ui/src/App.jsx | toast | 1 | yes | |

### Pipeline page

| ID | Label | Type | Component | Surfaced at | Interactions | Discoverable | Notes |
|---|---|---|---|---|---|---|---|
| UI-pipeline-url | "Paste a job posting URL…" | field | app/ui/src/components/AddJobBox.jsx | Pipeline › top | 1 | yes | |
| UI-pipeline-evaluate-now | "Evaluate now" | button (form submit) | app/ui/src/components/AddJobBox.jsx | Pipeline › top | 2 | yes | Disabled until a valid URL and agent ready; log streams in a panel below. |
| UI-pipeline-add-to-inbox | "Add to inbox" | button | app/ui/src/components/AddJobBox.jsx | Pipeline › top | 2 | partly — the inbox it fills is only visible on Sources | |
| UI-pipeline-autopdf | "PDF if score ≥ 3.5" | checkbox | app/ui/src/components/AddJobBox.jsx | Pipeline › top | 1 | partly — says "PDF", means a tailored CV; meaning in tooltip only | Threshold read from profile.yml (3.0 when absent). |
| UI-pipeline-addjob-help | "What happens when I click Evaluate now?" | disclosure | app/ui/src/components/AddJobBox.jsx | Pipeline › top | 1 | yes | |
| UI-pipeline-issues | "<n> data issue(s) found" | disclosure | app/ui/src/App.jsx | Pipeline › above toolbar (only with issues) | 1 | partly — lists raw codes like `status-unknown` | No action offered to fix them. |
| UI-pipeline-status-filter | "All", "<status> <n>" | filter chips | app/ui/src/App.jsx | Pipeline › toolbar | 1 | yes | Only statuses present get a chip. |
| UI-pipeline-score-filter | "Score": "Any", "Auto-CV (≥ 3.5)", "Manual review (3.0–3.49)", "Below threshold (< 3.0)" | select | app/ui/src/App.jsx | Pipeline › toolbar | 1 | partly — band names are upstream jargon | Band edges are fixed in `app/server/services/pipeline.js`, not the profile threshold. |
| UI-pipeline-search | "Filter company, role, notes…" | field | app/ui/src/App.jsx | Pipeline › toolbar | 1 | yes | |
| UI-pipeline-sort | "#", "Date", "Company", "Role", "Score", "Status", "Decision" | sortable headers | app/ui/src/components/PipelineTable.jsx | Pipeline › table header | 1 | partly — no affordance besides the "↓" on the default Score sort | "Comp" and "PDF" are not sortable. |
| UI-pipeline-open-row | (whole row) | row click | app/ui/src/components/PipelineTable.jsx | Pipeline › table | 2 (click, scroll) | partly — no visible affordance; result renders below the table | |
| UI-pipeline-status-cell | "<status>" (aria "Status for <company>") | inline select | app/ui/src/components/StatusCell.jsx | Pipeline › Status column | 1 | yes | Optimistic with rollback; "!" on error. |
| UI-pipeline-row-evaluate | "Evaluate" / "Re-evaluate" | button | app/ui/src/components/RowActions.jsx | Pipeline › row actions | 1 | yes | |
| UI-pipeline-row-pdf | "PDF" / "PDF ↻" | button | app/ui/src/components/RowActions.jsx | Pipeline › row actions | 1 | partly — does not say "tailored CV"; "↻" unexplained | |
| UI-pipeline-row-cover | "Cover" | button | app/ui/src/components/RowActions.jsx | Pipeline › row actions | 1 | yes | Opens the cover-letter dialog. |
| UI-pipeline-detail-posting-link | "<posting URL>" | link | app/ui/src/components/ReportDetail.jsx | Pipeline › detail header | 3 | partly — inside the hidden detail | |
| UI-pipeline-detail-tab-report | "Report" | tab | app/ui/src/components/ReportDetail.jsx | Pipeline › detail | 3 | partly — inside the hidden detail | |
| UI-pipeline-detail-tab-pdf | "PDF" / "PDF —" | tab | app/ui/src/components/ReportDetail.jsx | Pipeline › detail | 3 | partly | Shows the ATS verdict above the PDF. |
| UI-pipeline-detail-tab-cover | "Cover letter" / "Cover letter —" | tab | app/ui/src/components/ReportDetail.jsx | Pipeline › detail | 3 | partly | |
| UI-pipeline-detail-reevaluate | "Re-evaluate" | button | app/ui/src/components/RowActions.jsx | Pipeline › detail actions | 3 | partly | |
| UI-pipeline-detail-pdf | "Generate PDF" / "Regenerate PDF" | button | app/ui/src/components/RowActions.jsx | Pipeline › detail actions | 3 | partly | |
| UI-pipeline-detail-cover | "Cover letter" | button | app/ui/src/components/RowActions.jsx | Pipeline › detail actions | 3 | partly | |
| UI-pipeline-detail-run-badges | "<run label>: <outcome>" | buttons | app/ui/src/components/ReportDetail.jsx | Pipeline › detail actions | 3 | partly — look like badges, act as links to the Runs log | |
| UI-pipeline-cover-dialog | "Cover letter for <company>" | dialog | app/ui/src/components/CoverLetterDialog.jsx | over Pipeline | 1 | yes | Backdrop click closes it (answers lost). |
| UI-pipeline-cover-why | "A. Why this role / company?" | field | app/ui/src/components/CoverLetterDialog.jsx | cover dialog | 2 | yes | Required. |
| UI-pipeline-cover-problem | "B. What problem would you solve for them?" | field | app/ui/src/components/CoverLetterDialog.jsx | cover dialog | 2 | yes | Required. |
| UI-pipeline-cover-approach | "C. How would you approach it?" | field | app/ui/src/components/CoverLetterDialog.jsx | cover dialog | 2 | yes | Required. |
| UI-pipeline-cover-tone | "D. Tone" | select | app/ui/src/components/CoverLetterDialog.jsx | cover dialog | 2 | yes | Default "Mirror the posting". |
| UI-pipeline-cover-submit | "Draft and render the letter" | button | app/ui/src/components/CoverLetterDialog.jsx | cover dialog | 2 (+3 fields) | yes | Navigates to the Runs page on success. |
| UI-pipeline-cover-cancel | "Cancel" | button | app/ui/src/components/CoverLetterDialog.jsx | cover dialog | 2 | yes | |
| UI-pipeline-maint-dedup | "Dedup tracker · preview first" | button | app/ui/src/components/MaintenanceBar.jsx | Pipeline › Maintenance bar (bottom) | 2 | partly — buried; jargon | |
| UI-pipeline-maint-reconcile | "Reconcile inbox · preview first" | button | app/ui/src/components/MaintenanceBar.jsx | Pipeline › Maintenance bar | 2 | partly | |
| UI-pipeline-maint-verify | "Check integrity" | button | app/ui/src/components/MaintenanceBar.jsx | Pipeline › Maintenance bar | 2 | partly | |
| UI-pipeline-maint-validate | "Validate sources" | button | app/ui/src/components/MaintenanceBar.jsx | Pipeline › Maintenance bar | 2 | partly — belongs with Sources | |
| UI-pipeline-maint-probe | "Probe sources" | button | app/ui/src/components/MaintenanceBar.jsx | Pipeline › Maintenance bar | 2 | partly — belongs with Sources | |
| UI-pipeline-maint-help | "What do these do?" | disclosure | app/ui/src/components/MaintenanceBar.jsx | Pipeline › Maintenance bar | 2 | partly | |
| UI-pipeline-maint-confirm | "Run dedup tracker for real" / "Run reconcile inbox for real" | button | app/ui/src/components/RunPanel.jsx | Maintenance run panel, after a preview | 3 | partly — appears only after a successful preview | One preview authorises one run for ten minutes. |
| UI-pipeline-maint-discard | "Discard" | button | app/ui/src/components/RunPanel.jsx | Maintenance run panel, after a preview | 3 | partly | |

### Shared run panel

| ID | Label | Type | Component | Surfaced at | Interactions | Discoverable | Notes |
|---|---|---|---|---|---|---|---|
| UI-shared-run-cancel | "Cancel" | button | app/ui/src/components/RunPanel.jsx | every run panel (paste box, Maintenance, Sources scan, CV Studio render, Runs) | 1 | yes | |
| UI-shared-run-close | "Close" | button | app/ui/src/components/RunPanel.jsx | every finished run panel | 1 | yes | |

### Sources page

| ID | Label | Type | Component | Surfaced at | Interactions | Discoverable | Notes |
|---|---|---|---|---|---|---|---|
| UI-sources-scan | "Scan now" | button | app/ui/src/components/SourcesPage.jsx | Sources › scan box | 2 | yes | |
| UI-sources-preview-only | "Preview only" | checkbox | app/ui/src/components/SourcesPage.jsx | Sources › scan box | 2 | yes | |
| UI-sources-verify | "Verify each posting is live" | checkbox | app/ui/src/components/SourcesPage.jsx | Sources › scan box | 2 | yes | |
| UI-sources-company | "Only this company…" | field | app/ui/src/components/SourcesPage.jsx | Sources › scan box | 2 | yes | |
| UI-sources-since | "Last N days" | field | app/ui/src/components/SourcesPage.jsx | Sources › scan box | 2 | yes | |
| UI-sources-scan-help | "What the scan options do" | disclosure | app/ui/src/components/SourcesPage.jsx | Sources › scan box | 2 | yes | |
| UI-sources-inbox-toggle | "Show the inbox" (under "<n> URL(s) waiting to be evaluated") | disclosure | app/ui/src/components/SourcesPage.jsx | Sources › scan box | 2 | partly — collapsed; not where pasted URLs go from | Only rendered when the inbox has pending items. |
| UI-sources-inbox-link | "<posting title>" | link | app/ui/src/components/SourcesPage.jsx | Sources › inbox list | 3 | partly | Opens the posting in a new tab. |
| UI-sources-inbox-evaluate | "Evaluate" | button | app/ui/src/components/SourcesPage.jsx | Sources › inbox list | 3 | partly — the only "evaluate a pending posting" control, on the Sources page | No "evaluate all"; failed items ("[!]") show the error text. |
| UI-sources-help | "How sources work" | disclosure | app/ui/src/components/SourcesPage.jsx | Sources | 2 | yes | |
| UI-sources-issues | "<n> issue(s) in portals.yml" | disclosure | app/ui/src/components/SourcesPage.jsx | Sources › top (only with issues) | 2 | partly — file jargon | In `empty` this is the only sign the file is missing. |
| UI-sources-add-company | "Add" (Tracked companies) | button | app/ui/src/components/SourcesPage.jsx | Sources › Tracked companies header | 2 | partly — the form opens below *both* tables, off screen | Disabled when portals.yml is missing or drifted. |
| UI-sources-add-board | "Add" (Job boards) | button | app/ui/src/components/SourcesPage.jsx | Sources › Job boards header | 2 | yes | Same disabled rule. |
| UI-sources-toggle | "On" checkbox (aria "Include <name> in scans") | inline edit | app/ui/src/components/SourcesPage.jsx | Sources › tables | 2 | yes | Saves immediately. |
| UI-sources-edit | "Edit" | button | app/ui/src/components/SourcesPage.jsx | Sources › tables | 2 | partly — form opens at the bottom of the page | |
| UI-sources-remove | "Remove" | button | app/ui/src/components/SourcesPage.jsx | Sources › tables | 2 | yes | No confirmation. |
| UI-sources-filters | "Filters (<n> blocks, read-only)" | disclosure | app/ui/src/components/SourcesPage.jsx | Sources › bottom | 2 | partly — raw JSON, read-only | |
| UI-sources-form-name | "Name" | field | app/ui/src/components/PortalEntryForm.jsx | Sources › entry form | 3 | yes | |
| UI-sources-form-careers-url | "Careers URL" | field | app/ui/src/components/PortalEntryForm.jsx | Sources › entry form | 3 | yes | |
| UI-sources-form-provider | "Provider" ("Detect from the careers URL") | select | app/ui/src/components/PortalEntryForm.jsx | Sources › entry form | 3 | partly — provider ids are internal names | |
| UI-sources-form-api | "API endpoint" | field | app/ui/src/components/PortalEntryForm.jsx | Sources › entry form | 3 | partly — jargon | |
| UI-sources-form-scan-method | "Scan method" | select | app/ui/src/components/PortalEntryForm.jsx | Sources › entry form | 3 | partly — jargon (`websearch`, `local_parser`) | |
| UI-sources-form-query | "Search query" | field | app/ui/src/components/PortalEntryForm.jsx | Sources › entry form | 3 | partly — only used with websearch, which scans never fetch | |
| UI-sources-form-notes | "Notes" | field | app/ui/src/components/PortalEntryForm.jsx | Sources › entry form | 3 | yes | |
| UI-sources-form-enabled | "Include in scans" | checkbox | app/ui/src/components/PortalEntryForm.jsx | Sources › entry form | 3 | yes | |
| UI-sources-form-submit | "Add source" / "Save" | button | app/ui/src/components/PortalEntryForm.jsx | Sources › entry form | 3 | yes | |
| UI-sources-form-cancel | "Cancel" | button | app/ui/src/components/PortalEntryForm.jsx | Sources › entry form | 3 | yes | |

### Skills page

| ID | Label | Type | Component | Surfaced at | Interactions | Discoverable | Notes |
|---|---|---|---|---|---|---|---|
| UI-skills-fetch | "Fetch posting text" | button | app/ui/src/components/SkillsPage.jsx | Skills › toolbar | 2 | yes | |
| UI-skills-retry | "Retry <n> failed" | button | app/ui/src/components/SkillsPage.jsx | Skills › toolbar (only with failures) | 2 | yes | |
| UI-skills-extract | "Read <n> postings with Claude (<n> sessions)" / "Read the CV with Claude" / "Everything read by Claude" | button | app/ui/src/components/SkillsPage.jsx | Skills › toolbar | 2 | partly — state-dependent label; spends sessions | |
| UI-skills-run-log | "Open the run log" | link | app/ui/src/components/SkillsPage.jsx | Skills › toolbar (only while a skills run is active) | 2 | partly | |
| UI-skills-help | "How this page works" | disclosure | app/ui/src/components/SkillsPage.jsx | Skills › head | 2 | yes | |
| UI-skills-tab-learn | "Learn next" | tab | app/ui/src/components/SkillsPage.jsx | Skills › tabs (default) | 1 | yes | |
| UI-skills-tab-deepen | "Deepen" | tab | app/ui/src/components/SkillsPage.jsx | Skills › tabs | 2 | yes | |
| UI-skills-tab-demanded | "Most demanded" | tab | app/ui/src/components/SkillsPage.jsx | Skills › tabs | 2 | yes | |
| UI-skills-strong | "Jobs I’d apply to" | checkbox filter | app/ui/src/components/SkillsPage.jsx | Skills › tabs row | 2 | yes | Means "postings scored ≥ 4.0" (tooltip). |
| UI-skills-show-ignored | "Show ignored" | checkbox filter | app/ui/src/components/SkillsPage.jsx | Skills › tabs row (Most demanded only) | 3 | partly | |
| UI-skills-category | "Any category" | select | app/ui/src/components/SkillsPage.jsx | Skills › tabs row | 2 | yes | |
| UI-skills-search | "Find a skill…" | field | app/ui/src/components/SkillsPage.jsx | Skills › tabs row | 2 | yes | |
| UI-skills-expand | "▸ <skill>" | disclosure | app/ui/src/components/SkillsPage.jsx | Skills › table rows | 2 | partly — the evidence is behind a triangle that reads as text | No column sorting in this table. |
| UI-skills-status | "Have" / "Partial" / "Missing" / "Ignore" | inline select | app/ui/src/components/SkillsPage.jsx | Skills › Status column | 2 | yes | |
| UI-skills-reset | "reset" | button | app/ui/src/components/SkillsPage.jsx | Skills › Status column (overridden rows) | 2 | yes | |
| UI-skills-evidence-posting | "posting ↗" | link | app/ui/src/components/SkillsPage.jsx | Skills › expanded evidence | 3 | yes | |
| UI-skills-evidence-report | "report <nnn>" | link | app/ui/src/components/SkillsPage.jsx | Skills › expanded evidence ("flagged as a gap in report <nnn>" and per posting) | 3 | yes | Deep-links to `#/pipeline/<reportId>`. |
| UI-skills-cooccur | "Often asked for together with:" + "<skill> <n>" chips | buttons | app/ui/src/components/SkillsPage.jsx | Skills › expanded evidence | 3 | partly | Jumps to Most demanded. |

### Runs page

| ID | Label | Type | Component | Surfaced at | Interactions | Discoverable | Notes |
|---|---|---|---|---|---|---|---|
| UI-runs-open | (row: "Status", "Run", "About", "Lane", "Time", "Started") | row click | app/ui/src/components/RunsPage.jsx | Runs › Running / Waiting / Finished | 2 | partly — opens the log at the **top** of the page, away from the clicked row | **No retry** for a failed run; no filter; history lost on restart (60 kept). |
| UI-runs-cancel | "Cancel" | button | app/ui/src/components/RunsPage.jsx | Runs › live rows | 2 | yes | |
| UI-runs-help | "How runs work" | disclosure | app/ui/src/components/RunsPage.jsx | Runs › bottom | 2 | partly — lanes, `JSC_MAX_AGENTS`, file paths | |

### CV Studio page

| ID | Label | Type | Component | Surfaced at | Interactions | Discoverable | Notes |
|---|---|---|---|---|---|---|---|
| UI-cv-document | "CV" | select | app/ui/src/components/CvStudioPage.jsx | CV Studio › top bar | 2 | yes | Includes a fictional sample for previews. |
| UI-cv-accent | "Accent colour" | colour picker + field | app/ui/src/components/CvStudioPage.jsx | CV Studio › Look form | 2 | yes | |
| UI-cv-body-font | "Body font" | field + suggestions | app/ui/src/components/CvStudioPage.jsx | CV Studio › Look form | 2 | yes | |
| UI-cv-heading-font | "Heading font" | field + suggestions | app/ui/src/components/CvStudioPage.jsx | CV Studio › Look form | 2 | yes | |
| UI-cv-font-size | "Font size" | field | app/ui/src/components/CvStudioPage.jsx | CV Studio › Look form | 2 | yes | |
| UI-cv-margin | "Page margin" | field | app/ui/src/components/CvStudioPage.jsx | CV Studio › Look form | 2 | yes | |
| UI-cv-density | "Density" | select | app/ui/src/components/CvStudioPage.jsx | CV Studio › Look form | 2 | yes | |
| UI-cv-section-add | "Add a section to order…" | select | app/ui/src/components/CvStudioPage.jsx | CV Studio › Section order | 2 | partly — one section alone does nothing | |
| UI-cv-section-move | "↑" / "↓" | buttons | app/ui/src/components/CvStudioPage.jsx | CV Studio › Section order | 3 | partly — icon-only (tooltips "Move up"/"Move down") | |
| UI-cv-section-remove | "×" | button | app/ui/src/components/CvStudioPage.jsx | CV Studio › Section order | 3 | partly — icon-only ("Leave where the template puts it") | |
| UI-cv-save | "Save as default" | button | app/ui/src/components/CvStudioPage.jsx | CV Studio › Look form | 2 | yes | |
| UI-cv-revert | "Revert" | button | app/ui/src/components/CvStudioPage.jsx | CV Studio › Look form | 2 | yes | |
| UI-cv-themes-refresh | "Refresh with these tokens" | button | app/ui/src/components/CvStudioPage.jsx | CV Studio › Themes | 2 | partly — "tokens" | |
| UI-cv-theme-pick | "<theme name>" card with "ATS pass" / "ATS ok · <n> warnings" / "ATS fail · <n> critical", "yours" | toggle buttons | app/ui/src/components/CvStudioPage.jsx | CV Studio › Themes | 2 | yes | Picking changes the form, not the saved style. |
| UI-cv-render | "Render this CV" / "Save & render this CV" | button | app/ui/src/components/CvStudioPage.jsx | CV Studio › preview actions | 2 | yes | Disabled for the sample. |
| UI-cv-render-all | "Re-render all in this theme" | button | app/ui/src/components/CvStudioPage.jsx | CV Studio › preview actions | 2 | yes | |
| UI-cv-render-all-confirm | "Re-render all <n> CVs that belong to a report in “<theme>”?…" | browser confirm dialog | app/ui/src/components/CvStudioPage.jsx | CV Studio | 3 | yes | |
| UI-cv-ats-notes | "<n> advisory note(s)" | disclosure | app/ui/src/components/AtsVerdict.jsx | CV Studio › preview verdict | 3 | partly | The verdict itself ("ATS check passed" / "…failed — an applicant-tracking system will lose part of this CV") is always visible. |
| UI-cv-voice-text | voice textarea ("No voice-dna.md yet. Seed it from upstream's template, or write your own rules.") | field | app/ui/src/components/CvStudioPage.jsx | CV Studio › Voice (bottom) | 2 | partly — bottom of a long page; raw markdown | |
| UI-cv-voice-save | "Save voice rules" | button | app/ui/src/components/CvStudioPage.jsx | CV Studio › Voice | 3 | yes | |
| UI-cv-voice-seed | "Seed from template" | button | app/ui/src/components/CvStudioPage.jsx | CV Studio › Voice (only when the upstream template exists) | 3 | partly — "seed" | |
| UI-cv-samples | "Writing samples" list | read-only list | app/ui/src/components/CvStudioPage.jsx | CV Studio › Voice | 2 | partly — read-only; adding needs the file system | |
| UI-cv-help | "Content, look, voice and the ATS check — what each changes" | disclosure | app/ui/src/components/CvStudioPage.jsx | CV Studio › bottom | 2 | partly | |
| UI-cv-profile-warning | "config/profile.yml overrides some of these settings." | notice | app/ui/src/components/CvStudioPage.jsx | CV Studio › top (only when profile.yml sets `style`, `cv.sections` or `cv.template`) | 1 | partly — asks for an edit the UI cannot make | |

## 5. Upstream capabilities a career-ops user expects

Source: upstream `AGENTS.md` ("Skill Modes", "Main Files") and `modes/README.md`. Not part
of the discoverability metric; listed so P1's expectations can be checked.

| ID | Upstream command or script | What it does | Console equivalent |
|---|---|---|---|
| U-oferta | `/career-ops oferta`, auto-pipeline (paste a URL) | Evaluate one offer, write report and tracker row | K-evaluate ("Evaluate now") — yes |
| U-pdf | `pdf` | Tailored ATS CV PDF | K-pdf + K-cv-render — yes |
| U-cover | `cover` | Cover letter | K-cover — yes |
| U-scan | `scan` | Portal scanner | K-scan — yes |
| U-tracker | `tracker` | Tracker overview | Pipeline page — yes |
| U-pipeline | `pipeline` | Process every pending inbox URL | partial — per-item "Evaluate" on Sources; **no "process all"** |
| U-batch | `batch` | Mass processing with headless workers | **none** |
| U-upskill | `upskill`, `upskill.mjs`, `jd-skill-gap.mjs` | Skill-gap analysis | Skills page (the fork's own engine) — yes |
| U-ats | `ats` | ATS-friendliness score of any CV | partial — ATS guardrail on console renders only |
| U-integrity | `verify-pipeline.mjs`, `dedup-tracker.mjs`, `reconcile-pipeline.mjs`, `validate-portals.mjs`, `verify-portals.mjs` | Maintenance scripts | Maintenance bar — yes |
| U-set-status | `set-status.mjs --note` | Status change with a note | partial — status yes, **note no** |
| U-interview | `interview` (onboarding), `doctor.mjs` | First-run setup: CV, profile, portals, tracker | **none** — no onboarding, no CV/profile editor (M8) |
| U-intake | `intake` | Build the profile from documents | **none** |
| U-add | `add`, `add-entry.mjs` | Add a role/project to the CV, or a row to the tracker | **none** |
| U-expand | `expand` | Discover missing competencies | **none** |
| U-ofertas | `ofertas` | Compare several offers | **none** |
| U-triage | `triage` | Quick first-pass score | **none** |
| U-deep | `deep` | Company research prompt | **none** |
| U-contacto | `contacto`, `contacts.mjs`, `linkedin-join.mjs` | Outreach messages, contacts, warm intros | **none** |
| U-email | `email` | Application email draft | **none** |
| U-apply | `apply` | Form-filling assistant (never submits) | **none** (any equivalent must respect §9.1) |
| U-interview-prep | `interview-prep`, `interview/plan`, `interview/practice`, `interview/debrief`, `interview-redflag` | Interview preparation | **none** |
| U-offer-prep | `offer-prep` | Contract reading companion | **none** |
| U-followup | `followup`, `followup-cadence.mjs` | Follow-up cadence | **none** |
| U-reply-watch | `reply-watch`, `paste-reply.mjs` | Classify employer replies | **none** |
| U-outcome | `outcome`, `calibrate`, `patterns`, `analyze-patterns.mjs`, `funnel-velocity.mjs` | Outcomes, calibration, rejection patterns | **none** |
| U-stats | `stats.mjs`, `salary-gap.mjs`, `company-history.mjs`, `detect-reposts.mjs` | Pipeline statistics and analyses | **none** (Pipeline shows only counts) |
| U-titles | `titles` | Adjacent title suggestions | **none** |
| U-training | `training`, `project` | Evaluate a course or portfolio project | **none** |
| U-latex | `latex`, `latex-tex`, `text` | LaTeX and markdown CV exports | **none** |
| U-discover | `discover` | Resolve a company to a scannable ATS board | partial — "Probe sources" suggests corrected boards; no "find this company's board" |
| U-websearch | `scan_method: websearch` handoff | Agent searches companies with no board | **none** — such sources are listed but never fetched |
| U-agent-inbox | `agent-inbox` | Queue requests for the next session | **none** |
| U-update | `update`, `update-system.mjs` | Update the system | **none** |
| U-language | `language.modes_dir`, `language.output` | Market modes and output language | **none** (profile.yml not editable) |

## Summary

### Totals per table

| Table | Rows | yes | partly | no |
|---|---|---|---|---|
| 1. Server routes | 37 (36 routes + static/SPA fallback) | 22 | 10 | 5 |
| 2. Run kinds | 17 (13 user-startable, 4 internal) | 5 | 12 | 0 |
| 3. Config and data files | 18 (12 required + 6 more the engine reads) | 3 | 8 | 7 |
| 4. UI actions | 119 | 66 | 53 | 0 |
| **All** | **191** | **96** | **83** | **12** |

UI actions by page: Global 7, Pipeline 38, shared run panel 2, Sources 27, Skills 18,
Runs 3, CV Studio 24.

### Discoverability (§12.6 metric)

- **96 of 191 capabilities (50.3%)** are discoverable in ≤ 3 interactions with a label in the
  user's own words. Target: 100%.
- Excluding the 6 plumbing routes (all "yes") and the 4 internal run kinds (all "partly"),
  which no user asks for by name: **90 of 181 (49.7%)**.
- The "partly" rows fall into a few recurring causes: the report detail and the Maintenance
  bar render below a 40-row table (26 of the 83); engineering vocabulary ("Runs", "Dedup",
  "Reconcile", "Probe", "tokens", "Provider", "Scan method"); and controls placed on a
  different page from the thing they act on (inbox on Sources, source checks on Pipeline).

### Capabilities with no UI surface

1. **View or edit `cv.md`** (C-cv-md). A first-run user cannot get a CV in at all; every
   agent button stays disabled with "No cv.md in the data directory yet".
2. **View or edit `config/profile.yml`** (C-profile-yml): name, targets, comp, auto-PDF
   threshold, spend tier, output language (U-language).
3. **Create `portals.yml` on first run** and **edit scan filters** (C-portals-yml): "Add"
   is disabled when the file is missing; filters are read-only.
4. **Add, view or remove writing samples** (C-writing-samples).
5. **Edit `modes/_profile.md`** (archetypes and targeting every evaluation uses) and
   **`article-digest.md`** (proof points) — C-modes-profile-md, C-article-digest-md.
6. **Manage `data/blacklist.md`** (C-blacklist-md).
7. **Status history and status notes** (C-status-log; `note`/`on` on R-status).
8. **Edit tracker notes, add a row by hand, delete a row** (C-applications-md; U-add).
9. **Remove an inbox entry, see processed entries** (C-pipeline-md).
10. **See which data directory the console is using, and its health** (R-health).
11. **Reports without a tracker row** (R-reports-list).
12. **Retry a failed run** — no retry control on the Runs page; the user must repeat the
    original action from another page.
13. **Process every pending inbox URL at once** (U-pipeline, U-batch).
14. **Run options**: model choice (`evaluate`, `pdf`, `cover`), paper format and legacy
    HTML path (`pdf`), fetch limit (`skills-fetch`), session cap (`skills-extract`).
15. **Agent CLI path and concurrency** — environment variables only (planned for M9).
16. **Agent transcripts and prompts** — named as paths in "How runs work", not viewable.
17. API-only routes whose data reaches the UI another way: R-cv-templates, R-run,
    R-scan-summary.
18. Upstream modes with **no console equivalent** (table 5): batch, ofertas, triage, deep,
    contacto, email, apply, interview and interview-prep family, offer-prep, followup,
    reply-watch, outcome/calibrate/patterns, stats scripts, titles, training/project, add,
    expand, intake, latex/latex-tex/text, agent-inbox, update, the websearch handoff, and
    onboarding (`interview`/`doctor.mjs`).
