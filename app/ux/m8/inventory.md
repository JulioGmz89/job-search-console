# Capability inventory (M8 re-measure, method 1)

What the rebuilt console can do, and where the M8 UI shows each capability. This is the
re-measure of PROJECT_PLAN.md §12.2 method 1 against the code on branch
`feat/m8-ux-build`. The M6 baseline stays unchanged in `app/ux/inventory.md`. Nothing
here judges the design; the heuristic evaluation and the reviews in `app/ux/m8/reviews/`
do that.

## How to read this file

- **Row IDs.** Every M6 ID (`R-…`, `K-…`, `C-…`, `UI-…`, `U-…`) is kept where the
  capability still exists, so the two inventories can be compared row by row. A capability
  that M6 had and M8 dropped keeps its ID and is marked **no**. M8 additions get new IDs
  (`R-workspace`, `UI-today-…`, `UI-shell-…` and so on), listed after the M6 rows of each
  section.
- **Surfaced at** is `Page › section › control`, with the on-screen labels from
  `app/ui/src` and the page names of `app/ux/design/ia.md`. The six top-bar destinations
  are Today (the landing page, `#/today`), Applications, To review, Companies, Skills and
  My CV (`app/ui/src/lib/routes.js`, `DESTINATIONS`). Activity (a button with a panel) and
  Workspace (a link) are also in the top bar (`app/ui/src/shell/TopBar.jsx`). The job page
  (`#/applications/:id`), the Activity page and Help are reached from those.
- **Interactions** use the M6 rule, so that the numbers compare. They count from the
  landing page (Today). Every destination is one click away in the top bar, so this equals
  "from the page where a user would look for it" plus the click that gets there.
  - One interaction is each click, each choice in a select or menu (open and choose
    together), and each scroll needed to bring an off-screen control into view.
  - Typing into the required fields of a form is written as "+ typing". A confirmation
    dialog after the control is written as "+ confirm". Neither is counted, as in M6. The
    exception is a row that *is* the field or the confirm button.
  - Sub-sections cost one more: My CV opens on Content, so Profile, Design and Writing
    rules are 2 interactions. Skills opens on Learn next.
  - Scrolls were judged at **1280 × 800** (the M6/M7 audit viewport). The judgment uses the
    full-page shots of the populated sandbox in `app/ux/m8/a11y/shots/*-light-100.png` and
    `app/ux/m8/evidence/R-skills-cv-workspace-design-populated.png`. Where a shot did not
    show the loaded state (the Designs gallery), the count is worked out from
    `app/ui/src/app.css` and marked *estimate*.
- **User's words**: whether the label is one a job seeker uses (the glossary in
  `app/ux/design/brief.md` and `ia.md` §3).
- **Discoverable** (the §12.6 metric):
  - **yes**: reachable in ≤ 3 interactions *and* labelled in the user's words;
  - **partly**: surfaced, but one or both of those fail;
  - **no**: not surfaced in the UI at all.
- **No UI by design** marks the 11 plumbing capabilities that
  `app/ux/design/sitemap.md` (§Totals) classes as mechanisms nobody asks for by name.
  Each one gives the sitemap's reason. They are counted separately and left out of the
  "excluding plumbing" figure.
- `app/ux/ux.test.js` parses this file. Every route (`METHOD /path`) and every run kind
  sits verbatim in its own table cell. Every `app/ui/src/…` path cited here exists.

## 1. Server routes

Source: `app/server/app.js`. There are 50 routes: the 36 of M6 plus 14 added in M8. The
static/SPA fallback makes a 51st row. The UI calls routes through `app/ui/src/api.js`
and the shared resources in `app/ui/src/data.js`.

