# Heuristic evaluation — Pipeline

Scope: the Pipeline page (`#/pipeline`): add-job box ("Paste a job posting URL…", "Evaluate now",
"Add to inbox", "PDF if score ≥ 3.5", "What happens when I click Evaluate now?"), the run
panel under it, status chips, "Score" filter, "Filter company, role, notes…", the table
(sort, status select, row actions), and the "Maintenance" bar with "What do these do?".
The report detail under the table and the cover-letter dialog are in `job-detail.md`.

Evaluated on 2026-10-04 against `populated` (port 4400); `empty` and `broken` are in
`empty-state.md` and `broken-state.md`. Agent runs used the fake CLI (8 s, `auto`).

Summary: 0 × sev 4, 1 × sev 3, 7 × sev 2, 2 × sev 1.

---

## 1. Visibility of system status

### H-pipeline-04: A finished evaluation does not say what it concluded or where the new row is
- **Severity:** 3
- **Where:** Pipeline › run panel under the add-job box (after "Evaluate now")
- **Tasks:** T2
- **Capabilities:** UI-pipeline-evaluate-now, UI-shared-run-close, R-run-events
- **Method:** heuristic (H1 Visibility of system status)
- **Evidence:** app/ux/evidence/H-pipeline-04.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/
  2. Paste `https://job-boards.greenhouse.io/kestrelmedia/jobs/4134913` into "Paste a job posting URL…" and click "Evaluate now".
  3. Wait ~10 s until the panel badge reads "Finished".
  4. Observe: the panel title is "Evaluate job-boards.greenhouse.io", the subtitle "report 041". The score and decision only appear as the last raw log lines ("Report written: reports/041-… · score 4.1/5", "Score 4.1 ≥ 3.5: queuing the tailored PDF"). There is no "Kestrel Media · Senior Backend Engineer · 4.1 · Apply" summary and no link to open the new row. The row lands at its sorted position (7th) in a 41-row table, without a highlight until clicked.
- **Notes:** T2 asks "what did the app conclude?". P2 has to read a developer log to find out, then hunt for the row. A result line with "Open report" would close the loop. The chained PDF runs ("PDF for Kestrel Media", "Render …", "Mark PDF ready") are not shown in this panel at all; they appear only as badges in the detail.

### H-pipeline-09: "Add to inbox" confirms with a faint inline note; the inbox itself is not on this page
- **Severity:** 2
- **Where:** Pipeline › add-job box › "Add to inbox"
- **Tasks:** T2, T8
- **Capabilities:** UI-pipeline-add-to-inbox, R-inbox-add, UI-sources-inbox-toggle
- **Method:** heuristic (H1 Visibility of system status; H6 Recognition rather than recall)
- **Evidence:** app/ux/evidence/H-pipeline-09.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/
  2. Paste `https://job-boards.greenhouse.io/lumengrid/jobs/4999999` into "Paste a job posting URL…" and click "Add to inbox".
  3. Observe: the field clears and grey text "Added to the inbox." appears at the far right of the row. Nothing on Pipeline shows the inbox, how many URLs are waiting, or a link to it; the inbox lives on Sources › "Show the inbox".
- **Notes:** A user who parks a URL must remember that "inbox" means a collapsed list on another page. P1 knew this as `data/pipeline.md`; P2 has no model for it.

## 2. Match between system and the real world

### H-pipeline-02: The "What happens when I click Evaluate now?" help is written for career-ops developers
- **Severity:** 2
- **Where:** Pipeline › add-job box › "What happens when I click Evaluate now?"
- **Tasks:** T2
- **Capabilities:** UI-pipeline-addjob-help
- **Method:** heuristic (H2 Match between system and the real world)
- **Evidence:** app/ux/evidence/H-pipeline-02.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/
  2. Click "What happens when I click Evaluate now?".
  3. Observe: the text explains file paths (`data/pipeline.md`, `cv.md`, `reports/`, `data/applications.md`), "a headless Claude Code session", "`/career-ops oferta`", "the inbox's Processed section". The time note reads "Evaluations take a few minutes and stop themselves after 13" (13 of what is not said). Cost is never mentioned.
- **Notes:** Good for P1 (who knows the CLI); opaque for P2, whose card names "what it costs" and "why some things take minutes" as unknowns. The one sentence P2 needs ("we score how well this job fits your CV, 0–5, and file it; it takes a few minutes and uses your Claude plan") is buried.

