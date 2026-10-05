# Heuristic evaluation — The whole app in the `broken` state (errors and recovery)

Scope: how the app surfaces and lets the user recover from the three seeded faults of
`broken`: a malformed tracker row, an ATS-failing theme ("broken") saved as the CV
default, and one failed evaluation (Brightwater Health, Data Engineer,
`https://job-boards.greenhouse.io/brightwaterhealth/jobs/4101707`) on the Runs page.

Evaluated on 2026-10-04 against `broken` (port 4401), read-only: I opened pages, panels and
the failed run's log, and changed nothing (no retry, no theme change, no status edits).

Summary: 0 × sev 4, 4 × sev 3, 2 × sev 2, 0 × sev 1.

---

## 1. Visibility of system status

### H-broken-state-06: A failed evaluation is visible only on the Runs page
- **Severity:** 3
- **Where:** Pipeline (and every page except Runs) after the failed evaluation
- **Tasks:** T8
- **Capabilities:** UI-nav-runs, R-runs, UI-pipeline-issues
- **Method:** heuristic (H1 Visibility of system status)
- **Evidence:** app/ux/evidence/H-broken-state-06.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state broken --port 4400` (the launcher starts the failing evaluation), open http://127.0.0.1:4400/
  2. Observe: Pipeline shows "40 applications · 6 PDFs", "1 data issue found" (the tracker row) and the table; nothing says an evaluation failed today. The "Runs" nav item has no badge. Sources, Skills and CV Studio also show nothing.
- **Notes:** T8 starts from "something went wrong earlier". P2 never opens Runs unprompted; P1 thinks in terms of the terminal output they no longer see. A persistent "1 run failed — view" notice (or a red badge on "Runs") would make the failure findable. Combined with H-runs-03 (the Runs list is lost on restart) a failure can disappear without the user ever seeing it.

## 2. Match between system and the real world

### H-broken-state-02: The failed run explains itself in engine terms, hides the job's URL, and offers no retry
- **Severity:** 3
- **Where:** Runs › "Finished" › "Failed · Evaluate job-boards.greenhouse.io · report 041" › run panel
- **Tasks:** T8
- **Capabilities:** UI-runs-open, R-run, R-run-events, UI-sources-inbox-evaluate, UI-pipeline-url
- **Method:** heuristic (H9 Help users recognize, diagnose, and recover from errors; H2 Match)
- **Evidence:** app/ux/evidence/H-broken-state-02.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state broken --port 4400`, open http://127.0.0.1:4400/#/runs
  2. Click the "Failed" row "Evaluate job-boards.greenhouse.io".
  3. Observe: log "Reserved report number 041 · Prompt: language + modes/_shared.md … · Received: Evaluate this job posting. URL: https://job-boards.greenhous" (cut off) · "I looked at the page but wrote nothing." · "Claude finished in 1s · 3 turns · $0.05"; failure box "the agent exited without writing reports/041-*.md". No "Retry", no "Evaluate again", no company name, no full URL, no link to the posting.
- **Notes:** T8 asks "what happened and why, then get that job looked at". The why is in the log in plain words ("I looked at the page but wrote nothing"), but the failure box restates it as a file glob; "report 041" in the About column refers to a report that does not exist. To recover, the user must work out which job this was (the URL is truncated) and then find it in Sources › "Show the inbox" or paste it again on Pipeline. The run still cost $0.05.

## 3. User control and freedom

### H-broken-state-03: The failed job sits in the inbox looking like any other pending link
- **Severity:** 2
- **Where:** Sources › "Show the inbox" › "Data Engineer · Brightwater Health · Remote (US) · posted 2026-09-06 · Evaluate"
- **Tasks:** T8
- **Capabilities:** UI-sources-inbox-toggle, UI-sources-inbox-evaluate, R-inbox
- **Method:** heuristic (H3 User control and freedom; H1 Visibility)
- **Evidence:** app/ux/evidence/H-broken-state-03.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state broken --port 4400`, open http://127.0.0.1:4400/#/sources
  2. Click "Show the inbox".
  3. Observe: the Brightwater Health Data Engineer posting is first in the list with a normal "Evaluate" button; nothing marks that its evaluation failed today. The Pipeline also lists an older "Brightwater Health / Data Engineer" (row 21, different URL).
- **Notes:** This is the shortest recovery path for T8, but nothing leads the user from the failure to it, and the duplicate company/role in the tracker invites the wrong conclusion that the job was evaluated after all.

## 4. Consistency and standards

### H-broken-state-05: Pipeline gives no warning that every auto-generated PDF will use an ATS-failing theme
- **Severity:** 3
- **Where:** Pipeline › "PDF if score ≥ 3.5" (ticked), row "PDF" buttons; CV Studio shows "Saved." for theme "broken"
- **Tasks:** T2, T5, T7
- **Capabilities:** UI-pipeline-autopdf, UI-pipeline-row-pdf, C-style-yml, UI-cv-save
- **Method:** heuristic (H5 Error prevention; H4 Consistency)
- **Evidence:** app/ux/evidence/H-broken-state-05.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state broken --port 4400`, open http://127.0.0.1:4400/
  2. Observe: "PDF if score ≥ 3.5" is ticked; there is no notice about the CV theme anywhere on Pipeline.
  3. Open "CV Studio". Observe: theme "broken", "ATS check failed … This is a custom theme, and it is not ATS-safe", and on the left "Saved." — it is the default for every PDF.
