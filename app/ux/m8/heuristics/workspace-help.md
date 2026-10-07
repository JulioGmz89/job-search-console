# Heuristic evaluation (M8): Workspace (`#/workspace`) and Help (`#/help`)

Spec: `app/ux/design/ia.md` §2.9, §2.10. POPULATED (`:4401`), BROKEN (`:4403`). 1280×800.
Evaluator: heuristic-evaluator, 2026-10-07.

**Dark scheme: not exercised** (no way to switch `prefers-color-scheme` with the available
tools).

## 1. Visibility of system status

### H8-workspace-help-03: Data health says "No problems found" while "Check my list for problems" lists five possible duplicates under an empty "Done:"
- **Severity:** 2
- **Where:** Workspace › Data health; Tidy up › Check my list for problems › result
- **Tasks:** T3
- **Capabilities:** R-health, UI-pipeline-maint-verify
- **Method:** heuristic (H1 Visibility of system status)
- **Evidence:** app/ux/m8/evidence/H8-workspace-help-03.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4401`, open http://127.0.0.1:4401/#/workspace
  2. Read **Data health**: "No problems found."
  3. Click **Check my list for problems** ("Only reads; changes nothing · no AI").
  4. Observe: a green box reading just "Done:" followed by a grey log: "📊 Checking 40 entries in applications.md · ✅ All statuses are canonical · ⚠️ Possible duplicates: #4, #24 (Ember Payments — Backend Engineer (Go)) · ⚠️ Possible duplicates: #8, #38 …". Data health above still says "No problems found"; Activity records "No problems found." (H8-activity-01).
- **Notes:** the summary sentence after "Done:" is missing, so the only result is the raw
  log with warning emoji, contradicted by the two summaries the user is more likely to read.

## 2. Match between system and the real world

### H8-workspace-help-01: The "Remove links already in Applications" preview shows an engine message and still offers "Remove these links"
- **Severity:** 2
- **Where:** Workspace › Tidy up › Remove links already in Applications › preview
- **Tasks:** T4
- **Capabilities:** UI-pipeline-maint-reconcile, UI-pipeline-maint-confirm
- **Method:** heuristic (H2 Match between system and the real world)
- **Evidence:** app/ux/m8/evidence/H8-workspace-help-01.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4401`, open http://127.0.0.1:4401/#/workspace
  2. Click **Remove links already in Applications**.
  3. Observe: "Preview — nothing has changed yet. This is what would change:" followed by "No batch-state.tsv found — nothing to reconcile." in monospace, and below it the primary **Remove these links** next to **Don't change anything**.
- **Notes:** "batch-state.tsv" and "reconcile" are engine words; and when the preview finds
  nothing, offering a primary "Remove" is a slip waiting to happen. Say "No links in To review
  are already in Applications" and offer only **Close**.

## 3. User control and freedom

No issues found. Each data-changing tool previews first and offers **Don't change anything**;
the duplicate merge states that "a backup is kept as applications.md.bak".

## 4. Consistency and standards

### H8-workspace-help-05: "Check companies' job boards" is missing from Workspace's Tidy up
- **Severity:** 1
- **Where:** Workspace › Tidy up
- **Tasks:** T4
- **Capabilities:** UI-pipeline-maint-validate
- **Method:** heuristic (H4 Consistency and standards)
- **Evidence:** app/ux/m8/evidence/H8-workspace-help-03.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4401`, open http://127.0.0.1:4401/#/workspace
  2. Observe: Tidy up holds four tools (Find duplicate applications, Remove links already in Applications, Check my list for problems, Find the right job board for a company); **Check companies' job boards** is only on Companies.
- **Notes:** ia.md §2.9 lists five; P1 looking for "validate portals" in the one place that
  gathers maintenance tools will not find it.

## 5. Error prevention

### H8-workspace-help-02: The duplicate merge is confirmed from a raw log keyed by row numbers
- **Severity:** 3
- **Where:** Workspace › Tidy up › Find duplicate applications › preview › **Merge these duplicates**
- **Tasks:** T3
- **Capabilities:** UI-pipeline-maint-dedup, UI-pipeline-maint-confirm
- **Method:** heuristic (H5 Error prevention)
- **Evidence:** app/ux/m8/evidence/H8-workspace-help-02.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4401`, open http://127.0.0.1:4401/#/workspace
  2. Click **Find duplicate applications**.
  3. Observe: a 300-px scroll box of engine output ("📊 40 entries loaded · 📝 #13: notes merged · 🗑 Remove #23 (Driftwood Analytics — Backend Engineer (Go), 3.4/5) → kept #13 (3.9/5) · ⚠️ Keep #4 and #24: exact-title match but advanced status requires exact report identity …"), then the primary **Merge these duplicates**.
