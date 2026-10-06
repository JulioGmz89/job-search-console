# Top tasks (M6, method 2)

The nine top tasks of PROJECT_PLAN.md §12.2, written for the blind `persona-tester`.
Each persona × task pair runs in a fresh sandbox (`node app/ux/sandbox.mjs …`).

## Conventions

- **Goal** is what the tester receives, verbatim, together with one persona card from
  `personas.md`. Goals use the job seeker's words. They never name a page, button, tab
  or other label of the console. Nouns that are simply the user's own vocabulary and
  happen to appear on screen too (CV, cover letter, job posting, status) are allowed;
  the console's verbs and page names ("evaluate", "scan", "inbox", "pipeline", "sources",
  "runs", "render", "theme", "voice", "learn next") are not.
- **Start state** is the sandbox `--state`, plus `--delay` and `--scenario` when they
  differ from the defaults (`--delay 8000`, `--scenario auto`).
- **Success criterion** is checked after the run against the sandbox data root (`root` in
  the `SANDBOX_READY` line) or its API, never against the tester's own claim, except
  where a task asks the tester to report something; then the answer is checked against
  the API.
- **Step budget** counts browser actions (click, type, select, navigate, wait). 40 unless
  a reason is given.
- **Personas**: all three unless stated.
- "Sandbox start" below means the time `SANDBOX_READY` was printed.

## Revisions to the §12.2 list

The nine tasks are kept as §12.2 states them. Three choices go beyond the list and are
stated here so they can be challenged:

1. **T1 is kept although the current UI cannot complete it.** There is no Profile page
   (§5 page 4 was moved to M8) and "Add" on the sources page is disabled while
   `portals.yml` does not exist (`app/server/services/portals.js` line 273). The task
   stays, with a success criterion that describes the goal, because the baseline must
   record where a first-time user gets stuck; M8's acceptance re-runs it.
2. **T7 starts in `broken`, not `populated`.** In `broken` the selected theme fails the
   ATS check, so "confirm it is still ATS-safe" has something to find. In `populated` the
   saved theme is upstream's `standard` (`app/ux/sandbox/seeds/populated/config/cv/style.yml`),
   so the confirmation step could be skipped without consequence.
3. **T9 includes regenerating one CV.** Changing the rules alone never shows the user the
   effect; the §12.2 wording ("so the CV does not read as AI-generated") is about the CV,
   so the task ends with a CV written under the new rules.

T5 gets a budget of 50 (two documents, a four-question form, and two agent waits).

---

## T1 — First run from an empty workspace

- **Goal (give verbatim):**
  > You have just installed this app and opened it for the first time. Get it ready for
  > your job search. It needs your CV (below), and it needs to know which companies to
  > keep an eye on for new openings. Start with one: Kestrel Media, whose careers page is
  > https://job-boards.greenhouse.io/kestrelmedia
  >
  > Your CV:
  >
  > ```
  > # Alex Rivera
  > Austin, TX (remote) · alex.rivera@example.com · +1 555 010 0199
  >
  > ## Summary
  > Backend engineer with seven years building payment and data platforms in
  > TypeScript and Go.
  >
  > ## Experience
  > ### Senior Backend Engineer — Northwind Payments (2022–present, remote)
  > - Rebuilt the settlement pipeline as an event-driven Go service; reconciliation
  >   went from 4 hours to 25 minutes.
  > - Moved cron jobs to a queue-backed scheduler with idempotent retries; payment
  >   incidents fell 60% in two quarters.
  > ### Backend Engineer — Contoso Analytics (2019–2022, Austin)
  > - Designed the public REST API (TypeScript, PostgreSQL) used by 3,000 integrations.
  >
  > ## Education
  > B.S. Computer Science, University of Texas at Austin (2017)
  >
  > ## Skills
  > Go, TypeScript, SQL, Python, Kubernetes, Docker, Terraform, AWS, PostgreSQL, Kafka
  > ```
- **Start state:** `empty`.
- **Success criterion:** both hold:
  1. `<root>/cv.md` exists and contains "Alex Rivera" and "Northwind Payments"
     (equivalently `GET /api/agent/status` → `cvPresent: true`).
  2. `<root>/portals.yml` exists and `GET /api/portals` → `companies` contains at least
     one entry with `enabled: true` (expected: "Kestrel Media" with careers URL
     `https://job-boards.greenhouse.io/kestrelmedia`).
