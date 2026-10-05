# Heuristic evaluation — Runs

Scope: the Runs page (`#/runs`, `#/runs/<id>`): the open-run panel (title, status badge,
timer, "Cancel"/"Close", log, failure box), the "Running", "Waiting" and "Finished"
tables, and "How runs work".

Evaluated on 2026-10-04 against `populated` (port 4400) after starting an evaluation, a
cover letter, a scan, a dedup preview and an integrity check; the failed run in `broken`
is evaluated in `broken-state.md` (H-broken-state-02) and not repeated here.

Summary: 0 × sev 4, 0 × sev 3, 4 × sev 2, 0 × sev 1.

---

## 1. Visibility of system status

### H-runs-01: The open run panel says "Queued — waiting for a free slot" while the table says the same run is "Running"
- **Severity:** 2
- **Where:** Runs › top run panel vs "Running" table
- **Tasks:** T5, T8
- **Capabilities:** UI-runs-open, R-run-events, R-runs
- **Method:** heuristic (H1 Visibility of system status)
- **Evidence:** app/ux/evidence/H-runs-01.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/#/pipeline/2
  2. Click "Cover letter"; fill A, B and C with any text; click "Draft and render the letter".
  3. On the Runs page that opens, look at the top panel within the first 5 s.
  4. Observe: panel badge "Queued", text "Waiting for a free slot — another run is using the lane it needs", while its log already shows "▶ Claude session started" and the "Running 1" table lists "Cover letter for Cobalt Freight · Running · 0:05".
- **Notes:** P2's fear is "is it stuck?"; contradictory states on the same screen feed it. The panel corrects itself only when the run finishes. The page also opens scrolled to the middle (see H-global-03).

### H-runs-02: A finished run gives no way to open what it produced
- **Severity:** 2
- **Where:** Runs › run panel after "Finished"; "Finished" table rows
- **Tasks:** T5, T9
- **Capabilities:** UI-runs-open, UI-shared-run-close, R-report-cover, R-report-pdf
- **Method:** heuristic (H1 Visibility; H3 User control and freedom)
- **Evidence:** app/ux/evidence/H-runs-02.png
- **Reproduction:**
  1. Continue from H-runs-01; wait ~10 s.
  2. Observe: "Cover letter for Cobalt Freight · Finished · 0:08 · Close"; subtitle "Cobalt Freight · report 002 · mirror tone"; last log line "Cover letter rendered: output/cover-cobaltfreight-002.pdf" as plain text. Neither the title, the subtitle nor the path is a link; there is no "Open letter" / "Open job".
- **Notes:** The user must go to Pipeline, find the right Cobalt Freight row among five, scroll to the detail and open the "Cover letter" tab. Same for "PDF for …" runs.

## 2. Match between system and the real world

### H-runs-04: Run names and columns use internal terms: host names, "Lane: exclusive / script / Claude", file slugs
- **Severity:** 2
- **Where:** Runs › "Finished" table (Run, About, Lane columns)
- **Tasks:** T8
- **Capabilities:** R-runs, UI-runs-open
- **Method:** heuristic (H2 Match between system and the real world)
- **Evidence:** app/ux/evidence/H-runs-04.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/
  2. Evaluate any posting URL (e.g. `https://job-boards.greenhouse.io/kestrelmedia/jobs/4134913`) and let the chain finish; open "Runs".
  3. Observe rows: "Evaluate job-boards.greenhouse.io · report 041 · Claude", "Merge tracker additions · — · exclusive", "Reconcile inbox · — · exclusive", "Render cv-candidate-kestrel-media · standard · standard template · script", "Mark PDF ready · — · exclusive". "Started" shows a clock time ("2:02:51") with no date.
- **Notes:** In T8 the user must find "the job I asked about earlier"; the evaluation row does not name the company or the URL. A maintenance preview ("Dedup tracker", preview only) is listed as "Finished" with nothing marking that it wrote nothing. Lanes matter to the scheduler, not the user.

## 3. User control and freedom

Covered by H-runs-02. "Cancel" is available on running rows and in the panel (strength). A failed run has no "Retry" — see H-broken-state-02.

## 4. Consistency and standards

No issues found beyond H-runs-04; the run panel component is identical to Pipeline's and Sources', which is good.

## 5. Error prevention

No issues found. Runs offers no destructive action except Cancel.

## 6. Recognition rather than recall

Covered by H-runs-04 (runs not named by job).

## 7. Flexibility and efficiency of use

No issues found for the current volume. With dozens of runs per day the list has no filter (by kind, by job, failed only); noted for M7, not ranked.

## 8. Aesthetic and minimalist design

No separate finding. Chained housekeeping runs (merge, reconcile, mark ready) make up more than half the rows and push the user's own runs down.

## 9. Help users recognize, diagnose, and recover from errors

See H-broken-state-02 (failed evaluation: technical message, truncated URL, no retry).

## 10. Help and documentation

### H-runs-03: "How runs work" is developer documentation, and warns that history is lost on restart only in passing
- **Severity:** 2
- **Where:** Runs › "How runs work"
- **Tasks:** T8
- **Capabilities:** UI-runs-help
- **Method:** heuristic (H10 Help and documentation; H2 Match)
- **Evidence:** app/ux/evidence/H-runs-03.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/#/runs
  2. Click "How runs work".
  3. Observe: "scans and maintenance scripts (M2)", "`JSC_MAX_AGENTS` to change it", "auto_pdf_score_threshold", "follows `modes/pdf.md` … the fact gate must pass", "data/jsc/logs/<run id>.jsonl", and at the end "The server keeps the last sixty runs in memory; a restart forgets them all".
- **Notes:** The useful user-level facts (two agent runs at a time, others wait; a failed step cancels the ones after it; nothing is ever submitted) are there but buried among milestone numbers and env vars. That the Runs list empties on restart is important for T8 ("earlier today … something went wrong") and should be visible on the page, not in a footnote.

---

## Strengths
- Three clear groups (Running / Waiting / Finished) with counts and friendly empty text ("Nothing running.").
- Every run has a live log, a timer and a status badge; selecting a row opens it at the top with a stable URL (`#/runs/<id>`).
- Failed runs show a separate, highlighted failure box under the log.
- Cancel is available while running; costs and turn counts are shown in the log ("Claude finished in 1s · 3 turns · $0.05").
