# Review: shell-today-activity
Sandbox: http://127.0.0.1:4402/ (EMPTY, first run) · http://127.0.0.1:4403/ (BROKEN) · Date: 2026-10-06
Verdict: **FAIL**

The verdict is FAIL because of one severity-4 finding, R-shell-today-activity-01. In a
fresh workspace the first fit check succeeds, but the job never reaches Applications. The
app still says "then: added to Applications", and its **Open the job** link leads to "Job
not found". The first-job acceptance task therefore fails at its last criterion. The
shell, Today in the BROKEN state, the Activity panel and page, and T8 work well. Their
remaining findings are severity 2 or lower.

Walked at 1280 × 800 (light), plus 700, 640 × 400 (200% zoom) and 320 px, and in the dark
scheme. Keyboard first (Tab, Shift+Tab, Enter, Escape), then mouse. Live regions were read
from `#announce` and `#alert`, and focus from `document.activeElement`.

## Claimed fixes

| ID | Status | Evidence |
|---|---|---|
| F-001 (4) no way to give a CV | **Closed.** Today › Get set up › Add your CV takes pasted text or a file. Saving shows "Saved: Alex Rivera · Summary, Experience (2 roles), Education, Skills. Edit in My CV", announces it, and moves focus to that line. | R-shell-today-activity-setup-done.png |
| F-003 (4) failure in engine terms, no retry | **Closed.** The failed card names "Check fit · Driftwood Analytics — Data Engineer" and shows **What happened** and **What to do** in plain words, **Try again**, a full **Open the posting ↗** link, and **Technical details** (lane, exit, log path, raw log). Try again re-queued the check, which succeeded and linked "Tried again: that worked". | R-shell-today-activity-F-016.png |
| F-004 (4) Add disabled on first run | **Closed on Today.** **Follow company** works with no `portals.yml`. Companies › Follow a company was not exercised (out of scope). | R-shell-today-activity-setup-done.png |
| F-005 (4) run logs not keyboard-reachable | **Closed.** On `#/activity`, Tab reaches the filter chips, then the row link "Check fit · Driftwood Analytics — Data Engineer". Enter opens `#/activity/:id` with focus on its `<h1>`, and **Technical details** and **Try again** are reachable. | — |
| F-006 (3) nothing announced | **Closed.** One polite (`#announce`, role status) and one assertive (`#alert`) region are always mounted. Heard: "Your CV is saved: …", "You're set up.", "Started: Check fit. About 2 to 5 minutes.", "Check fit · Kestrel Media — Senior Backend Engineer: Fit 4.1 / 5. The fit report is ready.", "Dismissed … Undo is available.", "Undone: …", "Started again: …". | — |
| F-009 (3) runs don't name the job | **Partly closed.** Done, failed and retried runs are named "Check fit · Company — Role" everywhere. Remaining: while a new check is **Working**, the inline card, the Today "Working now" card and its Cancel button say only "Check fit" (see R-…-08). | R-shell-today-activity-03.png |
| F-011 (3) run outcome links | **Partly closed.** In BROKEN, **Open the job** goes to `#/applications/41` and **Open the CV** to `#/applications/41#documents`, both correct. In EMPTY, **Open the job** goes to "Job not found" (R-…-01). | R-shell-today-activity-02.png |
| F-012 (3) no first-run guidance | **Closed.** "Welcome. Let's get you set up." shows "2 steps left · about 5 minutes. Everything else in the app works meanwhile.", numbered steps, the assistant checked automatically, then "You're set up" with what to do next. | R-shell-today-activity-setup-done.png |
| F-016 (3) failure only on Runs | **Closed.** Today opens with "4 things need you", and the first card is the failed check. The top bar shows **Activity · 1 failed** (filled `--danger`, white text). | R-shell-today-activity-F-016.png |
| F-020 (3) dialogs | **Closed for the dialogs met.** The confirm dialog "Stop following Kestrel Media?" (role `alertdialog`) takes focus and traps Tab, and Escape closes it and returns focus to **Remove**. The Activity panel moves focus to its heading, and Escape returns focus to the Activity button. Note: the dialog focuses the destructive **Stop following** first (R-…-09). The cover-letter dialog belongs to another phase. | — |
| PW-A-T8-02 (3) panel drops below content | **Closed.** The panel is `position: fixed`, 400 px wide at the right edge at 1280 and 700 px, and full screen at 320 px. The layout never reflows. | R-shell-today-activity-panel.png, R-shell-today-activity-PW-A-T8-02.png |
| WP-T1-01 (2) empty My CV has nowhere to paste | **Not verified.** The only EMPTY sandbox had a CV after T1, so the empty state could not be reached again. | — |
| WP-T1-02 (2) Check for new openings with nothing followed | **Not verified**, for the same reason. Removing the only company failed (R-…-10), and the **On** switch could not be toggled by pointer in the run. | — |
| WP-T1-03 (1) error stays after the box is filled | **Not closed.** "Paste your CV first, or choose a file." and `aria-invalid="true"` stay after pasting and typing. The careers-link error does the same (R-…-03). | R-shell-today-activity-01.png |

