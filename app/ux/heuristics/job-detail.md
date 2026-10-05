# Heuristic evaluation — Job detail (report, PDF, cover letter)

Scope: the detail panel that opens under the Pipeline table when a row is clicked
("Evaluation: <company> — <role>"), its buttons ("Re-evaluate", "Regenerate PDF", "Cover
letter"), run badges, the tabs "Report", "PDF", "Cover letter", the row actions "PDF" /
"PDF ↻" / "Cover", and the dialog "Cover letter for <company>".

Evaluated on 2026-10-04 against `populated` (port 4400). Agent runs used the fake CLI;
where the fake CLI's output (a placeholder CV for "Ada Lovelace") affects what is shown,
the finding says so.

Summary: 0 × sev 4, 2 × sev 3, 4 × sev 2, 0 × sev 1.

---

## 1. Visibility of system status

### H-job-detail-01: Clicking a row opens its detail below the whole table, out of sight
- **Severity:** 3
- **Where:** Pipeline › table row (click) › detail panel
- **Tasks:** T2, T5
- **Capabilities:** UI-pipeline-open-row, UI-pipeline-detail-tab-report
- **Method:** heuristic (H1 Visibility of system status)
- **Evidence:** app/ux/evidence/H-job-detail-01.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/
  2. Click the row "Cobalt Freight / Staff Software Engineer" (row 12).
  3. Observe: the row turns yellow; nothing else changes in the viewport. The detail ("Evaluation: Cobalt Freight — Staff Software Engineer") is rendered after all 40 rows, about 1,700 px further down. No scroll, no arrow, no hint.
- **Notes:** The tasks' expected path says "click the row, scroll to the detail"; P2 does not know there is anything to scroll to and will conclude the click only selects. Opening via a deep link (`#/pipeline/12`, used by Skills) does scroll, so the two entry points behave differently.

### H-job-detail-06: A PDF that fails the ATS check is shown as done everywhere except inside the PDF tab
- **Severity:** 3
- **Where:** Pipeline › table › "PDF" column; detail › run badges; detail › "PDF" tab
- **Tasks:** T2, T5, T7
- **Capabilities:** UI-pipeline-detail-tab-pdf, UI-pipeline-detail-run-badges, R-report-pdf, UI-pipeline-autopdf
- **Method:** heuristic (H1 Visibility of system status; H9 Recognize errors)
- **Evidence:** app/ux/evidence/H-job-detail-06.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/
  2. Paste `https://job-boards.greenhouse.io/kestrelmedia/jobs/4134913`, keep "PDF if score ≥ 3.5" ticked, click "Evaluate now"; wait ~25 s for the chain to end.
  3. In the table, row 41 (Kestrel Media) shows a green "●" in "PDF" and the button "PDF ↻".
  4. Click the row, scroll to the detail: badges "Mark PDF ready: Finished", "Render …: Finished", "PDF for Kestrel Media: Finished" are all green.
  5. Click the "PDF" tab. Observe: "ATS check failed — an applicant-tracking system will lose part of this CV · score 52/100".
- **Notes:** The failure here comes from the fake CLI's tiny placeholder CV, but the display path is real: an ATS failure on an auto-generated PDF is never raised to the table, the run panel, a toast or the badges. A user who downloads PDFs from the table would send an unreadable CV. The ATS box also offers no next step (no link to CV Studio or "re-render in a passing theme").

## 2. Match between system and the real world

### H-job-detail-04: The cover-letter dialog speaks in engine terms and miscounts its own questions
- **Severity:** 2
- **Where:** Pipeline › "Cover" (row) or "Cover letter" (detail) › dialog "Cover letter for <company>"
- **Tasks:** T5
- **Capabilities:** UI-pipeline-cover-dialog, UI-pipeline-cover-why, UI-pipeline-cover-problem, UI-pipeline-cover-approach, UI-pipeline-cover-tone, UI-pipeline-cover-submit
- **Method:** heuristic (H2 Match; H5 Error prevention)
- **Evidence:** app/ux/evidence/H-job-detail-04.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/
  2. Click row 2 (Cobalt Freight / Site Reliability Engineer), scroll to the detail and click "Cover letter" (this job already has a letter: the "Cover letter" tab is enabled).
  3. Observe: the title is "Cover letter for Cobalt Freight" (the role is not named; the tracker holds five Cobalt Freight rows). The intro says "The cover-letter mode refuses to draft until you have answered these four questions … The session drafts the letter …". There are three text boxes plus a "D. Tone" select, none marked required; "Draft and render the letter" stays disabled until all three are filled, with no message. Nothing warns that the existing letter will be replaced.
- **Notes:** "mode", "session" and "refuses" are engine words. The pre-filled "Strengths the report found" line is a nice touch. On submit the app jumps to the Runs page (see H-job-detail-05 notes).

## 3. User control and freedom

### H-job-detail-05: Escape does not close the cover-letter dialog, and submitting leaves the page
- **Severity:** 2
- **Where:** Cover-letter dialog › keyboard Escape; "Draft and render the letter"
- **Tasks:** T5
- **Capabilities:** UI-pipeline-cover-cancel, UI-pipeline-cover-submit, UI-runs-open
- **Method:** heuristic (H3 User control and freedom)
- **Evidence:** app/ux/evidence/H-job-detail-05.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/
  2. Open the dialog as in H-job-detail-04; type "Scale of payments" in "A. Why this role / company?".
  3. Press Escape. Observe: the dialog stays open (only "Cancel" closes it).
  4. Fill B and C and click "Draft and render the letter". Observe: the browser switches to `#/runs/<id>`, scrolled to the middle of the Runs page; the top run panel there briefly says "Queued … Waiting for a free slot" while the table says "Running" (see H-runs-01). When it finishes there is no link back to the job or the letter.
- **Notes:** T5 needs a PDF and a letter for the same job; after the letter starts, the user has lost the job's detail and must find row 6 again. Starting the letter could stay on Pipeline with the run panel, as "Evaluate now" does.

## 4. Consistency and standards

### H-job-detail-03: The same three actions carry different labels in the row and the detail, and a dash-labelled tab is silently disabled
- **Severity:** 2
- **Where:** Pipeline › row actions ("Re-evaluate", "PDF"/"PDF ↻", "Cover") vs detail buttons ("Re-evaluate", "Regenerate PDF", "Cover letter"); detail tab "Cover letter —"
- **Tasks:** T5, T9
- **Capabilities:** UI-pipeline-row-pdf, UI-pipeline-row-cover, UI-pipeline-detail-pdf, UI-pipeline-detail-cover, UI-pipeline-detail-tab-cover
- **Method:** heuristic (H4 Consistency and standards; H1 Visibility)
- **Evidence:** app/ux/evidence/H-job-detail-03.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/
  2. Click row 12 (Cobalt Freight / Staff Software Engineer); scroll to the detail.
  3. Observe: the row says "PDF ↻" and "Cover"; the detail says "Regenerate PDF" and "Cover letter". The third tab reads "Cover letter —" and does nothing when clicked or hovered; no text says "no letter yet — use Cover letter above". The row's "Cover" button looks the same whether a letter exists (row 2) or not (row 12).
- **Notes:** "↻" is the only cue that a PDF exists; a letter has no cue in the table at all. In the screenshot the PDF tab's embedded viewer is still loading (dark area); it renders after a second, with the browser's download control.

## 5. Error prevention

Covered by H-job-detail-04 (no overwrite warning) and H-job-detail-06 (ATS failure not raised).

## 6. Recognition rather than recall

### H-job-detail-02: The report detail never shows the score
- **Severity:** 2
- **Where:** Pipeline › detail › header and "Report" tab summary strip
- **Tasks:** T2
- **Capabilities:** UI-pipeline-detail-tab-report, R-report
- **Method:** heuristic (H6 Recognition rather than recall)
- **Evidence:** app/ux/evidence/H-job-detail-02.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/#/pipeline/12
  2. Observe: header "Evaluation: Cobalt Freight — Staff Software Engineer", status chip, date, URL; summary strip "Decision Apply · Legitimacy High Confidence · Risk Low · Confidence High · Advertised comp · Next action". The 4.2 score shown in the table appears nowhere in the detail.
- **Notes:** T2's answer is "the score (4.1) or the decision"; the decision is there, the score must be remembered from the table, which is 1,700 px above. P2 also gets no hint what 4.2/5 means (no band explanation next to it).

## 7. Flexibility and efficiency of use

No issues found. Checked: deep link `#/pipeline/<n>`, posting link opens the original job, PDF viewer has download/print.

## 8. Aesthetic and minimalist design

No separate finding. The report renders its A–F sections as clean tables; "Soft gaps" and "Top strengths" give a fast summary. The run badges row ("Render cv-candidate-kestrel-media · standard: Finished", "Merge tracker additions: Finished") is internal plumbing that could be collapsed.

## 9. Help users recognize, diagnose, and recover from errors

Covered by H-job-detail-06. The ATS box lists concrete reasons, which is good, but no recovery action.

## 10. Help and documentation

No issues found on the panel itself; the decision vocabulary (Apply/Consider/Skip, Legitimacy, Confidence) has no inline explanation, which matters for P2 — recorded under H-job-detail-02's notes rather than as a separate finding.

---

## Strengths
- The report is readable as a page, not markdown: summary strip, gaps and strengths up top, structured A–F tables.
- The PDF and cover-letter tabs embed the real PDF with the browser's viewer (zoom, download, print).
- The ATS verdict sits directly above the PDF, with a score and specific reasons.
- The cover-letter form asks for exactly what only the user can supply, with good placeholders ("Your opening move on day one…") and a tone select with descriptions.
- Run badges in the detail show the whole chain that produced the artefacts.
