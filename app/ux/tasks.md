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

The shortest path through the M8 UI (app/ux/design/ia.md), with on-screen labels. The
walkthroughs and the ux-reviewer use these; the blind persona-tester never sees them.
The M6 paths through the old UI are in git history (M6, `app/ux/tasks.md`).

### T1 (empty)

1. Today opens on **Welcome. Let’s get you set up.** with **Get set up**: three steps.
2. **Add your CV**: paste the CV into **Your CV** (or **Choose a file…**) → **Save my CV**.
   The step shows "Saved: Alex Rivera · Summary, Experience (2 roles), Education, Skills".
3. **Follow a company**: **Company name** "Kestrel Media", **Careers page link** the
   Greenhouse URL → **Follow company**. The step shows "Following Kestrel Media ·
   Greenhouse job board recognised from the link". `portals.yml` is created.
4. **AI assistant** is already ticked in the sandbox ("Claude Code is installed").
5. **You’re set up** appears, with focus on it.

### T2 (populated)

1. **Applications** → **Add a job** → **Link to the job posting**: paste the URL.
2. **Check fit now** (the line under the field says it takes 2–5 minutes and uses the
   Claude plan). The check's card appears under the button, working (~8 s).
3. It finishes: "Fit 4.1 / 5. The fit report is ready." → **Open the job** (focus is
   on it). The job page shows **Fit 4.1 / 5 · Recommendation: Apply**.
   (Also from Today › **Check your first job** when there are no applications.)

### T3 (populated)

1. **Applications** opens sorted by fit, best first. Optional: the **Reviewed — not
   applied** chip, or **Fit** "4 and up".
2. For row 12 and row 13: **Status for … — …** → **Applied** → **When did you apply…?**
   → **Save as Applied**. "Saved: Applied" shows on the row, with Undo.

### T4 (populated)

1. **To review** → **Check for new openings** (a few seconds, no AI).
2. The summary card: "Last check, …: 4 new openings", naming them, and "Juniper
   Mobility couldn’t be reached (board not found) — Fix in Companies". The four links
   carry **New**; the top bar's To review shows the count.

### T5 (populated)

1. **Applications** → open row 6 (or search "Granite Cloud" in the top bar).
2. **Documents** → Tailored CV: **Make tailored CV** (~8 s) → Ready, with **Open** and
   **Download**.
3. Cover letter: **Write cover letter** → answer **Why this role?**, **What problem would
   you solve for them?**, **How would you start?** → **Write the letter** (~8 s) → Ready.

### T6 (populated)

1. **Skills** opens on **Learn next**, ranked by how many postings ask for each skill.
2. Optional: **Only jobs I’d apply to (fit 4 and up)** re-ranks by good-fit postings.
3. The top skill's row: "Asked for in N postings (…)" and **Show the evidence for …**
   lists the companies.

### T7 (broken)

1. Today › **Your CV design fails the screening check** → **Choose a design that passes**
   (or **My CV** › **Design**). The preview says **Screening problems** with what is lost.
2. Choose a design marked **Readable by screening systems** (or **Show a design that
   passes**) → **Make this my design for every CV**.
3. **Preview with** "Cobalt Freight — Staff Software Engineer, …" → **Lay out this CV
   again in …** (a few seconds, no AI), or **Update existing CVs to this design (6)** →
   confirm. The CV's verdict is readable.

### T8 (broken)

1. Today › **Needs you** → "Check fit · Driftwood Analytics — Data Engineer" with **What
   happened:** "…stopped before writing the fit report…" and **What to do:** "Try again…"
   (the Activity button reads **Activity · 1 failed**).
2. **Try again** (~8 s) → "Tried again: that worked" → **Open the job** (row 41).

### T9 (populated)

1. **My CV** › **Writing rules** → **Words to avoid**: **Add a word** "seamless" → **Add**,
   then "cutting-edge", then "robust". The five words already there stay.
2. **When rules apply** lists every tailored CV, best fit first; Cobalt Freight — Staff
   Software Engineer (#12) says "made before your rules changed" → **Make it again**
   (~8 s), or from the job page › Documents › **Make it again**.

### first-job (empty)

T1, then Today › **Check your first job** → paste the posting link → **Check fit now** →
"Fit 4.1 / 5" → **Open the job**: it is application #1 in **Applications**.