- **Step budget:** 40.
- **Personas:** P1, P2, P3.
- **Note:** expected to fail on the current UI (see Revisions). The run's value is the
  transcript: where each persona looks first and how long before they give up.

## T2 — Add one job by URL and get it evaluated

- **Goal (give verbatim):**
  > You have been using this app for a few weeks. Today you came across a job you like:
  > https://job-boards.greenhouse.io/kestrelmedia/jobs/4134913 (Senior Backend Engineer
  > at Kestrel Media). Find out how well it fits you and whether it is worth applying,
  > and make sure it is kept with the rest of your job applications. Tell me what the app
  > concluded.
- **Start state:** `populated` (default `--delay 8000`).
- **Success criterion:** `GET /api/pipeline` → a row with `company` "Kestrel Media" and
  `role` "Senior Backend Engineer", `hasReport: true`, and `report.url` equal to the
  URL above (in `data/applications.md`: a new row, number 41, linking a file in
  `reports/` that exists). The tester's answer states the score (4.1) or the decision.
- **Step budget:** 40.
- **Personas:** P1, P2, P3.

## T3 — Find the best matches and update their status

- **Goal (give verbatim):**
  > You have been using this app for a few weeks. Yesterday you sent applications for
  > the two best-rated jobs on your list that you had not done anything about yet. Update
  > your records so they show you have applied to those two. Nothing else should change.
- **Start state:** `populated`.
- **Success criterion:** in `GET /api/pipeline` (or `data/applications.md`):
  - row 12 (Cobalt Freight, Staff Software Engineer, 4.2) and row 13 (Driftwood
    Analytics, Backend Engineer (Go), 3.9) have status "Applied";
  - every other row's status is unchanged from
    `app/ux/sandbox/seeds/populated/data/applications.md`.
  ("Not done anything about" = status Evaluated; the highest-scored Evaluated rows are 12
  and 13.)
- **Step budget:** 40.
- **Personas:** P1, P2, P3.

## T4 — Run a scan and understand what came back

- **Goal (give verbatim):**
  > You have been using this app for a few weeks. It is Monday morning. Check whether any
  > new openings have appeared at the companies you follow since you last looked. Tell me
  > how many new ones there are, which ones, and whether anything went wrong while
  > checking.
- **Start state:** `populated`.
- **Success criterion:** both hold:
  1. `GET /api/runs` → a run of kind `scan` with status `succeeded` (a dry run is
     accepted).
  2. The tester's final answer says there are **4** new postings and names **Juniper
     Mobility** as the company whose job board could not be reached / no longer exists.
- **Step budget:** 40.
- **Personas:** P1, P2, P3.

## T5 — Get a tailored CV PDF and a cover letter for one job

- **Goal (give verbatim):**
  > You have been using this app for a few weeks. Your recruiter screen with Granite Cloud
  > for the Software Engineer, Payments role is booked, and the recruiter asked for a CV
  > tailored to that role and a cover letter. Get both ready; you will send them yourself.
  > If you are asked what the letter should say: you want this role because Granite Cloud
  > runs payments at a scale you have not worked at yet; the problem you would solve is
  > settlements that arrive late or fail; your first move would be to trace the
  > settlement path end to end and add safe retries wherever money could be paid twice.
  > You want the letter to sound direct.
- **Start state:** `populated` (default `--delay 8000`).
- **Success criterion:** `GET /api/reports/6` → `pdf.exists: true` and `cover` is not
  null, and `GET /api/runs` → a `pdf` run and a `cover` run with `meta.reportId` 6, both
  `succeeded`. (Report 006 has neither a PDF nor a cover letter in the seed.)
- **Step budget:** 50.
- **Personas:** P1, P2, P3.

## T6 — Decide what to learn next, with evidence

- **Goal (give verbatim):**
  > You have been using this app for a few weeks. You have three months of evenings to
  > study one thing that would make you a stronger candidate for the kind of jobs you are
  > seeing. Use what the app knows about those jobs to decide which skill to study first.
  > Tell me the skill, how many of the jobs ask for it, and at least one company that
  > wants it.