### H-pipeline-03: Runs are named after the job board's host, and the live log is a prompt dump
- **Severity:** 2
- **Where:** Pipeline › run panel (title and log); same names in toasts and on Runs
- **Tasks:** T2, T8
- **Capabilities:** UI-pipeline-evaluate-now, R-run-events
- **Method:** heuristic (H2 Match between system and the real world)
- **Evidence:** app/ux/evidence/H-pipeline-03.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/
  2. Paste `https://job-boards.greenhouse.io/kestrelmedia/jobs/4134913`, click "Evaluate now".
  3. Observe: title "Evaluate job-boards.greenhouse.io"; log lines "Reserved report number 041", "Prompt: language + modes/_shared.md + modes/_profile.md + … overlay:evaluate · model claude-sonnet-5", "▶ Claude session started · fake-claude · 3 tools". The URL in "Received: …" is cut at "https://job-boards.greenhous".
- **Notes:** Every evaluation of a Greenhouse job has the same title, so two parallel runs are indistinguishable. The progress line ("Claude is working — … a full evaluation takes several minutes") is good; the rest is noise for P2/P3.

## 3. User control and freedom

### H-pipeline-05: Changing a status saves instantly, with no undo, and the row disappears from a filtered view
- **Severity:** 2
- **Where:** Pipeline › table › "Status for <company>" select
- **Tasks:** T3
- **Capabilities:** UI-pipeline-status-cell, UI-pipeline-status-filter, R-status
- **Method:** heuristic (H3 User control and freedom)
- **Evidence:** app/ux/evidence/H-pipeline-05.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/
  2. Click the "Evaluated 10" chip.
  3. In row 13 (Driftwood Analytics, Backend Engineer (Go)) change the status select to "Applied".
  4. Observe: "saving…" appears next to the select for ~1 s, then the row vanishes; the chips update (Evaluated 9, Applied 7). No message names what changed and nothing offers "Undo".
- **Notes:** In T3, picking the wrong one of two "Cobalt Freight" or "Driftwood Analytics" rows is easy; the mistake leaves the view immediately, and the user must switch chips and find it to revert. The column widths also jump while "saving…" is shown.

### H-pipeline-06: An empty filter result offers no way back, and the open detail ignores the filter
- **Severity:** 1
- **Where:** Pipeline › table empty state ("No applications match these filters.")
- **Tasks:** T3, T5
- **Capabilities:** UI-pipeline-search, UI-pipeline-status-filter, UI-pipeline-open-row
- **Method:** heuristic (H3 User control and freedom; H8 Aesthetic and minimalist design)
- **Evidence:** app/ux/evidence/H-pipeline-06.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/
  2. Click any row (e.g. "Cobalt Freight / Staff Software Engineer") so its detail opens under the table.
  3. Click "Evaluated 10" and type `zzzz` in "Filter company, role, notes…".
  4. Observe: "No applications match these filters." with no "Clear filters" action; the detail of a row that is no longer listed stays open below.
- **Notes:** Minor; the search field's own "×" clears the text, but the chip filter must be undone separately. The search field is also narrow: its placeholder shows as "Filter company, role, no".

### H-pipeline-10: Row "Re-evaluate" starts a paid agent run in one click, even on rows never evaluated
- **Severity:** 2
- **Where:** Pipeline › table › row actions › "Re-evaluate"
- **Tasks:** T2, T8
- **Capabilities:** UI-pipeline-row-evaluate, R-runs-start, UI-pipeline-autopdf
- **Method:** heuristic (H5 Error prevention; H3 User control and freedom)
- **Evidence:** app/ux/evidence/H-pipeline-10.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/
  2. Scroll to row 40 (Mosaic Retail, Full Stack Engineer, Decision "Not evaluated", status "Discarded").
  3. Click "Re-evaluate".
  4. Observe: no confirmation; a toast "Evaluate job-boards.greenhouse.io started"; ~10 s later the row's date changes to today, it moves up to 9th place (score 4.1), and a tailored PDF is generated for a job the user had discarded (because "PDF if score ≥ 3.5" is on).
- **Notes:** The button sits next to "PDF" and "Cover" in every row (40 identical clusters), so a slip is easy. The label "Re-evaluate" on a row whose Decision is "Not evaluated" is also wrong. The only stop is "Cancel" in the run panel, which is now scrolled out of view.

## 4. Consistency and standards