## Findings

### R-shell-today-activity-01: In a fresh workspace the first fit check never reaches Applications, yet the app says it did
- Severity: 4. The first-job acceptance task fails: `GET /api/pipeline` has `rows: []` and `tracker-missing`. Every outcome message misleads the user, and **Open the job** is a dead end.
- Where: Today › Check your first job; the Activity panel, `#/activity` and `#/activity/:id` outcome; `#/applications/report/1`.
- Expected (ia.md §2.1, §2.8, §4): the first check writes `data/pipeline.md` and "upstream creates `applications.md` on merge". The outcome then says "added to Applications" and **Open** opens the job.
- What happened:
  - The evaluate run succeeded with "Fit 4.1 / 5. The fit report is ready.", plus "then: added to Applications" and **Open the job** (`#/applications/report/1`).
  - The chained `merge-tracker` run exits 0 with "No applications.md found. Nothing to merge into." Upstream's `merge-tracker.mjs:735` does not create the tracker, so the assumption in §4 is wrong.
  - **Open the job** shows "Job not found · It is not in your applications. It may have been merged into another row or removed from data/applications.md."
  - Applications shows "No applications yet", and Today keeps offering "Check your first job".
  - The nested line comes from `followUps()` in `app/ui/src/lib/runs.js:174`. It maps any succeeded `merge-tracker` child to "added to Applications" without checking that a row was written.
- Reproduction:
  1. `node app/ux/sandbox.mjs --state empty`.
  2. On Today, paste the T1 CV and **Save my CV**.
  3. Enter Company name "Kestrel Media" and Careers page link `https://job-boards.greenhouse.io/kestrelmedia`, then **Follow company**.
  4. In **Link to the job posting**, paste `https://job-boards.greenhouse.io/kestrelmedia/jobs/4134913` and click **Check fit now**.
  5. Wait about 8 s, then click **Open the job**.
- Evidence: app/ux/m8/evidence/R-shell-today-activity-02.png

### R-shell-today-activity-02: Focus falls to `<body>` after actions that remove or replace their own control
- Severity: 2. Keyboard and screen-reader users lose their place after four common actions; the announcements still tell them what happened. In one case it also breaks Escape.
- Where:
  - Today › Check your first job › **Check fit now** (focus lost while "Working");
  - the Today failure card › **Dismiss**;
  - `#/activity/:id` › **Try again**;
  - Activity panel › **Undo**.
- Expected (ia.md §3 Focus): "After an action that replaces its own button, focus moves to the new state's heading or primary action". The M7 prototype focused **Undo** after a removal.
- What happened:
  - After each action `document.activeElement` is `<body>`.
  - After **Undo** inside the open Activity panel, Escape no longer closes the panel, because focus has left it.
  - Done states do take focus: "You're set up" heading, and **Open the job** after the check finished.
- Reproduction:
  1. `node app/ux/sandbox.mjs --state broken`, open Today.
  2. Click **Dismiss** on the failed "Check fit · Driftwood Analytics — Data Engineer" card and read `document.activeElement` (BODY).
  3. Open **Activity**, click **Undo**, press Escape: the panel stays open.
- Evidence: app/ux/m8/evidence/R-shell-today-activity-04.png