- **Start state:** `populated`.
- **Success criterion:** checked against `GET /api/skills` at the end of the run (the data
  can change if the tester starts a reading run):
  1. The named skill is one of the top three in any of these rankings:
     - the first three ids of `lists.learn`;
     - the Learn next view as the page ranks it (by postings asking for it);
     - the same view with **Only jobs I'd apply to (fit 4 and up)** on, which re-ranks
       by good-fit postings (M7 decision D-3, after WP-T6-01).

     The page's two rankings come from `rankSkills()` in `app/ui/src/lib/skills.js`,
     which the checker imports, so it accepts exactly the order the tester saw.
  2. The answer cites evidence that matches that skill in the same ranking: its count
     (±1), or at least one company among the postings counted. For the filtered ranking
     that means the good-fit postings only. The unfiltered `demand` and `gapReports`
     companies are also accepted.
- **Step budget:** 40.
- **Personas:** P1, P2, P3.

## T7 — Change how the CV looks and confirm it is still ATS-safe

- **Goal (give verbatim):**
  > You have been using this app for a few weeks. You suspect your CV looks like
  > everyone else's. Give it a different design that you like, make that the design for
  > every CV the app produces from now on, and produce the version you would send to
  > Cobalt Freight for the Staff Software Engineer job. Before you finish, make sure the
  > automated screening systems companies use can still read it properly.
- **Start state:** `broken`.
- **Success criterion:** all hold:
  1. `<root>/config/cv/style.yml` (or `GET /api/cv/style` → `style.template`) names a
     theme other than `broken`.
  2. `GET /api/runs` → a `cv-render` run with `meta.documentId`
     `cv-alex-rivera-cobaltfreight-012` and status `succeeded`.
  3. `GET /api/reports/12` → `ats.verdict` is `pass` or `warn`, and `ats.checkedAt` is
     later than sandbox start.
- **Step budget:** 40.
- **Personas:** P1, P2, P3.

## T8 — Work out why a run failed and recover

- **Goal (give verbatim):**
  > You have been using this app for a few weeks. Earlier today you asked it to look at a
  > job posting for you and something went wrong. Find out what happened and why, then
  > get that job looked at after all. Tell me what went wrong.
- **Start state:** `broken` (the launcher starts one evaluation that fails; its id is
  `failedRun.id` in `SANDBOX_READY`; the next session succeeds).
- **Success criterion:** all hold:
  1. `GET /api/runs` → an `evaluate` run with `meta.url`
     `https://job-boards.greenhouse.io/driftwoodanalytics/jobs/4109592` and status
     `succeeded`, queued after `failedRun.id`.
  2. `GET /api/pipeline` → a new row (number 41 or above) for Driftwood Analytics, Data
     Engineer, whose `report.url` is that URL. (Revised after the walkthrough: the
     launcher used to fail on a Brightwater Health Data Engineer posting, and upstream's
     merge folded the retry into row 21, the older posting with the same company and
     role; see W-T8-06. The launcher now picks a posting whose company and role are not
     tracked. The malformed row is number 57, Quarry Systems.)
  3. The tester's answer says, in substance, that the assessment session ended without
     writing a report.
- **Step budget:** 40.
- **Personas:** P1, P2, P3.

## T9 — Change the writing voice so the CV does not read as AI-generated

- **Goal (give verbatim):**
  > You have been using this app for a few weeks. The CVs and letters it writes for you
  > still sound machine-made. The words "seamless", "cutting-edge" and "robust" keep
  > turning up, and they are not how you talk. Make sure it stops using them, without
  > losing the writing rules you already set up. Then get a fresh tailored CV for the
  > Cobalt Freight Staff Software Engineer job, written under the new rules.
- **Start state:** `populated` (default `--delay 8000`).
- **Success criterion:** all hold:
  1. `<root>/voice-dna.md` (or `GET /api/cv/voice` → `text`) contains "seamless",
     "cutting-edge" and "robust" (any case), and still contains "spearheaded" (a rule
     from the seed).
  2. `GET /api/runs` → a `pdf` run with `meta.reportId` 12, status `succeeded`, queued
     after `voice-dna.md` was last modified.
- **Step budget:** 40.
- **Personas:** P1, P2, P3.

---

## first-job — From an empty workspace to a first evaluated job (M8 acceptance)

