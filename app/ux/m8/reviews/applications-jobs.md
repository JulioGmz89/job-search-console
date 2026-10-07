# Review: applications-jobs
Sandbox: http://127.0.0.1:4401/ (POPULATED) · Date: 2026-10-06
Verdict: **FAIL**

This phase fails for two reasons:
- **F-015 (severity 3) is not closed.** Checking a posting whose company and role are already tracked still folds the result into the old row without saying so. The app says "then: added to Applications", and the job page's History reads "added to Applications · now Applied" for a row that was really overwritten (R-applications-jobs-01).
- **T4 can no longer answer "which ones".** After a check for new openings, nothing on any screen says which 4 openings are new. There are no **New** badges, no nav count, and no Today card naming them. A later check also replaces the "4 new" headline with "0 new" (R-applications-jobs-02).

T3 and T5 are now short and complete by keyboard and by mouse. T2 also completes. The Status control, the When? dialog and the Documents cards are the strongest parts of the build. The other findings are severity 2 or lower; most are about focus and stale messages.

Viewport 1280 × 800, with a full reload first. One stale browser session state was cleared before starting; it had restored a previous tester's filter and "Checked ↓" sort. Walked keyboard first (Tab, arrows, Enter, Escape), then mouse. I also checked the dark scheme, 640 × 400 (200% zoom) and 320 px. Live regions were read from `#announce` and `#alert`, focus from `document.activeElement`, and data from `/api/pipeline`, `/api/reports/:id` and `/api/runs`.

The sandbox was not pristine when I started. A tailored-CV run for row 38 (Ironleaf Security, fit 2.5) had already finished at 18:19, and **Activity** showed "1 done".

State I left behind:
- rows 12 and 13 are **Applied** (T3, dated "yesterday");
- row 41, Kestrel Media, has been added (T2);
- row 21, Brightwater Health Data Engineer, was merged (F-015 reproduction);
- report 6 has a tailored CV and a cover letter (T5);
- two checks for new openings have run;
- Kestrel Media was removed and restored with Undo.

## Claimed fixes