### R-shell-today-activity-03: Set-up field errors stay after they are fixed and are not announced (WP-T1-03 not closed)
- Severity: 2. A first-timer who saved too early sees a red error over a correct value. A screen-reader user is not told about the error at all.
- Where: Today › Get set up › **Your CV** and **Careers page link** (`app/ui/src/pages/Today.jsx` lines 91–94 and 209–211; `onChange` does not clear the error).
- Expected (ia.md §3 Errors): "Next to the field … in words, gone once fixed." In the M7 prototype, focus also moved to the invalid field.
- What happened:
  - **Save my CV** on an empty box shows "Paste your CV first, or choose a file." with `aria-invalid="true"`.
  - Both stay after pasting the CV and typing.
  - The same happens with "Paste the careers page link, starting with https://" after the link is corrected.
  - In both cases focus stays on the submit button and nothing reaches `#announce` or `#alert`.
- Reproduction:
  1. `node app/ux/sandbox.mjs --state empty`, open Today.
  2. Click **Save my CV** with the box empty.
  3. Paste the CV: the error stays.
  4. Type "Kestrel Media" and `job-boards.greenhouse.io/kestrelmedia`, then click **Follow company**.
  5. Fix the link to `https://…`: the error stays.
- Evidence: app/ux/m8/evidence/R-shell-today-activity-01.png

### R-shell-today-activity-04: Automatic follow-ons are listed as separate activities with engine names and contradictory outcomes
- Severity: 2. After T8's retry, the user sees four entries for one action and must reconcile "Your tailored CV is ready" with "It fails the screening check".
- Where: Activity panel (Earlier today), `#/activity`, and the polite announcement.
- Expected (ia.md §2.8): "Automatic follow-ons … are nested under the activity that started them: 'then: added to Applications, made tailored CV'".
- What happened:
  - Besides the check's nested line, the panel lists "Tailored CV · Driftwood Analytics — Data Engineer · Your tailored CV is ready · then: update design".
  - It also lists "Update design · Driftwood Analytics — Data Engineer · The CV was laid out again. It fails the screening check. · then: mark the cv as ready". The user never chose "Update design", and "mark the cv as ready" is engine wording in lower case.
  - The last announcement was "Update design · Driftwood Analytics — Data Engineer: The CV was laid out again. It fails the screening check."
  - The Activity button says "Activity · 3 done".
- Reproduction:
  1. `node app/ux/sandbox.mjs --state broken`.
  2. On Today, click **Try again** on the failed check and wait about 15 s.
  3. Open **Activity**.

### R-shell-today-activity-05: "Follow a company" done line omits the board check
- Severity: 2. A first-timer is not told whether the link worked. A wrong careers link would only show up later, as a broken board.
- Where: Today › Get set up › Follow a company, and the "You're set up" card.
- Expected (ia.md §2.1 step 2): "Following Kestrel Media · Greenhouse job board found · 6 open roles" or, on failure, the problem and the fix. The M7 prototype showed "Greenhouse job board found".
- What happened: the card shows "✓ Following Kestrel Media · Companies you follow", with no board type, no open-role count and no failure path. Companies shows "Not checked yet".
- Reproduction: complete steps 1–3 of R-…-01 and read the "You're set up" card.
- Evidence: app/ux/m8/evidence/R-shell-today-activity-setup-done.png

### R-shell-today-activity-06: The top bar wraps to two rows at 1280 px and the search placeholder is cut off
- Severity: 1
- Where: shell top bar.
- Expected (ia.md §1, §5): a 56 px top bar at wide widths. The destinations collapse into **Menu** below 960 px, where search becomes an icon button.
- What happened:
  - At 1280 px, with the badges "13 new" and "1 not working" (BROKEN), search, Activity and Workspace wrap to a second row, making the bar about 95 px tall.
  - The 15 rem field cuts the placeholder to "Find a job, company or documer" in both sandboxes.
  - Below 960 px search stays a full field instead of an icon button. At 320 px the bar is about 135 px tall.
- Reproduction: `--state broken`, open Today at 1280 × 800.
- Evidence: app/ux/m8/evidence/R-shell-today-activity-F-016.png, app/ux/m8/evidence/R-shell-today-activity-320.png

### R-shell-today-activity-07: At 320 px the full-screen Activity panel is 15 px wider than the viewport
- Severity: 1
- Where: Activity panel below 600 px.
- What happened:
  - The panel is 320 px wide in a 305 px viewport (the 320 px window minus a 15 px page scrollbar), so its left edge is at −15 px.
  - "Activity", "Now" and the card borders sit at the screen edge.
  - The page does not scroll sideways.
- Reproduction: `--state broken`, resize to 320 × 700, open **Activity · 1 failed**.
- Evidence: app/ux/m8/evidence/R-shell-today-activity-05.png

