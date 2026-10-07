# Capability inventory (M8 re-measure, method 1)

What the rebuilt console can do, and where the M8 UI shows each capability. This is the
re-measure of PROJECT_PLAN.md §12.2 method 1 against the code on branch
`feat/m8-ux-build` at commit **b7a7af1c** (after ac0c78da, 0063ab11 and b7a7af1c). The M6
baseline stays unchanged in `app/ux/inventory.md`. Nothing here judges the design; the
heuristic evaluation and the reviews in `app/ux/m8/reviews/` do that.

## How to read this file

- **Row IDs.** Every M6 ID (`R-…`, `K-…`, `C-…`, `UI-…`, `U-…`) is kept where the
  capability still exists, so the two inventories can be compared row by row. M8 additions
  get new IDs (`R-workspace`, `UI-today-…`, `UI-shell-…` and so on), listed after the M6
  rows of each section. Rows added or changed by the last three commits name the commit
  (ac0c78da, 0063ab11 or b7a7af1c) in Notes.
- **Surfaced at** is `Page › section › control`, with the on-screen labels from
  `app/ui/src` and the page names of `app/ux/design/ia.md`. The six top-bar destinations
  are Today (the landing page, `#/today`), Applications, To review, Companies, Skills and
  My CV (`app/ui/src/lib/routes.js`, `DESTINATIONS`). Activity (a button with a panel),
  Workspace and Help (links) are also in the top bar (`app/ui/src/shell/TopBar.jsx`). The
  job page (`#/applications/:id`), the report-only page (`#/applications/report/:n`) and
  the Activity page are reached from those.
- **Start page** is the page where a user would look for the capability (PROJECT_PLAN.md
  §12.6). The rules are in "Start pages assumed" below.
- **From there** counts interactions from the start page; this is the §12.6 measure.
  **From Today** counts from the landing page, the rule M6 and the first M8 inventory
  used; it is kept as a secondary figure.
  - One interaction is each click, each choice in a select or menu (open and choose
    together), and each scroll needed to bring an off-screen control into view (one
    scroll, whatever its length: a wheel flick or End).
  - Typing into the required fields of a form is written as "+ typing". A confirmation
    dialog after the control is written as "+ confirm". Neither is counted, as in M6. The
    exception is a row that *is* the field or the confirm button.
  - Scrolls are judged at **1280 × 800** (the M6/M7 audit viewport), from the full-page
    shots `app/ux/m8/a11y/shots/populated-*-light-100.png`. Those shots predate
    ac0c78da–b7a7af1c. Where a control moved in those commits, its position is worked out
    from the shot plus the code and `app/ui/src/app.css`, and marked *estimate*.
- **User's words**: whether the label is one a job seeker uses (the glossary in
  `app/ux/design/brief.md` and `ia.md` §3).
- **Discoverable** (the §12.6 metric):
  - **yes**: ≤ 3 interactions *from the start page* and labelled in the user's words;
  - **partly**: surfaced, but one or both of those fail;
  - **no**: not surfaced in the UI at all;
  - **no UI by design**: the 11 plumbing capabilities `app/ux/design/sitemap.md`
    (§Totals) classes as mechanisms nobody asks for by name, each with the sitemap's
    reason. They are counted separately and left out of the "excluding plumbing" figures.
- `app/ux/ux.test.js` parses this file. Every route (`METHOD /path`) and every run kind
  sits verbatim in its own table cell. Every `app/ui/src/…` path cited here exists.

## Start pages assumed

Where the start page is not simply the page that holds the control:

| Capability | Start page | Why |
|---|---|---|
| Anything about one job: its documents, cover letter, fit report, History, "I've sent my application", status on the job | the job page | A user acting on one job opens that job first. From Today that is 2 clicks (Applications, the job) or 1 from a Today card. |
| CV design, fine-tuning, writing rules, writing samples, profile fields | My CV | My CV opens on Content (`#/my-cv/content`). Profile, Design and Writing rules cost one more click. The sub-section is never assumed as the start. |
| Fit reports with no Applications row | Workspace (Data health) | sitemap.md places them there. A user who looks in Applications finds no pointer; Workspace is one top-bar click away, so the count from Applications is 2, still ≤ 3. |
| Tidy-up tools (duplicates, links already in Applications, list problems) | Workspace | ia.md §2.9. Applications and To review have "Tidy up" menus that jump there. |
| Board problems: Fix, finding the right board, checking the companies list, Companies to skip | Companies | ia.md §2.5; the Today card "Fix <company>" leads there. |
| Scan options | To review | The "Check for new openings" button and its Options are there. |
| The When dialog (date and note for Applied) | Applications (status select) or the job page | It opens after choosing Applied. |
| Cancel, Try again, Technical details | the run item, wherever it shows | ia.md §3 "Run feedback": progress shows where the user clicked. |
| Undo | the Undo bar that appears after the action | Counted as 1 after the action. |
| Help topics | Help (top bar) or the "?" link beside the control | Help is in the top bar since 0063ab11. |
| Top-bar controls | any page | The top bar is on every page. |

## 1. Server routes

Source: `app/server/app.js`. There are **55 routes**: the 36 of M6, 14 added in the first
M8 build, and 5 added in ac0c78da (`/api/pipeline/:id/history`, `/api/skip-list`,
`/api/cv/writing-samples/:name`, `/api/profile/design/release`,
`/api/profile/design/restore`; the first three are served by
`app/server/services/ledgers.js`). The static/SPA fallback makes a 56th row. The UI calls
routes through `app/ui/src/api.js` and the shared resources in `app/ui/src/data.js`.

