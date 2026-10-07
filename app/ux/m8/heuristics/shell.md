# Heuristic evaluation (M8): shell (top bar, search, Activity panel, Undo)

Spec: `app/ux/design/ia.md` §1, §2.8 (panel), §3 (global patterns).
Sandboxes: POPULATED `:4401`, EMPTY `:4402`, BROKEN `:4403`, at 1280×800 (one check at 800 px).
Evaluator: heuristic-evaluator, 2026-10-07.

**Dark scheme: not exercised.** The Playwright MCP tools available in this run cannot switch
`prefers-color-scheme`, and the UI has no in-app theme switch. Colour findings below are for the
light scheme only; dark-scheme contrast is left to the M8 a11y audit (`app/ux/m8/a11y/`).

## 1. Visibility of system status

### H8-shell-01: The Activity panel says "nothing needs you" while Today says "1 thing needs you"
- **Severity:** 2
- **Where:** shell › Activity panel › "Now"
- **Tasks:** T4, T8
- **Capabilities:** UI-shell-panel-see-all, R-runs, R-health
- **Method:** heuristic (H1 Visibility of system status)
- **Evidence:** app/ux/m8/evidence/H8-shell-01.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4401`, open http://127.0.0.1:4401/
  2. Today reads "1 thing needs you" with the red card "Juniper Mobility: board not found since Sep 24".
  3. Click **Activity** in the top bar.
  4. Observe: the panel's **Now** section says "Nothing running, and nothing needs you."
- **Notes:** the panel only knows about runs, but it uses Today's words ("needs you"). Two
  surfaces that both claim to answer "what needs me?" disagree on the same screen. Say "Nothing
  running" only, or list the same needs-you items.

## 2. Match between system and the real world

No issues found. Checked the six destinations, search result type labels ("Job", "Company",
"Document", "Page", "Action"), Activity states ("Activity · 1 working", "· 1 done", "· 1 failed")
and the panel's run names ("Check fit · Driftwood Analytics — Data Engineer", "Check for new
openings"); all are job-seeker words. Internal names only appear under **Technical details**.

## 3. User control and freedom

### H8-shell-03: Undo throws the user back to the top of the page and does not say the change was undone
- **Severity:** 2
- **Where:** shell › undo bar › **Undo** (seen on Applications and Companies)
- **Tasks:** T3
- **Capabilities:** UI-shell-undo, R-status, R-portals-create
- **Method:** heuristic (H3 User control and freedom)
- **Evidence:** app/ux/m8/evidence/H8-shell-03.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4401`, open http://127.0.0.1:4401/#/applications
  2. Scroll to row 12 (Cobalt Freight — Staff Software Engineer), open **Status for Cobalt Freight — Staff Software Engineer** → **Applied** → **Save as Applied**.
  3. The undo bar reads "Cobalt Freight — Staff Software Engineer set to Applied, applied Oct 7 · Undo · Hide". Click **Undo**.
  4. Observe: the page re-renders scrolled to the very top (the Add a job card); the row the user was working on is off screen and no "Restored" message appears. Same on Companies after **Stop following** → **Undo**.
- **Notes:** the user has to scroll back and re-read the row to learn whether Undo worked. Keep
  the scroll position and announce "Back to Reviewed — not applied".

## 4. Consistency and standards

### H8-shell-02: Search lists two identical results with nothing to tell them apart
- **Severity:** 2
- **Where:** shell › **Find a job, company or document** › results
- **Tasks:** T5
- **Capabilities:** UI-shell-search
- **Method:** heuristic (H4 Consistency and standards)
- **Evidence:** app/ux/m8/evidence/H8-shell-02.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4401`, open http://127.0.0.1:4401/
  2. Type "granite" in **Find a job, company or document**.
  3. Observe: "Job · Granite Cloud — Senior Backend Engineer" appears twice (rows 16 and 36), with no row number, fit, status or date to choose between them.
- **Notes:** ia.md §3 says repeated items carry what distinguishes them (Skills names reports
  "with their number and fit"). The Applications table shows "#16 · 3.3" vs "#36 · 2.2"; search should too.

## 5. Error prevention

No issues found in the shell itself. Checked: Escape closes the search list and the Activity
panel, focus returns to the **Activity** button, and the panel overlays the page instead of
pushing it down (PW-A-T8-02 fixed). The one action search offers ("Check for new openings") is
free and says so where it lands.

## 6. Recognition rather than recall

### H8-shell-04: The search field keeps the last query on every page
- **Severity:** 1
- **Where:** shell › **Find a job, company or document**
- **Tasks:** —
- **Capabilities:** UI-shell-search
- **Method:** heuristic (H6 Recognition rather than recall)
- **Evidence:** app/ux/m8/evidence/H8-shell-04.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4401`, open http://127.0.0.1:4401/
  2. Type "granite" in the search, press Escape, click **Applications**.
  3. Observe: the top bar still reads "granite" on Applications (and on every later page) with no results open.
- **Notes:** it looks like a filter applied to the page, but the list is not filtered ("Showing
  40 of 40"). Clear the field after Escape or a navigation.

## 7. Flexibility and efficiency of use

### H8-shell-05: Search finds only one of the app's "Check …" actions
- **Severity:** 1
- **Where:** shell › search › Action results
- **Tasks:** T2, T4
- **Capabilities:** UI-shell-search
- **Method:** heuristic (H7 Flexibility and efficiency of use)
- **Evidence:** app/ux/m8/evidence/H8-shell-05.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4401`, open http://127.0.0.1:4401/#/applications
  2. Type "check" in the search.
  3. Observe: one result, "Action · Check for new openings". "Check fit", "Check my list for problems" and "Check companies' job boards" are not offered.
- **Notes:** P1 thinks in commands; search is their fastest route. "writing" correctly finds
  "Page · Writing rules"; the action list is just thin.

## 8. Aesthetic and minimalist design

No issues found. The top bar holds six destinations, search, Activity and Workspace on one
line at 1280 px; at 800 px the destinations collapse into **Menu** and search into a **Search**
button, as specified. The Companies badge reads "1 not working" to screen readers.

## 9. Help users recognize, diagnose, and recover from errors

No issues found in the shell. Checked: a nonsense query shows "Nothing matches "zzqx"."; in
BROKEN the Activity button is filled red "Activity · 1 failed" and the failure carries
**What happened**, **What to do** and **Try again**.

## 10. Help and documentation

No issues found. Help is reached from Workspace › Help and from inline links ("What a check
costs", "How the fit is worked out"); there is no top-bar Help, which matches ia.md §1.

## Strengths

- The Activity button tells you on every page that something is running, finished or failed,
  in words and colour (fixes H-global-04).
- The panel names runs by job, nests follow-ons ("then: read the new postings for Skills") and
  keeps lane/exit code behind **Technical details**.
- Search reaches jobs, companies, documents and pages from anywhere; Enter opens the top result.
- One consistent undo bar for status changes, company removal and skill moves.

## M6 findings re-checked (H-global-*)

| M6 ID | M6 problem | Status in M8 | Note |
|---|---|---|---|
| H-global-01 | Toasts name the job board's host | **Fixed** | Runs and the undo bar name the job. |
| H-global-02 | Narrow window clips the Pipeline table | **Not re-tested** | At 800 px the shell collapses correctly; the Applications table at 600–1023 px was not checked. |
| H-global-03 | Changing page keeps the previous scroll position | **Fixed** | Every page change landed at the top with focus on the h1. (Undo now has a related problem: H8-shell-03.) |
| H-global-04 | No global sign that runs are in progress | **Fixed** | Activity button states. |