- **Notes:** this is the one tool that deletes rows from the tracker. The user must read
  emoji-prefixed log lines, keep row numbers in their head and scroll a small box to decide.
  ia.md §2.2 asks for "a preview of the pairs, then confirm": a table "Keep / Remove / why" per
  pair would let P1 and P2 judge it. Unchanged since M6 H-pipeline-07, and the stakes (rows
  removed, with a .bak only reachable from the file system) make it a 3.

## 6. Recognition rather than recall

No issues found. The Folder card states the path and counts ("40 applications · 40 fit reports
· 6 tailored CVs · 11 companies followed · 17 links to review") with "What each file is".

## 7. Flexibility and efficiency of use

No issues found. Each tool states its cost class beside its button ("Shows what would change
first · no AI", "Only reads; changes nothing · no AI"); Today's **Show me** deep-links to
`#/workspace#health`.

## 8. Aesthetic and minimalist design

No issues found beyond the raw logs above.

## 9. Help users recognize, diagnose, and recover from errors

### H8-workspace-help-04: The only fix for an unreadable row is to edit applications.md by hand
- **Severity:** 2
- **Where:** Workspace › Data health (BROKEN)
- **Tasks:** T3, T8
- **Capabilities:** R-health
- **Method:** heuristic (H9 Help users recognize, diagnose, and recover from errors)
- **Evidence:** app/ux/m8/evidence/H8-workspace-help-04.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state broken --port 4403`, open http://127.0.0.1:4403/ and click **Show me** on "1 application could not be read".
  2. Observe: "Quarry Systems #57: it has 9 columns instead of 10, so the score and status are in the wrong places. To fix it: open data/applications.md in your editor, go to line 45, and make the row match the others (one cell per column, a score like 4.2/5). The app picks the change up by itself."
- **Notes:** the diagnosis is excellent (fixes H-broken-state-01). The recovery, though, is a
  file edit, which P2's card lists as a reason to give up. An in-app "Show the row / remove it
  / fill in the missing cell" would close it.

## 10. Help and documentation

No issues found. Help has eight short topics in job-seeker words ("How the fit is worked out",
"What a check costs, and why it takes minutes", "Why something can fail, and what to do", "The
screening (ATS) check", "Writing rules", "What the app never does", "Installing the AI assistant
(Claude Code)", "Files in your workspace folder"). "How the fit is worked out" explains the
scale in two paragraphs ("4 and up is a strong fit; 3 to 4 is worth a look; under 3 usually
means skip"). Topics are linked from the controls they explain.

## Strengths

- Workspace gathers folder, health, tidy-up tools and the assistant's status in one page,
  each tool with a preview and a stated cost class (fixes H-pipeline-08).
- Data health speaks in words with the line number and the fix.
- Help is short, plain, and reachable from where the question arises; it replaces M6's
  developer documentation.

## M6 findings re-checked

| M6 ID | M6 problem | Status in M8 | Note |
|---|---|---|---|
| H-pipeline-07 | Dedup preview is a raw log keyed by row numbers | **Not fixed** | H8-workspace-help-02. |
| H-pipeline-08 | Maintenance bar mixes tracker and source tools | **Fixed** | Workspace › Tidy up, plus page-level Tidy up menus. |
| H-broken-state-01 | "1 data issue found" names only a code; row disappears | **Fixed** | Diagnosis in words (recovery still by hand: H8-workspace-help-04). |
| H-runs-03 | "How runs work" is developer documentation | **Fixed** | Replaced by Help topics. |