Added in M8 for the acceptance criterion in PROJECT_PLAN.md §8 M8: "in a fresh sandbox,
a simulated first-time persona gets from an empty workspace to a first evaluated job
without leaving the app". It chains T1 and T2 in one run and one context, so nothing
carries over between them except what the app itself shows.

- **Goal (give verbatim):**
  > You have just installed this app and opened it for the first time. Get it ready for
  > your job search: it needs your CV (below), and it should keep an eye on one company
  > for new openings, Kestrel Media, whose careers page is
  > https://job-boards.greenhouse.io/kestrelmedia
  >
  > Then use the app to find out whether this job is a good fit for you:
  > https://job-boards.greenhouse.io/kestrelmedia/jobs/4134913
  > Tell me what the app concluded. Do everything inside the app; do not open a
  > terminal or edit files.
  >
  > Your CV:
  >
  > ```
  > # Alex Rivera
  > Austin, TX (remote) · alex.rivera@example.com · +1 555 010 0199
  >
  > ## Summary
  > Backend engineer with seven years building payment and data platforms in
  > TypeScript and Go.
  >
  > ## Experience
  > ### Senior Backend Engineer — Northwind Payments (2022–present, remote)
  > - Rebuilt the settlement pipeline as an event-driven Go service; reconciliation
  >   went from 4 hours to 25 minutes.
  > - Moved cron jobs to a queue-backed scheduler with idempotent retries; payment
  >   incidents fell 60% in two quarters.
  > ### Backend Engineer — Contoso Analytics (2019–2022, Austin)
  > - Designed the public REST API (TypeScript, PostgreSQL) used by 3,000 integrations.
  >
  > ## Education
  > B.S. Computer Science, University of Texas at Austin (2017)
  >
  > ## Skills
  > Go, TypeScript, SQL, Python, Kubernetes, Docker, Terraform, AWS, PostgreSQL, Kafka
  > ```
- **Start state:** `empty` (default `--delay 8000`).
- **Success criterion:** all hold (`check-task.mjs --task first-job`):
  1. `GET /api/agent/status` → `cvPresent: true`.
  2. `GET /api/portals` → `exists: true` with at least one enabled company.
  3. `GET /api/runs` → a succeeded `evaluate` run.
  4. `GET /api/pipeline` → at least one row with a report.
- **Step budget:** 60.
- **Personas:** P2 (the first-timer) for acceptance; P1 and P3 optional.

## Expected paths (never shown to testers)

The shortest path through the current UI, with on-screen labels. Counts are browser
actions; waits are listed where a run must finish. Inventory row ids in brackets.

### T1 (empty)

No path completes the task.
1. Pipeline shows "1 data issue found" (`tracker-missing`) and "No applications match
   these filters."; "Evaluate now" is disabled with the reason "No cv.md in the data
   directory yet" [UI-pipeline-evaluate-now, R-agent-status].
2. Nowhere accepts CV text [C-cv-md]. CV Studio only offers the fictional sample CV in
   "CV" [UI-cv-document].
3. "Sources" → "1 issue(s) in portals.yml"; both "Add" buttons are disabled
   [UI-sources-add-company, R-portals-create, C-portals-yml].

Expected outcome: fail on both criteria. Record the first place each persona looks for
"upload my CV" and "add a company", and the step at which they stop.

### T2 (populated)

1. Click "Paste a job posting URL…" and paste the URL [UI-pipeline-url].
2. "PDF if score ≥ 3.5" is already ticked [UI-pipeline-autopdf]; click "Evaluate now"
   [UI-pipeline-evaluate-now].
3. Wait for the run panel below the paste box to show "Finished" (~8 s; the merge and
   inbox reconcile follow, then a PDF run because 4.1 ≥ 3.5).
4. The new row 41 "Kestrel Media · Senior Backend Engineer · 4.1" appears in the table.
5. Click the row, scroll to the detail, read "Decision" and the report
   [UI-pipeline-open-row].

About 5–7 actions.

### T3 (populated)

1. Click the "Evaluated" status chip [UI-pipeline-status-filter]; the table is already
   sorted by "Score ↓" [UI-pipeline-sort].
2. Row 12 (Cobalt Freight, 4.2): Status select → "Applied" [UI-pipeline-status-cell].
   The row leaves the filtered view after the reload.
