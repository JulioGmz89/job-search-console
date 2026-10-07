# Heuristic evaluation (M8): Activity (`#/activity`, `#/activity/:id`)

Spec: `app/ux/design/ia.md` §2.8 (the panel is covered in `shell.md`). POPULATED (`:4401`,
after a scan, the Workspace tools and a skills reading), BROKEN (`:4403`, failed check then
Try again). 1280×800. Evaluator: heuristic-evaluator, 2026-10-07.

**Dark scheme: not exercised** (no way to switch `prefers-color-scheme` with the available
tools). Run states carry a word badge ("Done", "Failed, tried again"), not only a border colour.

## 1. Visibility of system status

### H8-activity-01: Activity says "No problems found" for checks that found problems, and lists previews as "Done" like real changes
- **Severity:** 3
- **Where:** Activity › rows "Check companies' job boards", "Check my list for problems", "Find duplicate applications", "Remove links already in Applications"
- **Tasks:** T4
- **Capabilities:** R-runs, R-run, UI-pipeline-maint-validate, UI-pipeline-maint-dedup, UI-pipeline-maint-reconcile
- **Method:** heuristic (H1 Visibility of system status)
- **Evidence:** app/ux/m8/evidence/H8-activity-01.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4401`, open http://127.0.0.1:4401/#/workspace
  2. Click **Find duplicate applications**, then **Don't change anything**; click **Remove links already in Applications**, then **Don't change anything**; click **Check my list for problems**; click **Find the right job board for a company**.
  3. On Companies click **Check companies' job boards**.
  4. Open http://127.0.0.1:4401/#/activity.
  5. Observe: "Done · Check companies' job boards · No problems found." although Juniper Mobility's board is not found (Today and Companies both say so); "Done · Check my list for problems · No problems found." although its own output listed five "Possible duplicates: #4, #24 …"; "Done · Find duplicate applications · Done." and "Done · Remove links already in Applications · Done." for previews the user explicitly declined.
- **Notes:** Activity is "everything the app has done for you". A P1 user reading
  "Find duplicate applications · Done." will believe the tracker was merged; a P2 user reading
  "No problems found" will not go looking for the broken board. Name previews as such
  ("Previewed duplicates: 5 pairs, nothing changed") and report what checks found.

## 2. Match between system and the real world

### H8-activity-02: "Find the right job board for a company" is logged as "Check companies' job boards"
- **Severity:** 2
- **Where:** Activity › row title
- **Tasks:** T4
- **Capabilities:** UI-pipeline-maint-probe, UI-pipeline-maint-validate, R-runs
- **Method:** heuristic (H2 Match between system and the real world)
- **Evidence:** app/ux/m8/evidence/H8-activity-01.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4401`, open http://127.0.0.1:4401/#/workspace
  2. Click **Find the right job board for a company** once (and nothing else).
  3. Open **Activity**.
  4. Observe: the new row is titled "Check companies' job boards · No problems found.", the name of a different tool on Companies.
- **Notes:** with both tools run, the page shows two rows with the same name and the user
  cannot tell which is which. Its output (a list of "greenhouse/brightwaterhealth (8 live)"
  lines) is only under Technical details.

## 3. User control and freedom

No issues found. Each row links to its own page (`#/activity/<id>`) with **← Activity**;
working runs offer **Cancel**; failed ones **Try again**.

## 4. Consistency and standards

### H8-activity-03: The "Documents" filter does not count a tailored CV made as a follow-on
- **Severity:** 1
- **Where:** Activity › filter chips
- **Tasks:** T8
- **Capabilities:** R-runs
- **Method:** heuristic (H4 Consistency and standards)
- **Evidence:** app/ux/m8/evidence/H8-activity-03.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state broken --port 4403`, open http://127.0.0.1:4403/, click **Try again** on the failed check and wait until it is done.
  2. Open http://127.0.0.1:4403/#/activity.
  3. Observe: the done row says "then: made the tailored CV, added to Applications", yet the chips read "Documents (0)".
- **Notes:** a user looking for "the CV it made" filters by Documents and finds nothing.

## 5. Error prevention

No issues found. Nothing on this page changes data except **Try again** (stated as using the
Claude plan again) and **Cancel**.

## 6. Recognition rather than recall

No issues found. Rows are named by what they are about ("Check fit · Driftwood Analytics —
Data Engineer"), with date, duration and outcome ("Fit 4.1 / 5. The fit report is ready."),
and the retry links back to the failure ("Second attempt — the first one didn't finish" /
"Tried again: that worked").

## 7. Flexibility and efficiency of use

No issues found. Filters by Failed, Documents, Fit checks and Openings with counts; **Open the
job** / **See the 4 new openings** go straight to the result.

## 8. Aesthetic and minimalist design

No issues found. Engine details (lane, exit code, raw log) sit behind **Technical details**.

## 9. Help users recognize, diagnose, and recover from errors

No new issues. The failed check (in BROKEN) explains what happened and what to do, and after
retry the failed row reads "Failed, tried again · Tried again: that worked".

## 10. Help and documentation

No issues found. The intro states how long history is kept ("The last 60 are kept even when
the app restarts; older logs stay in your workspace folder"), fixing H-runs-03's buried warning.

## Strengths

- Every run is a sentence about a job or company, not a host name or slug (fixes H-runs-04).
- Finished runs link to what they produced (fixes H-runs-02).
- Follow-on work is nested and stated ("then: made the tailored CV, added to Applications").

## M6 findings re-checked (H-runs-*)

| M6 ID | M6 problem | Status in M8 | Note |
|---|---|---|---|
| H-runs-01 | Panel says "Queued" while table says "Running" | **Partly fixed** | Page and panel agree on each row; the top-bar count says "4 working" while two are "Waiting" (H8-skills-01). |
| H-runs-02 | Finished run gives no way to open what it produced | **Fixed** | Open the job / See the 4 new openings. |
| H-runs-03 | "How runs work" is developer docs; history loss buried | **Fixed** | One plain sentence on retention. |
| H-runs-04 | Internal terms: hosts, lanes, slugs | **Fixed** | Only under Technical details. |