| ID | Status | Evidence |
|---|---|---|
| F-005 (4) run logs not keyboard-reachable | **Closed** (re-check). On the job page, History rows are links to `#/activity/:id`. In the Activity panel the run titles and **Open the job** / **Open the letter** are links reachable by Tab. | R-applications-jobs-F-015.png |
| F-010 (3) report opens below the table | **Closed.** Each job opens on its own page. The `<title>` becomes "Company — Role", focus moves to the `<h1>`, and the page has Summary, Documents, Fit report and History. Remaining: Back and **← Applications** do not restore the scroll position, and a filter that came from a link (Today › **Review them**) is lost (R-…-06). | R-applications-jobs-job12.png |
| F-011 (3) no way to open what a run produced | **Closed.** Ready cards show the file name, **Open** (new tab) and **Download**, each named after the job. Activity has **Open the job** and **Open the letter**. Still missing on some cards: design and tone (R-…-08). | R-applications-jobs-T5-docs.png |
| F-013 (3) inbox check gives no feedback, then the item reverts | **Partly closed.** **Check fit** in To review now shows a named "Working" card in the item, with elapsed time and **Cancel**, and the start is announced. When the check succeeds, the item disappears from the list. Nothing at that spot shows the fit, the recommendation or a link, and focus falls to `<body>` (R-…-04). | — |
| F-014 (3) rows and headers mouse-only | **Closed.** The table is one Tab stop. Arrow keys reach every cell, the job name is a link, and ArrowUp to a header then Enter sorts it (`aria-sort` changes). The table opens sorted **Fit ↓**. | R-applications-jobs-list.png |
| F-015 (3) merge into an existing row without notice | **Not closed.** See R-applications-jobs-01. | R-applications-jobs-F-015.png, R-applications-jobs-F-015-job21.png |
| F-017 (3) failed job not marked in the inbox | **Partly verified.** "Posting couldn't be read" shows as a badge with "Try again, or remove it if the job is gone." The **Last check failed** mark needs a failed check, which this sandbox cannot produce (BROKEN state). | R-applications-jobs-T4.png |
| F-018 (3) finished check doesn't say what it concluded | **Closed, one detail missing.** The result card in place reads "Check fit · Kestrel Media — Senior Backend Engineer · Fit 4.1 / 5. The fit report is ready. · then: added to Applications · **Open the job**". The same is announced, and focus moves to **Open the job**. The recommendation ("Apply") is not in the card; the prototype showed it. | R-applications-jobs-F-018.png |
| F-020 (3) dialog focus | **Closed** for the dialogs met: **When did you apply to …?**, **Make the tailored CV … again?** and **Stop following Kestrel Media?**. Each traps focus, closes on Escape and returns focus to its trigger. The destructive confirm now focuses **Cancel**. The cover letter is an inline form: focus goes to the form, and an empty submit moves focus to the first invalid field. | R-applications-jobs-when.png |
| F-021 (3) unreadable row in words | **Not verified here.** It needs the BROKEN state. | — |
| F-022 (3) status select saves on the first arrow | **Closed.** Enter opens the list, arrows only move (the API still showed "Evaluated"), Enter chooses, and Escape cancels without saving. | R-applications-jobs-F-022.png |
| WP-T2-01 (2) job link in search is a dead end | **Not closed.** The search shows "Nothing matches 'https://…/4134913'." and offers no action. | R-applications-jobs-WP-T2-01.png |
| WP-T2-02 (1) History lists one check twice | **Closed** (one check line, one "added" line). The two lines now disagree on the date: "done, Oct 6" and "Oct 7 · added to Applications" (R-…-09). | — |
| WP-T2-03 (1) Save for later accepts a link already in Applications | **Not closed.** It now shows a green "That link is already in To review. **Open To review**", but the job is #41 in Applications and is not in the To review list. | R-applications-jobs-WP-T2-03.png |
| WP-T2-04 (2) To review check gives no result in place | **Not closed** (see F-013 and R-…-04). | — |
| WP-T2-05 (2) focus lost when progress becomes result | **Closed** on Applications › Add a job: focus moves to the run card, then to **Open the job**. | R-applications-jobs-F-018.png |
| WP-T2-06 (1) To review offers no way to add a link | **Not closed.** It still says "or saved by you" and has no link field. | R-applications-jobs-to-review.png |
| WP-T3-01 (2) "I've sent my application" records today without asking | **Not closed.** The button text now says "Sets the status to Applied, dated today", but it still saves at once with no **When?**. It also leaves a stale "Saved: Reviewed — not applied" next to the new **Applied** and drops focus to `<body>` (R-…-05). | R-applications-jobs-WP-T3-01.png |
| WP-T3-02 (1) status menu opens below the fold | **Closed.** The list flips upward and is fully visible for rows 12 and 13 at 1280 × 800. | R-applications-jobs-WP-T3-02.png |
| WP-T3-03 (1) second change removes the first Undo; Activity doesn't keep it | **Closed per ia.md §3.** The Activity panel holds the latest change's **Undo** "until the next action". Undo from the panel worked, was announced ("Undone: …") and kept focus in the panel. | R-applications-jobs-WP-T3-03.png |
| WP-T4-01 (2) "Checking…" banner stays after the check | **Partly closed.** On To review the result replaces the summary in place and takes focus. On Companies, **Check for new openings** shows nothing on the page, before or after; only the Activity count and the announcement change (R-…-07). | R-applications-jobs-WP-T4-01.png |
| WP-T4-02 (2) "Last worked" never updates | **Closed.** Every working company reads "Working · last checked Oct 6". The Juniper badge now reads "since Oct 6" instead of "since Sep 24" (R-…-09). | R-applications-jobs-companies-fix.png |
| WP-T4-03 (1) focus drops when the Today progress card turns done | **Not re-walked on Today** (shell phase). On To review, focus moves to the result summary. | — |
| WP-T4-04 (1) "1 min" for a seconds-long check | **Not observed.** | — |
| WP-T5-01 (2) focus drops to the top when a document finishes | **Closed for the finished card, with a new side effect.** Focus moves into the Ready card. It also does so when the user is typing in the cover-letter form, which takes focus out of the field (R-…-03). | R-applications-jobs-focus-steal.png |
| WP-T5-02 (1) time estimates disagree; letter lacks "you can leave" | **Mostly closed.** The letter card now says "You can leave this page." The CV card says "about 3 minutes", while **Make it again** says "AI, about 3 min" and does not mention the Claude plan. | — |
| WP-T5-03 (1) badge says Ready during a re-run | **Partly closed.** The badge now says **Working**. The previous file, **Open** and **Download** still disappear until the run ends. | — |
| WP-T5-04 (1) My CV has no route to a job's tailored CV | Out of scope (My CV). | — |
| WP-T5-05 (1) controls named only "Open"/"Download" | **Closed.** Their names are "Open the tailored CV for Granite Cloud — Software Engineer, Payments (new tab)", and so on. | — |
| R-shell-today-activity-10 (2) removing the only company | **Not reachable** in POPULATED (12 companies). Removing Kestrel Media worked: confirm, then "Stopped following Kestrel Media. Undo is available.", with focus on **Undo**, and **Undo** restored it. | — |

