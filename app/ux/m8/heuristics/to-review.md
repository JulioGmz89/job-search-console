# Heuristic evaluation (M8): To review (`#/to-review`)

Spec: `app/ux/design/ia.md` §2.4. POPULATED (`:4401`, after one **Check for new openings**
that found 4), EMPTY (`:4402`, after set-up). 1280×800. Evaluator: heuristic-evaluator, 2026-10-07.

**Dark scheme: not exercised** (no way to switch `prefers-color-scheme` with the available
tools).

## 1. Visibility of system status

### H8-to-review-01: A check that read no company is shown as a green success, without a reason
- **Severity:** 2
- **Where:** To review › last-check summary card
- **Tasks:** T1, first-job, T4
- **Capabilities:** R-scan-summary, R-runs-start (scan)
- **Method:** heuristic (H1 Visibility of system status)
- **Evidence:** app/ux/m8/evidence/H8-to-review-01.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state empty --port 4402`, open http://127.0.0.1:4402/
  2. Save a CV; follow "Kestrel Media" with `https://kestrelmedia.example.com/careers`; click **Check for new openings**.
  3. Open **To review**.
  4. Observe: a green-bordered card "Last check, Oct 7, 00:24: 0 new openings · 0 companies checked." with nothing saying which company was skipped or why. The button line above says "1 company · a few seconds · no AI".
- **Notes:** this page at least states the truth ("0 companies checked"), unlike Today
  (H8-today-02), but in success styling and without a fix. "Kestrel Media was skipped: its link
  isn't a job board the app can read · Fix in Companies" would close the loop.

### H8-to-review-02: Newly found openings carry no "New" mark and sit at the bottom of the list
- **Severity:** 2
- **Where:** To review › "17 links to review" list
- **Tasks:** T4
- **Capabilities:** R-inbox, R-today-get
- **Method:** heuristic (H1 Visibility of system status)
- **Evidence:** app/ux/m8/evidence/H8-to-review-02.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4401`, open http://127.0.0.1:4401/#/to-review
  2. Click **Check for new openings**; the summary reads "Last check …: 4 new openings" and lists them.
  3. Scroll the list.
  4. Observe: the four (Driftwood Analytics — Site Reliability Engineer, Harbor Learning — Full Stack Engineer, Lumen Grid — Platform Engineer, Mosaic Retail — Platform Engineer, all "posted Sep 29") are items 14–17 of 17, styled like the 13 older links, with no **New** badge. The summary card around them has a red (danger) border although the check succeeded and only one board failed.
- **Notes:** ia.md §2.4 lists **New** since last looked per item. T4 asks "which ones are new";
  the summary answers it, but anyone who scrolls the list cannot tell. Red framing for a
  successful check also overstates the Juniper problem.

## 2. Match between system and the real world

No issues found. "Check fit", "Open the posting ↗", "Remove", "Already checked (30)",
"Posting couldn't be read" with "The posting page didn't load … Try again, or remove it if the
job is gone." are all job-seeker words.

## 3. User control and freedom

### H8-to-review-03: "Tidy up" leaves the page for Workspace and drops the user's selection
- **Severity:** 2
- **Where:** To review › **Tidy up** › **Remove links already in Applications**
- **Tasks:** T4
- **Capabilities:** UI-pipeline-maint-reconcile, R-workspace
- **Method:** heuristic (H3 User control and freedom)
- **Evidence:** app/ux/m8/evidence/H8-to-review-03.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4401`, open http://127.0.0.1:4401/#/to-review
  2. Tick two links (the buttons become **Check fit for selected (2)** and **Remove selected (2)**).
  3. Open **Tidy up To review** › **Remove links already in Applications**.
  4. Observe: the app navigates to `#/workspace#tool-reconcile`, scrolled to a grid of four tool cards; nothing has run, the tool is not highlighted, and going back to To review shows the two ticks cleared.
- **Notes:** a menu item that reads like an action turns out to be a link to another page,
  where the user must find and click the same label again. Run the preview here, or label it
  "Open in Workspace".

## 4. Consistency and standards

No issues found. Per-item buttons carry the job's name for screen readers ("Check fit for
Brightwater Health — Data Engineer"); bulk buttons count the selection.

## 5. Error prevention

### H8-to-review-04: The bulk confirmation states the time twice, differently
- **Severity:** 1
- **Where:** To review › **Check fit for selected (2)** › dialog "Check fit for 2 jobs?"
- **Tasks:** T2
- **Capabilities:** R-runs-start (evaluate, batch)
- **Method:** heuristic (H5 Error prevention)
- **Evidence:** app/ux/m8/evidence/H8-to-review-04.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4401`, open http://127.0.0.1:4401/#/to-review
  2. Tick two links → **Check fit for selected (2)**.
  3. Observe: "Each check takes 2–5 minutes …; up to 2 run at once, so 2 checks take about 4 minutes in all." followed by a second line "About 2–5 min · uses your Claude plan".
- **Notes:** the confirmation itself is right (count, cost, **Check 2 jobs** / **Cancel**); the
  leftover per-item caption contradicts its total.

## 6. Recognition rather than recall

No issues found. The summary of the last check names the four openings and Juniper Mobility
with **Fix in Companies**; options are labelled ("Only this company", "Only openings from the
last … days", "Preview without saving — see what would be added", "Confirm each posting is
still live — slower").

## 7. Flexibility and efficiency of use

No issues found. Per-item and bulk Check fit and Remove; a company filter and day limit under
**Options**; **Already checked (30)** keeps processed links one click away.

## 8. Aesthetic and minimalist design

No issues found beyond the red frame noted in H8-to-review-02. Each item is one line of
company, role, location, posted date, and three buttons.

## 9. Help users recognize, diagnose, and recover from errors

No issues found. A broken posting says what happened and offers **Check fit** (retry) and
**Remove**; a broken board is named with a fix link.

## 10. Help and documentation

No issues found. The intro line says what the page holds and where links come from.

## Strengths

- The scan result is now a sentence and a list, not terminal output (fixes H-sources-06).
- Links can be removed, and checked one by one or in bulk with a confirmation that states the
  total time and the cost (fixes H-sources-05).
- Scan options are labelled fields in a disclosure (fixes H-sources-07).

## M6 findings re-checked

| M6 ID | M6 problem | Status in M8 | Note |
|---|---|---|---|
| H-sources-05 | Inbox items can only be evaluated; no dismiss, no bulk | **Fixed** | Remove (with undo), bulk check and remove. |
| H-sources-06 | Scan result is the scanner's terminal output | **Fixed** | Summary in words; raw output under Technical details. |
| H-sources-07 | "Last seen" holds a status; scan filters unlabelled | **Fixed** | Labelled Options. |
| H-broken-state-03 | Failed job sits in the inbox looking like any other link | **Not re-tested** | BROKEN's To review was not inspected; in POPULATED, an unreadable posting is badged "Posting couldn't be read". |
| H-empty-state-04 | Scan enabled with no sources, fails with "Run onboarding first" | **Not re-tested** | See H8-to-review-01 for the related one-unreadable-company case. |