### H-pipeline-08: The maintenance bar mixes tracker tools with source tools
- **Severity:** 1
- **Where:** Pipeline › "Maintenance" bar
- **Tasks:** T4
- **Capabilities:** UI-pipeline-maint-validate, UI-pipeline-maint-probe, UI-pipeline-maint-verify
- **Method:** heuristic (H4 Consistency and standards)
- **Evidence:** app/ux/evidence/H-pipeline-08.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/
  2. Scroll to the bottom of Pipeline.
  3. Observe: "Validate sources" and "Probe sources" (about `portals.yml` and job boards) sit on Pipeline next to "Dedup tracker" and "Check integrity"; Sources, where a "board not found" problem is shown, has no probe button.
- **Notes:** In T4 the user sees "board not found" on Sources and has no nearby control to diagnose it.

Also observed (no separate finding): the status option "SKIP" is upper-case among title-case statuses, and the action button reads "PDF" on some rows and "PDF ↻" on others (meaning "regenerate"), which is an unexplained convention.

## 5. Error prevention

### H-pipeline-01: A malformed URL silently keeps both buttons disabled, with no reason given
- **Severity:** 2
- **Where:** Pipeline › add-job box › "Paste a job posting URL…", "Evaluate now", "Add to inbox"
- **Tasks:** T2
- **Capabilities:** UI-pipeline-url, UI-pipeline-evaluate-now, UI-pipeline-add-to-inbox
- **Method:** heuristic (H5 Error prevention; H9 Help users recognize errors)
- **Evidence:** app/ux/evidence/H-pipeline-01.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/
  2. Type `not a url` into "Paste a job posting URL…".
  3. Observe: "Evaluate now" (salmon, looks enabled) and "Add to inbox" stay disabled; no message says why, no tooltip on hover.
- **Notes:** "Evaluate now" uses a pale orange fill when disabled that reads as active, while "Add to inbox" goes grey — the two disabled states look different. A user who pastes a URL with a leading space or without `https://` gets no hint.

### H-pipeline-07: The dedup preview is a raw log keyed by row numbers, and proposes merging distinct postings
- **Severity:** 2
- **Where:** Pipeline › "Maintenance" › "Dedup tracker preview first" › preview panel
- **Tasks:** —
- **Capabilities:** UI-pipeline-maint-dedup, UI-pipeline-maint-confirm, UI-pipeline-maint-discard
- **Method:** heuristic (H5 Error prevention; H2 Match)
- **Evidence:** app/ux/evidence/H-pipeline-07.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/
  2. Scroll to the bottom; click "Dedup tracker preview first".
  3. Observe: lines such as "🗑️ Remove #34 (Ember Payments — Software Engineer, Payments, 1.5/5) → kept #14 (3.5/5)" and "📝 #27: status promoted to "Rejected" (from #37)", then "Run dedup tracker for real" / "Discard".
- **Notes:** The preview-then-confirm design is good (see Strengths). But rows #14/#34 are two different postings evaluated a month apart; to judge whether the merge is right the user must cross-reference six pairs of row numbers by scrolling the table. A side-by-side of the pairs, with dates and URLs, would make the confirm meaningful.

## 6. Recognition rather than recall

No issues found beyond H-pipeline-09 (inbox not visible here). Checked: chips show counts, sort direction shows in the header ("Score ↓"), the score filter labels its bands with numbers ("Auto-CV (≥ 3.5) (14)").

## 7. Flexibility and efficiency of use

No issues found on this page alone. Checked: sort on every column, keyboard-reachable search, status selects in-row. Missing bulk actions (e.g. mark several rows Applied) are noted for M7, not ranked: T3 needs only two edits.

## 8. Aesthetic and minimalist design

Covered by H-pipeline-03 (log noise) and H-pipeline-06. Every row repeats three outlined buttons, so 120 identical buttons compete with the data; the table is otherwise calm and readable.

## 9. Help users recognize, diagnose, and recover from errors

Covered by H-pipeline-01. Error states for this page in the other sandboxes: see `empty-state.md` (H-empty-state-01/02) and `broken-state.md` (H-broken-state-01).

## 10. Help and documentation

Covered by H-pipeline-02. "What do these do?" under Maintenance is thorough and explains preview-first and "Found problems" vs "Failed" well.

---

## Strengths
- Evaluation progress is visible inline: badge ("Running" → "Finished"), timer, indeterminate bar and a plain sentence that a full evaluation takes several minutes. Cancel is next to it.
- Maintenance scripts that rewrite files run in preview mode first, with "Nothing has been written yet" and an explicit "Run … for real" / "Discard". This is exemplary error prevention.
- The "PDF if score ≥ 3.5" checkbox shows the threshold and has a tooltip saying where it comes from.
- Status chips carry live counts and update after an edit; the score is colour-coded and sorted by default.
- Deep links (`#/pipeline/12`) open the report detail directly (used by Skills).