## Findings

### R-applications-jobs-01: A check on an already-tracked job overwrites that application and says "added to Applications" (F-015 not closed)
- Severity: 3. This is the user's application record. Row 21's older posting had fit 3.3 and status Applied. Its fit, date and posting link change silently, and the Applied status is carried onto a posting the user never applied to. Every message on screen says a job was *added*.
- Where:
  - the To review item's **Check fit**;
  - the Activity panel outcome ("then: added to Applications");
  - the job page's History;
  - the Applications row.
- Expected (ia.md §2.2 "New or merged rows", §3 Merged results): the badge **Updated** and "Merged into #21: score 3.3 → 4.1, posting link changed".
- What happened:
  - The API now shows row 21 "Brightwater Health — Data Engineer · 4.1 · Applied · 2026-10-07" and still 41 rows in total.
  - The panel says "Fit 4.1 / 5. The fit report is ready. then: added to Applications · **Open the job**". It opens `#/applications/21`, which has no **Updated** badge.
  - History reads "Oct 7 · added to Applications · now Applied".
  - The only trace is the engine's own note line, "Your note: … Re-eval 2026-10-07 (3.3→4.1): Fixture evaluation".
  - The Applications row has no badge.
  - The nested line comes from `followUps()` in `app/ui/src/lib/runs.js` ('merge-tracker' → "added to Applications"). History comes from `app/ui/src/pages/Job.jsx:237`.
- Reproduction:
  1. `node app/ux/sandbox.mjs --state populated`.
  2. Open To review and click **Check fit** on "Brightwater Health — Data Engineer" (posting 4101707). Wait about 10 s.
  3. Open **Activity**, then **Open the job**.
- Evidence: app/ux/m8/evidence/R-applications-jobs-F-015.png, app/ux/m8/evidence/R-applications-jobs-F-015-job21.png

### R-applications-jobs-02: After a check for new openings, no screen says which openings are new
- Severity: 3. T4 asks "how many new ones there are, **which ones**". The count is shown, but no screen identifies the four, so a first-timer has to guess from "posted Sep 29" dates in a 17-item list. The prototype marked them with **New** badges, listed them first, and showed "To review 4 new" in the nav.
- Where: To review list; top-bar **To review**; Today › New since you last looked.
- Expected (ia.md §1 counts, §2.1 "4 new openings … naming them", §2.4 "**New** since last looked"): new items marked, a nav count, and a Today card naming them.
- What happened:
  - After **Check for new openings** the summary reads "Last check, Oct 6, 22:38: 4 new openings · 11 companies checked. Juniper Mobility couldn't be reached (board not found) — Fix in Companies".
  - The list grows from 13 to 17 links with no badge on any item. The only badge in `main` is "Posting couldn't be read".
  - The four new links are the last four in the list.
  - The nav link reads just "To review".
  - Today shows only "Last checked for new openings Oct 6" and a **Check for new openings** button. A "Just finished" card says "Finished checking for new openings." and **See what came back**.
  - The announcement is "Check for new openings: Finished checking for new openings." It gives no count and does not mention Juniper.
  - A second check (from Companies) replaced the headline with "0 new openings", so even the count was gone.
  - The badge is rendered in `app/ui/src/pages/ToReview.jsx:247` (from `newSince(…)` at line 145) and was never shown in this run.
- Reproduction:
  1. `node app/ux/sandbox.mjs --state populated`.
  2. Visit Today, then To review, and click **Check for new openings**.
  3. Look for a **New** mark, a nav count, or names on Today.
  4. Then click **Check for new openings** on Companies and return to To review.
- Evidence: app/ux/m8/evidence/R-applications-jobs-T4.png, app/ux/m8/evidence/R-applications-jobs-T4-today.png

### R-applications-jobs-03: A document finishing takes focus away from the cover-letter field the user is typing in
- Severity: 2. T5's natural path is to start the CV and fill the letter while it runs. Mid-sentence, keystrokes stop reaching the field. The text already typed is kept.
- Where: job page › Documents, when the Tailored CV goes Working → Ready while the cover-letter form is open.
- Expected (ia.md §3 Focus): focus moves to the new state "after an action that replaces its own button", not when another control has focus. In the M7 prototype, focus stayed in the letter field.
- What happened: with focus in "Why this role? (required)", the CV finished, and `document.activeElement` became the CV card's `div[tabindex=-1]`. The same happened in the keyboard pass: the next Tab landed on the CV's **Open**.
- Reproduction: on `#/applications/6`, click **Make it again** › **Make it again**, click into "Why this role?", and wait 9 s.
- Evidence: app/ux/m8/evidence/R-applications-jobs-focus-steal.png