- **Notes:** The guardrail exists in CV Studio and in each job's PDF tab, but the place where PDFs are produced in bulk (evaluate with auto-PDF, row "PDF") does not warn before producing one. Combined with H-job-detail-06 (an ATS failure is shown as a green "●" in the table), a user can generate and send failing CVs without ever seeing the verdict.

## 5. Error prevention

### H-broken-state-04: With an ATS-failing theme selected, "Render this CV" remains the one-click primary action
- **Severity:** 2
- **Where:** CV Studio › preview › "Render this CV", "Re-render all in this theme"
- **Tasks:** T7
- **Capabilities:** UI-cv-render, UI-cv-render-all, UI-cv-theme-pick
- **Method:** heuristic (H5 Error prevention)
- **Evidence:** app/ux/evidence/H-broken-state-04.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state broken --port 4400`, open http://127.0.0.1:4400/#/cv
  2. Observe: the ATS box is red with 13 reasons; directly under it, "Render this CV" is still the filled primary button and "Re-render all in this theme" is beside it. (Not clicked.)
- **Notes:** The red sentence says "pick another before sending a CV made with it", but the UI makes the opposite action the easiest one. A suggested passing theme ("Standard — ATS pass") next to the box, or a confirmation when rendering with a failing theme, would turn the diagnosis into a recovery. The ATS box's own wording issues are in H-cv-studio-05.

## 6. Recognition rather than recall

No issues found beyond H-broken-state-02 (the failed job is not named).

## 7. Flexibility and efficiency of use

No issues found; recovery options (paste URL again, inbox "Evaluate") exist but are not connected to the failure (H-broken-state-02, -03).

## 8. Aesthetic and minimalist design

No separate finding. Error colours are used consistently (amber banners, red ATS fail, red "Failed" badge).

## 9. Help users recognize, diagnose, and recover from errors

### H-broken-state-01: "1 data issue found" names only a code, "row-unparseable", and the affected row silently disappears
- **Severity:** 3
- **Where:** Pipeline › "1 data issue found" › "row-unparseable"; masthead "40 applications"
- **Tasks:** T3
- **Capabilities:** UI-pipeline-issues, R-pipeline, C-applications-md, UI-pipeline-maint-validate
- **Method:** heuristic (H9 Help users recognize, diagnose, and recover from errors)
- **Evidence:** app/ux/evidence/H-broken-state-01.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state broken --port 4400`, open http://127.0.0.1:4400/
  2. Click "1 data issue found".
  3. Observe: a single bullet "row-unparseable" — no row number, no company, no description, no suggested fix. The masthead and "All" chip say 40, and the table lists 40 rows, while `data/applications.md` holds 41 table rows: the broken one is simply not shown.
- **Notes:** The user cannot tell which application is missing from their tracker, let alone fix it, and no "Check integrity" hint is attached (that button is at the bottom of the page). Compare the `empty` state's issue, which does carry a sentence (H-empty-state-02). Data that silently vanishes is the trust risk P1 names ("the app doing something to your files").

## 10. Help and documentation

No issues found beyond the above; "What do these do?" under Maintenance explains "Found problems" vs "Failed", which helps here if the user finds it.

---

## Strengths
- Every seeded fault is detected and shown somewhere: the tracker problem as a banner, the ATS failure in CV Studio (with a specific diagnosis and an explicit "not ATS-safe" sentence), the failed run with a red badge and a failure box.
- The failed run keeps its full log, including the agent's own plain-language explanation ("I looked at the page but wrote nothing").
- Theme cards show ATS badges, so a passing alternative is visible on the same screen as the failure.
- Nothing in the broken state blocks the rest of the app: Pipeline, Sources, Skills and Runs all work normally.