| ID | Route | What it does | Surfaced at | Interactions | Label | User's words | Discoverable | Notes |
|---|---|---|---|---|---|---|---|---|
| R-health | GET /api/health | Data root, tracker path, counts, parse issues | not surfaced (route not called) | — | — | — | no — `fetchHealth` in `app/ui/src/api.js` is never imported | The same facts now reach the user through R-workspace (Workspace › Folder, Data health). The route is redundant for the UI. M6 used the same convention for R-scan-summary. |
| R-pipeline | GET /api/pipeline | Tracker rows, statuses, issues | Applications › table | 1 | "Applications" | yes | yes | Also feeds search, Today's cards and the top bar (`app/ui/src/data.js`). |
| R-reports-list | GET /api/reports | Every report with its Machine Summary | not surfaced | — | — | — | no — never called | A report with no tracker row is still invisible. To review › "Already checked" links to `#/applications/report/<n>`, and for such a report that lands on "Job not found" (`app/ui/src/pages/Job.jsx`). sitemap.md planned "Fit reports not in Applications" in Workspace; it was not built. |
| R-report | GET /api/reports/:id | One report: header, Machine Summary, A–G prose, PDF/cover/ATS facts | Job › Fit report | 3 (Applications, job link, scroll) | "Fit report" | yes | yes | Opens on its own page, never below the list (`app/ui/src/pages/Job.jsx`). In the shot `populated-job-light-100.png` it starts at ≈ 890 px. Today's "Just finished › Open the job" reaches the page in 1. |
| R-report-pdf | GET /api/reports/:id/pdf | Streams the tailored CV PDF | Job › Documents › Tailored CV › "Open" / "Download"; My CV › Writing rules › Your tailored CVs › "Open" | 3 (Applications, job, Open) | "Open", "Download" | yes | yes | `app/ui/src/components/Documents.jsx`, `app/ui/src/pages/mycv/Writing.jsx`. Search also finds "Tailored CV · <job>" (`app/ui/src/shell/Search.jsx`). |
| R-report-cover | GET /api/reports/:id/cover | Streams the cover letter PDF | Job › Documents › Cover letter › "Open" / "Download" | 3 | "Open", "Download" | yes | yes | |
| R-cv-style-get | GET /api/cv/style | Saved style, field help, densities, section keys, profile overrides | My CV › Design | 2 (My CV, Design) | "Design" | yes | yes | |
| R-cv-style-put | PUT /api/cv/style | Saves `config/cv/style.yml` | My CV › Design › "Make this my design for every CV" | 4 (My CV, Design, scroll, button) + choose a design | "Make this my design for every CV" | yes | partly — below the 60vh preview | The button sits at ≈ 900 px (`R-skills-cv-workspace-design-populated.png`; `app/ui/src/app.css` line 340). Disabled until something changed. A failing design asks "Use it anyway". |
| R-cv-voice-get | GET /api/cv/voice | `voice-dna.md`, its words to avoid, the example text | My CV › Writing rules | 2 | "Writing rules" | yes | yes | |
| R-cv-voice-put | PUT /api/cv/voice | Writes the whole `voice-dna.md` | My CV › Writing rules › All rules › "Save"; › "Start from the example rules…" | 5 (My CV, Writing rules, scroll, All rules, Save) + typing | "All rules", "Save" | yes | partly — whole-file edit is behind a disclosure below the tailored-CV list | Adding one word uses R-cv-voice-words-add instead (3). |
| R-cv-templates | GET /api/cv/templates | Lists custom designs in `config/cv/templates/` | My CV › Design › Designs (names); Job › Documents (design name) | 2 | the design's name | yes | yes | Called now (resource `templates`), only to name designs (`app/ui/src/lib/designs.js`). A custom design is not marked as the user's own (sitemap.md planned "Yours"). |
| R-cv-writing-samples | GET /api/cv/writing-samples | Lists `writing-samples/` | My CV › Writing rules › Writing samples | 3 (My CV, Writing rules, scroll) | "Writing samples" | yes | yes | Names and dates only; see C-writing-samples. |
| R-cv-documents | GET /api/cv/documents | Structured CV payloads plus the sample | My CV › Design › "Preview with" | 3 | "Preview with": "Cobalt Freight — Staff Software Engineer, Oct 6" | yes | yes | Named by job (`app/ui/src/pages/mycv/Design.jsx`, `docLabel`). |
| R-cv-preview | POST /api/cv/preview | Renders unsaved settings, runs the screening check | My CV › Design › Preview (automatic) | 2 | "Preview", "Updating…", "Readable by screening systems." | yes | yes | |
| R-cv-preview-pdf | GET /api/cv/preview/:id | Streams a preview PDF | My CV › Design › preview frame | — | — | — | no UI by design | sitemap.md: transport for R-cv-preview. |
| R-cv-themes | POST /api/cv/themes | Every design rendered with a verdict | My CV › Design › Designs | 2 | "Designs", "Readable by screening systems" / "Readable, N small issues" / "Screening problems" | yes | yes | |
| R-cv-render-all | POST /api/cv/render-all | Queues one `cv-render` per CV with a report | My CV › Design › "Update existing CVs to this design (6)" | 4 (My CV, Design, scroll, button) + confirm | as label | yes | partly — below the preview | Confirm "Update 6 CVs". The result says "follow them in Activity". |
| R-cv-thumbs | GET /api/cv/thumbs/:key | Design thumbnails | My CV › Design › gallery images | — | — | — | no UI by design | sitemap.md: images for R-cv-themes. |
| R-skills | GET /api/skills | Coverage, ranked skills, evidence | Skills | 1 | "Skills" | yes | yes | |
| R-skills-extract | POST /api/skills/extract | Queues up to 5 `skills-extract` (+ `skills-cv` when stale) | Skills › basis line › "Improve the analysis" | 2 | "Improve the analysis" + "Reads N postings with Claude · about N sessions · uses your Claude plan" | yes | yes | Shown only when postings wait for Claude (`cov.pendingLlm`, `app/ui/src/pages/Skills.jsx`). `max` is fixed at 5. |
| R-skills-overrides | PUT /api/skills/overrides | Sets or clears a skill's status | Skills › row › "<skill> on your CV" | 2 | "Missing" / "Partly" / "Has it" / "Ignore this skill" | yes | yes | Undo for 10 s. Clearing to the automatic reading happens only through that Undo (UI-skills-reset). |
| R-status | PATCH /api/pipeline/rows/:id/status | Changes status through `set-status.mjs`, with `on` and `note` | Applications › row › Status; Job › Status; Job › "I've sent my application" | 2 (Applications, Status select) | "Status for <job>", status words (`ia.md` §3) | yes | yes | `on` and `note` are sent only for Applied, through "When did you apply…?" (`app/ui/src/components/StatusControl.jsx`). Other statuses still cannot carry a note. |
| R-inbox | GET /api/inbox | Pending and processed entries, last scan | To review | 1 | "To review" | yes | yes | Processed entries now shown ("Already checked (30)"). |
| R-inbox-add | POST /api/inbox/urls | Appends a link; with `evaluate`, starts a check | Applications › Add a job; Today › Check your first job | 2 (Applications, button) + typing | "Check fit now", "Save for later" | yes | yes | `app/ui/src/components/AddJob.jsx`. |
| R-agent-status | GET /api/agent/status | Claude CLI found and signed in, profile facts, max agents | Today › Get set up › AI assistant; Workspace › AI assistant | 0 on first run; 3 in Workspace (Workspace, scroll, Check again) | "AI assistant", "Check again" | yes | yes | `?refresh=1` is "Check again" (`app/ui/src/api.js`, `checkAgent`). The CLI path and concurrency are shown read-only. |
| R-portals | GET /api/portals | Companies, boards, filters, health | Companies | 1 | "Companies", "Companies you follow" | yes | yes | |
| R-portals-create | POST /api/portals/entries | Adds a company or board; creates `portals.yml` if missing | Companies › "Follow a company" › "Follow"; Today › Get set up › "Follow company" | 3 (Companies, Follow a company, Follow) + typing | "Follow a company", "Follow" | yes | yes | Works on first run now (`app/ui/src/pages/Today.jsx`, `CompanyStep`). |
| R-portals-update | PATCH /api/portals/entries/:kind/:index | Edits, pauses or resumes one entry | Companies › row › switch "Check <name> for new openings"; "Edit" › "Save" | 2 | as label | yes | yes | |
| R-portals-delete | DELETE /api/portals/entries/:kind/:index | Removes one entry | Companies › row › "Remove" | 2 + confirm | "Remove", confirm "Stop following" | yes | yes | Undo re-creates the entry; `portals.yml.bak` kept. |
| R-runs | GET /api/runs | Queued, active and recent runs | Top bar › "Activity" (panel); Activity page | 1 | "Activity" / "Activity · 1 failed" / "· 2 working" / "· 1 done" | yes | yes | `app/ui/src/lib/runs.js`, `activitySummary`. |
| R-runs-start | POST /api/runs | Starts any non-internal kind | every action button (table 2) | — | — | — | no UI by design | sitemap.md: transport for every action button. |
| R-run | GET /api/runs/:id | One run with its log lines | Activity › item › "Technical details"; Workspace › Tidy up results | 2 (Activity, Technical details) | "Technical details" | yes | yes | Called now (`app/ui/src/components/RunItem.jsx`, `app/ui/src/pages/Workspace.jsx`). |
| R-run-cancel | POST /api/runs/:id/cancel | Cancels a queued or running run | any working item › "Cancel" | 1–2 | "Cancel" | yes | yes | Wherever the run shows: inline, Today › Working now, Activity. |
| R-run-events | GET /api/runs/:id/events | SSE per run | not surfaced (route not called) | — | — | — | no — `runEventsUrl` in `app/ui/src/api.js` is never imported | Live progress now comes through R-events, and the log through R-run. The route is redundant for the UI. |
| R-events | GET /api/events | SSE: file changes and run transitions | whole app | — | "Lost the connection to the app…" (only when down, `app/ui/src/App.jsx`) | — | no UI by design | sitemap.md: keeps pages current. |
| R-scan-summary | GET /api/scan/summary | Last scan's counters | not surfaced (route not called) | — | — | — | no — counters arrive through R-inbox | Shown as To review › "Last check, Sep 24, 08:01: 18 new openings". |
| R-static | GET /* (static files and SPA fallback) | Serves the built UI | the app itself | — | — | — | no UI by design | sitemap.md: the app itself. Old hash routes redirect (`app/ui/src/lib/routes.js`). |
| R-workspace | GET /api/workspace | Files present, set-up steps, counts, issues, assistant check | Today (set-up and needs cards); Workspace › Folder, Data health | 0 (Today); 1 (Workspace) | "Get set up", "Folder", "Data health" | yes | yes | M8. |
| R-today-get | GET /api/today | Last looked, dismissed cards | Today › "New since you last looked" | 0 | "New since you last looked" | yes | yes | M8. |
| R-today-put | PUT /api/today | Writes last looked; dismisses or restores a card | Today › Needs you › "Dismiss" · "Undo" | 1 | "Dismiss", "Undo" | yes | yes | M8. Last looked is written when the user leaves Today. |
| R-cv-content-get | GET /api/cv/content | Reads `cv.md` with a summary | Today › Get set up › Add your CV; My CV › Content | 1 | "Your CV (Markdown)", "What the app reads from it" | yes | yes | M8. |
| R-cv-content-put | PUT /api/cv/content | Saves `cv.md`, keeping `cv.md.bak` | Today › "Save my CV"; My CV › Content › "Save" | 1 on first run (Save my CV) + typing; 2 in My CV + typing | "Save my CV", "Save" | yes | yes | M8. |
| R-profile-get | GET /api/profile | Reads the Profile fields | My CV › Profile | 2 | "Profile" | yes | yes | M8. |
| R-profile-put | PUT /api/profile | Saves the fields, keeping comments and unknown keys | My CV › Profile › "Save profile" | 4 (My CV, Profile, scroll, Save profile) + typing | "Save profile" | yes | partly — Save sits at ≈ 947 px | `populated-my-cv-profile-light-100.png`. M8. |
| R-cv-voice-words-add | POST /api/cv/voice/words | Adds one word under `## Never write` | My CV › Writing rules › Words to avoid › "Add" | 3 (My CV, Writing rules, Add) + typing | "Add a word", "Add" | yes | yes | M8. |
| R-cv-voice-words-remove | DELETE /api/cv/voice/words | Removes one word | My CV › Writing rules › word chip › "×" | 3 | "×" (named "Remove <word>") | yes | yes | Undo re-adds it. M8. |
| R-cv-voice-restore | POST /api/cv/voice/restore | Swaps `voice-dna.md` with its `.bak` | My CV › Writing rules › All rules › "Start from the example rules…" › "Replace my rules" › "Undo" | 7 (My CV, Writing rules, scroll, All rules, Start from…, Replace my rules, Undo) | "Undo" | yes | partly — only as the Undo of a replacement | M8. |
| R-cv-design-check | GET /api/cv/design-check | Renders the saved design once and reports the verdict | Today › Needs you › "Your CV design fails the screening check"; Job › Documents › "Make it again" confirm | 0 (Today, when it fails) | as label, "Choose a design that passes" | yes | yes | M8. |
| R-inbox-remove | DELETE /api/inbox/urls | Removes a link from To review | To review › item › "Remove"; "Remove selected (N)" | 2 | "Remove" | yes | yes | M8. |
| R-inbox-restore | POST /api/inbox/urls/restore | Puts a removed line back | Undo bar / Activity panel › "Undo" | 3 (To review, Remove, Undo) | "Undo" | yes | yes | M8. |
| R-run-retry | POST /api/runs/:id/retry | Re-queues a failed run with the same request | Today › Needs you › "Try again"; Activity; job page; To review | 1 (Today) | "Try again" | yes | yes | Offered only when the failure explanation allows it (`app/ui/src/lib/runs.js`, `explainFailure`). M8. |

## 2. Run kinds

Source: `RUN_KINDS` in `app/server/queue/specs.js`. These are the same 17 kinds as in M6.
The UI names each one in `app/ui/src/lib/runs.js` (`RUN_NAMES`).

| ID | Kind | Internal | Activity name | UI label | Surfaced at | Interactions | User's words | Discoverable | Notes |
|---|---|---|---|---|---|---|---|---|---|
| K-scan | scan | no | Check for new openings | "Check for new openings"; "Check <company> for new openings now" | Today › New since you last looked; To review (header); Companies (header) | 1 (Today card) | yes | yes | Options under To review › "Options" (UI-sources-…). Chains `skills-fetch-auto`. |
| K-dedup | dedup | no | Find duplicate applications | "Find duplicate applications" › "Merge these duplicates" | Workspace › Tidy up; Applications › "Tidy up" menu (jumps to Workspace) | 2 (Workspace, button) + confirm | yes | yes | Preview first, then confirm. From Applications the menu adds 2 interactions and the tool's button must be pressed again. |
| K-reconcile | reconcile | no | Remove links already in Applications | as label › "Remove these links" | Workspace › Tidy up; To review › "Tidy up" | 2 + confirm | yes | yes | |
| K-verify-pipeline | verify-pipeline | no | Check my list for problems | as label | Workspace › Tidy up; Applications › "Tidy up" | 2 | yes | yes | "Found problems:" is shown as an answer, not a failure. |
| K-validate-portals | validate-portals | no | Check companies' job boards | — | not surfaced | — | — | no — no control starts it | Companies › "Check companies' job boards" starts `verify-portals` (`app/ui/src/pages/Companies.jsx`). `RUN_NAMES` gives both kinds the same name. sitemap.md placed it; the M8 UI dropped it. M6 had it on the Maintenance bar (partly). |
| K-verify-portals | verify-portals | no | Check companies' job boards | "Check companies' job boards" (Companies); "Find the right job board for a company" (Workspace) | Companies › bottom card; Workspace › Tidy up | 3 (Companies, scroll, button) | yes | yes | Two labels for one kind. The suggested new board appears only in the raw output on Workspace. The row's "Fix" does not run it (UI-companies-fix). |
| K-skills-fetch | skills-fetch | no | Read new postings | "Read the N new postings" | Skills › basis line | 2 | yes | yes | Shown only when postings are unread. The `retryFailed` and `limit` options are not surfaced (UI-skills-retry). |
| K-cv-render | cv-render | no | Update design | "Update the layout to <design>" (Job); "Lay out this CV again in <design>" (My CV › Design) | Job › Documents › Tailored CV; My CV › Design › under the preview | 3 (Applications, job, button) when the design changed; 4 in Design | yes | yes | Also chained after every `pdf`. Hint "A few seconds · no AI · wording unchanged". |
| K-evaluate | evaluate | no | Check fit | "Check fit now"; "Check fit"; "Check fit again"; "Check fit for selected (N)"; "Try again" | Applications › Add a job; Today › Check your first job; To review; Job; row Actions | 2 | yes | yes | Cost stated beside each button ("About 2–5 min · uses your Claude plan"). `model` not surfaced. |
| K-pdf | pdf | no | Tailored CV | "Make tailored CV"; "Make it again"; "Also make a tailored CV if the fit is 3.5 or more" | Job › Documents; Applications › row Actions; My CV › Writing rules › Your tailored CVs | 3 (Applications, job, Make tailored CV) | yes | yes | `format` and `model` not surfaced. |
| K-cover | cover | no | Cover letter | "Write cover letter" › "Write the letter" | Job › Documents › Cover letter (inline form) | 4 (Applications, job, Write cover letter, Write the letter) + typing | yes | partly — one step more than the limit from Today | From the job page it is 2. Today › "Get documents ready" reaches it in 3, but only for jobs that replied or are interviewing. |
| K-skills-extract | skills-extract | no | Improve the skills analysis | "Improve the analysis" | Skills › basis line | 2 | yes | yes | Started through R-skills-extract. |
| K-skills-cv | skills-cv | no | Read your CV's skills | — (folded into "Improve the analysis") | Skills › basis line | 2 | no — no label mentions the CV | partly | Queued with "Improve the analysis" when the CV changed. When no posting waits for Claude, the button is hidden, so a changed CV cannot be re-read from the UI. sitemap.md's "Read my CV's skills again" was not built. |
| K-merge-tracker | merge-tracker | yes | Add to Applications | "then: added to Applications" / "updated application #21" | nested under its check | — | — | no UI by design | sitemap.md: automatic step; its outcome is shown (F-015). |
| K-reconcile-auto | reconcile-auto | yes | Tidy To review | not shown (bookkeeping) | nested under its check | — | — | no UI by design | sitemap.md: automatic step. |
| K-skills-fetch-auto | skills-fetch-auto | yes | Read new postings | "then: read the new postings for Skills" | nested under the scan | — | — | no UI by design | sitemap.md: automatic step. |
| K-mark-pdf-ready | mark-pdf-ready | yes | Mark the CV as ready | not shown (bookkeeping) | nested under the tailored CV | — | — | no UI by design | sitemap.md: automatic step. |

## 3. Config and data files

Sources: `app/server/services/`, upstream `AGENTS.md` and `DATA_CONTRACT.md`, and the Help
topic "Files in your workspace folder" (`app/ui/src/pages/Help.jsx`).

| ID | File | What it is for | Read by the UI | Written by the UI | Surfaced at | Interactions | User's words | Discoverable | Notes |
|---|---|---|---|---|---|---|---|---|---|
| C-cv-md | cv.md | The canonical CV | yes (text and summary) | yes | Today › Get set up › Add your CV; My CV › Content | 0–1 | yes ("Your CV") | yes | Paste, "Choose a file…" or "Import from a file". `.bak` kept. M6: no. |
| C-profile-yml | config/profile.yml | Identity, targets, pay, auto-CV threshold, language, usage tier | yes | the form's fields only | My CV › Profile | 2 | yes ("Profile") | yes | The `style`, `cv.sections` and `cv.template` overrides are not on the form (UI-cv-profile-warning). M6: no. |
| C-portals-yml | portals.yml | Companies, job-board searches, filters | yes | entries; created on first follow | Companies; Today › Get set up | 1 | yes ("Companies you follow") | yes | Filters stay read-only, shown in words under "What jobs to keep" (decision D-3). Entries in a shape the app can't edit say so. |
| C-style-yml | config/cv/style.yml | CV design and fine-tuning | yes | yes | My CV › Design | 2 | yes ("Design") | yes | |
| C-voice-dna-md | voice-dna.md | Writing rules for CVs and letters | yes | yes (words one by one, or whole) | My CV › Writing rules | 2 | yes ("Writing rules") | yes | |
| C-writing-samples | writing-samples/ | The user's own writing, for tone | names and dates | no | My CV › Writing rules › Writing samples | 3 | yes | partly — listed only; adding, opening or removing needs the file system | The page gives the folder path. sitemap.md's "Open" was not built. |
| C-cv-templates | config/cv/templates/ | User-made HTML designs | as named gallery cards | no | My CV › Design › Designs | 2 | partly — not marked as the user's own | partly — creating one needs the file system | sitemap.md's Help topic "Make your own design" does not exist (`app/ui/src/pages/Help.jsx`). |
| C-applications-md | data/applications.md | The tracker | yes | status (with date and note for Applied) | Applications | 1 | yes | yes | Editing notes, adding a row by hand and deleting a row are not in the UI. |
| C-pipeline-md | data/pipeline.md | Links waiting to be checked | pending and processed | append, remove, restore | To review | 1 | yes | yes | M6: partly. |
| C-reports | reports/ | A–G fit reports | yes | via `evaluate` | Job › Fit report | 3 | yes | yes | Reports with no tracker row are unreachable (R-reports-list). |
| C-output | output/ | Tailored CVs, payloads, letters | yes | via `pdf`, `cv-render`, `cover` | Job › Documents; My CV › Writing rules › Your tailored CVs; search | 3 | yes ("Documents") | yes | Open and Download for both documents. |
| C-data-skills | data/skills/ | Posting cache, extractions, overrides | yes | overrides, runs | Skills | 1 | yes | yes | |
| C-modes-profile-md | modes/_profile.md | Archetypes and targeting | whether it exists | no | My CV › Profile › "Advanced files" | 4 (My CV, Profile, scroll, Advanced files) | yes ("the kinds of roles you target…") | partly — named with its purpose and "Edit it in your editor"; below the fold | ia.md §2.7: editing has no UI in v1. |
| C-article-digest-md | article-digest.md | Proof points | whether it exists | no | My CV › Profile › "Advanced files" | 4 | yes ("proof points the assistant may quote") | partly — as above | |
| C-blacklist-md | data/blacklist.md | Companies never to apply to | no | no | not surfaced | — | — | no | Named only in a failure's "What to do" (`app/ui/src/lib/runs.js`, `explainFailure`). sitemap.md's "Companies to skip" was not built. |
| C-scan-data | data/scan-history.tsv, data/scan-runs.tsv, data/portal-health.tsv | Scan history, counters, board health | last run, health | via `scan`, `verify-portals` | To review › "Last check…"; Companies › each row's health ("Working · last checked Sep 24", "Board not found since Sep 24") | 1 | yes | yes | History beyond the last check is not shown. |
| C-data-jsc | data/jsc/ | The console's own state: logs, prompts, covers index, ATS records, Today | yes | yes | Technical details (log path); Activity | — | — | no UI by design | sitemap.md: internal state, surfaced through what it records. |
| C-status-log | data/status-log.tsv | Status-change ledger | no | indirectly (through `set-status.mjs`) | not surfaced | — | — | no | Job › "History" lists this session's activity and "added to Applications · now <status>". It never reads the ledger (`app/ui/src/pages/Job.jsx`), so past status changes and their notes are not shown. sitemap.md placed it there. |

## 4. UI actions

Source: every file under `app/ui/src`. Labels are exactly as rendered (`<n>` = a number,
`<name>` = data). The components with actions are:
- `app/ui/src/App.jsx`
- `app/ui/src/shell/TopBar.jsx`, `app/ui/src/shell/Search.jsx`,
  `app/ui/src/shell/ActivityPanel.jsx`, `app/ui/src/shell/undo.jsx`
- `app/ui/src/components/ui.jsx`, `app/ui/src/components/RunItem.jsx`,
  `app/ui/src/components/AddJob.jsx`, `app/ui/src/components/StatusControl.jsx`,
  `app/ui/src/components/Documents.jsx`, `app/ui/src/components/LeaveGuard.jsx`
- `app/ui/src/pages/Today.jsx`, `app/ui/src/pages/Applications.jsx`,
  `app/ui/src/pages/Job.jsx`, `app/ui/src/pages/ToReview.jsx`,
  `app/ui/src/pages/Companies.jsx`, `app/ui/src/pages/Skills.jsx`,
  `app/ui/src/pages/MyCv.jsx`, `app/ui/src/pages/mycv/Content.jsx`,
  `app/ui/src/pages/mycv/Profile.jsx`, `app/ui/src/pages/mycv/Design.jsx`,
  `app/ui/src/pages/mycv/Writing.jsx`, `app/ui/src/pages/Activity.jsx`,
  `app/ui/src/pages/Workspace.jsx`, `app/ui/src/pages/Help.jsx`,
  `app/ui/src/pages/NotFound.jsx`

### Global and shell

| ID | Label | Type | Component | Surfaced at | Interactions | User's words | Discoverable | Notes |
|---|---|---|---|---|---|---|---|---|
| UI-nav-pipeline | "Applications" | link | app/ui/src/shell/TopBar.jsx | Top bar | 1 | yes | yes | Was "Pipeline". |
| UI-nav-sources | "Companies" (count "<n> not working") | link | app/ui/src/shell/TopBar.jsx | Top bar | 1 | yes | yes | Sources is split into Companies and To review. |
| UI-nav-skills | "Skills" | link | app/ui/src/shell/TopBar.jsx | Top bar | 1 | yes | yes | |
| UI-nav-runs | "Activity" / "Activity · <n> failed" / "· <n> working" / "· <n> done" | button (opens panel) | app/ui/src/shell/TopBar.jsx | Top bar | 1 | yes | yes | Was "Runs". Colour follows the state. |
| UI-nav-cv | "My CV" | link | app/ui/src/shell/TopBar.jsx | Top bar | 1 | yes | yes | Was "CV Studio". |
| UI-global-toast-open-log | (run title link, e.g. "Check fit · Driftwood Analytics — Data Engineer") | link | app/ui/src/components/RunItem.jsx | where the action was started; Activity panel | 1 | yes | yes | No toast any more. Progress shows where the user clicked (ia.md §3 "Run feedback"). |
| UI-global-toast-dismiss | "Got it" / "Dismiss" / "Hide" | button | app/ui/src/pages/Today.jsx, app/ui/src/shell/undo.jsx | Today cards; Undo bar | 1 | yes | yes | Nothing important is toast-only. |
| UI-shell-skip | "Skip to content" | link | app/ui/src/App.jsx | first Tab stop | 1 | yes | yes | M8. |
| UI-shell-brand | "Job Search Console" | link to Today | app/ui/src/shell/TopBar.jsx | Top bar | 1 | yes | yes | M8 (M6's title was not a link). |
| UI-shell-nav-today | "Today" | link | app/ui/src/shell/TopBar.jsx | Top bar | 0–1 | yes | yes | M8. Landing page. |
| UI-shell-nav-to-review | "To review" (count "<n> new") | link | app/ui/src/shell/TopBar.jsx | Top bar | 1 | yes | yes | M8. |
| UI-shell-menu | "Menu" | disclosure (below 960 px) | app/ui/src/shell/TopBar.jsx | Top bar | 1 | yes | yes | M8. |
| UI-shell-workspace | "Workspace" | link | app/ui/src/shell/TopBar.jsx | Top bar, far right | 1 | partly — a word for the folder, health, tidy-up and the assistant that P2/P3 would not use | partly | M8. Help is reached only from here (Workspace › Help), from "?" links in context, or from search. |
| UI-shell-search | "Find a job, company or document…" | combobox | app/ui/src/shell/Search.jsx | Top bar | 2 (type, Enter) | yes | yes | M8. Finds jobs, companies, documents, pages and two actions. |
| UI-shell-search-toggle | "Search" | button (below 960 px) | app/ui/src/shell/Search.jsx | Top bar | 1 | yes | yes | M8. |
| UI-shell-panel-close | "Close" | button | app/ui/src/shell/ActivityPanel.jsx | Activity panel | 2 | yes | yes | M8. Escape also closes it. |
| UI-shell-panel-see-all | "See all activity" | link | app/ui/src/shell/ActivityPanel.jsx | Activity panel | 2 | yes | yes | M8. |
| UI-shell-undo | "Undo" | button | app/ui/src/shell/undo.jsx | Undo bar (10 s); Activity panel until replaced | 1 after the action | yes | yes | M8. Removals, replacements, status and skill changes, dismissals. |
| UI-shell-undo-hide | "Hide" | button | app/ui/src/shell/undo.jsx | Undo bar | 1 | yes | yes | M8. |
| UI-shell-leave-guard | "Leave without saving <your CV / your profile / your design / your writing rules>?" › "Leave without saving" / "Stay" | dialog | app/ui/src/components/LeaveGuard.jsx | My CV, any editor with unsaved changes | appears on leaving | yes | yes | M8. |
| UI-notfound-today | "Go to Today" | link | app/ui/src/pages/NotFound.jsx | unknown address | 1 | yes | yes | M8. |

### Applications and the job page (was Pipeline)

| ID | Label | Type | Component | Surfaced at | Interactions | User's words | Discoverable | Notes |
|---|---|---|---|---|---|---|---|---|
| UI-pipeline-url | "Link to the job posting" ("https://…/jobs/123") | field | app/ui/src/components/AddJob.jsx | Applications › Add a job; Today › Check your first job | 2 (Applications, type) | yes | yes | |
| UI-pipeline-evaluate-now | "Check fit now" | button (submit) | app/ui/src/components/AddJob.jsx | Applications › Add a job | 2 + typing | yes | yes | Result shows below the field. The reason it can't run is in view ("Add your CV first…"). |
| UI-pipeline-add-to-inbox | "Save for later" | button | app/ui/src/components/AddJob.jsx | Applications › Add a job | 2 + typing | yes | yes | Confirms "Saved in To review" with "Open To review". |
| UI-pipeline-autopdf | "Also make a tailored CV if the fit is 3.5 or more" › checkbox "Make a tailored CV right after the check when the fit is 3.5 or more…" | disclosure + checkbox | app/ui/src/components/AddJob.jsx | Applications › Add a job | 3 | yes | yes | No longer pre-ticked. Links to Profile. |
| UI-pipeline-addjob-help | hint "Check fit now: … Save for later: …" + "What a check costs" | text + link | app/ui/src/components/AddJob.jsx | Applications › Add a job | 1 (in view) | yes | yes | |
| UI-pipeline-issues | "<n> application could not be read" + "Show me how to fix it" / "Show me" | notice + link | app/ui/src/pages/Applications.jsx, app/ui/src/pages/Today.jsx | Today › Needs you; Applications (top); Workspace › Data health | 0 (Today) | yes | yes | Only `row-unparseable` reaches Today. The other issues are listed only in Workspace. |
| UI-pipeline-status-filter | "All (40)", "Reviewed — not applied (10)", … | toggle chips | app/ui/src/pages/Applications.jsx | Applications › filters | 2 | yes | yes | |
| UI-pipeline-score-filter | "Fit": "Any fit" / "4 and up" / "3.5 and up" / "Under 3" | select | app/ui/src/pages/Applications.jsx | Applications › filters | 2 | yes | yes | M6: partly (band jargon). |
| UI-pipeline-search | "Search" ("Company, role or note") | field | app/ui/src/pages/Applications.jsx | Applications › filters | 2 | yes | yes | |
| UI-pipeline-sort | "#", "Company and role", "Fit", "Status", "Checked" (↕) | sortable headers | app/ui/src/pages/Applications.jsx | Applications › table | 2 | yes | yes | Sort arrows on every sortable header. "Recommendation" and "Documents" do not sort. |
| UI-pipeline-open-row | "<Company> — <Role>" | link | app/ui/src/pages/Applications.jsx | Applications › table | 2 | yes | yes | Opens the job page. M6: partly. |
| UI-pipeline-status-cell | "<status>" (named "Status for <job>") | select | app/ui/src/components/StatusControl.jsx | Applications › Status | 2 | yes | yes | Commits on choose. Shows "Saved: …" and Undo. A row leaving the filter stays greyed. |
| UI-pipeline-row-evaluate | "Actions" › "Check fit again" | menu item | app/ui/src/pages/Applications.jsx | Applications › row | 3 | yes | yes | Unlike the job page, no confirmation on closed jobs and no cost beside it (`act()`). |
| UI-pipeline-row-pdf | "Actions" › "Make tailored CV" / "Make tailored CV again" | menu item | app/ui/src/pages/Applications.jsx | Applications › row | 3 | yes | yes | Starts at once; "again" is not confirmed here. |
| UI-pipeline-row-cover | "Actions" › "Write cover letter" | menu item | app/ui/src/pages/Applications.jsx | Applications › row | 3 | yes | yes | Opens the job page with the form open. |
| UI-pipeline-detail-posting-link | "Open the posting ↗" | link | app/ui/src/pages/Job.jsx | Job › Summary; row "Actions" | 3 | yes | yes | |
| UI-pipeline-detail-tab-report | "Fit report" | section | app/ui/src/pages/Job.jsx | Job › Fit report | 3 (Applications, job, scroll) | yes | yes | Machine Summary facts in words ("Is the posting real?", "Gaps", "Strengths"). |
| UI-pipeline-detail-tab-pdf | "Open" / "Download" (Tailored CV) | links | app/ui/src/components/Documents.jsx | Job › Documents | 3 | yes | yes | File name, date, design, writing-rules date, screening verdict. |
| UI-pipeline-detail-tab-cover | "Open" / "Download" (Cover letter) | links | app/ui/src/components/Documents.jsx | Job › Documents | 3 | yes | yes | |
| UI-pipeline-detail-reevaluate | "Check fit again" | button | app/ui/src/pages/Job.jsx | Job › Summary | 3 (+ confirm on closed jobs) | yes | yes | Cost beside it. |
| UI-pipeline-detail-pdf | "Make tailored CV" / "Make it again" | button | app/ui/src/components/Documents.jsx | Job › Documents › Tailored CV | 3 (+ confirm for again) | yes | yes | The confirm warns if the design fails screening. |
| UI-pipeline-detail-cover | "Write cover letter" / "Write it again" | button | app/ui/src/components/Documents.jsx | Job › Documents › Cover letter | 3 | yes | yes | |
| UI-pipeline-detail-run-badges | "History" (activity links "<run title> — done, <date>") | list | app/ui/src/pages/Job.jsx | Job › History | 3 (Applications, job, scroll) | yes | yes | A failed check also shows at the top in a "Needs you" box. |
| UI-pipeline-cover-dialog | "Cover letter questions for <job>" | inline form | app/ui/src/components/Documents.jsx | Job › Documents › Cover letter | 3 | yes | yes | No modal any more. |
| UI-pipeline-cover-why | "Why this role? (required)" | field | app/ui/src/components/Documents.jsx | cover form | 4 | yes | partly — one more than the limit from Today | 2 from the job page. |
| UI-pipeline-cover-problem | "What problem would you solve for them? (required)" | field | app/ui/src/components/Documents.jsx | cover form | 4 | yes | partly — as above | |
| UI-pipeline-cover-approach | "How would you start? (required)" | field | app/ui/src/components/Documents.jsx | cover form | 4 | yes | partly — as above | |
| UI-pipeline-cover-tone | "Tone": "Match the posting" / "Direct" / "Warm" / "Formal" | select | app/ui/src/components/Documents.jsx | cover form | 4 | yes | partly — as above | |
| UI-pipeline-cover-submit | "Write the letter" | button | app/ui/src/components/Documents.jsx | cover form | 4 + typing (+ confirm "Replace the letter") | yes | partly — as above | |
| UI-pipeline-cover-cancel | "Cancel" | button | app/ui/src/components/Documents.jsx | cover form | 4 | yes | partly — as above | |
| UI-pipeline-maint-dedup | "Find duplicate applications" | button | app/ui/src/pages/Workspace.jsx | Workspace › Tidy up; Applications › "Tidy up" | 2 | yes | yes | Hint "Shows what would change first · no AI". |
| UI-pipeline-maint-reconcile | "Remove links already in Applications" | button | app/ui/src/pages/Workspace.jsx | Workspace › Tidy up; To review › "Tidy up" | 2 | yes | yes | |
| UI-pipeline-maint-verify | "Check my list for problems" | button | app/ui/src/pages/Workspace.jsx | Workspace › Tidy up; Applications › "Tidy up" | 2 | yes | yes | |
| UI-pipeline-maint-validate | — | — | — | not surfaced | — | — | no | No control starts `validate-portals` (K-validate-portals). |
| UI-pipeline-maint-probe | "Find the right job board for a company" / "Check companies' job boards" | button | app/ui/src/pages/Workspace.jsx, app/ui/src/pages/Companies.jsx | Workspace › Tidy up (≈ 1004 px); Companies › bottom card | 3 (page, scroll, button) | yes | yes | Both start `verify-portals`. |
| UI-pipeline-maint-help | each tool's description and hint | text | app/ui/src/pages/Workspace.jsx | Workspace › Tidy up | 1 | yes | yes | |
| UI-pipeline-maint-confirm | "Merge these duplicates" / "Remove these links" | button | app/ui/src/pages/Workspace.jsx | the tool, after its preview | 3 | yes | yes | Names the effect. |
| UI-pipeline-maint-discard | "Don't change anything" | button | app/ui/src/pages/Workspace.jsx | the tool, after its preview | 3 | yes | yes | |
| UI-shared-run-cancel | "Cancel" | button | app/ui/src/components/RunItem.jsx | every working item | 1–2 | yes | yes | |
| UI-shared-run-close | "Open the job" / "Open the CV" / "Got it" | link / button | app/ui/src/components/RunItem.jsx, app/ui/src/pages/Today.jsx | finished items | 1–2 | yes | yes | |
| UI-apps-tidy | "Tidy up" › "Find duplicate applications" / "Check my list for problems" | menu | app/ui/src/components/ui.jsx (ActionMenu), app/ui/src/pages/Applications.jsx | Applications › header | 3 | yes | yes | M8. Jumps to the tool in Workspace. The tool's own button must then be pressed. |
| UI-apps-clear | "Clear filters" | button | app/ui/src/pages/Applications.jsx | Applications › filters; "No applications match these filters" | 3 | yes | yes | M8. |
| UI-apps-open-job | "Actions" › "Open the job" | menu item | app/ui/src/pages/Applications.jsx | Applications › row | 3 | yes | yes | M8. |
| UI-apps-empty-link | "Open To review" | link | app/ui/src/pages/Applications.jsx | Applications › "No applications yet" | 2 | yes | yes | M8. |
| UI-job-back | "← Applications" | link | app/ui/src/pages/Job.jsx | Job › top | 3 | yes | yes | M8. Filters and scroll are restored. |
| UI-job-fit-help | "How the fit is worked out" | link | app/ui/src/pages/Job.jsx | Job › Summary | 3 | yes | yes | M8. |
| UI-job-status | "Status" select | select | app/ui/src/components/StatusControl.jsx | Job › Summary | 3 | yes | yes | M8. |
| UI-job-sent | "I've sent my application" | button | app/ui/src/pages/Job.jsx | Job › under Documents (only for Reviewed — not applied) | 4 (Applications, job, scroll, button) | yes | partly — at ≈ 824 px, just below the fold | M8. Opens the "When did you apply…?" dialog. |
| UI-job-never-help | "What the app never does" | link | app/ui/src/components/Documents.jsx | Job › under Documents | 3 | yes | yes | M8. |
| UI-job-choose-design | "Choose a design that passes" | link | app/ui/src/components/Documents.jsx | Job › Tailored CV, when it fails screening | 3 | yes | yes | M8. |
| UI-status-when | "When did you apply to <job>?": "Today (<date>)" / "Yesterday (<date>)" / "On another day" | dialog + radios | app/ui/src/components/StatusControl.jsx | after choosing Applied | 3 | yes | yes | M8. Sends `on`. |
| UI-status-when-date | "Date" | date field | app/ui/src/components/StatusControl.jsx | "On another day" | 4 | yes | partly — needs one more choice | M8. |
| UI-status-note | "Add a note (optional)" | field | app/ui/src/components/StatusControl.jsx | When dialog | 3 | yes | yes | M8. Sends `note`. Only offered with Applied. |
| UI-status-save-applied | "Save as Applied" / "Cancel" | buttons | app/ui/src/components/StatusControl.jsx | When dialog | 3 | yes | yes | M8. |
| UI-run-retry | "Try again" | button | app/ui/src/components/RunItem.jsx | failed items: Today › Needs you, job page, Activity, document cards | 1 (Today) | yes | yes | M8. "What happened" and "What to do" are in words above it. |
| UI-run-open-posting | "Open the posting ↗" | link | app/ui/src/components/RunItem.jsx | failed items | 1 | yes | yes | M8. |
| UI-run-technical | "Technical details" | disclosure | app/ui/src/components/RunItem.jsx | every item | 2 | yes | yes | M8. Kind, lane, exit code, log path, last 80 log lines. |
| UI-run-outcome-open | "Open the job" / "Open the CV" / "Open the letter" / "See the <n> new openings" / "Open Skills" / "Open Workspace" | link | app/ui/src/components/RunItem.jsx | done items | 1–2 | yes | yes | M8. |

### Today

| ID | Label | Type | Component | Surfaced at | Interactions | User's words | Discoverable | Notes |
|---|---|---|---|---|---|---|---|---|
| UI-today-cv-paste | "Your CV" ("Paste your CV here…") | field | app/ui/src/pages/Today.jsx | Today › Get set up › 1 Add your CV | 1 | yes | yes | M8. First run only. |
| UI-today-cv-file | "Choose a file…" | file button | app/ui/src/pages/Today.jsx | Get set up › Add your CV | 1 | yes | yes | M8. Saves at once. |
| UI-today-cv-save | "Save my CV" | button | app/ui/src/pages/Today.jsx | Get set up › Add your CV | 1 + typing | yes | yes | M8. |
| UI-today-cv-edit | "Edit in My CV" | link | app/ui/src/pages/Today.jsx | Add your CV (done); "You're set up" | 1 | yes | yes | M8. |
| UI-today-co-name | "Company name" | field | app/ui/src/pages/Today.jsx | Get set up › 2 Follow a company | 1 | yes | yes | M8. |
| UI-today-co-url | "Careers page link" | field | app/ui/src/pages/Today.jsx | Get set up › Follow a company | 1 | yes | yes | M8. |
| UI-today-co-follow | "Follow company" | button | app/ui/src/pages/Today.jsx | Get set up › Follow a company | 1 + typing | yes | yes | M8. Creates `portals.yml`. |
| UI-today-co-scan | "Check <company> for new openings now" | button | app/ui/src/pages/Today.jsx | Follow a company (done) | 1 | yes | yes | M8. |
| UI-today-ai-install | "How to install it" | link | app/ui/src/pages/Today.jsx | Get set up › 3 AI assistant (missing) | 1 | yes | yes | M8. |
| UI-today-ai-check | "Check again" | button | app/ui/src/pages/Today.jsx | Get set up › AI assistant (missing) | 1 | yes | yes | M8. |
| UI-today-setup-gotit | "Got it" | button | app/ui/src/pages/Today.jsx | "You're set up" card | 1 | yes | yes | M8. |
| UI-today-dismiss | "Dismiss" | button | app/ui/src/pages/Today.jsx | Needs you › failure card | 1 | yes | yes | M8. Undo offered. |
| UI-today-unreadable | "Show me" | link | app/ui/src/pages/Today.jsx | Needs you › "<n> application could not be read" | 1 | yes | yes | M8. To Workspace › Data health. |
| UI-today-design-fails | "Choose a design that passes" | link | app/ui/src/pages/Today.jsx | Needs you › "Your CV design fails the screening check" | 1 | yes | yes | M8. |
| UI-today-board-fix | "Fix <company>" | link | app/ui/src/pages/Today.jsx | Needs you › "<company>: board not found since <date>" | 1 | yes | yes | M8. Lands at the top of Companies, not at the company; the row's "Fix" needs a scroll and a click (3 in all). |
| UI-today-done-open | "Open the job" / "Open the CV" / … | link | app/ui/src/pages/Today.jsx | Just finished | 1 | yes | yes | M8. |
| UI-today-done-gotit | "Got it" | button | app/ui/src/pages/Today.jsx | Just finished | 1 | yes | yes | M8. |
| UI-today-fresh | "Look at the <n> new openings" | link | app/ui/src/pages/Today.jsx | New since you last looked | 1 | yes | yes | M8. |
| UI-today-replied | "Get documents ready (start with the first)" + job links | links | app/ui/src/pages/Today.jsx | Waiting for you › "<n> jobs that replied or are interviewing without a tailored CV or letter" | 1 | yes | yes | M8. |
| UI-today-reviewed | "Review them" + the three best jobs | links | app/ui/src/pages/Today.jsx | Waiting for you › "<n> jobs reviewed but not applied" | 1 | yes | yes | M8. Opens Applications filtered. |

### To review and Companies (was Sources)

| ID | Label | Type | Component | Surfaced at | Interactions | User's words | Discoverable | Notes |
|---|---|---|---|---|---|---|---|---|
| UI-sources-scan | "Check for new openings" | button | app/ui/src/pages/ToReview.jsx, app/ui/src/pages/Companies.jsx, app/ui/src/pages/Today.jsx | Today card; To review; Companies | 1 (Today) | yes | yes | |
| UI-sources-preview-only | "Preview without saving — see what would be added" | checkbox | app/ui/src/pages/ToReview.jsx | To review › Options | 3 | yes | yes | |
| UI-sources-verify | "Confirm each posting is still live — slower" | checkbox | app/ui/src/pages/ToReview.jsx | To review › Options | 3 | yes | yes | |
| UI-sources-company | "Only this company" | select | app/ui/src/pages/ToReview.jsx | To review › Options | 3 | yes | yes | |
| UI-sources-since | "Only openings from the last … days" | field | app/ui/src/pages/ToReview.jsx | To review › Options | 3 | yes | yes | |
| UI-sources-scan-help | "Options" (each option says what it does); hint "<n> companies · a few seconds · no AI" | disclosure | app/ui/src/pages/ToReview.jsx | To review › header | 2 | yes | yes | |
| UI-sources-inbox-toggle | "To review" | page | app/ui/src/pages/ToReview.jsx | Top bar | 1 | yes | yes | M6: partly (collapsed on Sources). |
| UI-sources-inbox-link | "Open the posting ↗" | link | app/ui/src/pages/ToReview.jsx | To review › item | 2 | yes | yes | |
| UI-sources-inbox-evaluate | "Check fit" | button | app/ui/src/pages/ToReview.jsx | To review › item | 2 | yes | yes | Named "Check fit for <job>". |
| UI-sources-help | page lead "The app checks these companies' job boards for new openings." | text | app/ui/src/pages/Companies.jsx | Companies › head | 1 | yes | yes | No Help topic about companies. |
| UI-sources-issues | "<n> job board needs you: <company>. Use Fix below." / badge "Board not found since <date>" | notice + badge | app/ui/src/pages/Companies.jsx | Companies; Today › Needs you | 0 (Today) | yes | yes | |
| UI-sources-add-company | "Follow a company" | button | app/ui/src/pages/Companies.jsx | Companies › header | 2 | yes | yes | Works with no `portals.yml`. |
| UI-sources-add-board | "Add a job-board search" | button | app/ui/src/pages/Companies.jsx | Companies › Job-board searches (≈ 1316 px with 12 companies) | 3 (Companies, scroll, button) | yes | yes | |
| UI-sources-toggle | switch "Check <name> for new openings" | switch | app/ui/src/pages/Companies.jsx | Companies › row | 2 | yes | yes | |
| UI-sources-edit | "Edit" | button | app/ui/src/pages/Companies.jsx | Companies › row | 2 | yes | yes | The form opens inside the row. |
| UI-sources-remove | "Remove" › "Stop following" | button + confirm | app/ui/src/pages/Companies.jsx | Companies › row | 2 + confirm | yes | yes | Undo. |
| UI-sources-filters | "What jobs to keep" | read-only card | app/ui/src/pages/Companies.jsx | Companies › below the lists | 2 (Companies, scroll) | yes | yes | In words. Editing them is not in the UI ("edit … portals.yml with your editor"). |
| UI-sources-form-name | "Company name" / "Name of this search" | field | app/ui/src/pages/Companies.jsx | Follow a company form | 3 | yes | yes | |
| UI-sources-form-careers-url | "Careers page link" / "Job board link" | field | app/ui/src/pages/Companies.jsx | Follow a company form | 3 | yes | yes | |
| UI-sources-form-provider | "Board type" ("Recognised from the link") | select | app/ui/src/pages/Companies.jsx | form › More options | 4 | yes | partly — behind More options (by design) | |
| UI-sources-form-api | "API endpoint" | field | app/ui/src/pages/Companies.jsx | form › More options | 4 | no | partly | |
| UI-sources-form-scan-method | "How to check for openings" | select | app/ui/src/pages/Companies.jsx | form › More options | 4 | yes | partly | Option "Web search (only with the command-line tools)". |
| UI-sources-form-query | "Search query" ("Only for web search.") | field | app/ui/src/pages/Companies.jsx | form › More options | 4 | yes | partly | |
| UI-sources-form-notes | "Notes" | field | app/ui/src/pages/Companies.jsx | form › More options | 4 | yes | partly | |
| UI-sources-form-enabled | switch "Check <name> for new openings" | switch | app/ui/src/pages/Companies.jsx | Companies › row | 2 | yes | yes | The form no longer has the checkbox: new entries are on, and the row's switch pauses them. |
| UI-sources-form-submit | "Follow" / "Add" / "Save" | button | app/ui/src/pages/Companies.jsx | form | 3 + typing | yes | yes | Errors appear next to their fields. |
| UI-sources-form-cancel | "Cancel" | button | app/ui/src/pages/Companies.jsx | form | 3 | yes | yes | |
| UI-review-select | item checkbox | checkbox | app/ui/src/pages/ToReview.jsx | To review › item | 2 | yes | yes | M8. |
| UI-review-bulk-check | "Check fit for selected (<n>)" › "Check <n> jobs" | button + confirm | app/ui/src/pages/ToReview.jsx | To review › list header | 3 + confirm | yes | yes | M8. The confirm states time and cost. |
| UI-review-bulk-remove | "Remove selected (<n>)" › "Remove" | button + confirm | app/ui/src/pages/ToReview.jsx | To review › list header | 3 + confirm | yes | yes | M8. |
| UI-review-remove | "Remove" | button | app/ui/src/pages/ToReview.jsx | To review › item | 2 | yes | yes | M8. Undo. |
| UI-review-retry | "Try again" | button | app/ui/src/pages/ToReview.jsx | To review › item with "Last check failed" | 2 | yes | yes | M8. |
| UI-review-tidy | "Tidy up" › "Remove links already in Applications" | menu | app/ui/src/pages/ToReview.jsx | To review › list header | 3 | yes | yes | M8. Jumps to Workspace. |
| UI-review-processed | "Already checked (<n>)" | disclosure | app/ui/src/pages/ToReview.jsx | To review › bottom | 3 (To review, scroll, open) | yes | yes | M8. Links to each job. |
| UI-review-scan-details | "Technical details" | disclosure | app/ui/src/pages/ToReview.jsx | To review › Last check | 2 | yes | yes | M8. Raw counters ("scan.mjs · …"). |
| UI-review-fix-link | "Fix in Companies" | link | app/ui/src/pages/ToReview.jsx | To review › Last check | 2 | yes | yes | M8. |
| UI-companies-fix | "Fix" | disclosure button | app/ui/src/pages/Companies.jsx | Companies › broken row (Juniper Mobility is the 9th row, ≈ 991 px) | 3 (Companies, scroll, Fix) | yes | yes | M8. Gives advice. It does **not** run the board probe sitemap.md described. |
| UI-companies-fix-actions | "Pause <name>" / "Edit the link" / "Open their careers page ↗" | buttons, link | app/ui/src/pages/Companies.jsx | inside Fix | 4 | yes | partly — one step more | M8. |
| UI-companies-files-help | "Files in your workspace folder" | link | app/ui/src/pages/Companies.jsx | What jobs to keep | 3 | yes | yes | M8. |

### Skills

| ID | Label | Type | Component | Surfaced at | Interactions | User's words | Discoverable | Notes |
|---|---|---|---|---|---|---|---|---|
| UI-skills-fetch | "Read the <n> new postings" | button | app/ui/src/pages/Skills.jsx | Skills › basis line | 2 | yes | yes | Only when postings are unread. |
| UI-skills-retry | — | — | — | not surfaced | — | — | no | No control re-fetches postings that failed (`retryFailed` in `app/server/queue/specs.js`). The basis line only says "N couldn't be loaded". sitemap.md's "Try the 3 failed postings again" was not built. |
| UI-skills-extract | "Improve the analysis" | button | app/ui/src/pages/Skills.jsx | Skills › basis line | 2 | yes | yes | Sessions and cost stated. |
| UI-skills-run-log | run item in place of the buttons (title links to Activity) | link | app/ui/src/components/RunItem.jsx | Skills › basis line, while running | 2 | yes | yes | |
| UI-skills-help | page lead, basis line, ranking sentence, bar legend | text | app/ui/src/pages/Skills.jsx | Skills | 1 | yes | yes | No "?" and no Help topic for Skills. |
| UI-skills-tab-learn | "Learn next" | link | app/ui/src/pages/Skills.jsx | Skills › views | 1 | yes | yes | |
| UI-skills-tab-deepen | "Strengthen" | link | app/ui/src/pages/Skills.jsx | Skills › views | 2 | yes | yes | Was "Deepen". |
| UI-skills-tab-demanded | "Most asked for" | link | app/ui/src/pages/Skills.jsx | Skills › views | 2 | yes | yes | Was "Most demanded". |
| UI-skills-strong | "Only jobs I'd apply to (fit 4 and up)" | checkbox | app/ui/src/pages/Skills.jsx | Skills › filters | 2 | yes | yes | Says what it changed. |
| UI-skills-show-ignored | "Show skills I ignored" | checkbox | app/ui/src/pages/Skills.jsx | Skills › filters | 2 | yes | yes | Now on every view. |
| UI-skills-category | "Category" ("All categories") | select | app/ui/src/pages/Skills.jsx | Skills › filters | 2 | yes | yes | |
| UI-skills-search | "Find a skill" | field | app/ui/src/pages/Skills.jsx | Skills › filters | 2 | yes | yes | |
| UI-skills-expand | "Show the evidence for <skill>" | disclosure | app/ui/src/pages/Skills.jsx | Skills › row | 2 | yes | yes | |
| UI-skills-status | "<skill> on your CV": "Missing" / "Partly" / "Has it" / "Ignore this skill" | select | app/ui/src/pages/Skills.jsx | Skills › row | 2 | yes | yes | |
| UI-skills-reset | "Undo" | button | app/ui/src/shell/undo.jsx | Undo bar / Activity panel | 3 | yes | partly — going back to the automatic reading only works through Undo, and only until the next undoable action | sitemap.md's "Back to automatic" was not built. |
| UI-skills-evidence-posting | "<title> · fit <n> ↗" | link | app/ui/src/pages/Skills.jsx | evidence | 3 | yes | yes | |
| UI-skills-evidence-report | "<Company> — <Role> (#<n>, fit <n>)" | link | app/ui/src/pages/Skills.jsx | evidence › "Flagged as a gap in your fit reports" | 3 | yes | yes | Opens the job page. |
| UI-skills-cooccur | "Often asked for together with: …" | text | app/ui/src/pages/Skills.jsx | evidence | 3 | yes | yes | Plain text now (M6: buttons that jumped to the skill). |
| UI-skills-empty-links | "Companies you follow" · "Check for new openings" | links | app/ui/src/pages/Skills.jsx | Skills › "Nothing to rank yet" | 2 | yes | yes | M8. |

### Activity (was Runs)

| ID | Label | Type | Component | Surfaced at | Interactions | User's words | Discoverable | Notes |
|---|---|---|---|---|---|---|---|---|
| UI-runs-open | "<what> · <job>" (e.g. "Check fit · Driftwood Analytics — Data Engineer") | link | app/ui/src/components/RunItem.jsx | Activity panel; Activity page | 2 | yes | yes | Opens `#/activity/:id`. |
| UI-runs-cancel | "Cancel" | button | app/ui/src/components/RunItem.jsx | working items | 2 | yes | yes | |
| UI-runs-help | page lead; "What happened" / "What to do" on failures | text | app/ui/src/pages/Activity.jsx, app/ui/src/components/RunItem.jsx | Activity | 1–2 | yes | yes | The Help topic "Why something can fail" is linked from nowhere but the Help index (Workspace, scroll, All help topics, topic = 4). |
| UI-activity-filters | "All", "Failed", "Documents", "Fit checks", "Openings" (with counts); "Show all" | chips | app/ui/src/pages/Activity.jsx | Activity page | 3 (Activity, See all activity, chip) | yes | yes | M8. |

### My CV (was CV Studio)

| ID | Label | Type | Component | Surfaced at | Interactions | User's words | Discoverable | Notes |
|---|---|---|---|---|---|---|---|---|
| UI-cv-document | "Preview with" | select | app/ui/src/pages/mycv/Design.jsx | My CV › Design | 3 | yes | yes | Named by job; "Sample CV (fictional)". |
| UI-cv-accent | "Accent colour" (+ "Pick the accent colour") | colour + field | app/ui/src/pages/mycv/Design.jsx | Design › Fine-tune | 5 (My CV, Design, scroll, Fine-tune, field) *estimate* | yes | partly — Fine-tune sits under the 7-card gallery | Gallery: 7 designs in 2 columns of 9rem thumbnails (`app/ui/src/app.css` lines 209, 336). |
| UI-cv-body-font | "Body font" | field | app/ui/src/pages/mycv/Design.jsx | Fine-tune | 5 | yes | partly — as above | |
| UI-cv-heading-font | "Heading font" | field | app/ui/src/pages/mycv/Design.jsx | Fine-tune | 5 | yes | partly — as above | |
| UI-cv-font-size | "Text size" | field | app/ui/src/pages/mycv/Design.jsx | Fine-tune | 5 | yes | partly — as above | |
| UI-cv-margin | "Page margin" | field | app/ui/src/pages/mycv/Design.jsx | Fine-tune | 5 | yes | partly — as above | |
| UI-cv-density | "Spacing" | select | app/ui/src/pages/mycv/Design.jsx | Fine-tune | 5 | yes | partly — as above | |
| UI-cv-section-add | "Add a section to the order" ("Choose…") | select | app/ui/src/pages/mycv/Design.jsx | Fine-tune › Section order | 5 | yes | partly — as above | |
| UI-cv-section-move | "Up" / "Down" (named with the section) | buttons | app/ui/src/pages/mycv/Design.jsx | Fine-tune › Section order | 6 (needs a section added first) | yes | partly | Now text, not arrows. |
| UI-cv-section-remove | "Remove" (named "Remove <section> from the order") | button | app/ui/src/pages/mycv/Design.jsx | Fine-tune › Section order | 6 | yes | partly | |
| UI-cv-save | "Make this my design for every CV" | button | app/ui/src/pages/mycv/Design.jsx | Design › under the preview | 4 + choose a design | yes | partly — below the 60vh preview | A failing design asks "Use … even though it fails screening?" › "Use it anyway". |
| UI-cv-revert | "Leave without saving" (only when leaving) | dialog button | app/ui/src/components/LeaveGuard.jsx | My CV › Design, on leaving with changes | 4 (My CV, Design, another link, Leave without saving) | yes | partly — no "Discard changes" button on the page | Picking the saved card again also undoes a design choice, but not fine-tuning. |
| UI-cv-themes-refresh | — | — | app/ui/src/pages/mycv/Design.jsx | automatic | — | — | no UI by design | sitemap.md: the gallery refreshes itself. In the code it refreshes when the *saved* style or the document changes, not while fine-tuning. |
| UI-cv-theme-pick | "<Design> · your design" + "Readable by screening systems" / "Readable, <n> small issues" / "Screening problems" / "Can't be used with your CV" | toggle buttons | app/ui/src/pages/mycv/Design.jsx | Design › Designs | 3 | yes | yes | M6's "yours" badge for custom designs is gone. |
| UI-cv-render | "Update the layout to <design>" (Job); "Lay out this CV again in <design>" (Design) | button | app/ui/src/components/Documents.jsx, app/ui/src/pages/mycv/Design.jsx | Job › Tailored CV (when the design changed); Design › under the preview | 3 (Job) / 4 (Design) | yes | yes | Design then shows "Laid out again … Open the job's documents". |
| UI-cv-render-all | "Update existing CVs to this design (<n>)" | button | app/ui/src/pages/mycv/Design.jsx | Design › under the preview | 4 | yes | partly — below the preview | |
| UI-cv-render-all-confirm | "Update <n> CVs to the <design> design?" › "Update <n> CVs" | dialog | app/ui/src/pages/mycv/Design.jsx | Design | 5 | yes | partly | Accessible dialog (`app/ui/src/components/ui.jsx`); warns if the design fails screening. |
| UI-cv-ats-notes | verdict "<verdict>." + "Details" | notice + disclosure | app/ui/src/pages/mycv/Design.jsx | Design › Preview | 3 | yes | yes | The verdict is always in view. Job cards show the verdict line but no Details. |
| UI-cv-voice-text | "Your writing rules (voice-dna.md)" | editor | app/ui/src/pages/mycv/Writing.jsx | Writing rules › All rules (≈ 1229 px) | 5 (My CV, Writing rules, scroll, All rules, type) | yes | partly — below the tailored-CV list, closed | Open by default when there are no rules yet. |
| UI-cv-voice-save | "Add" (words to avoid) / "Save" (All rules) | buttons | app/ui/src/pages/mycv/Writing.jsx | Writing rules | 3 + typing (Add) / 5 (Save) | yes | yes | Add a word is instant. |
| UI-cv-voice-seed | "Start from the example rules…" › "Replace my rules" | button + confirm | app/ui/src/pages/mycv/Writing.jsx | All rules | 5 + confirm | yes | partly — inside All rules | Undo and `.bak`. |
| UI-cv-samples | "Writing samples" | read-only list | app/ui/src/pages/mycv/Writing.jsx | Writing rules › bottom | 3 | yes | yes | The folder path is given for adding. |
| UI-cv-help | "What the screening check is", "About writing rules" | links | app/ui/src/pages/mycv/Design.jsx, app/ui/src/pages/mycv/Writing.jsx | Design, Writing rules | 3 | yes | yes | No general "?" for My CV. |
| UI-cv-profile-warning | "Your profile (config/profile.yml) has its own style…, which wins over the settings here. Remove those keys from profile.yml…" | notice | app/ui/src/pages/mycv/Design.jsx | Design › top (only when profile.yml sets them) | 2 | no — file and key names | partly — asks for an edit that the Profile form cannot make | sitemap.md planned "Change in Profile". |
| UI-mycv-subnav | "Content", "Profile", "Design", "Writing rules" | links | app/ui/src/pages/MyCv.jsx | My CV | 2 | yes | yes | M8. |
| UI-mycv-content-editor | "Your CV (Markdown)" | editor | app/ui/src/pages/mycv/Content.jsx | My CV › Content | 2 | yes | yes | M8. Hint explains #, ##, ###. |
| UI-mycv-content-save | "Save" | button | app/ui/src/pages/mycv/Content.jsx | My CV › Content | 2 + typing | yes | yes | M8. "Nothing to save yet" when unchanged. |
| UI-mycv-content-import | "Import from a file" | file button | app/ui/src/pages/mycv/Content.jsx | My CV › Content | 2 | yes | yes | M8. Loads into the editor; the user then saves. |
| UI-mycv-profile-about | "About you": "Name", "Email", "Location" | fields | app/ui/src/pages/mycv/Profile.jsx | My CV › Profile | 3 | yes | yes | M8. |
| UI-mycv-profile-looking | "What you're looking for": "Target roles", "Where and how you want to work", "Target pay", "Lowest pay you would accept" | fields | app/ui/src/pages/mycv/Profile.jsx | My CV › Profile | 3 | yes | yes | M8. |
| UI-mycv-profile-app | "How the app works for you": "Make a tailored CV automatically when the fit is at least", "Language of reports and documents", "Claude usage tier" | fields | app/ui/src/pages/mycv/Profile.jsx | My CV › Profile (≈ 800–830 px) | 4 (My CV, Profile, scroll, field) | yes (language is a code, e.g. "en") | partly — at the fold | M8. |
| UI-mycv-profile-save | "Save profile" | button | app/ui/src/pages/mycv/Profile.jsx | My CV › Profile (≈ 947 px) | 4 + typing | yes | partly — below the fold | M8. Same as R-profile-put. |
| UI-mycv-profile-advanced | "Advanced files" | disclosure | app/ui/src/pages/mycv/Profile.jsx | My CV › Profile › bottom | 4 | yes | partly | M8. |
| UI-mycv-design-show-passing | "Show a design that passes" | button | app/ui/src/pages/mycv/Design.jsx | Design › Preview verdict, on a failing design | 3 | yes | yes | M8. |
| UI-mycv-words-add | "Add a word" › "Add" | field + button | app/ui/src/pages/mycv/Writing.jsx | Writing rules › Words to avoid | 3 + typing | yes | yes | M8. |
| UI-mycv-words-remove | "×" (named "Remove <word>") | button | app/ui/src/pages/mycv/Writing.jsx | Words to avoid › chip | 3 | yes | yes | M8. Undo. |
| UI-mycv-remake | "Open" / "Make it again" per CV | link, button | app/ui/src/pages/mycv/Writing.jsx | Writing rules › When rules apply › Your tailored CVs | 3 | yes | yes | M8. Each says whether it predates the rules. No confirmation here, unlike the job page. |
| UI-mycv-design-help | "What the screening check is" | link | app/ui/src/pages/mycv/Design.jsx | Design › Designs | 3 | yes | yes | M8. |

### Workspace and Help

| ID | Label | Type | Component | Surfaced at | Interactions | User's words | Discoverable | Notes |
|---|---|---|---|---|---|---|---|---|
| UI-workspace-health | "Data health": each issue with what to do | list | app/ui/src/pages/Workspace.jsx | Workspace | 1 | yes | yes | M8. Line numbers and fixes in words; the fix itself is done in an editor. |
| UI-workspace-files-help | "What each file is" | link | app/ui/src/pages/Workspace.jsx | Workspace › Folder | 2 | yes | yes | M8. |
| UI-workspace-ai-check | "Check again" | button | app/ui/src/pages/Workspace.jsx | Workspace › AI assistant | 3 (Workspace, scroll, button) | yes | yes | M8. |
| UI-workspace-ai-install | "How to install it" | link | app/ui/src/pages/Workspace.jsx | Workspace › AI assistant (missing) | 3 | yes | yes | M8. |
| UI-workspace-help | "All help topics" · "Everything the app has done" | links | app/ui/src/pages/Workspace.jsx | Workspace › Help | 3 | yes | yes | M8. |
| UI-help-topics | topic links; "← Help" | links | app/ui/src/pages/Help.jsx | Help | 4 from the top bar (Workspace, scroll, All help topics, topic); 2–3 through a "?" link | yes | yes | M8. Eight topics. Most are reached in context ("What a check costs", "How the fit is worked out"…), so the count from where the question arises is ≤ 3. |

## 5. Upstream capabilities a career-ops user expects

Source: upstream `AGENTS.md` and `modes/`. These rows are not part of the §12.6 metric.
"M6" gives the baseline's answer.

| ID | Upstream command or script | What it does | Console equivalent (M8) | M6 |
|---|---|---|---|---|
| U-oferta | `oferta`, auto-pipeline | Evaluate one offer | K-evaluate ("Check fit now") — yes | yes |
| U-pdf | `pdf` | Tailored CV PDF | K-pdf + K-cv-render ("Make tailored CV") — yes | yes |
| U-cover | `cover` | Cover letter | K-cover ("Write cover letter") — yes | yes |
| U-scan | `scan` | Portal scanner | K-scan ("Check for new openings") — yes | yes |
| U-tracker | `tracker` | Tracker overview | Applications — yes | yes |
| U-pipeline | `pipeline` | Process every pending URL | To review › "Check fit for selected (N)" — yes | partial |
| U-batch | `batch` | Mass processing | partial — bulk check, queued two at a time; no batch mode | none |
| U-upskill | `upskill`, `jd-skill-gap.mjs` | Skill gaps | Skills — yes | yes |
| U-ats | `ats` | ATS score of any CV | partial — screening check on every design and tailored CV; no "check any PDF" | partial |
| U-integrity | `verify-pipeline.mjs`, `dedup-tracker.mjs`, `reconcile-pipeline.mjs`, `validate-portals.mjs`, `verify-portals.mjs` | Maintenance | Workspace › Tidy up — yes, **except `validate-portals.mjs`** | yes |
| U-set-status | `set-status.mjs --note` | Status with a note | partial — date and note only with Applied | partial |
| U-interview | `interview`, `doctor.mjs` | First-run setup | Today › Get set up (CV, company, assistant) — yes; profile fields in My CV › Profile | none |
| U-intake | `intake` | Profile from documents | none (out of scope v1, sitemap.md) | none |
| U-add | `add`, `add-entry.mjs` | Add a role to the CV / a tracker row | partial — the CV is editable in My CV › Content; no manual tracker row | none |
| U-expand | `expand` | Missing competencies | none | none |
| U-ofertas | `ofertas` | Compare offers | none | none |
| U-triage | `triage` | Quick first pass | none | none |
| U-deep | `deep` | Company research | none | none |
| U-contacto | `contacto`, `contacts.mjs`, `linkedin-join.mjs` | Outreach | none | none |
| U-email | `email` | Application email | none (§9.1) | none |
| U-apply | `apply` | Form-filling assistant | none (§9.1, §10); Help › "What the app never does" says so | none |
| U-interview-prep | `interview-prep` family | Interview preparation | none | none |
| U-offer-prep | `offer-prep` | Contract reading | none | none |
| U-followup | `followup`, `followup-cadence.mjs` | Follow-ups | partial — Today › "jobs that replied or are interviewing without a tailored CV or letter"; no cadence | none |
| U-reply-watch | `reply-watch`, `paste-reply.mjs` | Classify replies | none | none |
| U-outcome | `outcome`, `calibrate`, `patterns`, … | Outcomes and patterns | none | none |
| U-stats | `stats.mjs`, `salary-gap.mjs`, … | Statistics | partial — status chip counts, Workspace counts | none |
| U-titles | `titles` | Adjacent titles | none | none |
| U-training | `training`, `project` | Evaluate a course or project | none | none |
| U-latex | `latex`, `latex-tex`, `text` | LaTeX / text exports | none | none |
| U-discover | `discover` | Find a company's board | partial — "Find the right job board for a company" (suggestions in raw output only) | partial |
| U-websearch | `scan_method: websearch` | Search companies with no board | shown, not run ("Web search (only with the command-line tools)") | none |
| U-agent-inbox | `agent-inbox` | Queue for the next session | none | none |
| U-update | `update`, `update-system.mjs` | Update the system | none (M9) | none |
| U-language | `language.output` | Output language | My CV › Profile › "Language of reports and documents" — yes | none |

## Summary

### Totals per table

| Table | Rows | yes | partly | no | no UI by design |
|---|---|---|---|---|---|
| 1. Server routes | 51 (50 routes + static fallback; 14 new in M8) | 37 | 5 | 4 | 5 |
| 2. Run kinds | 17 (13 user-startable, 4 internal) | 10 | 2 | 1 | 4 |
| 3. Config and data files | 18 | 11 | 4 | 2 | 1 |
| 4. UI actions | 207 (119 M6 IDs + 88 M8 additions) | 169 | 35 | 2 | 1 |
| **All** | **293** | **227** | **46** | **9** | **11** |

UI actions by page:
- Global and shell: 21 (7 M6 + 14 new)
- Applications, job page and shared: 59 (40 M6 + 19 new)
- Today: 20 (new)
- To review and Companies: 39 (27 M6 + 12 new)
- Skills: 19 (18 M6 + 1 new)
- Activity: 4 (3 M6 + 1 new)
- My CV: 39 (24 M6 + 15 new)
- Workspace and Help: 6 (new)

### Discoverability (§12.6 metric)

- **227 of 293 capabilities (77.5%)** are discoverable: ≤ 3 interactions from Today with
  a label in the user's own words.
- **233 of 293 (79.5%)** are reachable in ≤ 3 interactions, whatever the label. This
  counts the 227 above plus 6 "partly" rows that are close enough but fall short on the
  label or on completeness: UI-shell-workspace, UI-cv-profile-warning,
  C-writing-samples, C-cv-templates, K-skills-cv and UI-skills-reset.
- **Excluding the 11 plumbing capabilities** ("no UI by design", sitemap.md):
  **227 of 282 (80.5%)**.
- **On the M6 rows only** (the 191 IDs both inventories share): **134 of 191 (70.2%)**.
  Excluding the same 11 plumbing rows, that is 134 of 180 (74.4%). The 88 new UI rows
  are mostly Today and shell controls, all one click away, so they raise the overall
  figure.

### Compared with M6 (96 of 191 = 50.3%)

- **Up, on the same rows:** 50.3% → 70.2% (+38 capabilities). On all rows, 77.5%.
- **What moved:**
  - Every capability that M6 found below a 40-row table now has its own page or anchor:
    the report detail, the Maintenance bar and the inbox.
  - The engineering words are gone. "Runs", "Dedup", "Reconcile", "Probe", "tokens",
    "Provider" and "Scan method" became "Activity", "Find duplicate applications",
    "Remove links already in Applications", "Check companies' job boards", "Fine-tune"
    and "More options".
  - M6's 12 "no" rows: 8 are now surfaced (cv.md, profile.yml, modes/_profile.md,
    article-digest.md, R-cv-templates, R-run, and the inbox and status-date gaps). The
    rest stay "no".
- **Why it is not 100%** (the target):
  - **Depth on My CV › Design.** The action buttons sit under a 60vh preview, and
    Fine-tune sits under a 7-card gallery. That accounts for 15 "partly" rows.
  - **The job page is one click deeper than M6's inline detail.** The cover-letter form's
    six controls are 4 from Today but 2 from the job.
  - **Fold placement:** Profile's Save and last field group, and "I've sent my
    application".
  - **"More options" in the Follow form** (5 rows), which is by design.
  - **Two M6 controls the rebuild dropped:** "Validate sources" and "Retry N failed"
    fetches.
- **Not built, against sitemap.md:**
  - "Fit reports not in Applications" (Workspace);
  - "Companies to skip";
  - Job › History from `status-log.tsv`;
  - "Back to automatic" (Skills);
  - "Read my CV's skills again";
  - "Try the N failed postings again";
  - "Discard changes" (Design);
  - "Yours" on custom designs;
  - writing samples' "Open";
  - "Change in Profile" on the override warning;
  - `validate-portals`;
  - "Fix" running the board probe.

  These are the M8 gaps behind the "no" and several "partly" rows.

### Capabilities with no UI surface

1. **`data/blacklist.md`** (C-blacklist-md). It is named only in a failure explanation.
2. **Status history and notes** (C-status-log). Job › History does not read the ledger.
   A note or date can be sent only with Applied (R-status).
3. **Reports without a tracker row** (R-reports-list). Links to them from "Already
   checked" land on "Job not found".
4. **`validate-portals`** (K-validate-portals, UI-pipeline-maint-validate). No control
   starts it, and it shares its Activity name with `verify-portals`.
5. **Retrying failed posting fetches** (UI-skills-retry). The `retryFailed` option is not
   surfaced.
6. **Re-reading the CV's skills when no posting is pending** (K-skills-cv; partly).
7. **Editing the scan filters** in `portals.yml`. They are read-only in words, by
   decision D-3.
8. **Adding, opening or removing writing samples; creating custom designs; editing
   `modes/_profile.md` and `article-digest.md`.** These happen in the file system; the
   UI names and explains them.
9. **The tracker beyond status:** editing notes, adding a row by hand, deleting a row.
10. **Run options:** model (`evaluate`, `pdf`, `cover`), paper format (`pdf`), fetch
    limit (`skills-fetch`), session cap (`skills-extract`, fixed at 5).
11. **Agent CLI path and concurrency.** Workspace shows them read-only ("comes in a later
    version", M9).
12. **The profile's `style` / `cv.sections` / `cv.template` overrides.** The warning asks
    for a file edit the Profile form cannot make.
13. **Routes the UI does not call**, whose facts reach the user another way: R-health
    (via R-workspace), R-run-events (via R-events and R-run) and R-scan-summary (via
    R-inbox).
14. **Upstream modes with no console equivalent** (table 5): intake, expand, ofertas,
    triage, deep, contacto, email, apply, the interview-prep family, offer-prep,
    reply-watch, outcome/calibrate/patterns, titles, training/project, latex/text,
    agent-inbox and update. Batch, ats, stats, followup, add, discover and set-status
    are partial.