### R-applications-jobs-04: Check fit from To review: the item vanishes on success, and focus drops (F-013, WP-T2-04)
- Severity: 2. The outcome is announced and is in Activity, so this is not 3. A first-timer on this page still sees the job disappear.
- Where: To review › item › **Check fit**.
- Expected (ia.md §3 Run feedback): "Done or failed updates the same spot".
- What happened:
  - The in-item "Working" card appears.
  - On success the item is gone from "16 links to review". No fit, recommendation or **Open the job** remains on the page.
  - `document.activeElement` is `<body>` both after the click and after completion.
- Reproduction: `--state populated` › To review › **Check fit** on any item › wait 10 s.

### R-applications-jobs-05: "I've sent my application" never asks when, and leaves a contradictory confirmation (WP-T3-01)
- Severity: 2. T3's user applied *yesterday*, so this route records the wrong date. The page also shows two statuses at once.
- Where: job page › Documents › **I've sent my application** (shown while the status is Reviewed — not applied).
- Expected (ia.md §2.2): choosing Applied offers **When?**.
- What happened:
  - The status saves at once as "set to Applied today".
  - The Summary shows Status **Applied** beside the green line "Saved: Reviewed — not applied" left over from the previous change.
  - Focus falls to `<body>`.
  - The undo bar at the bottom left covers the button itself after an earlier change.
- Reproduction: on `#/applications/12`, set Status to **Reviewed — not applied**, click **Hide**, then click **I've sent my application**.
- Evidence: app/ux/m8/evidence/R-applications-jobs-WP-T3-01.png, app/ux/m8/evidence/R-applications-jobs-job-status.png

### R-applications-jobs-06: Status change: focus jumps to the next job's Status, and the confirmation sits in a bar over the rows
- Severity: 2
- Where: Applications › Status › **When did you apply to …?** › **Save as Applied**; the undo bar.
- Expected (ia.md §3 Focus, §2.2 inline "Saved: Applied · **Undo**"): the dialog returns focus to its trigger, and the confirmation sits in the row.
- What happened:
  - After saving row 12, focus lands on "Status for Driftwood Analytics — Backend Engineer (Go)". After row 13, it lands on Ember Payments. One more Enter starts a status change on a job the user did not pick. (Escape correctly returns focus to the trigger.)
  - The row shows "Moved to Applied" greyed in place, as specified. The "set to Applied · **Undo** · **Hide**" confirmation is a fixed bar at the bottom left.
  - At 1280 × 800 the bar covers the names of rows 12 and 13, the two T3 targets, and it stays on the next page.
  - The dialog has no dates ("Yesterday", not "Yesterday, Oct 5"), names only the company ("When did you apply to Cobalt Freight?") although four Cobalt Freight rows exist, and starts with focus on **Save as Applied** with "Today" pre-selected.
- Reproduction: `--state populated`, Today › **Review them** › row 12 Status › **Applied** › **Save as Applied**, then read `document.activeElement`.
- Evidence: app/ux/m8/evidence/R-applications-jobs-T3-saved.png, app/ux/m8/evidence/R-applications-jobs-undo-bar.png, app/ux/m8/evidence/R-applications-jobs-when.png

### R-applications-jobs-07: Smaller run-feedback and navigation gaps
- Severity: 2
- **Companies' Check for new openings shows no result on the page** (rest of WP-T4-01).
- **Back and ← Applications don't restore scroll.** `scrollY` was 0 after returning from row 16 opened at 439 px (ia.md §2.2).
- **Filters from a link are lost.** Arriving through Today › **Review them** (`?status=evaluated`) and returning gives **All (40)**. **Clear filters** also leaves `?status=evaluated` in the URL.
- **The job's History omits status changes.** "When?" (yesterday) and the Applied change are never shown, so the user cannot confirm the date was recorded. History is built in `Job.jsx:226–239` from runs plus one "added" line, not from `status-log.tsv` (ia.md §2.3 item 4).
- **Field errors stay after the fix and are not announced:**
  - Add a job: "A URL cannot contain spaces or "|"";
  - Follow a company: "Type the company name.", "Paste the careers page link…";
  - the cover-letter questions.

  `aria-invalid="true"` stays after valid input, and `#alert` stays empty (same as R-shell-today-activity-03).
- Evidence: app/ux/m8/evidence/R-applications-jobs-WP-T4-01.png, app/ux/m8/evidence/R-applications-jobs-url-error.png