### R-shell-today-activity-08: A working check is named only "Check fit" (rest of F-009)
- Severity: 2. Two checks running at once cannot be told apart, and neither can their Cancel buttons ("Cancel Check fit").
- Where: Today › the run card under Check your first job, the "Working now" card, and the announcement "Started: Check fit. About 2 to 5 minutes."
- Expected (ia.md §2.8, §3 Labels): every run is named by what it is about. The posting link (and so the company) is known when the check starts.
- Reproduction: step 4 of R-…-01, then read the card during the first 8 s.
- Evidence: app/ux/m8/evidence/R-shell-today-activity-03.png

### R-shell-today-activity-09: Smaller deviations from the spec's wording and patterns
- Severity: 1
- Labels:
  - The data-problem card says **Show me how to fix it** (ia: **Show me**).
  - "Waiting for you" lists per-job links but has no **Get documents ready** action.
  - The set-up file control is "Or choose a file", a native input in the browser's language ("Seleccionar archivo"); ia: **Choose a file…**.
- Text glitches:
  - "…contact email in the body of the CV.." (double full stop) on the CV-design card.
  - "took 0 s" on the failed check.
- Paths outside Technical details:
  - `#/activity` intro: "(data/jsc/logs)".
  - Job-not-found page: "data/applications.md".
- Undo bar:
  - It is fixed over the bottom-left of the page and hides part of the next card ("Juniper Mobility…") while shown.
  - It left the page before 15 s. It does stay in the Activity panel, as specified.
- Shell semantics:
  - The confirm dialog puts initial focus on the destructive **Stop following**, not **Cancel**.
  - The Activity button keeps `aria-controls="activity-panel"` while the panel is unmounted.

### R-shell-today-activity-10 (outside this phase's scope, for the Companies gate): Removing the only company fails with an engine message
- Severity: 2. The user cannot stop following their only company. Pausing is the workaround.
- Where: Companies › **Remove Kestrel Media** › **Stop following**.
- What happened:
  - `DELETE /api/portals/entries/company/0:0` returns 500.
  - The row shows the alert "The edit did not produce the intended configuration and was discarded".
- Reproduction: `--state empty`, complete T1, then on Companies click **Remove Kestrel Media** › **Stop following**.

## Tokens and layout
- Hard-coded colours outside `tokens.css`, all in `app/ui/src/app.css`:
  - Shell:
    - lines 47, 50, 65 (`#ffffff` hover);
    - lines 57–60 and 265–266 (search, menu and Activity button borders and backgrounds: `#a1a1aa`, `#27272a`, `#fafafa`, `#d4d4d8`);
    - line 63 (`#4ade80` for the "done" border, which should be the `--success` token).
  - Outside this phase:
    - lines 216–217 and 242 (`.preview` and `iframe.doc` white paper);
    - line 336 (`.thumb-img`);
    - `pages/mycv/Design.jsx:298`, a default accent value.
- Inline styles: one, in `pages/Skills.jsx:45` (the bar width, which is data-driven and acceptable). None in the shell or Today.
- Light and dark: Today and the Activity button are legible in both. In dark, "1 failed" is dark text on a light red fill.
- 200% zoom (640 × 400): no sideways scroll, nothing cut off.
- 320 px: no sideways scroll, and Today is one column; see R-…-07 for the panel.
- 700 px: the panel overlays the page as a 400 px sheet.

## Strengths
- The T8 path is now short and fully keyboard-operable. Today's first card is the failure in words, and **Try again** gives "Tried again: still working" → "that worked", which links to the new run. **Open the job** lands on the new row 41 with its fit, recommendation and documents. The Activity button moves from failed → working → done.
- The live regions are always mounted, and the messages name the job.
- The page `<h1>` takes focus on every route change, `<title>` follows the page or job, and `aria-current="page"` marks the destination.
- The skip link is the first stop, visible on focus, and lands on `<main>`.
- The search combobox works by keyboard ("writ" → Writing rules, Enter opens it; "kestrel" → the company).
- Get set up confirms each step in place, says what is left, and ends with a clear "You're set up" card.
- Costs are stated next to every assistant action ("about 2–5 min, uses your Claude plan · What a check costs").
- All seven Help topics from ia.md §2.10 exist, plus one on installing the assistant.
- Dismiss has Undo both in a bar and in the Activity panel, and Undo restores the card and the "1 failed" state.