3. Row 13 (Driftwood Analytics, 3.9): Status select → "Applied".

3 actions.

### T4 (populated)

1. "Sources" [UI-nav-sources].
2. "Scan now" [UI-sources-scan]; wait for "Finished" (seconds; the log arrives all at
   once).
3. Read the log summary and the line "<n> URL(s) waiting to be evaluated · last scan
   <date>: … found, 4 added …"; "Show the inbox" lists the new ones
   [UI-sources-inbox-toggle].
4. In "Tracked companies", Juniper Mobility's "Last seen" reads "board not found".

3–4 actions plus reading.

### T5 (populated)

1. Type "Granite" in "Filter company, role, notes…" [UI-pipeline-search] (or find row 6).
2. Row 6 (Granite Cloud, Software Engineer, Payments): "PDF" [UI-pipeline-row-pdf].
3. Same row: "Cover" [UI-pipeline-row-cover] → dialog "Cover letter for Granite Cloud".
4. Fill "A. Why this role / company?", "B. What problem would you solve for them?",
   "C. How would you approach it?" [UI-pipeline-cover-why/-problem/-approach].
5. "D. Tone" → "Direct — …" [UI-pipeline-cover-tone].
6. "Draft and render the letter" → the app jumps to the Runs page with the letter's log.
7. Wait for "PDF for Granite Cloud" and "Cover letter for Granite Cloud" to finish (two
   agent lanes, so they overlap; the PDF chains a "Render CV" and "Mark PDF ready").
8. "Pipeline", click row 6, scroll to the detail; "PDF" tab and "Cover letter" tab
   [UI-pipeline-detail-tab-pdf, UI-pipeline-detail-tab-cover].

About 12–14 actions.

### T6 (populated)

1. "Skills" [UI-nav-skills]; the "Learn next" tab is selected [UI-skills-tab-learn].
2. Optional: tick "Jobs I’d apply to" [UI-skills-strong].
3. Click "▸ <top skill>" to expand its evidence: "<n> postings ask for <skill>", the
   companies, and "flagged as a gap in report <nnn>" [UI-skills-expand].

2–3 actions plus reading.

### T7 (broken)

1. "CV Studio" [UI-nav-cv].
2. "CV" select → the Cobalt Freight Staff Software Engineer CV
   (`cv-alex-rivera-cobaltfreight-012`) [UI-cv-document]. The preview shows "🚨 ATS check
   failed — an applicant-tracking system will lose part of this CV" and the selected card
   shows "ATS fail · <n> critical".
3. Click a theme card marked "ATS pass" [UI-cv-theme-pick]; optionally change "Accent
   colour" [UI-cv-accent].
4. "Save & render this CV" [UI-cv-render] (saves `style.yml`, then queues `cv-render`).
5. Wait for the run panel to show "Finished"; the preview verdict reads "✓ ATS check
   passed".

5–6 actions.

### T8 (broken)

1. "Runs" [UI-nav-runs]; under "Finished", the row with status "Failed", run
   "Evaluate job-boards.greenhouse.io", about the Driftwood Analytics URL.
2. Click it [UI-runs-open]; the log at the top of the page shows the failure (the session
   wrote no report).
3. There is no retry. Shortest recovery: "Sources" → "Show the inbox" → "Evaluate" on
   "Data Engineer · Driftwood Analytics" [UI-sources-inbox-evaluate]. (Alternative: paste
   the URL into "Paste a job posting URL…" on Pipeline and click "Evaluate now".)
4. Wait for the evaluation to finish (~8 s plus chained merge and reconcile).

About 5–6 actions.

### T9 (populated)

1. "CV Studio" [UI-nav-cv]; scroll to "Voice — writing rules" [UI-cv-voice-text].
2. In the textarea, under "## Never write", add "- seamless", "- cutting-edge",
   "- robust".
3. "Save voice rules" [UI-cv-voice-save]; notice "voice-dna.md saved. It applies to the
   next cover letter or PDF."
4. "Pipeline"; row 12 (Cobalt Freight, Staff Software Engineer) → "PDF ↻"
   [UI-pipeline-row-pdf] (it already has a PDF).
5. Wait for "PDF for Cobalt Freight" and its "Render CV" to finish.

About 6–7 actions.