### R-applications-jobs-08: Document cards don't always show what ia.md §3 Documents lists
- Severity: 2
- **Older CVs** (e.g. row 12): "Made Oct 6, 00:23 · written before your writing rules changed (Oct 6)" has no design. A newly made CV does show "standard design".
- **Cover letter**: shows only "cover-granitecloud-006.pdf · Made Oct 7". There is no time and no tone, and the date is a day off from the CV made a minute earlier ("Oct 6, 22:40").
- **Write it again** asks the three questions again from blank and resets Tone to "Match the posting". It does warn "This replaces the letter of Oct 7."
- **Layout**: Summary and Documents are stacked at 1280 px; ia.md §5 asks for them side by side at 1024 px and wider.
- Evidence: app/ux/m8/evidence/R-applications-jobs-job12.png, app/ux/m8/evidence/R-applications-jobs-T5-docs.png

### R-applications-jobs-09: Dates and stale wording
- Severity: 1
- Dates switch between local and UTC around midnight UTC:
  - row 41 "Checked Oct 7";
  - History "done, Oct 6" next to "Oct 7 · added";
  - file names "…-2026-10-07.pdf".
- Juniper's badge changed from "Board not found since Sep 24" to "since Oct 6" after a re-check, so the date shows the last failure, not the first.
- Add a job first paints "Also make a tailored CV if the fit is **3.0** or more", then "3.5" once the profile loads.
- Paths and engine words outside Technical details:
  - "portals.yml.bak" in the Stop-following dialog;
  - "edit title_filter in portals.yml";
  - the report table's "JD Requirement", "TL;DR", "cv.md: Skills".
- **Make it again** says "AI, about 3 min" and does not say it uses the Claude plan.
- The To review header has no "Last checked …" next to the button; the date is only in the summary heading.

### R-applications-jobs-10: Layout at narrow widths
- Severity: 1
- At 320 px the job page scrolls sideways by 21 px: the Fit report's "JD Requirement | CV Match | Source" table is 326 px wide in a 305 px viewport.
- At 640 px Applications also hides **Recommendation** (ia.md §5 hides only Documents and Checked between 600 and 1023 px).
- Evidence: app/ux/m8/evidence/R-applications-jobs-320.png, app/ux/m8/evidence/R-applications-jobs-zoom200.png

## Tokens and layout
- **Hard-coded colours.** No new ones in this phase's pages. The ones that remain are all in `app/ui/src/app.css` and were already reported by the shell gate:
  - top bar: lines 47, 50, 57–60, 63, 65, 265–266, 344;
  - `.preview` and `iframe.doc`: lines 216–217, 242;
  - `.thumb-img`: line 336;
  - `pages/mycv/Design.jsx:298`.
- **Inline styles.** Only `pages/Skills.jsx:45` (a data-driven bar width). Inputs carry an empty `style=""` at runtime, which is harmless.
- **Colour schemes.** Light and dark are both legible on Applications, the job page, To review and Companies. Primary buttons are readable in dark.
- **200% zoom (640 × 400).** No sideways scroll on Applications, the job page, To review or Companies, and nothing is cut off (see R-…-10 for the extra hidden column).
- **320 px.** Applications, To review and Companies are one column with no sideways scroll. The job page overflows by 21 px (R-…-10).

## Strengths
- **T3 is quick and safe by keyboard and by mouse.** Today › **Review them** opens the list filtered and sorted **Fit ↓**, with rows 12 (4.2) and 13 (3.9) first. The Status list commits only on choose, opens in view, and asks **When?**. The row stays greyed with "Moved to Applied", the change is announced with the job's name, and **Undo** is both in the bar and in the Activity panel. Only rows 12 and 13 changed.
- **T2 by keyboard.** It takes the link field, Enter, and one wait. Focus follows the run to **Open the job**, and the job page lands with its `<h1>` focused.
- **T5.** Two cards say exactly what each button makes, how long it takes and that it uses the Claude plan. The letter form validates in words and focuses the first empty field. Both documents finish in place with named **Open** and **Download**. **Make it again** confirms with the design, time and cost.
- **Companies.**
  - **Fix** expands a plain explanation with **Pause Juniper Mobility**, **Edit the link** and **Open their careers page ↗**.
  - **Remove** confirms with focus on **Cancel**, then offers **Undo** with focus on it.
  - The switches are named "Check X for new openings".
- **To review.**
  - Every control carries the job's name.
  - **Options** holds all four scan options.
  - The last-check summary names Juniper Mobility and links **Fix in Companies**.