| ID | Route | What it does | Surfaced at | Label | Start page | From there | From Today | User's words | Discoverable | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| R-health | GET /api/health | Data root, tracker path, counts, parse issues | not surfaced: the route is not called | — | Workspace | — | — | — | no — route not called | `fetchHealth` in `app/ui/src/api.js` is still never imported. sitemap.md and ia.md (§2.1, §2.9) give this capability a place, Workspace › Folder and Data health and Today's "could not be read" card, and that place is built, but it is fed by R-workspace and R-pipeline. Not "no UI by design" (sitemap.md does not list it there). See "Redundant routes" in the Summary. |
| R-pipeline | GET /api/pipeline | Tracker rows, statuses, issues | Applications › table | "Applications" | Applications | 0 | 1 | yes | yes | Also feeds search, Today's cards, the top bar and the job page (`app/ui/src/data.js`). |
| R-reports-list | GET /api/reports | Every report with its Machine Summary | Workspace › Data health › "Fit reports not in Applications (N)", each with "Open" | "Fit reports not in Applications", "Open" | Workspace | 1 (Open) | 2 | yes | yes | Called now (resource `reports`, `app/ui/src/data.js`; `reportsNotInApplications` in `app/ui/src/lib/reports.js` leaves out older checks of a job that has a row). Lists 20, then "and N more, in the reports folder". Open lands on the report-only page (UI-job-report-only-check). Matches sitemap.md's place and step count. |
| R-report | GET /api/reports/:id | One report: header, Machine Summary, A–G prose, PDF/cover/ATS facts | Job › Fit report; report-only page | "Fit report" | the job page | 1 (scroll; the section starts at ≈ 930 px, *estimate*) | 3 (Applications, job, scroll) | yes | yes | `app/ui/src/pages/Job.jsx`. A report with no row now opens as a readable page ("This fit report isn't in your Applications…") instead of "Job not found". |
| R-report-pdf | GET /api/reports/:id/pdf | Streams the tailored CV PDF | Job › Documents › Tailored CV › "Open" / "Download"; My CV › Writing rules › Your tailored CVs › "Open" | "Open", "Download" | the job page | 1 | 3 | yes | yes | `app/ui/src/components/Documents.jsx`, `app/ui/src/pages/mycv/Writing.jsx`. Search also finds "Tailored CV · <job>" (`app/ui/src/shell/Search.jsx`). |
| R-report-cover | GET /api/reports/:id/cover | Streams the cover letter PDF | Job › Documents › Cover letter › "Open" / "Download" | "Open", "Download" | the job page | 1 | 3 | yes | yes | |
| R-cv-style-get | GET /api/cv/style | Saved style, field help, densities, section keys, profile overrides | My CV › Design | "Design" | My CV | 1 | 2 | yes | yes | |
| R-cv-style-put | PUT /api/cv/style | Saves `config/cv/style.yml` | My CV › Design › Preview › "Make this my design for every CV" | "Make this my design for every CV" | My CV | 2 (Design, button) + choose a design | 3 | yes | yes | Now above the 60vh preview, in view with the verdict (`app/ui/src/pages/mycv/Design.jsx`, comment "UI-cv-save"; ≈ 360 px, *estimate*). Disabled until something changed. A failing design asks "Use it anyway". |
| R-cv-voice-get | GET /api/cv/voice | `voice-dna.md`, its words to avoid, the example text | My CV › Writing rules | "Writing rules" | My CV | 1 | 2 | yes | yes | |
| R-cv-voice-put | PUT /api/cv/voice | Writes the whole `voice-dna.md` | My CV › Writing rules › All rules › "Save"; › "Start from the example rules…" | "All rules", "Save" | My CV | 4 (Writing rules, All rules, scroll, Save) + typing | 5 | yes | partly — Save sits under a 16-row editor | All rules now comes right after Words to avoid (summary ≈ 560 px), but opened, its editor runs to ≈ 1010 px and Save to ≈ 1070 px (*estimate*, from `populated-my-cv-writing-light-100.png` and `rows={16}` in `app/ui/src/pages/mycv/Writing.jsx`). Adding one word uses R-cv-voice-words-add instead (2). |
| R-cv-templates | GET /api/cv/templates | Lists custom designs in `config/cv/templates/` | My CV › Design › Designs (names, "Yours"); Job › Documents (design name) | the design's name, "Yours" | My CV | 1 | 2 | yes | yes | Gallery cards with `source === 'custom'` carry the badge "Yours" (`app/ui/src/pages/mycv/Design.jsx`), as sitemap.md planned. |
| R-cv-writing-samples | GET /api/cv/writing-samples | Lists `writing-samples/` | My CV › Writing rules › Writing samples | "Writing samples" | My CV | 1 (the list is at ≈ 650–760 px, *estimate*) | 2 | yes | yes | Each sample is now an "Open <name>" disclosure (R-cv-writing-sample). |
| R-cv-documents | GET /api/cv/documents | Structured CV payloads plus the sample | My CV › Design › "Preview with" | "Preview with": "Cobalt Freight — Staff Software Engineer, Oct 6" | My CV | 2 (Design, select) | 3 | yes | yes | Named by job (`docLabel` in `app/ui/src/pages/mycv/Design.jsx`). |
| R-cv-preview | POST /api/cv/preview | Renders unsaved settings, runs the screening check | My CV › Design › Preview (automatic) | "Preview", "Updating…", "Readable by screening systems." | My CV | 1 | 2 | yes | yes | |
| R-cv-preview-pdf | GET /api/cv/preview/:id | Streams a preview PDF | My CV › Design › preview frame | — | — | — | — | — | no UI by design | sitemap.md: transport for R-cv-preview. |
| R-cv-themes | POST /api/cv/themes | Every design rendered with a verdict | My CV › Design › Designs | "Designs", "Readable by screening systems" / "Readable, N small issues" / "Screening problems" | My CV | 1 | 2 | yes | yes | |
| R-cv-render-all | POST /api/cv/render-all | Queues one `cv-render` per CV with a report | My CV › Design › Preview › "Update existing CVs to this design (6)" | as label | My CV | 2 (Design, button) + confirm | 3 | yes | yes | Now above the preview, beside "Make this my design…". Confirm "Update 6 CVs". |
| R-cv-thumbs | GET /api/cv/thumbs/:key | Design thumbnails | My CV › Design › gallery images | — | — | — | — | — | no UI by design | sitemap.md: images for R-cv-themes. |
| R-skills | GET /api/skills | Coverage, ranked skills, evidence | Skills | "Skills" | Skills | 0 | 1 | yes | yes | |
| R-skills-extract | POST /api/skills/extract | Queues up to 5 `skills-extract` (+ `skills-cv` when stale) | Skills › basis line › "Improve the analysis" | "Improve the analysis" + "Reads N postings with Claude · about N sessions · uses your Claude plan" | Skills | 1 | 2 | yes | yes | Shown only when postings wait for Claude (`cov.pendingLlm`, `app/ui/src/pages/Skills.jsx`). `max` is fixed at 5. |
| R-skills-overrides | PUT /api/skills/overrides | Sets or clears a skill's status | Skills › row › "<skill> on your CV"; › "Back to automatic" | "Missing" / "Partly" / "Has it" / "Ignore this skill"; "Back to automatic" | Skills | 1 | 2 | yes | yes | Clearing (`status: null`) now has its own control (UI-skills-reset), with Undo. |
| R-status | PATCH /api/pipeline/rows/:id/status | Changes status through `set-status.mjs`, with `on` and `note` | Applications › row › Status; Job › Status; Job › "I've sent my application" | "Status for <job>", status words (`ia.md` §3) | Applications | 1 (Status select) | 2 | yes | yes | `on` and `note` are sent only for Applied, through "When did you apply…?" (`app/ui/src/components/StatusControl.jsx`). Other statuses still cannot carry a note. |
| R-inbox | GET /api/inbox | Pending and processed entries, last scan | To review | "To review" | To review | 0 | 1 | yes | yes | Processed entries shown ("Already checked (30)"); their links now open for reports with no row too. |
| R-inbox-add | POST /api/inbox/urls | Appends a link; with `evaluate`, starts a check | Applications › Add a job; Today › Check your first job | "Check fit now", "Save for later" | Applications | 1 + typing | 2 + typing | yes | yes | `app/ui/src/components/AddJob.jsx`. |
| R-agent-status | GET /api/agent/status | Claude CLI found and signed in, profile facts, max agents | Today › Get set up › AI assistant; Workspace › AI assistant | "AI assistant", "Check again" | Workspace | 2 (scroll, Check again) | 3; 0 on first run | yes | yes | `?refresh=1` is "Check again" (`checkAgent` in `app/ui/src/api.js`). The CLI path and concurrency are shown read-only. |
| R-portals | GET /api/portals | Companies, boards, filters, health | Companies | "Companies", "Companies you follow" | Companies | 0 | 1 | yes | yes | |
| R-portals-create | POST /api/portals/entries | Adds a company or board; creates `portals.yml` if missing | Companies › "Follow a company" › "Follow"; Today › Get set up › "Follow company" | "Follow a company", "Follow" | Companies | 2 (Follow a company, Follow) + typing | 3 + typing | yes | yes | |
| R-portals-update | PATCH /api/portals/entries/:kind/:index | Edits, pauses or resumes one entry | Companies › row › switch "Check <name> for new openings"; "Edit" › "Save"; Fix › "Pause <name>" | as label | Companies | 1 | 2 | yes | yes | |
| R-portals-delete | DELETE /api/portals/entries/:kind/:index | Removes one entry | Companies › row › "Remove" | "Remove", confirm "Stop following" | Companies | 1 + confirm | 2 + confirm | yes | yes | Undo re-creates the entry; `portals.yml.bak` kept. |
| R-runs | GET /api/runs | Queued, active and recent runs | Top bar › "Activity" (panel); Activity page | "Activity" / "Activity · 1 failed" / "· 2 working" / "· 1 done" | any page | 1 | 1 | yes | yes | `activitySummary` in `app/ui/src/lib/runs.js`. |
| R-runs-start | POST /api/runs | Starts any non-internal kind | every action button (table 2) | — | — | — | — | — | no UI by design | sitemap.md: transport for every action button. |
| R-run | GET /api/runs/:id | One run with its log lines | Activity › item › "Technical details"; Workspace › Tidy up results | "Technical details" | the run item | 1 | 2 | yes | yes | `app/ui/src/components/RunItem.jsx`, `app/ui/src/pages/Workspace.jsx`. |
| R-run-cancel | POST /api/runs/:id/cancel | Cancels a queued or running run | any working item › "Cancel" | "Cancel" | the run item | 1 | 1–2 | yes | yes | Inline, Today › Working now, Activity. |
| R-run-events | GET /api/runs/:id/events | SSE per run | not surfaced: the route is not called | — | Activity | — | — | — | no — route not called | `runEventsUrl` in `app/ui/src/api.js` is never imported. sitemap.md places "Live progress and log" at Activity › item and Technical details; that place is built, fed by R-events (progress) and R-run (log). Not "no UI by design" in sitemap.md. See "Redundant routes". |
| R-events | GET /api/events | SSE: file changes and run transitions | whole app | "Lost the connection to the app…" (only when down, `app/ui/src/App.jsx`) | — | — | — | — | no UI by design | sitemap.md: keeps pages current. |
| R-scan-summary | GET /api/scan/summary | Last scan's counters | not surfaced: the route is not called | — | To review | — | — | — | no — route not called | The counters reach To review › "Last check, Sep 24, 08:01: 18 new openings" through R-inbox (`lastScan`). sitemap.md gives it that place; same case as R-health. |
| R-static | GET /* (static files and SPA fallback) | Serves the built UI | the app itself | — | — | — | — | — | no UI by design | sitemap.md: the app itself. Old hash routes redirect (`app/ui/src/lib/routes.js`). |
| R-workspace | GET /api/workspace | Files present, set-up steps, counts, issues, assistant check | Today (set-up and needs cards); Workspace › Folder, Data health | "Get set up", "Folder", "Data health" | Workspace | 0 | 1; 0 on Today | yes | yes | M8. |
| R-today-get | GET /api/today | Last looked, dismissed cards | Today › "New since you last looked" | "New since you last looked" | Today | 0 | 0 | yes | yes | M8. |
| R-today-put | PUT /api/today | Writes last looked; dismisses or restores a card | Today › Needs you › "Dismiss" · "Undo" | "Dismiss", "Undo" | Today | 1 | 1 | yes | yes | M8. Last looked is written when the user leaves Today. |
| R-cv-content-get | GET /api/cv/content | Reads `cv.md` with a summary | Today › Get set up › Add your CV; My CV › Content | "Your CV (Markdown)", "What the app reads from it" | My CV | 0 | 1 | yes | yes | M8. |
| R-cv-content-put | PUT /api/cv/content | Saves `cv.md`, keeping `cv.md.bak` | Today › "Save my CV"; My CV › Content › "Save" | "Save my CV", "Save" | My CV | 1 + typing | 2 + typing; 1 on first run | yes | yes | M8. |
| R-profile-get | GET /api/profile | Reads the Profile fields | My CV › Profile | "Profile" | My CV | 1 | 2 | yes | yes | M8. |
| R-profile-put | PUT /api/profile | Saves the fields, keeping comments and unknown keys | My CV › Profile › sticky bar › "Save profile" | "Save profile" | My CV | 2 (Profile, Save profile) + typing | 3 + typing | yes | yes | The Save bar is `position: sticky; bottom: 0` (`.savebar` in `app/ui/src/app.css`; `app/ui/src/pages/mycv/Profile.jsx`), so it is in view wherever the user is in the form (0063ab11). |
| R-cv-voice-words-add | POST /api/cv/voice/words | Adds one word under `## Never write` | My CV › Writing rules › Words to avoid › "Add" | "Add a word", "Add" | My CV | 2 (Writing rules, Add) + typing | 3 + typing | yes | yes | M8. |
| R-cv-voice-words-remove | DELETE /api/cv/voice/words | Removes one word | My CV › Writing rules › word chip › "×" | "×" (named "Remove <word>") | My CV | 2 | 3 | yes | yes | Undo re-adds it. M8. |
| R-cv-voice-restore | POST /api/cv/voice/restore | Swaps `voice-dna.md` with its `.bak` | My CV › Writing rules › All rules › "Start from the example rules…" › "Replace my rules" › "Undo" | "Undo" | My CV | 6 (Writing rules, All rules, scroll, Start from…, Replace my rules, Undo) | 7 | yes | partly — only as the Undo of a replacement | A plain Save of All rules also keeps a `.bak` but offers no Undo (`saveAll` in `app/ui/src/pages/mycv/Writing.jsx`), so "go back to my previous rules" is reachable only right after "Start from the example rules". M8. |
| R-cv-design-check | GET /api/cv/design-check | Renders the saved design once and reports the verdict | Today › Needs you › "Your CV design fails the screening check"; Job › Documents › "Make it again" confirm | as label, "Choose a design that passes" | Today | 0 (when it fails) | 0 | yes | yes | M8. |
| R-inbox-remove | DELETE /api/inbox/urls | Removes a link from To review | To review › item › "Remove"; "Remove selected (N)" | "Remove" | To review | 1 | 2 | yes | yes | M8. |
| R-inbox-restore | POST /api/inbox/urls/restore | Puts a removed line back | Undo bar / Activity panel › "Undo" | "Undo" | the Undo bar | 1 after the action | 3 (To review, Remove, Undo) | yes | yes | M8. |
| R-run-retry | POST /api/runs/:id/retry | Re-queues a failed run with the same request | Today › Needs you › "Try again"; Activity; job page; To review | "Try again" | the run item | 1 | 1 | yes | yes | Offered only when `explainFailure` allows it (`app/ui/src/lib/runs.js`). M8. |
| R-pipeline-history | GET /api/pipeline/:id/history | One row's status changes from `data/status-log.tsv`, oldest first | Job › History | "History": "Sep 24 · Reviewed — not applied → Applied", "· by <source>" | the job page | 1 (scroll; History is the last section, ≈ 2290 px, *estimate*) | 3 (Applications, job, scroll) | yes | yes | ac0c78da, 0063ab11. `readStatusHistory` in `app/server/services/ledgers.js`; `useStatusHistory` in `app/ui/src/pages/Job.jsx`. Lists date, from and to, and the source when it is not the app or `set-status`. The ledger has no note column, so notes are not in History (the row's note shows in the Summary as "Your note:"). |
| R-skip-list | GET /api/skip-list | `data/blacklist.md`, read-only, parsed with `scan.mjs`'s `parseBlacklist` | Companies › "Companies to skip" | "Companies to skip" | Companies | 1 (scroll; the last card, ≈ 1800 px, *estimate*) | 2 | yes | yes | ac0c78da, 0063ab11. `readSkipList` in `app/server/services/ledgers.js`; `SkipList` in `app/ui/src/pages/Companies.jsx`. |
| R-cv-writing-sample | GET /api/cv/writing-samples/:name | One sample's text (text and Markdown only, cut at 200 KB) | My CV › Writing rules › Writing samples › "Open <name>" | "Open <name> · changed <date>" | My CV | 2 (Writing rules, Open) | 3 | yes | yes | ac0c78da, 0063ab11. `readWritingSample` in `app/server/services/ledgers.js`; `Sample` in `app/ui/src/pages/mycv/Writing.jsx`. Other file types say "open this one from the folder". |
| R-profile-design-release | POST /api/profile/design/release | Removes `profile.yml`'s own style and section order | My CV › Design › override notice › "Let this page decide" | "Let this page decide" | My CV | 2 (Design, button) | 3 | yes | yes | ac0c78da, 0063ab11. Shown only when `profile.yml` sets them (`handOver` in `app/ui/src/pages/mycv/Design.jsx`). Hint: "Removes only those settings from profile.yml; everything else in it stays. You can undo it." |
| R-profile-design-restore | POST /api/profile/design/restore | Puts those `profile.yml` keys back | Undo bar after "Let this page decide" | "Undo" | the Undo bar | 1 after the action | 4 (My CV, Design, Let this page decide, Undo) | yes | yes | ac0c78da, 0063ab11. The route exists only to undo the release, so the Undo is its whole purpose. |

## 2. Run kinds

Source: `RUN_KINDS` in `app/server/queue/specs.js`. These are the same 17 kinds as in M6.
The UI names each one in `RUN_NAMES` (`app/ui/src/lib/runs.js`); `validate-portals` and
`verify-portals` now have different names.

| ID | Kind | Internal | Activity name | UI label | Surfaced at | Start page | From there | From Today | User's words | Discoverable | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| K-scan | scan | no | Check for new openings | "Check for new openings"; "Check <company> for new openings now" | Today › New since you last looked; To review (header); Companies (header) | To review | 1 | 1 (Today card) | yes | yes | Options under To review › "Options". Chains `skills-fetch-auto`. |
| K-dedup | dedup | no | Find duplicate applications | "Find duplicate applications" › "Merge these duplicates" | Workspace › Tidy up; Applications › "Tidy up" menu (jumps to Workspace) | Workspace | 2 (scroll, button) + confirm | 3 + confirm | yes | yes | Preview first, then confirm. |
| K-reconcile | reconcile | no | Remove links already in Applications | as label › "Remove these links" | Workspace › Tidy up; To review › "Tidy up" | Workspace | 2 + confirm | 3 + confirm | yes | yes | |
| K-verify-pipeline | verify-pipeline | no | Check my list for problems | as label | Workspace › Tidy up; Applications › "Tidy up" | Workspace | 2 | 3 | yes | yes | "Found problems:" is an answer, not a failure. |
| K-validate-portals | validate-portals | no | Check the companies list for mistakes | "Check the companies list for mistakes" | Companies › "Check companies' job boards" card (≈ 1690 px) | Companies | 2 (scroll, button) | 3 | yes | yes | 0063ab11 (`app/ui/src/pages/Companies.jsx`). Hint: "Reads your companies file for unknown board types, missing names and broken links. Changes nothing." sitemap.md also placed it in Workspace › Tidy up; it is not there. |
| K-verify-portals | verify-portals | no | Check companies' job boards | "Check companies' job boards" (Companies); "Find the right job board for a company" (Workspace); "Find the right job board for <name>" (Companies › Fix) | Companies › bottom card and Fix; Workspace › Tidy up | Companies | 2 (scroll, button) | 3 | yes | yes | Three labels for one kind. The Fix button runs it for every company (no per-company option) and shows the run, whose outcome lists what it found (`outcome` in `app/ui/src/lib/runs.js`). |
| K-skills-fetch | skills-fetch | no | Read new postings | "Read the N new postings"; "Try the N failed postings again" | Skills › basis line | Skills | 1 | 2 | yes | yes | `retryFailed` is now surfaced (UI-skills-retry). `limit` is not. |
| K-cv-render | cv-render | no | Update design | "Update the layout to <design>" (Job); "Lay out this CV again in <design>" (My CV › Design) | Job › Documents › Tailored CV; My CV › Design › under the preview | the job page | 1 (when the design changed) | 3 | yes | yes | In Design it sits under the 60vh preview (≈ 900 px, *estimate*): 3 from My CV. Also chained after every `pdf`. |
| K-evaluate | evaluate | no | Check fit | "Check fit now"; "Check fit"; "Check fit again"; "Check fit for selected (N)"; "Check fit again and add it to Applications"; "Try again" | Applications › Add a job; Today › Check your first job; To review; Job; row Actions; report-only page | Applications | 1 + typing | 2 + typing | yes | yes | Cost stated beside each button. `model` not surfaced. |
| K-pdf | pdf | no | Tailored CV | "Make tailored CV"; "Make it again"; "Also make a tailored CV if the fit is 3.5 or more" | Job › Documents; Applications › row Actions; My CV › Writing rules › Your tailored CVs | the job page | 1 | 3 | yes | yes | `format` and `model` not surfaced. |
| K-cover | cover | no | Cover letter | "Write cover letter" › "Write the letter" | Job › Documents › Cover letter (inline form) | the job page | 2 (Write cover letter, Write the letter) + typing | 4 + typing | yes | yes | Today › "Get documents ready" reaches the job in 1, but only for jobs that replied or are interviewing. |
| K-skills-extract | skills-extract | no | Improve the skills analysis | "Improve the analysis" | Skills › basis line | Skills | 1 | 2 | yes | yes | Started through R-skills-extract. |
| K-skills-cv | skills-cv | no | Read your CV's skills | "Read my CV's skills again" | Skills › basis line | Skills | 1 | 2 | yes | yes | 0063ab11. Shown whenever there is a CV (`data.cv.present`), with "Your CV changed since Claude last read it" / "Read by Claude <date>" / "Read by quick rules so far" and the cost. Hidden while another skills run is working. |
| K-merge-tracker | merge-tracker | yes | Add to Applications | "then: added to Applications" / "updated application #21" | nested under its check | — | — | — | — | no UI by design | sitemap.md: automatic step; its outcome is shown (F-015). |
| K-reconcile-auto | reconcile-auto | yes | Tidy To review | not shown (bookkeeping) | nested under its check | — | — | — | — | no UI by design | sitemap.md: automatic step. |
| K-skills-fetch-auto | skills-fetch-auto | yes | Read new postings | "then: read the new postings for Skills" | nested under the scan | — | — | — | — | no UI by design | sitemap.md: automatic step. |
| K-mark-pdf-ready | mark-pdf-ready | yes | Mark the CV as ready | not shown (bookkeeping) | nested under the tailored CV | — | — | — | — | no UI by design | sitemap.md: automatic step. |

## 3. Config and data files

Sources: `app/server/services/`, upstream `AGENTS.md` and `DATA_CONTRACT.md`, and the Help
topics "Files in your workspace folder", "Make your own design" and "Companies to skip"
(`app/ui/src/pages/Help.jsx`).

| ID | File | What it is for | Read by the UI | Written by the UI | Surfaced at | Start page | From there | From Today | User's words | Discoverable | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| C-cv-md | cv.md | The canonical CV | yes (text and summary) | yes | Today › Get set up › Add your CV; My CV › Content | My CV | 0 | 1; 0 on first run | yes ("Your CV") | yes | Paste, "Choose a file…" or "Import from a file". `.bak` kept. |
| C-profile-yml | config/profile.yml | Identity, targets, pay, auto-CV threshold, language, usage tier | yes | the form's fields; design keys removed by "Let this page decide" | My CV › Profile; My CV › Design (override notice) | My CV | 1 | 2 | yes ("Profile") | yes | The `style` and `cv.sections` overrides can now be handed to Design (R-profile-design-release). `cv.template` is not on the notice. |
| C-portals-yml | portals.yml | Companies, job-board searches, filters | yes | entries; created on first follow | Companies; Today › Get set up | Companies | 0 | 1 | yes ("Companies you follow") | yes | Filters stay read-only, in words, under "What jobs to keep" (decision D-3). |
| C-style-yml | config/cv/style.yml | CV design and fine-tuning | yes | yes | My CV › Design | My CV | 1 | 2 | yes ("Design") | yes | |
| C-voice-dna-md | voice-dna.md | Writing rules for CVs and letters | yes | yes (words one by one, or whole) | My CV › Writing rules | My CV | 1 | 2 | yes ("Writing rules") | yes | |
| C-writing-samples | writing-samples/ | The user's own writing, for tone | names, dates and text | no | My CV › Writing rules › Writing samples › "Open <name>" | My CV | 2 (Writing rules, Open) | 3 | yes | yes | Opening is built (ac0c78da, 0063ab11). Adding and removing happen in the folder, whose path the page gives; sitemap.md calls adding "an M8 follow-up". |
| C-cv-templates | config/cv/templates/ | User-made HTML designs | as named gallery cards marked "Yours" | no | My CV › Design › Designs; Design › "Make your own design" (Help) | My CV | 1 | 2 | yes ("Yours", "Make your own design") | yes | Both parts of sitemap.md's place are built (0063ab11). Making one is done in an editor, as the Help topic explains. |
| C-applications-md | data/applications.md | The tracker | yes | status (with date and note for Applied) | Applications | Applications | 0 | 1 | yes | yes | Editing notes, adding a row by hand and deleting a row are not in the UI. |
| C-pipeline-md | data/pipeline.md | Links waiting to be checked | pending and processed | append, remove, restore | To review | To review | 0 | 1 | yes | yes | |
| C-reports | reports/ | A–G fit reports | yes, including reports with no row | via `evaluate` | Job › Fit report; Workspace › Fit reports not in Applications; report-only page | the job page | 1 | 3 | yes | yes | Every report is now reachable (R-reports-list). |
| C-output | output/ | Tailored CVs, payloads, letters | yes | via `pdf`, `cv-render`, `cover` | Job › Documents; My CV › Writing rules › Your tailored CVs; search | the job page | 1 | 3 | yes ("Documents") | yes | |
| C-data-skills | data/skills/ | Posting cache, extractions, overrides | yes | overrides, runs | Skills | Skills | 0 | 1 | yes | yes | |
| C-modes-profile-md | modes/_profile.md | Archetypes and targeting | whether it exists | no | My CV › Profile › "Advanced files: two more files that shape your checks" | My CV | 2 (Profile, Advanced files) | 3 | yes ("the kinds of roles you target…") | yes | Advanced files is now the first thing on Profile (0063ab11). ia.md §2.7: editing has no UI in v1 ("Edit it in your editor"). |
| C-article-digest-md | article-digest.md | Proof points | whether it exists | no | My CV › Profile › "Advanced files…" | My CV | 2 | 3 | yes ("proof points the assistant may quote") | yes | As above. |
| C-blacklist-md | data/blacklist.md | Companies never to apply to | yes (read-only) | no | Companies › "Companies to skip"; Help › "Companies to skip" | Companies | 1 (scroll) | 2 | yes ("Companies to skip") | yes | ac0c78da, 0063ab11; the populated sandbox has one since b7a7af1c. Lists company, reason and "since"; explains how to edit the file. sitemap.md left read-only or editable to M8; read-only follows D-3. A failure's "What to do" now points here (`explainFailure` in `app/ui/src/lib/runs.js`). |
| C-scan-data | data/scan-history.tsv, data/scan-runs.tsv, data/portal-health.tsv | Scan history, counters, board health | last run, health | via `scan`, `verify-portals` | To review › "Last check…"; Companies › each row's health | To review | 0 | 1 | yes | yes | History beyond the last check is not shown. |
| C-data-jsc | data/jsc/ | The console's own state: logs, prompts, covers index, ATS records, Today | yes | yes | Technical details (log path); Activity | — | — | — | — | no UI by design | sitemap.md: internal state, surfaced through what it records. |
| C-status-log | data/status-log.tsv | Status-change ledger | yes (per row) | indirectly (through `set-status.mjs`) | Job › History | the job page | 1 (scroll) | 3 | yes ("History") | yes | ac0c78da, 0063ab11, through R-pipeline-history; the populated sandbox has one since b7a7af1c. Matches sitemap.md's place. |

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

| ID | Label | Type | Component | Surfaced at | Start page | From there | From Today | User's words | Discoverable | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| UI-nav-pipeline | "Applications" | link | app/ui/src/shell/TopBar.jsx | Top bar | any page | 1 | 1 | yes | yes | Was "Pipeline". |
| UI-nav-sources | "Companies" (count "<n> not working") | link | app/ui/src/shell/TopBar.jsx | Top bar | any page | 1 | 1 | yes | yes | Sources is split into Companies and To review. |
| UI-nav-skills | "Skills" | link | app/ui/src/shell/TopBar.jsx | Top bar | any page | 1 | 1 | yes | yes | |
| UI-nav-runs | "Activity" / "Activity · <n> failed" / "· <n> working" / "· <n> done" | button (opens panel) | app/ui/src/shell/TopBar.jsx | Top bar | any page | 1 | 1 | yes | yes | Was "Runs". |
| UI-nav-cv | "My CV" | link | app/ui/src/shell/TopBar.jsx | Top bar | any page | 1 | 1 | yes | yes | Was "CV Studio". |
| UI-global-toast-open-log | (run title link, e.g. "Check fit · Driftwood Analytics — Data Engineer") | link | app/ui/src/components/RunItem.jsx | where the action was started; Activity panel | the run item | 1 | 1 | yes | yes | No toast any more (ia.md §3 "Run feedback"). |
| UI-global-toast-dismiss | "Got it" / "Dismiss" / "Hide" | button | app/ui/src/pages/Today.jsx, app/ui/src/shell/undo.jsx | Today cards; Undo bar | Today | 1 | 1 | yes | yes | |
| UI-shell-skip | "Skip to content" | link | app/ui/src/App.jsx | first Tab stop | any page | 1 | 1 | yes | yes | M8. |
| UI-shell-brand | "Job Search Console" | link to Today | app/ui/src/shell/TopBar.jsx | Top bar | any page | 1 | 1 | yes | yes | M8. |
| UI-shell-nav-today | "Today" | link | app/ui/src/shell/TopBar.jsx | Top bar | any page | 1 | 0 | yes | yes | M8. Landing page. |
| UI-shell-nav-to-review | "To review" (count "<n> new") | link | app/ui/src/shell/TopBar.jsx | Top bar | any page | 1 | 1 | yes | yes | M8. |
| UI-shell-menu | "Menu" | disclosure (below 960 px) | app/ui/src/shell/TopBar.jsx | Top bar | any page | 1 | 1 | yes | yes | M8. |
| UI-shell-workspace | "Workspace" | link | app/ui/src/shell/TopBar.jsx | Top bar, right | any page | 1 | 1 | partly — a word for the folder, data health, tidy-up and the assistant that P2/P3 would not use | partly — label | M8. Help no longer depends on it (UI-shell-help). Data health, Fit reports not in Applications and Tidy up are reached through it. |
| UI-shell-help | "Help" | link | app/ui/src/shell/TopBar.jsx | Top bar, beside Workspace | any page | 1 | 1 | yes | yes | 0063ab11. Search also finds "Help" (`app/ui/src/shell/Search.jsx`). |
| UI-shell-search | "Find a job, company or document…" | combobox | app/ui/src/shell/Search.jsx | Top bar | any page | 2 (type, Enter) | 2 | yes | yes | M8. Jobs, companies, documents, pages and two actions. |
| UI-shell-search-toggle | "Search" | button (below 960 px) | app/ui/src/shell/Search.jsx | Top bar | any page | 1 | 1 | yes | yes | M8. |
| UI-shell-panel-close | "Close" | button | app/ui/src/shell/ActivityPanel.jsx | Activity panel | any page | 2 | 2 | yes | yes | M8. Escape also closes it. |
| UI-shell-panel-see-all | "See all activity" | link | app/ui/src/shell/ActivityPanel.jsx | Activity panel | any page | 2 | 2 | yes | yes | M8. |
| UI-shell-undo | "Undo" | button | app/ui/src/shell/undo.jsx | Undo bar (10 s); Activity panel until replaced | the Undo bar | 1 after the action | 1 after the action | yes | yes | M8. Removals, replacements, status and skill changes, dismissals, "Back to automatic", "Let this page decide". |
| UI-shell-undo-hide | "Hide" | button | app/ui/src/shell/undo.jsx | Undo bar | the Undo bar | 1 | 1 | yes | yes | M8. |
| UI-shell-leave-guard | "Leave without saving <your CV / your profile / your design / your writing rules>?" › "Leave without saving" / "Stay" | dialog | app/ui/src/components/LeaveGuard.jsx | My CV, any editor with unsaved changes | appears on leaving | 1 | 1 | yes | yes | M8. |
| UI-notfound-today | "Go to Today" | link | app/ui/src/pages/NotFound.jsx | unknown address | the not-found page | 1 | 1 | yes | yes | M8. |

### Applications and the job page (was Pipeline)

| ID | Label | Type | Component | Surfaced at | Start page | From there | From Today | User's words | Discoverable | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| UI-pipeline-url | "Link to the job posting" ("https://…/jobs/123") | field | app/ui/src/components/AddJob.jsx | Applications › Add a job; Today › Check your first job | Applications | 1 | 2 | yes | yes | |
| UI-pipeline-evaluate-now | "Check fit now" | button (submit) | app/ui/src/components/AddJob.jsx | Applications › Add a job | Applications | 1 + typing | 2 + typing | yes | yes | |
| UI-pipeline-add-to-inbox | "Save for later" | button | app/ui/src/components/AddJob.jsx | Applications › Add a job | Applications | 1 + typing | 2 + typing | yes | yes | |
| UI-pipeline-autopdf | "Also make a tailored CV if the fit is 3.5 or more" › checkbox | disclosure + checkbox | app/ui/src/components/AddJob.jsx | Applications › Add a job | Applications | 2 | 3 | yes | yes | |
| UI-pipeline-addjob-help | hint "Check fit now: … Save for later: …" + "What a check costs" | text + link | app/ui/src/components/AddJob.jsx | Applications › Add a job | Applications | 0 (in view) | 1 | yes | yes | |
| UI-pipeline-issues | "<n> application could not be read" + "Show me how to fix it" / "Show me" | notice + link | app/ui/src/pages/Applications.jsx, app/ui/src/pages/Today.jsx | Today › Needs you; Applications (top); Workspace › Data health | Today | 0 | 0 | yes | yes | Only `row-unparseable` reaches Today. |
| UI-pipeline-status-filter | "All (40)", "Reviewed — not applied (10)", … | toggle chips | app/ui/src/pages/Applications.jsx | Applications › filters | Applications | 1 | 2 | yes | yes | |
| UI-pipeline-score-filter | "Fit": "Any fit" / "4 and up" / "3.5 and up" / "Under 3" | select | app/ui/src/pages/Applications.jsx | Applications › filters | Applications | 1 | 2 | yes | yes | |
| UI-pipeline-search | "Search" ("Company, role or note") | field | app/ui/src/pages/Applications.jsx | Applications › filters | Applications | 1 | 2 | yes | yes | |
| UI-pipeline-sort | "#", "Company and role", "Fit", "Status", "Checked" (↕) | sortable headers | app/ui/src/pages/Applications.jsx | Applications › table | Applications | 1 | 2 | yes | yes | |
| UI-pipeline-open-row | "<Company> — <Role>" | link | app/ui/src/pages/Applications.jsx | Applications › table | Applications | 1 | 2 | yes | yes | Opens the job page. |
| UI-pipeline-status-cell | "<status>" (named "Status for <job>") | select | app/ui/src/components/StatusControl.jsx | Applications › Status | Applications | 1 | 2 | yes | yes | Commits on choose; "Saved: …" and Undo. |
| UI-pipeline-row-evaluate | "Actions" › "Check fit again" | menu item | app/ui/src/pages/Applications.jsx | Applications › row | Applications | 2 | 3 | yes | yes | No confirmation on closed jobs here, unlike the job page. |
| UI-pipeline-row-pdf | "Actions" › "Make tailored CV" / "Make tailored CV again" | menu item | app/ui/src/pages/Applications.jsx | Applications › row | Applications | 2 | 3 | yes | yes | |
| UI-pipeline-row-cover | "Actions" › "Write cover letter" | menu item | app/ui/src/pages/Applications.jsx | Applications › row | Applications | 2 | 3 | yes | yes | Opens the job page with the form open. |
| UI-pipeline-detail-posting-link | "Open the posting ↗" | link | app/ui/src/pages/Job.jsx | Job › Summary; row "Actions" | the job page | 1 | 3 | yes | yes | |
| UI-pipeline-detail-tab-report | "Fit report" | section | app/ui/src/pages/Job.jsx | Job › Fit report | the job page | 1 (scroll) | 3 | yes | yes | |
| UI-pipeline-detail-tab-pdf | "Open" / "Download" (Tailored CV) | links | app/ui/src/components/Documents.jsx | Job › Documents | the job page | 1 | 3 | yes | yes | |
| UI-pipeline-detail-tab-cover | "Open" / "Download" (Cover letter) | links | app/ui/src/components/Documents.jsx | Job › Documents | the job page | 1 | 3 | yes | yes | |
| UI-pipeline-detail-reevaluate | "Check fit again" | button | app/ui/src/pages/Job.jsx | Job › Summary | the job page | 1 (+ confirm on closed jobs) | 3 | yes | yes | |
| UI-pipeline-detail-pdf | "Make tailored CV" / "Make it again" | button | app/ui/src/components/Documents.jsx | Job › Documents › Tailored CV | the job page | 1 (+ confirm for again) | 3 | yes | yes | |
| UI-pipeline-detail-cover | "Write cover letter" / "Write it again" | button | app/ui/src/components/Documents.jsx | Job › Documents › Cover letter | the job page | 1 | 3 | yes | yes | |
| UI-pipeline-detail-run-badges | "History": activity links "<run title> — done, <date>", status changes "<date> · <from> → <to>", "added to Applications · now <status>" | list | app/ui/src/pages/Job.jsx | Job › History | the job page | 1 (scroll) | 3 | yes | yes | Status changes from the ledger since ac0c78da (R-pipeline-history). |
| UI-pipeline-cover-dialog | "Cover letter questions for <job>" | inline form | app/ui/src/components/Documents.jsx | Job › Documents › Cover letter | the job page | 1 | 3 | yes | yes | |
| UI-pipeline-cover-why | "Why this role? (required)" | field | app/ui/src/components/Documents.jsx | cover form | the job page | 2 | 4 | yes | yes | |
| UI-pipeline-cover-problem | "What problem would you solve for them? (required)" | field | app/ui/src/components/Documents.jsx | cover form | the job page | 2 | 4 | yes | yes | |
| UI-pipeline-cover-approach | "How would you start? (required)" | field | app/ui/src/components/Documents.jsx | cover form | the job page | 2 | 4 | yes | yes | |
| UI-pipeline-cover-tone | "Tone": "Match the posting" / "Direct" / "Warm" / "Formal" | select | app/ui/src/components/Documents.jsx | cover form | the job page | 2 | 4 | yes | yes | |
| UI-pipeline-cover-submit | "Write the letter" | button | app/ui/src/components/Documents.jsx | cover form | the job page | 2 + typing (+ confirm "Replace the letter") | 4 + typing | yes | yes | |
| UI-pipeline-cover-cancel | "Cancel" | button | app/ui/src/components/Documents.jsx | cover form | the job page | 2 | 4 | yes | yes | |
| UI-pipeline-maint-dedup | "Find duplicate applications" | button | app/ui/src/pages/Workspace.jsx | Workspace › Tidy up; Applications › "Tidy up" | Workspace | 2 (scroll, button) | 3 | yes | yes | Tidy up now sits below the "Fit reports not in Applications" list, so it needs a scroll (*estimate*). Applications › "Tidy up" jumps straight to the tool. |
| UI-pipeline-maint-reconcile | "Remove links already in Applications" | button | app/ui/src/pages/Workspace.jsx | Workspace › Tidy up; To review › "Tidy up" | Workspace | 2 (scroll, button) | 3 | yes | yes | |
| UI-pipeline-maint-verify | "Check my list for problems" | button | app/ui/src/pages/Workspace.jsx | Workspace › Tidy up; Applications › "Tidy up" | Workspace | 2 | 3 | yes | yes | |
| UI-pipeline-maint-validate | "Check the companies list for mistakes" | button | app/ui/src/pages/Companies.jsx | Companies › "Check companies' job boards" card | Companies | 2 (scroll, button) | 3 | yes | yes | 0063ab11. Starts `validate-portals`. Not in Workspace › Tidy up, where M6 had it. |
| UI-pipeline-maint-probe | "Check companies' job boards" / "Find the right job board for a company" | button | app/ui/src/pages/Companies.jsx, app/ui/src/pages/Workspace.jsx | Companies › bottom card; Workspace › Tidy up | Companies | 2 (scroll, button) | 3 | yes | yes | Both start `verify-portals`. |
| UI-pipeline-maint-help | each tool's description and hint | text | app/ui/src/pages/Workspace.jsx | Workspace › Tidy up | Workspace | 1 (scroll) | 2 | yes | yes | |
| UI-pipeline-maint-confirm | "Merge these duplicates" / "Remove these links" | button | app/ui/src/pages/Workspace.jsx | the tool, after its preview | Workspace | 3 (scroll, tool, confirm) | 4 | yes | yes | The preview replaces the tool's button in place, so no further scroll. |
| UI-pipeline-maint-discard | "Don't change anything" | button | app/ui/src/pages/Workspace.jsx | the tool, after its preview | Workspace | 3 | 4 | yes | yes | |
| UI-shared-run-cancel | "Cancel" | button | app/ui/src/components/RunItem.jsx | every working item | the run item | 1 | 1–2 | yes | yes | |
| UI-shared-run-close | "Open the job" / "Open the CV" / "Got it" | link / button | app/ui/src/components/RunItem.jsx, app/ui/src/pages/Today.jsx | finished items | the run item | 1 | 1–2 | yes | yes | |
| UI-apps-tidy | "Tidy up" › "Find duplicate applications" / "Check my list for problems" | menu | app/ui/src/components/ui.jsx, app/ui/src/pages/Applications.jsx | Applications › header | Applications | 1 | 2 | yes | yes | M8. Jumps to the tool in Workspace; the tool's button must then be pressed. |
| UI-apps-clear | "Clear filters" | button | app/ui/src/pages/Applications.jsx | Applications › filters; "No applications match these filters" | Applications | 2 | 3 | yes | yes | M8. |
| UI-apps-open-job | "Actions" › "Open the job" | menu item | app/ui/src/pages/Applications.jsx | Applications › row | Applications | 2 | 3 | yes | yes | M8. |
| UI-apps-empty-link | "Open To review" | link | app/ui/src/pages/Applications.jsx | Applications › "No applications yet" | Applications | 1 | 2 | yes | yes | M8. |
| UI-job-back | "← Applications" | link | app/ui/src/pages/Job.jsx | Job › top | the job page | 1 | 3 | yes | yes | M8. |
| UI-job-fit-help | "How the fit is worked out" | link | app/ui/src/pages/Job.jsx | Job › Summary | the job page | 1 | 3 | yes | yes | M8. |
| UI-job-status | "Status" select | select | app/ui/src/components/StatusControl.jsx | Job › Summary | the job page | 1 | 3 | yes | yes | M8. |
| UI-job-sent | "I've sent my application" | button | app/ui/src/pages/Job.jsx | Job › Summary, the row under Status (only for Reviewed — not applied) | the job page | 1 | 3 | yes | yes | Moved into the Summary in 0063ab11 (≈ 340 px, *estimate*; it was at ≈ 865 px). Hint "Sets the status to Applied, with the date you sent it." Opens the When dialog. |
| UI-job-never-help | "What the app never does" | link | app/ui/src/components/Documents.jsx | Job › under Documents | the job page | 1 | 3 | yes | yes | M8. |
| UI-job-choose-design | "Choose a design that passes" | link | app/ui/src/components/Documents.jsx | Job › Tailored CV, when it fails screening | the job page | 1 | 3 | yes | yes | M8. |
| UI-status-when | "When did you apply to <job>?": "Today (<date>)" / "Yesterday (<date>)" / "On another day" | dialog + radios | app/ui/src/components/StatusControl.jsx | after choosing Applied | Applications | 2 (Status › Applied, radio) | 3 | yes | yes | M8. Sends `on`. |
| UI-status-when-date | "Date" | date field | app/ui/src/components/StatusControl.jsx | "On another day" | Applications | 3 (Status › Applied, On another day, Date) | 4 | yes | yes | M8. |
| UI-status-note | "Add a note (optional)" | field | app/ui/src/components/StatusControl.jsx | When dialog | Applications | 2 | 3 | yes | yes | M8. Only offered with Applied. |
| UI-status-save-applied | "Save as Applied" / "Cancel" | buttons | app/ui/src/components/StatusControl.jsx | When dialog | Applications | 2 | 3 | yes | yes | M8. |
| UI-run-retry | "Try again" | button | app/ui/src/components/RunItem.jsx | failed items: Today › Needs you, job page, Activity, document cards | the run item | 1 | 1 | yes | yes | M8. |
| UI-run-open-posting | "Open the posting ↗" | link | app/ui/src/components/RunItem.jsx | failed items | the run item | 1 | 1 | yes | yes | M8. |
| UI-run-technical | "Technical details" | disclosure | app/ui/src/components/RunItem.jsx | every item | the run item | 1 | 2 | yes | yes | M8. |
| UI-run-outcome-open | "Open the job" / "Open the CV" / "Open the letter" / "See the <n> new openings" / "Open Skills" / "Open Workspace" / "Open Companies" | link | app/ui/src/components/RunItem.jsx | done items | the run item | 1 | 1–2 | yes | yes | M8. A finished check whose report has no row now opens the report-only page. |
| UI-job-report-only-check | "Check fit again and add it to Applications" (+ "Open the posting ↗") | button | app/ui/src/pages/Job.jsx | report-only page (`#/applications/report/<n>` with no row), notice "This fit report isn't in your Applications…" | Workspace | 2 (Open, button) | 3 (Workspace, Open, button) | yes | yes | 0063ab11 (`ReportOnly`). Shown when the report has a posting link. Also reached from To review › Already checked and from Skills' gap evidence. |

### Today

| ID | Label | Type | Component | Surfaced at | Start page | From there | From Today | User's words | Discoverable | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| UI-today-cv-paste | "Your CV" ("Paste your CV here…") | field | app/ui/src/pages/Today.jsx | Today › Get set up › 1 Add your CV | Today | 1 | 1 | yes | yes | M8. First run only. |
| UI-today-cv-file | "Choose a file…" | file button | app/ui/src/pages/Today.jsx | Get set up › Add your CV | Today | 1 | 1 | yes | yes | M8. |
| UI-today-cv-save | "Save my CV" | button | app/ui/src/pages/Today.jsx | Get set up › Add your CV | Today | 1 + typing | 1 + typing | yes | yes | M8. |
| UI-today-cv-edit | "Edit in My CV" | link | app/ui/src/pages/Today.jsx | Add your CV (done); "You're set up" | Today | 1 | 1 | yes | yes | M8. |
| UI-today-co-name | "Company name" | field | app/ui/src/pages/Today.jsx | Get set up › 2 Follow a company | Today | 1 | 1 | yes | yes | M8. |
| UI-today-co-url | "Careers page link" | field | app/ui/src/pages/Today.jsx | Get set up › Follow a company | Today | 1 | 1 | yes | yes | M8. |
| UI-today-co-follow | "Follow company" | button | app/ui/src/pages/Today.jsx | Get set up › Follow a company | Today | 1 + typing | 1 + typing | yes | yes | M8. |
| UI-today-co-scan | "Check <company> for new openings now" | button | app/ui/src/pages/Today.jsx | Follow a company (done) | Today | 1 | 1 | yes | yes | M8. |
| UI-today-ai-install | "How to install it" | link | app/ui/src/pages/Today.jsx | Get set up › 3 AI assistant (missing) | Today | 1 | 1 | yes | yes | M8. |
| UI-today-ai-check | "Check again" | button | app/ui/src/pages/Today.jsx | Get set up › AI assistant (missing) | Today | 1 | 1 | yes | yes | M8. |
| UI-today-setup-gotit | "Got it" | button | app/ui/src/pages/Today.jsx | "You're set up" card | Today | 1 | 1 | yes | yes | M8. |
| UI-today-dismiss | "Dismiss" | button | app/ui/src/pages/Today.jsx | Needs you › failure card | Today | 1 | 1 | yes | yes | M8. Undo offered. |
| UI-today-unreadable | "Show me" | link | app/ui/src/pages/Today.jsx | Needs you › "<n> application could not be read" | Today | 1 | 1 | yes | yes | M8. To Workspace › Data health. |
| UI-today-design-fails | "Choose a design that passes" | link | app/ui/src/pages/Today.jsx | Needs you › "Your CV design fails the screening check" | Today | 1 | 1 | yes | yes | M8. |
| UI-today-board-fix | "Fix <company>" | link | app/ui/src/pages/Today.jsx | Needs you › "<company>: board not found since <date>" | Today | 1 | 1 | yes | yes | M8. Lands at the top of Companies, not at the company; the row's Fix is then scroll + click. |
| UI-today-link-fix | "Fix <company>'s link" | link | app/ui/src/pages/Today.jsx | Needs you › "<company>'s link isn't a job board the app can read" | Today | 1 | 1 | yes | yes | Not in the previous inventory. Lands at the top of Companies; the row's Edit is then a scroll and a click. |
| UI-today-done-open | "Open the job" / "Open the CV" / … | link | app/ui/src/pages/Today.jsx | Just finished | Today | 1 | 1 | yes | yes | M8. |
| UI-today-done-gotit | "Got it" | button | app/ui/src/pages/Today.jsx | Just finished | Today | 1 | 1 | yes | yes | M8. |
| UI-today-fresh | "Look at the <n> new openings" | link | app/ui/src/pages/Today.jsx | New since you last looked | Today | 1 | 1 | yes | yes | M8. |
| UI-today-replied | "Get documents ready (start with the first)" + job links | links | app/ui/src/pages/Today.jsx | Waiting for you › replied or interviewing without documents | Today | 1 | 1 | yes | yes | M8. |
| UI-today-reviewed | "Review them" + the three best jobs | links | app/ui/src/pages/Today.jsx | Waiting for you › "<n> jobs reviewed but not applied" | Today | 1 | 1 | yes | yes | M8. |

### To review and Companies (was Sources)

| ID | Label | Type | Component | Surfaced at | Start page | From there | From Today | User's words | Discoverable | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| UI-sources-scan | "Check for new openings" | button | app/ui/src/pages/ToReview.jsx, app/ui/src/pages/Companies.jsx, app/ui/src/pages/Today.jsx | Today card; To review; Companies | To review | 1 | 1 (Today) | yes | yes | |
| UI-sources-preview-only | "Preview without saving — see what would be added" | checkbox | app/ui/src/pages/ToReview.jsx | To review › Options | To review | 2 | 3 | yes | yes | |
| UI-sources-verify | "Confirm each posting is still live — slower" | checkbox | app/ui/src/pages/ToReview.jsx | To review › Options | To review | 2 | 3 | yes | yes | |
| UI-sources-company | "Only this company" | select | app/ui/src/pages/ToReview.jsx | To review › Options | To review | 2 | 3 | yes | yes | |
| UI-sources-since | "Only openings from the last … days" | field | app/ui/src/pages/ToReview.jsx | To review › Options | To review | 2 | 3 | yes | yes | |
| UI-sources-scan-help | "Options"; hint "<n> companies · a few seconds · no AI" | disclosure | app/ui/src/pages/ToReview.jsx | To review › header | To review | 1 | 2 | yes | yes | |
| UI-sources-inbox-toggle | "To review" | page | app/ui/src/pages/ToReview.jsx | Top bar | any page | 1 | 1 | yes | yes | |
| UI-sources-inbox-link | "Open the posting ↗" | link | app/ui/src/pages/ToReview.jsx | To review › item | To review | 1 | 2 | yes | yes | |
| UI-sources-inbox-evaluate | "Check fit" | button | app/ui/src/pages/ToReview.jsx | To review › item | To review | 1 | 2 | yes | yes | Named "Check fit for <job>". |
| UI-sources-help | page lead "The app checks these companies' job boards for new openings." | text | app/ui/src/pages/Companies.jsx | Companies › head | Companies | 0 | 1 | yes | yes | Help topic "Companies to skip" is linked from the skip list. |
| UI-sources-issues | "<n> job board needs you: <company>. Use Fix below." / badge "Board not found since <date>" / "This link isn't a job board the app can read" | notice + badge | app/ui/src/pages/Companies.jsx | Companies; Today › Needs you | Companies | 0 | 0 (Today) | yes | yes | |
| UI-sources-add-company | "Follow a company" | button | app/ui/src/pages/Companies.jsx | Companies › header | Companies | 1 | 2 | yes | yes | |
| UI-sources-add-board | "Add a job-board search" | button | app/ui/src/pages/Companies.jsx | Companies › Job-board searches (≈ 1316 px with 12 companies) | Companies | 2 (scroll, button) | 3 | yes | yes | |
| UI-sources-toggle | switch "Check <name> for new openings" | switch | app/ui/src/pages/Companies.jsx | Companies › row | Companies | 1 | 2 | yes | yes | |
| UI-sources-edit | "Edit" | button | app/ui/src/pages/Companies.jsx | Companies › row | Companies | 1 | 2 | yes | yes | |
| UI-sources-remove | "Remove" › "Stop following" | button + confirm | app/ui/src/pages/Companies.jsx | Companies › row | Companies | 1 + confirm | 2 + confirm | yes | yes | Undo. |
| UI-sources-filters | "What jobs to keep" | read-only card | app/ui/src/pages/Companies.jsx | Companies › below the lists | Companies | 1 (scroll) | 2 | yes | yes | Editing is not in the UI (D-3). |
| UI-sources-form-name | "Company name" / "Name of this search" | field | app/ui/src/pages/Companies.jsx | Follow a company form | Companies | 2 | 3 | yes | yes | |
| UI-sources-form-careers-url | "Careers page link" / "Job board link" | field | app/ui/src/pages/Companies.jsx | Follow a company form | Companies | 2 | 3 | yes | yes | |
| UI-sources-form-provider | "Board type" ("Recognised from the link") | select | app/ui/src/pages/Companies.jsx | form › More options | Companies | 3 (Follow a company, More options, select) | 4 | yes | yes | |
| UI-sources-form-api | "API endpoint" | field | app/ui/src/pages/Companies.jsx | form › More options | Companies | 3 | 4 | no | partly — label | Engineering word; placeholder "Filled in automatically when blank". |
| UI-sources-form-scan-method | "How to check for openings" | select | app/ui/src/pages/Companies.jsx | form › More options | Companies | 3 | 4 | yes | yes | Option "Web search (only with the command-line tools)". |
| UI-sources-form-query | "Search query" ("Only for web search.") | field | app/ui/src/pages/Companies.jsx | form › More options | Companies | 3 | 4 | yes | yes | |
| UI-sources-form-notes | "Notes" | field | app/ui/src/pages/Companies.jsx | form › More options | Companies | 3 | 4 | yes | yes | |
| UI-sources-form-enabled | switch "Check <name> for new openings" | switch | app/ui/src/pages/Companies.jsx | Companies › row | Companies | 1 | 2 | yes | yes | New entries are on; the row's switch pauses them. |
| UI-sources-form-submit | "Follow" / "Add" / "Save" | button | app/ui/src/pages/Companies.jsx | form | Companies | 2 + typing | 3 + typing | yes | yes | |
| UI-sources-form-cancel | "Cancel" | button | app/ui/src/pages/Companies.jsx | form | Companies | 2 | 3 | yes | yes | |
| UI-review-select | item checkbox | checkbox | app/ui/src/pages/ToReview.jsx | To review › item | To review | 1 | 2 | yes | yes | M8. |
| UI-review-bulk-check | "Check fit for selected (<n>)" › "Check <n> jobs" | button + confirm | app/ui/src/pages/ToReview.jsx | To review › list header | To review | 2 + confirm | 3 + confirm | yes | yes | M8. |
| UI-review-bulk-remove | "Remove selected (<n>)" › "Remove" | button + confirm | app/ui/src/pages/ToReview.jsx | To review › list header | To review | 2 + confirm | 3 + confirm | yes | yes | M8. |
| UI-review-remove | "Remove" | button | app/ui/src/pages/ToReview.jsx | To review › item | To review | 1 | 2 | yes | yes | M8. Undo. |
| UI-review-retry | "Try again" | button | app/ui/src/pages/ToReview.jsx | To review › item with "Last check failed" | To review | 1 | 2 | yes | yes | M8. |
| UI-review-tidy | "Tidy up" › "Remove links already in Applications" | menu | app/ui/src/pages/ToReview.jsx | To review › list header | To review | 1 | 2 | yes | yes | M8. Jumps to Workspace. |
| UI-review-processed | "Already checked (<n>)" | disclosure | app/ui/src/pages/ToReview.jsx | To review › bottom | To review | 2 (scroll, open) | 3 | yes | yes | M8. Every link now opens: a report with no row lands on the report-only page. |
| UI-review-scan-details | "Technical details" | disclosure | app/ui/src/pages/ToReview.jsx | To review › Last check | To review | 1 | 2 | yes | yes | M8. |
| UI-review-fix-link | "Fix in Companies" | link | app/ui/src/pages/ToReview.jsx | To review › Last check | To review | 1 | 2 | yes | yes | M8. |
| UI-companies-fix | "Fix" | disclosure button | app/ui/src/pages/Companies.jsx | Companies › broken row (Juniper Mobility, ≈ 991 px) | Companies | 2 (scroll, Fix) | 3 | yes | yes | M8. |
| UI-companies-fix-actions | "Pause <name>" / "Edit the link" / "Open their careers page ↗" | buttons, link | app/ui/src/pages/Companies.jsx | inside Fix | Companies | 3 | 4 | yes | yes | M8. |
| UI-companies-files-help | "Files in your workspace folder" | link | app/ui/src/pages/Companies.jsx | What jobs to keep | Companies | 2 | 3 | yes | yes | M8. |
| UI-companies-find-board | "Find the right job board for <name>" | button | app/ui/src/pages/Companies.jsx | inside Fix, for a board not found | Companies | 3 (scroll, Fix, button) | 4 | yes | yes | 0063ab11. Runs `verify-portals` for every company and shows the run in place; "If one is found, use Edit the link to switch to it." Closes sitemap.md's "Fix running the board probe". |
| UI-companies-skip | "Companies to skip": "<company> · <reason> · since <date>"; "About this list" | read-only list + link | app/ui/src/pages/Companies.jsx | Companies › last card (≈ 1800 px, *estimate*) | Companies | 1 (scroll) | 2 | yes | yes | 0063ab11. Empty state "None. Every company's openings are kept." Says how to edit `data/blacklist.md`. |

### Skills

| ID | Label | Type | Component | Surfaced at | Start page | From there | From Today | User's words | Discoverable | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| UI-skills-fetch | "Read the <n> new postings" | button | app/ui/src/pages/Skills.jsx | Skills › basis line | Skills | 1 | 2 | yes | yes | Only when postings are unread. |
| UI-skills-retry | "Try the <n> failed postings again" | button | app/ui/src/pages/Skills.jsx | Skills › basis line | Skills | 1 | 2 | yes | yes | 0063ab11. Starts `skills-fetch` with `retryFailed: true`. Only when some postings failed (`cov.fetchFailed`). |
| UI-skills-extract | "Improve the analysis" | button | app/ui/src/pages/Skills.jsx | Skills › basis line | Skills | 1 | 2 | yes | yes | |
| UI-skills-run-log | run item in place of the buttons (title links to Activity) | link | app/ui/src/components/RunItem.jsx | Skills › basis line, while running | Skills | 1 | 2 | yes | yes | |
| UI-skills-help | page lead, basis line, ranking sentence, bar legend | text | app/ui/src/pages/Skills.jsx | Skills | Skills | 0 | 1 | yes | yes | No Help topic for Skills. |
| UI-skills-tab-learn | "Learn next" | link | app/ui/src/pages/Skills.jsx | Skills › views | Skills | 0 | 1 | yes | yes | |
| UI-skills-tab-deepen | "Strengthen" | link | app/ui/src/pages/Skills.jsx | Skills › views | Skills | 1 | 2 | yes | yes | |
| UI-skills-tab-demanded | "Most asked for" | link | app/ui/src/pages/Skills.jsx | Skills › views | Skills | 1 | 2 | yes | yes | |
| UI-skills-strong | "Only jobs I'd apply to (fit 4 and up)" | checkbox | app/ui/src/pages/Skills.jsx | Skills › filters | Skills | 1 | 2 | yes | yes | |
| UI-skills-show-ignored | "Show skills I ignored" | checkbox | app/ui/src/pages/Skills.jsx | Skills › filters | Skills | 1 | 2 | yes | yes | |
| UI-skills-category | "Category" ("All categories") | select | app/ui/src/pages/Skills.jsx | Skills › filters | Skills | 1 | 2 | yes | yes | |
| UI-skills-search | "Find a skill" | field | app/ui/src/pages/Skills.jsx | Skills › filters | Skills | 1 | 2 | yes | yes | |
| UI-skills-expand | "Show the evidence for <skill>" | disclosure | app/ui/src/pages/Skills.jsx | Skills › row | Skills | 1 | 2 | yes | yes | |
| UI-skills-status | "<skill> on your CV": "Missing" / "Partly" / "Has it" / "Ignore this skill" | select | app/ui/src/pages/Skills.jsx | Skills › row | Skills | 1 | 2 | yes | yes | |
| UI-skills-reset | "You set this. Back to automatic" | button | app/ui/src/pages/Skills.jsx | Skills › row, under the select, on skills the user set | Skills | 1 | 2 | yes | yes | 0063ab11 (`onReset`). Clears the override; Undo offered. |
| UI-skills-evidence-posting | "<title> · fit <n> ↗" | link | app/ui/src/pages/Skills.jsx | evidence | Skills | 2 | 3 | yes | yes | |
| UI-skills-evidence-report | "<Company> — <Role> (#<n>, fit <n>)" / "report <n>" | link | app/ui/src/pages/Skills.jsx | evidence › "Flagged as a gap in your fit reports" | Skills | 2 | 3 | yes | yes | "report <n>" opens the report-only page. |
| UI-skills-cooccur | "Often asked for together with: …" | text | app/ui/src/pages/Skills.jsx | evidence | Skills | 2 | 3 | yes | yes | |
| UI-skills-empty-links | "Companies you follow" · "Check for new openings" | links | app/ui/src/pages/Skills.jsx | Skills › "Nothing to rank yet" | Skills | 1 | 2 | yes | yes | M8. |
| UI-skills-cv-again | "Read my CV's skills again" | button | app/ui/src/pages/Skills.jsx | Skills › basis line, whenever there is a CV | Skills | 1 | 2 | yes | yes | 0063ab11. Starts `skills-cv`. `app/server/queue/specs.js` says the extraction is cached against `cv.md`'s content, so with an unchanged CV the run may change nothing; the hint says whether the CV changed. |

### Activity (was Runs)

| ID | Label | Type | Component | Surfaced at | Start page | From there | From Today | User's words | Discoverable | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| UI-runs-open | "<what> · <job>" | link | app/ui/src/components/RunItem.jsx | Activity panel; Activity page | Activity | 1 | 2 | yes | yes | Opens `#/activity/:id`. |
| UI-runs-cancel | "Cancel" | button | app/ui/src/components/RunItem.jsx | working items | Activity | 1 | 2 | yes | yes | |
| UI-runs-help | page lead; "What happened" / "What to do" on failures | text | app/ui/src/pages/Activity.jsx, app/ui/src/components/RunItem.jsx | Activity | Activity | 0–1 | 1–2 | yes | yes | The Help topic "Why something can fail" is now 2 from any page (Help, topic). |
| UI-activity-filters | "All", "Failed", "Documents", "Fit checks", "Openings" (with counts); "Show all" | chips | app/ui/src/pages/Activity.jsx | Activity page | Activity | 2 (See all activity, chip) | 3 | yes | yes | M8. |

### My CV (was CV Studio)

| ID | Label | Type | Component | Surfaced at | Start page | From there | From Today | User's words | Discoverable | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| UI-cv-document | "Preview with" | select | app/ui/src/pages/mycv/Design.jsx | My CV › Design | My CV | 2 | 3 | yes | yes | |
| UI-cv-accent | "Accent colour" (+ "Pick the accent colour") | colour + field | app/ui/src/pages/mycv/Design.jsx | Design › "Fine-tune <design>: colour, fonts, size, spacing, section order" | My CV | 3 (Design, Fine-tune, field) | 4 | yes | yes | Fine-tune now sits above the gallery, under "Preview with" (≈ 360 px, *estimate*), and its summary names what is inside (0063ab11). |
| UI-cv-body-font | "Body font" | field | app/ui/src/pages/mycv/Design.jsx | Fine-tune | My CV | 3 | 4 | yes | yes | |
| UI-cv-heading-font | "Heading font" | field | app/ui/src/pages/mycv/Design.jsx | Fine-tune | My CV | 3 | 4 | yes | yes | |
| UI-cv-font-size | "Text size" | field | app/ui/src/pages/mycv/Design.jsx | Fine-tune | My CV | 3 | 4 | yes | yes | |
| UI-cv-margin | "Page margin" | field | app/ui/src/pages/mycv/Design.jsx | Fine-tune | My CV | 3 | 4 | yes | yes | |
| UI-cv-density | "Spacing" | select | app/ui/src/pages/mycv/Design.jsx | Fine-tune | My CV | 3 | 4 | yes | yes | |
| UI-cv-section-add | "Add a section to the order" ("Choose…") | select | app/ui/src/pages/mycv/Design.jsx | Fine-tune › Section order | My CV | 3 | 4 | yes | yes | |
| UI-cv-section-move | "Up" / "Down" (named with the section) | buttons | app/ui/src/pages/mycv/Design.jsx | Fine-tune › Section order | My CV | 4 (Design, Fine-tune, add a section, Up) | 5 | yes | partly — needs a section in the order first | 3 when the saved style already has an order. |
| UI-cv-section-remove | "Remove" (named "Remove <section> from the order") | button | app/ui/src/pages/mycv/Design.jsx | Fine-tune › Section order | My CV | 4 | 5 | yes | partly — as above | |
| UI-cv-save | "Make this my design for every CV" | button | app/ui/src/pages/mycv/Design.jsx | Design › Preview, above the preview frame | My CV | 2 + choose a design | 3 | yes | yes | Moved above the 60vh preview in 0063ab11. A failing design asks "Use … even though it fails screening?" › "Use it anyway". |
| UI-cv-revert | "Discard changes" | button | app/ui/src/pages/mycv/Design.jsx | Design › Preview, beside Save (only with unsaved changes) | My CV | 2 (Design, Discard changes) after a change | 3 | yes | yes | 0063ab11. Resets choice and fine-tuning; "Changes discarded: the preview shows your saved design." Matches sitemap.md. |
| UI-cv-themes-refresh | — | — | app/ui/src/pages/mycv/Design.jsx | automatic | — | — | — | — | no UI by design | sitemap.md: the gallery refreshes itself (on a saved-style or document change). |
| UI-cv-theme-pick | "<Design> · your design" + "Yours" + "Readable by screening systems" / "Readable, <n> small issues" / "Screening problems" / "Can't be used with your CV" | toggle buttons | app/ui/src/pages/mycv/Design.jsx | Design › Designs | My CV | 2 | 3 | yes | yes | "Yours" on custom designs since 0063ab11. |
| UI-cv-render | "Update the layout to <design>" (Job); "Lay out this CV again in <design>" (Design) | button | app/ui/src/components/Documents.jsx, app/ui/src/pages/mycv/Design.jsx | Job › Tailored CV (when the design changed); Design › under the preview frame (≈ 900 px, *estimate*) | the job page | 1 | 3 | yes | yes | From My CV: Design, scroll, button = 3. |
| UI-cv-render-all | "Update existing CVs to this design (<n>)" | button | app/ui/src/pages/mycv/Design.jsx | Design › Preview, beside Save | My CV | 2 | 3 | yes | yes | Moved above the preview in 0063ab11. |
| UI-cv-render-all-confirm | "Update <n> CVs to the <design> design?" › "Update <n> CVs" | dialog | app/ui/src/pages/mycv/Design.jsx | Design | My CV | 3 | 4 | yes | yes | |
| UI-cv-ats-notes | verdict "<verdict>." + "Details" | notice + disclosure | app/ui/src/pages/mycv/Design.jsx | Design › Preview | My CV | 2 | 3 | yes | yes | |
| UI-cv-voice-text | "Your writing rules (voice-dna.md)" | editor | app/ui/src/pages/mycv/Writing.jsx | Writing rules › All rules (summary ≈ 560 px, *estimate*) | My CV | 3 (Writing rules, All rules, editor) | 4 | yes | yes | All rules now follows Words to avoid (0063ab11); it was ≈ 1229 px. Open by default when there are no rules. |
| UI-cv-voice-save | "Save" (All rules) | button | app/ui/src/pages/mycv/Writing.jsx | Writing rules › All rules, under the editor (≈ 1070 px, *estimate*) | My CV | 4 (Writing rules, All rules, scroll, Save) + typing | 5 + typing | yes | partly — under a 16-row editor | Reclassified from the previous "yes": that row also counted the words "Add", which is UI-mycv-words-add. M6's UI-cv-voice-save is the whole-file Save. |
| UI-cv-voice-seed | "Start from the example rules…" › "Replace my rules" | button + confirm | app/ui/src/pages/mycv/Writing.jsx | All rules, beside Save | My CV | 4 + confirm | 5 + confirm | yes | partly — as above | Undo and `.bak`. |
| UI-cv-samples | "Writing samples" | list | app/ui/src/pages/mycv/Writing.jsx | Writing rules › after All rules (≈ 650 px, *estimate*) | My CV | 1 | 2 | yes | yes | Each sample opens (UI-mycv-sample-open). The folder path is given for adding. |
| UI-cv-help | "What the screening check is", "Make your own design", "About writing rules" | links | app/ui/src/pages/mycv/Design.jsx, app/ui/src/pages/mycv/Writing.jsx | Design, Writing rules | My CV | 2 | 3 | yes | yes | |
| UI-cv-profile-warning | "Your profile (config/profile.yml) has its own style and section order, which wins over the settings here; the preview already shows their effect." › "Let this page decide" | notice + button | app/ui/src/pages/mycv/Design.jsx | Design › top (only when profile.yml sets them) | My CV | 2 (Design, button) | 3 | yes | yes | 0063ab11. The notice no longer asks for a file edit; the button removes those keys (R-profile-design-release) with Undo. sitemap.md planned "Change in Profile"; this replaces it. Reclassified from "partly" on that basis. |
| UI-mycv-subnav | "Content", "Profile", "Design", "Writing rules" | links | app/ui/src/pages/MyCv.jsx | My CV | My CV | 1 | 2 | yes | yes | M8. |
| UI-mycv-content-editor | "Your CV (Markdown)" | editor | app/ui/src/pages/mycv/Content.jsx | My CV › Content | My CV | 1 | 2 | yes | yes | M8. |
| UI-mycv-content-save | "Save" | button | app/ui/src/pages/mycv/Content.jsx | My CV › Content | My CV | 1 + typing | 2 + typing | yes | yes | M8. |
| UI-mycv-content-import | "Import from a file" | file button | app/ui/src/pages/mycv/Content.jsx | My CV › Content | My CV | 1 | 2 | yes | yes | M8. |
| UI-mycv-profile-about | "About you": "Name", "Email", "Location" | fields | app/ui/src/pages/mycv/Profile.jsx | My CV › Profile | My CV | 2 | 3 | yes | yes | M8. |
| UI-mycv-profile-looking | "What you're looking for": "Target roles", "Where and how you want to work", "Target pay", "Lowest pay you would accept" | fields | app/ui/src/pages/mycv/Profile.jsx | My CV › Profile | My CV | 2 | 3 | yes | yes | M8. |
| UI-mycv-profile-app | "How the app works for you": "Make a tailored CV automatically when the fit is at least", "Language of reports and documents", "Claude usage tier" | fields | app/ui/src/pages/mycv/Profile.jsx | My CV › Profile (≈ 850 px, *estimate*: Advanced files moved above it) | My CV | 3 (Profile, scroll, field) | 4 | yes (language is a code, e.g. "en") | yes | M8. |
| UI-mycv-profile-save | "Save profile" | button | app/ui/src/pages/mycv/Profile.jsx | My CV › Profile › sticky bar at the bottom of the viewport | My CV | 2 + typing | 3 + typing | yes | yes | Sticky since 0063ab11 (`.savebar`). |
| UI-mycv-profile-advanced | "Advanced files: two more files that shape your checks" | disclosure | app/ui/src/pages/mycv/Profile.jsx | My CV › Profile › top | My CV | 2 | 3 | yes | yes | Moved to the top in 0063ab11. |
| UI-mycv-design-show-passing | "Show a design that passes" | button | app/ui/src/pages/mycv/Design.jsx | Design › Preview verdict, on a failing design | My CV | 2 | 3 | yes | yes | M8. |
| UI-mycv-words-add | "Add a word" › "Add" | field + button | app/ui/src/pages/mycv/Writing.jsx | Writing rules › Words to avoid | My CV | 2 + typing | 3 + typing | yes | yes | M8. |
| UI-mycv-words-remove | "×" (named "Remove <word>") | button | app/ui/src/pages/mycv/Writing.jsx | Words to avoid › chip | My CV | 2 | 3 | yes | yes | M8. Undo. |
| UI-mycv-remake | "Open" / "Make it again" per CV | link, button | app/ui/src/pages/mycv/Writing.jsx | Writing rules › When rules apply › Your tailored CVs (now last, ≈ 900 px and below, *estimate*) | My CV | 3 (Writing rules, scroll, button) | 4 | yes | yes | M8. No confirmation here, unlike the job page. |
| UI-mycv-design-help | "What the screening check is" | link | app/ui/src/pages/mycv/Design.jsx | Design › Designs | My CV | 2 | 3 | yes | yes | M8. |
| UI-mycv-sample-open | "Open <name> · changed <date>" (shows the text) | disclosure | app/ui/src/pages/mycv/Writing.jsx | Writing rules › Writing samples | My CV | 2 | 3 | yes | yes | 0063ab11. Long files are cut ("Only the start is shown"); non-text files say to open them from the folder. |
| UI-mycv-own-design-help | "Make your own design" | link | app/ui/src/pages/mycv/Design.jsx | Design › Designs, beside "What the screening check is" | My CV | 2 | 3 | yes | yes | 0063ab11. Help topic `own-design` (`app/ui/src/pages/Help.jsx`). |

### Workspace and Help

| ID | Label | Type | Component | Surfaced at | Start page | From there | From Today | User's words | Discoverable | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| UI-workspace-health | "Data health": each issue with what to do | list | app/ui/src/pages/Workspace.jsx | Workspace | Workspace | 0 | 1 | yes | yes | M8. |
| UI-workspace-files-help | "What each file is" | link | app/ui/src/pages/Workspace.jsx | Workspace › Folder | Workspace | 1 | 2 | yes | yes | M8. |
| UI-workspace-ai-check | "Check again" | button | app/ui/src/pages/Workspace.jsx | Workspace › AI assistant | Workspace | 2 (scroll, button) | 3 | yes | yes | M8. |
| UI-workspace-ai-install | "How to install it" | link | app/ui/src/pages/Workspace.jsx | Workspace › AI assistant (missing) | Workspace | 2 | 3 | yes | yes | M8. |
| UI-workspace-help | "All help topics" · "Everything the app has done" | links | app/ui/src/pages/Workspace.jsx | Workspace › Help | Workspace | 2 | 3 | yes | yes | M8. |
| UI-help-topics | topic links; "← Help" | links | app/ui/src/pages/Help.jsx | Help | Help | 1 | 2 (Help, topic) | yes | yes | Ten topics now (fit, costs, failures, screening, rules, never, assistant, own-design, skip, files). Help is in the top bar, so this was 4 and is now 2. |
| UI-workspace-loose-open | "Fit reports not in Applications (<n>)" › "<Company> — <Role> · fit report <n>, <date> · Open" | list + links | app/ui/src/pages/Workspace.jsx | Workspace › Data health | Workspace | 1 | 2 | yes | yes | 0063ab11. "None: every fit report belongs to an application." when empty. Position depends on the number of data problems listed above it. |

## 5. Upstream capabilities a career-ops user expects

Source: upstream `AGENTS.md` and `modes/`. These rows are not part of the §12.6 metric.
"M6" gives the baseline's answer.

| ID | Upstream command or script | What it does | Console equivalent (M8, b7a7af1c) | M6 |
|---|---|---|---|---|
| U-oferta | `oferta`, auto-pipeline | Evaluate one offer | K-evaluate ("Check fit now") — yes | yes |
| U-pdf | `pdf` | Tailored CV PDF | K-pdf + K-cv-render ("Make tailored CV") — yes | yes |
| U-cover | `cover` | Cover letter | K-cover ("Write cover letter") — yes | yes |
| U-scan | `scan` | Portal scanner | K-scan ("Check for new openings") — yes; the skip list is shown read-only | yes |
| U-tracker | `tracker` | Tracker overview | Applications — yes | yes |
| U-pipeline | `pipeline` | Process every pending URL | To review › "Check fit for selected (N)" — yes | partial |
| U-batch | `batch` | Mass processing | partial — bulk check, queued two at a time; no batch mode | none |
| U-upskill | `upskill`, `jd-skill-gap.mjs` | Skill gaps | Skills — yes | yes |
| U-ats | `ats` | ATS score of any CV | partial — screening check on every design and tailored CV; no "check any PDF" | partial |
| U-integrity | `verify-pipeline.mjs`, `dedup-tracker.mjs`, `reconcile-pipeline.mjs`, `validate-portals.mjs`, `verify-portals.mjs` | Maintenance | Workspace › Tidy up and Companies — yes, all five (`validate-portals.mjs` since 0063ab11) | yes |
| U-set-status | `set-status.mjs --note` | Status with a note | partial — date and note only with Applied; the ledger is now shown in Job › History | partial |
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
| U-followup | `followup`, `followup-cadence.mjs` | Follow-ups | partial — Today › jobs that replied or are interviewing without documents; no cadence | none |
| U-reply-watch | `reply-watch`, `paste-reply.mjs` | Classify replies | none | none |
| U-outcome | `outcome`, `calibrate`, `patterns`, … | Outcomes and patterns | none | none |
| U-stats | `stats.mjs`, `salary-gap.mjs`, … | Statistics | partial — status chip counts, Workspace counts | none |
| U-titles | `titles` | Adjacent titles | none | none |
| U-training | `training`, `project` | Evaluate a course or project | none | none |
| U-latex | `latex`, `latex-tex`, `text` | LaTeX / text exports | none | none |
| U-discover | `discover` | Find a company's board | partial — Companies › Fix › "Find the right job board for <name>" and Workspace run `verify-portals`, which suggests the moved board in its findings; the user then edits the link by hand | partial |
| U-websearch | `scan_method: websearch` | Search companies with no board | shown, not run ("Web search (only with the command-line tools)") | none |
| U-agent-inbox | `agent-inbox` | Queue for the next session | none | none |
| U-update | `update`, `update-system.mjs` | Update the system | none (M9) | none |
| U-language | `language.output` | Output language | My CV › Profile › "Language of reports and documents" — yes | none |

## Summary

### Totals per table

| Table | Rows | yes | partly | no | no UI by design |
|---|---|---|---|---|---|
| 1. Server routes | 56 (55 routes + static fallback; 19 added in M8, 5 of them in ac0c78da) | 46 | 2 | 3 | 5 |
| 2. Run kinds | 17 (13 user-startable, 4 internal) | 13 | 0 | 0 | 4 |
| 3. Config and data files | 18 | 17 | 0 | 0 | 1 |
| 4. UI actions | 214 (119 M6 IDs + 95 M8 additions) | 207 | 6 | 0 | 1 |
| **All** | **305** | **283** | **8** | **3** | **11** |

UI actions by page:
- Global and shell: 22 (7 M6 + 15 new; UI-shell-help added)
- Applications, job page and shared: 59 (40 M6 + 19 new; UI-job-report-only-check added)
- Today: 21 (new; UI-today-link-fix added)
- To review and Companies: 41 (27 M6 + 14 new; UI-companies-find-board and UI-companies-skip added)
- Skills: 20 (18 M6 + 2 new; UI-skills-cv-again added)
- Activity: 4 (3 M6 + 1 new)
- My CV: 40 (24 M6 + 16 new; UI-mycv-sample-open and UI-mycv-own-design-help added)
- Workspace and Help: 7 (new; UI-workspace-loose-open added)

**Correction to the previous inventory.** Its tables held 291 rows, not 293: Applications
had 58 UI rows (it said 59) and My CV 38 (it said 39). Its 227 "yes" were therefore
227 of 291 (78.0%), not 227 of 293 (77.5%).

### Discoverability (§12.6 metric, as written)

"Every capability reachable in ≤ 3 interactions from the page where a user would look
for it, labelled in the user's own words." Start pages are in "Start pages assumed".

- **Primary: 283 of 305 capabilities (92.8%)** are discoverable.
- **Excluding the 11 plumbing capabilities** ("no UI by design", sitemap.md):
  **283 of 294 (96.3%)**.
- **If the three redundant routes counted as surfaced** (see below): 286 of 305 (93.8%);
  286 of 294 (97.3%) excluding plumbing. This is not the primary figure.
- **Target: 100% of the 294 non-plumbing rows. Short by 11 rows**, listed below.

### Secondary: from Today (the M6 rule)

- **255 of 305 (83.6%)** are discoverable counting from the landing page; **255 of 294
  (86.7%)** excluding plumbing.
- The difference is **28 rows** that meet §12.6 but are 4 interactions from Today. All of
  them are one level inside a page:
  - My CV › Design: the 7 Fine-tune controls (UI-cv-accent, UI-cv-body-font,
    UI-cv-heading-font, UI-cv-font-size, UI-cv-margin, UI-cv-density,
    UI-cv-section-add) and UI-cv-render-all-confirm;
  - My CV › Writing rules: UI-cv-voice-text, UI-mycv-remake;
  - My CV › Profile: UI-mycv-profile-app;
  - My CV › Design override: R-profile-design-restore (its Undo);
  - the cover-letter form: K-cover, UI-pipeline-cover-why, -problem, -approach, -tone,
    -submit, -cancel (2 from the job page);
  - Workspace › Tidy up after a preview: UI-pipeline-maint-confirm,
    UI-pipeline-maint-discard;
  - Companies: UI-companies-fix-actions, UI-companies-find-board, and the four "More
    options" fields UI-sources-form-provider, -scan-method, -query, -notes;
  - Applications: UI-status-when-date.

### Compared with M6 (96 of 191 = 50.3%) and the previous M8 inventory

On the 191 IDs both inventories share:

| Measure | M6 | M8, previous inventory | M8, b7a7af1c |
|---|---|---|---|
| From Today (M6's rule) | 96 / 191 (50.3%) | 134 / 191 (70.2%) | **149 / 191 (78.0%)** |
| From the start page (§12.6) | — | — | **171 / 191 (89.5%)** |
| §12.6, excluding the 11 plumbing rows | — | — | 171 / 180 (95.0%) |

- **What moved since the previous inventory** (all verified in the code cited in the
  rows):
  - Every gap it listed under "Not built, against sitemap.md" is built, except
    `validate-portals` in Workspace › Tidy up: Fit reports not in Applications,
    Companies to skip, Job › History from `status-log.tsv`, Back to automatic, Read my
    CV's skills again, Try the N failed postings again, Discard changes, "Yours", Open on
    writing samples, a fix for the profile override (as "Let this page decide"), a
    control for `validate-portals` (on Companies), and Fix running the board probe.
  - Depth on My CV › Design is gone: Save, Discard changes and Update existing CVs sit
    above the preview, and Fine-tune above the gallery.
  - Fold placement: Profile's Save is sticky; "I've sent my application" is in the job's
    Summary; Advanced files is at the top of Profile; All rules comes before the
    tailored-CV list.
  - Help is in the top bar, so every Help topic is 2 away.
- **Moved the other way:** the Workspace tidy-up tools now need a scroll, because the
  "Fit reports not in Applications" list sits above them (*estimate*). They stay ≤ 3 from
  Workspace; the two post-preview buttons became 4 from Today.
- **Reclassified without a code change, with the basis:** UI-cv-voice-save from yes to
  partly (the row is M6's whole-file Save; the previous row also counted the separate
  "Add" control).

### Redundant routes

R-health, R-run-events and R-scan-summary are API routes the UI no longer calls:
`fetchHealth` and `runEventsUrl` in `app/ui/src/api.js` are never imported, and
`/api/scan/summary` has no client function. Their facts reach the user another way:
R-health's through R-workspace and R-pipeline (Workspace › Folder and Data health,
Today's "could not be read" card), R-run-events' through R-events (progress) and R-run
(Technical details), R-scan-summary's through R-inbox (To review › Last check).

- **What sitemap.md and ia.md say.** sitemap.md gives each a place (R-health: Workspace ›
  Folder, Data health; R-run-events: Activity › item and Technical details;
  R-scan-summary: To review › header) and does **not** list any of them under "no UI by
  design" (sitemap.md §Totals names 11 rows, none of these). ia.md §2.1 and §2.9 name
  `/api/health` as the source of Today's unreadable-row card and Workspace › Folder.
- **How they are classified here.** Not plumbing: sitemap.md gives no basis for that, so
  they stay in the denominator. **no**: the routes themselves are not reached from any
  control. This is the M6 convention and the previous M8 inventory's, and nothing in these
  routes changed since. The figure with them counted as surfaced (the places sitemap.md
  gives them are built) is given above for comparison only.
- **What would close them.** A decision, not a UI change: retire the three routes, or
  record in sitemap.md that their capability is served by R-workspace, R-events/R-run and
  R-inbox, or have the UI call them.

### Capabilities still short of the target (11)

| ID | Discoverable | Why |
|---|---|---|
| R-health | no | Route not called; see "Redundant routes". |
| R-run-events | no | Route not called; see "Redundant routes". |
| R-scan-summary | no | Route not called; see "Redundant routes". |
| UI-shell-workspace | partly | Label: "Workspace" is not a job seeker's word for the folder, data health, tidy-up and the assistant. Reachable in 1. |
| UI-sources-form-api | partly | Label: "API endpoint" (behind More options; reachable in 3). |
| UI-cv-section-move | partly | 4 from My CV (Design, Fine-tune, add a section, Up) when no section order is set yet. |
| UI-cv-section-remove | partly | As above. |
| R-cv-voice-put | partly | Save of All rules sits under the 16-row editor: 4 from My CV (*estimate*). |
| UI-cv-voice-save | partly | Same control as R-cv-voice-put. |
| UI-cv-voice-seed | partly | "Start from the example rules…" sits beside that Save: 4 + confirm. |
| R-cv-voice-restore | partly | Going back to the previous rules is offered only as the Undo of "Start from the example rules"; a normal Save keeps `voice-dna.md.bak` but offers no Undo. |

Other gaps that do not change a row's class:
- `validate-portals` is on Companies only; sitemap.md also placed it in Workspace ›
  Tidy up.
- Fit reports not in Applications are reachable from Workspace only; Applications has no
  pointer to them.
- The Fix button's "Find the right job board for <name>" runs the probe for every
  company, not just the one being fixed.
- "Read my CV's skills again" is always shown, though the run is cached against
  `cv.md`'s content (`app/server/queue/specs.js`), so it may do nothing on an unchanged CV.
- UI-today-board-fix and UI-today-link-fix land at the top of Companies, not on the
  company's row.
- Status notes: History shows the ledger's status changes, but the ledger has no note
  column, and a note can be sent only with Applied (R-status).
- Positions marked *estimate* were not re-shot after ac0c78da–b7a7af1c. R-cv-voice-put,
  UI-cv-voice-save and UI-cv-voice-seed are the rows where the estimate decides the class.

### Capabilities with no UI surface

1. **The three redundant routes** (R-health, R-run-events, R-scan-summary): the routes
   are not called; their facts are shown through other routes.
2. **Editing the scan filters** in `portals.yml` and **editing `data/blacklist.md`**: both
   are shown read-only, in words, with how to edit the file (decision D-3; sitemap.md
   left the skip list's editability to M8).
3. **Adding or removing writing samples; creating custom designs; editing
   `modes/_profile.md` and `article-digest.md`.** These happen in the file system; the UI
   names, shows and explains them (sitemap.md and ia.md §2.7: no editor in v1).
4. **The tracker beyond status:** editing notes, adding a row by hand, deleting a row.
5. **Run options:** model (`evaluate`, `pdf`, `cover`), paper format (`pdf`), fetch
   limit (`skills-fetch`), session cap (`skills-extract`, fixed at 5), a single company
   for `verify-portals`.
6. **Agent CLI path and concurrency.** Workspace shows them read-only ("Changing this
   comes in a later version", M9).
7. **The profile's `cv.template` override.** "Let this page decide" covers `style` and
   `cv.sections` only.
8. **Upstream modes with no console equivalent** (table 5): intake, expand, ofertas,
   triage, deep, contacto, email, apply, the interview-prep family, offer-prep,
   reply-watch, outcome/calibrate/patterns, titles, training/project, latex/text,
   agent-inbox and update. Batch, ats, stats, followup, add, discover and set-status are
   partial.

Items the previous inventory listed here and that now have a surface: `data/blacklist.md`,
status history, reports without a tracker row, `validate-portals`, retrying failed
posting fetches, re-reading the CV's skills, opening writing samples, and the profile's
`style` / `cv.sections` overrides.
