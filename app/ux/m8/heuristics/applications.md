# Heuristic evaluation (M8): Applications (`#/applications`)

Spec: `app/ux/design/ia.md` §2.2. POPULATED (`:4401`), BROKEN (`:4403`), EMPTY (`:4402`) at
1280×800. Evaluator: heuristic-evaluator, 2026-10-07.

**Dark scheme: not exercised** (no way to switch `prefers-color-scheme` with the available
tools).

## 1. Visibility of system status

### H8-applications-01: The row menu's "Check fit again" spends a paid check in one click, with no confirmation and no sign of it near the row
- **Severity:** 3
- **Where:** Applications › table › **Actions for <job>** › **Check fit again**
- **Tasks:** T2, T3
- **Capabilities:** UI-pipeline-row-evaluate, R-runs-start
- **Method:** heuristic (H1 Visibility of system status; H5 Error prevention)
- **Evidence:** app/ux/m8/evidence/H8-applications-01.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4401`, open http://127.0.0.1:4401/#/applications
  2. Scroll to row 12 (Cobalt Freight — Staff Software Engineer, fit 4.2, Documents "CV").
  3. Open **Actions for Cobalt Freight — Staff Software Engineer** → **Check fit again**.
  4. Observe: the menu closes and nothing changes in view. No confirmation, no cost line, no "Started" on the row; the only trace is the top bar (scrolled out of view) reading "Activity · 1 working". About 10 s later the row silently changes to fit 4.1, gains an **Updated** badge, moves position, and its Documents cell changes from "CV" to "—".
- **Notes:** ia.md §3 "Costs and slips": every assistant action states time and cost beside
  the button, and "Check fit again" confirms. The job page's own **Check fit again** does show
  "About 2–5 min · uses your Claude plan"; the row menu does not. The consequence is worse than
  the spend: see H8-job-01 (the tailored CV is detached). M6 H-pipeline-10 is not fixed for the
  row menu.

## 2. Match between system and the real world

### H8-applications-03: Unchecked rows say "Not evaluated", a word the rest of the app no longer uses
- **Severity:** 1
- **Where:** Applications › table › Recommendation column (rows 39, 40)
- **Tasks:** T3
- **Capabilities:** R-pipeline
- **Method:** heuristic (H2 Match between system and the real world)
- **Evidence:** app/ux/m8/evidence/H8-applications-02.png (last two rows)
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4401`, open http://127.0.0.1:4401/#/applications
  2. Scroll to the bottom (rows 40 Mosaic Retail — Full Stack Engineer, 39 Lumen Grid — Machine Learning Engineer).
  3. Observe: Fit "—", Recommendation "Not evaluated".
- **Notes:** the glossary says "check fit"; "Not checked yet" matches the rest of the UI.

## 3. User control and freedom

No issues found. Checked: a status change saves with an undo bar ("Cobalt Freight — Staff
Software Engineer set to Applied, applied Oct 7 · Undo"); **Applied** asks **When did you
apply…?** with Today / Yesterday / On another day and an optional note, with **Cancel**; a
filter with no matches shows "No applications match these filters" with **Clear filters** in
two places. (Undo's scroll jump is logged once, as H8-shell-03.)

## 4. Consistency and standards

### H8-applications-02: Job names in the table are links that look like plain bold text
- **Severity:** 2
- **Where:** Applications › table › Company and role column
- **Tasks:** T5, T3
- **Capabilities:** UI-apps-open-job, UI-pipeline-open-row
- **Method:** heuristic (H4 Consistency and standards)
- **Evidence:** app/ux/m8/evidence/H8-applications-02.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4401`, open http://127.0.0.1:4401/#/applications
  2. Look at "Brightwater Health — Full Stack Engineer" and the other names.
  3. Observe: black bold text, no underline or link colour, while every other link in the app (Today's job names, Skills evidence, "What a check costs") is purple and underlined.
- **Notes:** the accessibility tree has them as links, and **Actions › Open the job** also
  exists, but a first-timer scanning the table sees nothing that says "click me" except the
  Status and Actions buttons.

## 5. Error prevention

No new issues beyond H8-applications-01. Checked: an invalid link ("greenhouse kestrel") in
**Link to the job posting** gets an inline error "A URL cannot contain spaces or "|"" under the
field, and nothing is started (fixes H-pipeline-01); the line under the field states "Check fit
now: the assistant writes a fit report, about 2–5 min, uses your Claude plan".

## 6. Recognition rather than recall

No issues found. Status chips show every status in use with counts ("Reviewed — not applied
(10)", "Skipped — don't apply (8)"); the threshold is visible in **Also make a tailored CV if
the fit is 3.5 or more**; BROKEN shows "1 application could not be read and is not in this
list: Quarry Systems #57…" above the table with **Show me how to fix it**.

## 7. Flexibility and efficiency of use

No issues found. Sortable headers (#, Company and role, Fit, Status, Checked), Fit filter,
free-text search ("Company, role or note"), a **Tidy up** menu, and Today's **Review them**
deep link (`#/applications?status=evaluated`) cover P1's tracker needs.

## 8. Aesthetic and minimalist design

No issues found. One Add a job card, one filter row, one table; the table re-flows its column
widths when a status note appears under a select (cosmetic, not ranked).

## 9. Help users recognize, diagnose, and recover from errors

No issues found beyond those noted. The malformed row is explained in words, with the line and
the fix one click away.

## 10. Help and documentation

No issues found. "What a check costs" sits next to the paid button; "How the fit is worked
out" is on each job page.

## Strengths

- The table finally speaks the user's statuses ("They replied", "Reviewed — not applied",
  "Skipped — don't apply") and names every control after its job.
- Marking an application as sent is a two-click, dated, undoable action.
- Invalid links and empty filter results explain themselves in place.

## M6 findings re-checked (H-pipeline-*, plus job-detail-01)

| M6 ID | M6 problem | Status in M8 | Note |
|---|---|---|---|
| H-pipeline-01 | Malformed URL silently keeps buttons disabled | **Fixed** | Inline error under the field. |
| H-pipeline-02 | "What happens when I click Evaluate now?" written for developers | **Fixed** | One plain line under the field, plus "What a check costs". |
| H-pipeline-03 | Runs named after host; live log is a prompt dump | **Fixed** | Runs named "Check fit · Company — Role"; log under Technical details. |
| H-pipeline-04 | Finished evaluation doesn't say what it concluded | **Fixed** | "Fit 4.1 / 5 · Recommendation: Apply · Open the job" on Today and in Activity. |
| H-pipeline-05 | Status change saves with no undo; row vanishes from filter | **Partly fixed** | Undo added. Row behaviour inside a status filter was not re-tested. |
| H-pipeline-06 | Empty filter result offers no way back | **Fixed** | Clear filters in the empty state. |
| H-pipeline-07 | Dedup preview is a raw log keyed by row numbers | **Not fixed** | Moved to Workspace; still a raw log (H8-workspace-help-02). |
| H-pipeline-08 | Maintenance bar mixes tracker and source tools | **Fixed** | Separate Tidy up menus; all tools in Workspace. |
| H-pipeline-09 | "Add to inbox" confirms with a faint note | **Not re-tested** | **Save for later** was not exercised. |
| H-pipeline-10 | Row "Re-evaluate" starts a paid run in one click | **Not fixed** | H8-applications-01 (job page states the cost; row menu does not). |
