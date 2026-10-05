# UX backlog (M6 baseline)

Synthesised by `ux-synthesizer` from the evidence in `app/ux/` (PROJECT_PLAN.md §12.2 #7):
the inventory, 52 heuristic findings (`heuristics/*.md`), 42 walkthrough findings
(`walkthroughs/T1–T9.md`), 27 persona runs (`runs/P*-T*/transcript.md`, judged by their
`verdict.md`), and 16 accessibility findings (`a11y/report.md`, `a11y/axe-summary.md`).
This file adds no finding of its own. Every F- item lists the source IDs it merges.

Rules applied:
- **Merging.** Two findings are one when they describe the same underlying problem in the same place. "Methods" counts the distinct methods that found it: heuristic, walkthrough, persona, a11y.
- **Severity.** Each item starts from its highest source severity and is then adjusted for evidence.
  - A problem that made a persona run fail (per `verdict.md`) is at least 3.
  - A problem raised by one heuristic or walkthrough reviewer that no persona hit comes down one step. The exception is a consequence of data loss, spent money or a blocked task.
- **Ranking.** By severity, then the number of affected tasks, then the number of methods.
- **Recommendations** describe what the user needs, not an implementation. M6 changes no UI.

## Summary

| Severity | Count | Findings |
|---|---|---|
| 4 (catastrophe) | 5 | F-001 – F-005 |
| 3 (major) | 17 | F-006 – F-022 |
| 2 (minor) | 41 | F-023 – F-063 |
| 1 (cosmetic) | 16 | F-064 – F-079 |
| **Total ranked** | **79** | |
| Out of scope | 2 | below |
| Not a problem (0) | 7 | below |

There are **22 open severity-3/4 findings** (F-001 – F-022). The §12.6 target is 0.

### The five problems that matter most
1. **F-001: A first-time user cannot give the app a CV.** Nothing anywhere accepts one, and every agent feature depends on it. T1 failed for 3 of 3 personas.
2. **F-004: "Add" on Sources is disabled on first run**, while the page says "add a company to create one". This is T1's second hard stop, again 3 of 3.
3. **F-003: A failed evaluation cannot be diagnosed or retried from where it is shown.** The reason is given in engine terms, the posting URL is truncated, and there is no retry. T8 failed for 3 of 3 personas. With F-017, it sent two of them to re-evaluate the wrong posting.
4. **F-002: "Seed from template" overwrites the user's saved writing rules on disk**, in one click, with no confirmation or undo.
5. **F-005: Run logs cannot be opened from the keyboard**, so keyboard and screen-reader users cannot complete T8 at all.

---

## Ranked findings

### F-001: There is no way to give the app your CV; the first screen names the missing `cv.md` and offers nothing
- **Severity:** 4 (all three T1 runs failed on it per `verdict.md` (`cvPresent=false`); every agent feature depends on the CV)
- **Affected tasks:** T1, T7   **Capabilities:** C-cv-md, R-agent-status, UI-pipeline-evaluate-now, UI-cv-document
- **Found by:** heuristic H-empty-state-01, H-empty-state-06; walkthrough W-T1-01, W-T1-02; persona P1-T1-01, P2-T1-01, P3-T1-01 (3 methods)
- **Evidence:** app/ux/evidence/W-T1-01.png, app/ux/evidence/H-empty-state-06.png, app/ux/runs/P2-T1/step-02.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state empty --port 4400`, open http://127.0.0.1:4400/
  2. Observe "No cv.md in the data directory yet" under the URL field. It is plain text with no link, and "Evaluate now" is disabled.
  3. Click "CV Studio". Observe that "CV" lists only "Sample CV (fictional)" ("for trying themes before you have generated one"), and there is no upload, paste or "use my CV" control.
  4. Visit "Skills" ("CV: no cv.md found") and "Runs". No page accepts CV text or a file.
- **Notes:**
  - Every persona looked first in CV Studio, then in Skills and Runs, and gave up with SEQ 1/7.
  - P2 and P3 do not know what "cv.md" or "the data directory" are. P1 knows, but came to the app so as not to edit files by hand.
  - The user needs a way to provide or paste their CV inside the app, and a first screen that leads there.
  - Known gap: the Profile page was moved to M8 (§5 page 4).

### F-002: "Seed from template" replaces the user's saved writing rules on disk at once, with no confirmation or undo
- **Severity:** 4 (silent loss of user data on a one-click secondary button next to "Save voice rules", confirmed by reloading the page)
- **Affected tasks:** T9, T1   **Capabilities:** UI-cv-voice-seed, R-cv-voice-put, C-voice-dna-md
- **Found by:** walkthrough W-T9-02 (1 method)
- **Evidence:** app/ux/evidence/W-T9-02.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/#/cv
  2. Scroll to "Voice — writing rules". Note the user's rules ("# Voice DNA — Alex Rivera (fictional)", "## Never write", "- spearheaded" …).
  3. Click "Seed from template".
  4. Observe: the textarea now holds upstream's template, with no dialog and no message. Reload the page: the template is still there, and "spearheaded" and the rest of the user's rules are gone.
- **Notes:**
  - T9 says "without losing the writing rules you already set up". The template bans the three target words, so a user who stops here believes the task is done.
  - No persona clicked it, but P2-T9 (transcript step 3) avoided it explicitly: "I will not press 'Seed from template', it might wipe my rules."
  - The user needs either protection from overwriting rules they already have, or a way to get them back.

### F-003: A failed evaluation explains itself in engine terms, truncates the posting URL, and offers no retry
- **Severity:** 4 (all three T8 runs failed per `verdict.md` ("no succeeded retry"); users cannot complete the recovery from what the failure shows)
- **Affected tasks:** T8   **Capabilities:** UI-runs-open, R-run, R-run-events, UI-sources-inbox-evaluate, UI-pipeline-url
- **Found by:** heuristic H-broken-state-02; walkthrough W-T8-02; persona P1-T8-01, P1-T8-03, P2-T8-01, P2-T8-03, P3-T8-01, P3-T8-02, P3-T8-03 (3 methods)
- **Evidence:** app/ux/evidence/W-T8-02.png, app/ux/runs/P3-T8/step-03.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state broken --port 4400` (the launcher starts one evaluation that fails), open http://127.0.0.1:4400/#/runs
  2. Click the "Failed" row "Evaluate job-boards.greenhouse.io".
  3. Observe:
     - the failure box reads "the agent exited without writing reports/041-*.md";
     - the log line "Received: Evaluate this job posting. URL: https://job-boards.greenhous" is cut off;
     - no company or role is named;
     - the only button is "Close".
  4. Hover the row and open "How runs work". There is no retry and no hint of one.
- **Notes:**
  - All three personas found the failure on Runs and none could recover from there.
  - P3 stopped because the URL was unreadable ("I would not guess the rest of the address"). P1 and P2 went to the inbox and re-evaluated a different posting (see F-017).
  - The plain-language cause exists in the log ("I looked at the page but wrote nothing"), but the failure box restates it as a file glob.
  - The user needs to know which job failed, why in plain words, whether trying again could help, and how to try again from there.
  - The truncation is also reported in P1-T8-02 and P2-T8-02 (see F-009).

### F-004: On first run both "Add" buttons on Sources are disabled with no reason, while the page says "add a company to create one"
- **Severity:** 4 (all three T1 runs failed on it per `verdict.md` (`portals.yml exists=false`); the app's own instruction cannot be followed)
- **Affected tasks:** T1   **Capabilities:** UI-sources-add-company, UI-sources-add-board, UI-sources-issues, R-portals-create, C-portals-yml
- **Found by:** heuristic H-empty-state-03; walkthrough W-T1-04; persona P1-T1-02, P2-T1-02, P3-T1-02 (3 methods)
- **Evidence:** app/ux/evidence/W-T1-04.png, app/ux/evidence/H-empty-state-03.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state empty --port 4400`, open http://127.0.0.1:4400/#/sources
  2. Expand "1 issue(s) in portals.yml". It reads "portals-missing: No portals.yml yet — add a company to create one."
  3. Hover or click either "Add" under "Tracked companies (0)" and "Job boards (0)".
  4. Observe: both are greyed out, with no tooltip or reason. "How sources work" says nothing about getting started.
- **Notes:**
  - Every persona tried "Add" and stopped here. Even P1, who could edit `portals.yml` by hand, had been told by the page that "Add" creates it.
  - The banner speaks in a code and a file name.
  - The user needs to add their first company from the page that tells them to.

### F-005: Run logs cannot be opened from the keyboard, so a keyboard or screen-reader user cannot diagnose a failed run
- **Severity:** 4 (blocks T8 completely for keyboard and screen-reader users, verified in the keyboard-only pass)
- **Affected tasks:** T8 (also T4, T5 and T7 whenever the user wants a log; not counted)   **Capabilities:** UI-runs-open, UI-global-toast-open-log, R-runs
- **Found by:** a11y A-03 (1 method)
- **Evidence:** app/ux/evidence/A-03.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state broken --port 4400`, open http://127.0.0.1:4400/#/runs
  2. Press Tab repeatedly.
  3. Observe: focus visits the five nav buttons and "How runs work", then leaves the page. The failed run's row can never receive focus and contains no button or link. Its text names neither the job nor the cause.
- **Notes:**
  - The only other keyboard routes to a log are the toast's "Open log", which disappears after 6 s (F-045), and the jump after submitting a cover letter.
  - Keyboard users need every run, and especially a failed one, to be openable and to state its job and cause in the row.

### F-006: Run progress, completion, save results and ATS verdict changes are never announced to assistive technology
- **Severity:** 3 (a screen-reader user is not told that an agent started, finished or failed, or that a save happened, across five tasks)
- **Affected tasks:** T2, T4, T5, T7, T9   **Capabilities:** UI-pipeline-evaluate-now, UI-sources-scan, UI-cv-render, UI-cv-voice-save, UI-cv-save, UI-skills-extract, UI-global-toast-open-log, UI-shared-run-close
- **Found by:** a11y A-06 (1 method)
- **Evidence:** app/ux/evidence/A-06.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/#/cv
  2. Tab to the "Voice — writing rules" textarea, edit it, Tab to "Save voice rules" and press Enter.
  3. Observe: the confirmation "voice-dna.md saved. It applies to the next cover letter or PDF." appears at the top of the page without a status role, and focus is on `<body>`.
  4. On Pipeline, evaluate a URL. The run panel goes "Running → Finished" with an unnamed progress bar and no live region.
- **Notes:**
  - The only live region in the app is the toast, which several screen readers ignore and which disappears after 6 s.
  - Users need to hear run state changes and save results where they are working, without having to hunt for them.

### F-007: An ATS-failing CV theme silently produces failing PDFs; the Pipeline shows them as done and never warns
- **Severity:** 3 (a user can generate, and send, CVs that screening software cannot read without ever seeing the verdict; all three T7 personas and P1-T8 noticed only by chance)
- **Affected tasks:** T2, T5, T7, T8   **Capabilities:** UI-pipeline-autopdf, UI-pipeline-row-pdf, UI-pipeline-detail-tab-pdf, UI-pipeline-detail-run-badges, R-report-pdf, C-style-yml, UI-cv-save
- **Found by:** heuristic H-job-detail-06, H-broken-state-05; persona P1-T7-02, P2-T7-05, P3-T7-05, P1-T8-07 (2 methods)
- **Evidence:** app/ux/evidence/H-broken-state-05.png, app/ux/evidence/H-job-detail-06.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state broken --port 4400`, open http://127.0.0.1:4400/
  2. Observe: "PDF if score ≥ 3.5" is ticked and the page has no notice about the CV theme.
  3. Open "CV Studio". Observe: theme "broken", "ATS check failed … This is a custom theme, and it is not ATS-safe", and "Saved." on the left. It is the default for every PDF.
  4. Back on Pipeline, click "PDF" on any row and wait. The row shows a green "●", and the run badges read "Finished". Only the detail's "PDF" tab shows the failure.
- **Notes:**
  - All three T7 personas said nothing on Pipeline warned them that their CVs were failing.
  - P1-T8 saw an automatic follow-on PDF run labelled "broken template" and could not tell whether a usable PDF had been produced.
  - The H-job-detail-06 screenshot shows a failure caused by the fake CLI's placeholder CV, but the display path is real.
  - The user needs to learn that a CV fails screening wherever it is produced or listed, and to be pointed to a passing alternative.

### F-008: Dark scheme: white text on the amber primary buttons (1.67:1) and on the "ATS fail" badge (2.69:1)
- **Severity:** 3 (the main action of each page, and the one warning meant to be impossible to miss, are effectively blank for low-vision users in dark mode)
- **Affected tasks:** T4, T6, T7, T9   **Capabilities:** UI-sources-scan, UI-sources-form-submit, UI-skills-tab-learn, UI-cv-render, UI-cv-theme-pick
- **Found by:** a11y A-08 (1 method; axe `color-contrast`, serious)
- **Evidence:** app/ux/evidence/A-08.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/#/sources with `prefers-color-scheme: dark`.
  2. Observe: "Scan now" is white on `#fbbf24`, 1.67:1.
  3. Restart with `--state broken` and open `#/cv` in dark mode. The selected card's "ATS fail" badge is white on `#fb7185`, 2.69:1.
- **Notes:** Users need primary actions and failure badges readable in both colour schemes.

### F-009: Runs, toasts, run panels and the cover-letter dialog name the job board's host or only the company, never the job
- **Severity:** 3 (in T8 two personas could not tell which posting had failed, and both then retried the wrong one; across T2, T5 and T8 parallel or repeated runs are indistinguishable)
- **Affected tasks:** T2, T5, T8   **Capabilities:** UI-pipeline-evaluate-now, R-run-events, R-runs, UI-runs-open, UI-global-toast-open-log, UI-pipeline-cover-dialog, UI-pipeline-row-pdf, UI-sources-inbox-evaluate
- **Found by:** heuristic H-pipeline-03, H-runs-04, H-global-01; walkthrough W-T5-03, W-T8-04; persona P1-T8-02, P2-T8-02 (3 methods)
- **Evidence:** app/ux/evidence/H-runs-04.png, app/ux/evidence/H-global-01.png, app/ux/evidence/W-T5-03.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/
  2. Scroll to row 40 (Mosaic Retail) and click "Re-evaluate". Observe the toast "Evaluate job-boards.greenhouse.io started".
  3. Open "Runs". Rows read "Evaluate job-boards.greenhouse.io · report 041", "Render cv-candidate-… · standard · script", and "Lane: exclusive". "Started" shows a time with no date.
  4. On Pipeline, type "Granite" in the filter and click "Cover" on row 6. The dialog title is "Cover letter for Granite Cloud", although four Granite Cloud rows exist.
- **Notes:**
  - Every Greenhouse evaluation gets the same title.
  - The run panel's log is also prompt-level detail (H-pipeline-03; see F-065).
  - P1-T8-02 and P2-T8-02 also report the truncated URL, merged under F-003.
  - Users need every run, toast and dialog to name the company and the role they acted on.

### F-010: Clicking a row only highlights it; the report opens below the whole table, out of sight
- **Severity:** 3 (all three T2 personas had to hunt for the result, and the walkthrough predicts first-timers conclude the click did nothing; 3 methods agree)
- **Affected tasks:** T2, T5   **Capabilities:** UI-pipeline-open-row, UI-pipeline-detail-tab-report
- **Found by:** heuristic H-job-detail-01; walkthrough W-T2-03; persona P1-T2-03, P2-T2-01, P3-T2-01 (3 methods)
- **Evidence:** app/ux/evidence/W-T2-03.png, app/ux/runs/P2-T2/step-03.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/
  2. Click the row "Cobalt Freight / Staff Software Engineer" (row 12).
  3. Observe: the row turns yellow and the viewport does not move. "Evaluation: Cobalt Freight — Staff Software Engineer" is rendered after all 40 rows, about 1,700 px down. A deep link (`#/pipeline/12`) does scroll, so the two entry points behave differently.
- **Notes:**
  - P2: "After clicking the row I saw nothing change at the top … I almost missed it."
  - P3 also noted that nothing pointed out where the evaluation result went.
  - Users need the job's details to appear where they are looking when they open a job.

### F-011: A finished run gives no way to open what it produced, and the documents have no visible download or location
- **Severity:** 3 (two T5 personas self-reported only "partly" because they could not find their files; the browser PDF viewer does offer a download, so this is not a 4)
- **Affected tasks:** T5, T9   **Capabilities:** UI-runs-open, UI-shared-run-close, R-report-cover, R-report-pdf, C-output
- **Found by:** heuristic H-runs-02; walkthrough W-T5-05; persona P1-T5-01, P2-T5-01, P3-T5-01 (3 methods)
- **Evidence:** app/ux/evidence/W-T5-05.png, app/ux/runs/P2-T5/step-21.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/
  2. Type "Granite" in the filter. On row 6 click "Cover", fill A, B and C, and click "Draft and render the letter".
  3. Wait about 10 s on the Runs page. Observe "Finished", with a last log line "Cover letter rendered: output/cover-granitecloud-006.pdf" as plain text. There is no "Open letter", no link back to the job, and the CV's path is never shown.
- **Notes:**
  - The user must return to Pipeline, find the right row among duplicates, scroll to the detail and open a tab.
  - All three personas asked where the files are "so I can attach them".
  - Users need to open, and save, the documents they just made from where the app tells them they are done.
  - Sending them stays manual (see Out of scope).

### F-012: There is no first-run guidance, and the empty-state messages point to actions that are blocked
- **Severity:** 3 (all three T1 personas asked for a setup checklist; the data issue tells the user to run an evaluation that the missing CV blocks)
- **Affected tasks:** T1, T2   **Capabilities:** UI-pipeline-issues, UI-pipeline-evaluate-now, R-agent-status
- **Found by:** heuristic H-empty-state-02; persona P1-T1-03, P2-T1-03, P3-T1-03 (2 methods)
- **Evidence:** app/ux/evidence/H-empty-state-02.png, app/ux/runs/P1-T1/step-04.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state empty --port 4400`, open http://127.0.0.1:4400/
  2. Click "1 data issue found". It reads "tracker-missing: No applications tracker yet — run an evaluation to create one."
  3. Observe: "Evaluate now" directly above is disabled ("No cv.md in the data directory yet"). No page states the order of steps: CV, then companies or a job, then evaluation.
- **Notes:**
  - The amber styling makes a fresh install look broken.
  - Each page shows a different missing-file message ("tracker-missing", "portals-missing", "no cv.md"), and none links to the next step.
  - Users need to be told what to do first, in their own words.

### F-013: Evaluating from the inbox gives no feedback, then the item reverts to "Evaluate" and stays listed after the run succeeds
- **Severity:** 3 (success looks like "nothing happened", which invites a second paid run, on the very task about recovery; 2 methods)
- **Affected tasks:** T8, T4   **Capabilities:** UI-sources-inbox-evaluate, R-inbox, R-events
- **Found by:** walkthrough W-T8-05; persona P1-T8-05, P2-T8-04 (2 methods)
- **Evidence:** app/ux/evidence/W-T8-05.png, app/ux/evidence/W-T8-05b.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state broken --port 4400`, open http://127.0.0.1:4400/#/sources
  2. Click "Show the inbox", then "Evaluate" on "Data Engineer · Driftwood Analytics". Stay on the page.
  3. Wait about 20 s. Runs shows the evaluate, merge, PDF and reconcile runs all "Finished".
  4. Observe: the item is still listed with an "Evaluate" button, and the count is unchanged. It disappears only after leaving Sources and coming back.
- **Notes:**
  - P1 and P2 both reported "no visible feedback on the page" and had to go to Runs.
  - Users need to see that their request started, and then that it finished, where they made it.

### F-014: Pipeline rows and sortable headers are mouse-only, so the report cannot be opened from the table by keyboard
- **Severity:** 3 (keyboard and screen-reader users cannot reach a report's reasoning, PDF or cover-letter tabs from Pipeline)
- **Affected tasks:** T2, T5   **Capabilities:** UI-pipeline-open-row, UI-pipeline-sort, UI-pipeline-detail-tab-report, UI-pipeline-detail-tab-pdf, UI-pipeline-detail-tab-cover, UI-pipeline-detail-run-badges
- **Found by:** a11y A-01 (1 method)
- **Evidence:** app/ux/evidence/A-01.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/
  2. Tab to "Filter company, role, notes…" and press Tab once more.
  3. Observe: focus jumps to the first row's status select. No header or row ever gets focus, and Enter or Space does not open the detail.
- **Notes:** The only keyboard routes into a report are Skills' "report NNN" links and typing `#/pipeline/<id>`. Keyboard users need to open any job's details and sort the table.

### F-015: A new evaluation for an already-tracked company and role is folded into the old row without any notice
- **Severity:** 3 (the user's application record changes silently: the older posting's score, date and report link vanish, and its "Applied" status is carried onto a posting the user never applied to). Not counted as a T8 blocker: the T8 seed collision that caused it was fixed.
- **Affected tasks:** T8, T2   **Capabilities:** R-pipeline, C-applications-md, K-merge-tracker, UI-pipeline-open-row
- **Found by:** walkthrough W-T8-06 (1 method)
- **Evidence:** app/ux/evidence/W-T8-06.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/
  2. Type "Brightwater" in the filter and note row 21: "Data Engineer · 3.3 · Applied", an older posting.
  3. Paste `https://job-boards.greenhouse.io/brightwaterhealth/jobs/4101707` (another Brightwater Health Data Engineer posting) and click "Evaluate now". Wait for the chained runs to finish.
  4. Observe: still "40 applications" and four Brightwater rows. Row 21 now shows today's date, score 4.1 and the new URL, with status "Applied". Nothing says "merged into row 21".
- **Notes:**
  - Reproduction derived from W-T8-06, which observed this in the earlier `broken` seed.
  - The folding is upstream's `merge-tracker` behaviour (same company and role). Changing it is out of scope (see below). What is missing is feedback.
  - Users need to be told when a result was merged into an existing application, and what changed in it.

### F-016: A failed evaluation is visible only on the Runs page; the landing page's only alert is unrelated
- **Severity:** 3 (no persona saw the failure on the first screen; all three found it by guessing "Runs", and P3 first followed the unrelated "data issue")
- **Affected tasks:** T8   **Capabilities:** UI-nav-runs, R-runs, UI-pipeline-issues
- **Found by:** heuristic H-broken-state-06; walkthrough W-T8-01; persona P1-T8-06, P3-T8-04 (3 methods)
- **Evidence:** app/ux/evidence/W-T8-01.png, app/ux/evidence/H-broken-state-06.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state broken --port 4400`, open http://127.0.0.1:4400/
  2. Observe: "1 data issue found" (`row-unparseable`) and the table. No banner, toast, badge or nav count mentions the failed evaluation. Sources, Skills and CV Studio show nothing either.
- **Notes:**
  - The Runs list is also forgotten on restart (H-runs-03, F-029), so a failure can vanish unseen.
  - Users need to learn that something they asked for failed without having to know where to look.

### F-017: In the inbox, the job whose evaluation failed is not marked, while another posting's error mark lures users to the wrong job
- **Severity:** 3 (P1-T8 and P2-T8 re-evaluated "Senior Backend Engineer · Driftwood Analytics", the item marked "posting could not be read", instead of the failed Data Engineer posting; `verdict.md`: failure)
- **Affected tasks:** T8   **Capabilities:** UI-sources-inbox-toggle, UI-sources-inbox-evaluate, R-inbox
- **Found by:** heuristic H-broken-state-03; walkthrough W-T8-03; persona P1-T8-04 (3 methods)
- **Evidence:** app/ux/evidence/W-T8-03.png, app/ux/runs/P1-T8/step-07.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state broken --port 4400`, open http://127.0.0.1:4400/#/sources
  2. Click "Show the inbox".
  3. Observe: "Data Engineer · Driftwood Analytics", the job that failed, has an ordinary "Evaluate" button and no mark. A different item, "Senior Backend Engineer · Driftwood Analytics", carries "posting could not be read". The failed run on Runs does not link here.
- **Notes:**
  - The heuristic and walkthrough observed this with the earlier seed's Brightwater Health posting, and the problem is the same.
  - Users need the failed job to be recognisable wherever they can retry it.

### F-018: A finished evaluation does not say what it concluded or that the job was added; the score is a raw log line
- **Severity:** 3 (T2's payoff, "what did the app conclude", is only inside a developer log; every T2 persona asked for a "saved to your list" line)
- **Affected tasks:** T2   **Capabilities:** UI-pipeline-evaluate-now, UI-shared-run-close, R-run-events
- **Found by:** heuristic H-pipeline-04; walkthrough W-T2-02; persona P1-T2-02, P2-T2-03 (3 methods)
- **Evidence:** app/ux/evidence/H-pipeline-04.png, app/ux/evidence/W-T2-02.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/
  2. Paste `https://job-boards.greenhouse.io/kestrelmedia/jobs/4134913` and click "Evaluate now". Wait about 10 s for "Finished".
  3. Observe:
     - the title is "Evaluate job-boards.greenhouse.io", the subtitle "report 041";
     - the score appears only as "· score 4.1/5" at the end of a file-path line, and the decision ("Apply") is not shown;
     - nothing says the job was added to the list or links to the new row, which has no highlight.
- **Notes:** Users need the outcome (company, role, score, decision, "added to your applications") and a way to open it.

### F-019: It is unclear what makes a design the default for every CV, and nothing confirms it
- **Severity:** 3 (all three T7 personas self-reported only "partly" with SEQ 4–5 for this reason, although the data passed; the walkthrough predicts silent loss of the choice)
- **Affected tasks:** T7   **Capabilities:** UI-cv-theme-pick, UI-cv-save, UI-cv-render, UI-cv-render-all, R-cv-style-put
- **Found by:** heuristic H-cv-studio-03; walkthrough W-T7-03, W-T7-04; persona P1-T7-01, P2-T7-01, P2-T7-03, P3-T7-01, P3-T7-02 (3 methods)
- **Evidence:** app/ux/evidence/W-T7-03.png, app/ux/runs/P2-T7/step-05.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state broken --port 4400`, open http://127.0.0.1:4400/#/cv
  2. Select "Report 012 · cv-alex-rivera-cobaltfreight-012", scroll to "Themes" and click "Executive".
  3. Observe:
     - the preview already shows "✓ ATS check passed";
     - the primary button changes from "Render this CV" to "Save & render this CV";
     - "Unsaved changes — the preview shows them already." is out of view above;
     - "Save as default" covers the same choice, and "Re-render all in this theme" sits beside them.
  4. Click "Save & render this CV". Observe a JSON log and the button reverting. Nothing says "Executive is now your default theme" or that the new PDF passed.
- **Notes:**
  - P2 and P3 read the greyed-out "Save as default" as unrelated to the theme.
  - P2 did not dare click "Re-render all" because it might overwrite every CV.
  - Users need one clear way to make a design their default, a confirmation in view, and to know what "render all" will change.

### F-020: The cover-letter dialog does not behave as a dialog: focus stays behind it, Tab walks the page first, Escape does nothing
- **Severity:** 3 (T5 passes "only with great difficulty" by keyboard, with 18–160 background stops before the first field)
- **Affected tasks:** T5   **Capabilities:** UI-pipeline-row-cover, UI-pipeline-cover-dialog, UI-pipeline-cover-why, UI-pipeline-cover-problem, UI-pipeline-cover-approach, UI-pipeline-cover-tone, UI-pipeline-cover-submit, UI-pipeline-cover-cancel
- **Found by:** heuristic H-job-detail-05; a11y A-02 (2 methods)
- **Evidence:** app/ux/evidence/A-02.png, app/ux/evidence/H-job-detail-05.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/ and type "Granite" into "Filter company, role, notes…".
  2. Tab to row 6's "Cover" and press Enter. Observe: focus stays on "Cover" behind the scrim, and a screen reader is not told a dialog opened.
  3. Press Escape: nothing happens. Press Tab: 18 dimmed background controls come before "A. Why this role / company?".
  4. "Cancel" does not return focus to "Cover". "Draft and render the letter" moves to Runs with focus on `<body>`.
- **Notes:** Users need the dialog to take focus, keep it until closed, close on Escape, and return them where they were.

### F-021: "1 data issue found" names only the code "row-unparseable", and the affected application silently disappears from the tracker
- **Severity:** 3 (data silently hidden is a trust risk, and P3-T8 followed this alert as a wrong turn; heuristic only, but kept at 3 because the user cannot tell which application is missing)
- **Affected tasks:** T3   **Capabilities:** UI-pipeline-issues, R-pipeline, C-applications-md, UI-pipeline-maint-validate
- **Found by:** heuristic H-broken-state-01 (1 method)
- **Evidence:** app/ux/evidence/H-broken-state-01.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state broken --port 4400`, open http://127.0.0.1:4400/
  2. Click "1 data issue found".
  3. Observe: a single bullet "row-unparseable", with no row number, company or suggested fix. The masthead and table say 40, while `data/applications.md` holds 41 rows (row 57, Quarry Systems, is the malformed one).
- **Notes:** Users need to know which application has a problem and what they can do about it.

### F-022: The Pipeline status select saves on the first arrow key, then drops focus
- **Severity:** 3 (a keyboard user exploring options rewrites tracker statuses unintentionally, which breaks T3's "nothing else should change")
- **Affected tasks:** T3   **Capabilities:** UI-pipeline-status-cell, R-status
- **Found by:** a11y A-04 (1 method)
- **Evidence:** app/ux/evidence/A-04.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/. Tab to the "Evaluated" chip and press Enter.
  2. Tab to row 12's "Status for Cobalt Freight" and press ArrowDown once.
  3. Observe: "Applied" is saved at once, the row leaves the filtered table, and focus is on `<body>`.
- **Notes:** Reaching any later status writes every intermediate one. Keyboard users need to choose a status before it is saved.

### F-023: At narrow widths the Pipeline clips its action columns, and at 320 px every page scrolls sideways with the nav cut off
- **Severity:** 2 (200% zoom passes; the failures are at half-width windows and 400% zoom)
- **Affected tasks:** T2, T3, T4, T5, T6, T7, T8, T9   **Capabilities:** UI-pipeline-row-pdf, UI-pipeline-row-cover, UI-pipeline-row-evaluate, UI-nav-cv, UI-cv-document, UI-cv-voice-text
- **Found by:** heuristic H-global-02; a11y A-10 (2 methods)
- **Evidence:** app/ux/evidence/H-global-02.png, app/ux/evidence/A-10.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/
  2. Resize to 800×900. The "PDF" column and the "Re-evaluate / PDF / Cover" buttons are cut off.
  3. Resize to 320×640 and open `#/cv`. The page is 439 px wide, "CV Studio" is off-screen in the nav, and the CV select and the `voice-dna.md` path overflow.
- **Notes:** P1 works beside an editor in a half-width window. Users need every control reachable at any width.

### F-024: The focus ring is invisible on selected chips in the light scheme
- **Severity:** 2 (affects the first or second Tab stop on every page, but only on selected chips in one scheme)
- **Affected tasks:** T2, T3, T4, T5, T6, T7, T8, T9   **Capabilities:** UI-nav-pipeline, UI-nav-sources, UI-nav-skills, UI-nav-runs, UI-nav-cv, UI-pipeline-status-filter, UI-skills-tab-learn
- **Found by:** a11y A-05 (1 method)
- **Evidence:** app/ux/evidence/A-05.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/ in the light scheme.
  2. Tab to "Evaluated", then press Shift+Tab. "All" is focused but no ring is visible. The same happens on the current nav pill.
- **Notes:** Keyboard users need to see where focus is at all times.

### F-025: No main landmark, no skip link, skipped heading levels, and a page title that never changes
- **Severity:** 2 (screen-reader users cannot jump to content or hear that the page changed; tasks are still completable)
- **Affected tasks:** T2, T3, T4, T5, T6, T7, T8, T9   **Capabilities:** UI-nav-pipeline, UI-nav-sources, UI-nav-skills, UI-nav-runs, UI-nav-cv
- **Found by:** a11y A-13 (1 method)
- **Evidence:** app/ux/evidence/A-13.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/#/skills and list landmarks and headings.
  2. Observe: only `banner` and `navigation`, one h1, and no skip link. The title stays "Job Search Console" on every page.
- **Notes:** Users of assistive technology need page structure and per-page titles.

### F-026: Repeated controls share one name ("Cover" ×41, "Status for Cobalt Freight" ×4, "Not found on your CV" ×16)
- **Severity:** 2 (in a buttons or form-controls list a screen-reader user cannot tell which row they act on)
- **Affected tasks:** T3, T5, T6, T8, T9   **Capabilities:** UI-pipeline-row-evaluate, UI-pipeline-row-pdf, UI-pipeline-row-cover, UI-pipeline-status-cell, UI-skills-status, UI-skills-expand, UI-sources-inbox-evaluate, UI-sources-edit, UI-sources-remove, UI-cv-section-move, UI-cv-section-remove
- **Found by:** a11y A-11 (1 method)
- **Evidence:** app/ux/evidence/A-11.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/#/skills and Tab to the first Status select.
  2. Observe: its name is "Not found on your CV" on every row and never names the skill.
  3. On Pipeline, a buttons list shows "Cover" 41 times. Rows 2, 12, 22 and 32 all expose "Status for Cobalt Freight".
- **Notes:** Users need each control to name the item it acts on.

### F-027: Focus is lost to the page body after most actions
- **Severity:** 2 (Chromium's sequential starting point masks it, but screen readers lose the user's place while they wait for a result)
- **Affected tasks:** T2, T4, T5, T7, T9   **Capabilities:** UI-pipeline-evaluate-now, UI-pipeline-row-pdf, UI-pipeline-cover-submit, UI-sources-scan, UI-cv-voice-save, UI-cv-render
- **Found by:** a11y A-15 (1 method)
- **Evidence:** app/ux/evidence/A-15.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/#/sources
  2. Tab to "Scan now" and press Enter.
  3. Observe: `document.activeElement` is `<body>` and no ring is visible. The same happens after "Evaluate now", row "PDF", "Save voice rules" and "Save & render this CV".
- **Notes:** Users need to stay oriented after acting.

### F-028: Starting a run gives only a short-lived toast; nothing shows progress or completion afterwards, on any page
- **Severity:** 2 (all three T5 personas learned that the PDF was done only by noticing a dot fill or a counter change; tasks still succeeded)
- **Affected tasks:** T2, T5, T8, T9   **Capabilities:** UI-pipeline-row-pdf, UI-global-toast-open-log, UI-nav-runs, R-runs, R-events
- **Found by:** heuristic H-global-04; persona P1-T5-02, P2-T5-02, P3-T5-02, P3-T9-02 (2 methods)
- **Evidence:** app/ux/evidence/H-global-04.png, app/ux/runs/P3-T9/step-05.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/
  2. Type "Granite" in the filter and click "PDF" on row 6. Observe the toast "PDF for Granite Cloud started · Open log". It disappears after 6 s.
  3. Click "Skills", then "Runs". Observe: no running count or indicator on "Runs", the masthead counter is gone off Pipeline, and no completion message appears anywhere.
- **Notes:**
  - P1 also wanted to know, before starting, that the run costs model usage.
  - P3-T9 noted that the toast names only the company.
  - Users need a persistent sign of what is running and a clear "done" that leads to the result.

### F-029: In-app help and messages are written in file names, codes and CLI terms, and say nothing about failures
- **Severity:** 2 (opaque to P2 and P3 on several pages, but none was blocked by help alone)
- **Affected tasks:** T1, T2, T8   **Capabilities:** UI-pipeline-addjob-help, UI-runs-help, UI-sources-issues, UI-pipeline-issues
- **Found by:** heuristic H-pipeline-02, H-runs-03; persona P2-T1-04, P3-T1-04, P3-T8-05 (2 methods)
- **Evidence:** app/ux/evidence/H-pipeline-02.png, app/ux/evidence/H-runs-03.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/
  2. Click "What happens when I click Evaluate now?". It explains `data/pipeline.md`, "a headless Claude Code session" and "/career-ops oferta", gives no cost, and says "stop themselves after 13".
  3. Open "Runs" › "How runs work". It mentions milestones, `JSC_MAX_AGENTS` and log paths. "A restart forgets them all" appears only in passing, and nothing covers why a run fails or how to retry.
- **Notes:** P2's card lists "what it costs" and "why some things take minutes" as unknowns. Users need help written in job-seeker terms that covers failure and cost.

### F-030: An open job detail stays below the table after filtering, even when its row is no longer listed
- **Severity:** 2 (in T5 the labelled "Cover letter" button nearest the Granite rows can belong to another job, and there is no "clear filters")
- **Affected tasks:** T3, T5, T9   **Capabilities:** UI-pipeline-search, UI-pipeline-status-filter, UI-pipeline-open-row, UI-pipeline-detail-pdf, UI-pipeline-detail-cover
- **Found by:** heuristic H-pipeline-06; walkthrough W-T5-01 (2 methods)
- **Evidence:** app/ux/evidence/W-T5-01.png, app/ux/evidence/H-pipeline-06.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/
  2. Click row 1 "Brightwater Health · Full Stack Engineer".
  3. Type "Granite" into "Filter company, role, notes…".
  4. Observe: four Granite Cloud rows, then directly below "Evaluation: Brightwater Health — Full Stack Engineer" with "Regenerate PDF" and "Cover letter".
- **Notes:** Users need the details they see to belong to the jobs they see, and a way back from an empty filter.

### F-031: Several fields have no label, only a placeholder, or a misleading one (axe `select-name`, critical)
- **Severity:** 2 (the unnamed select is optional; the voice textarea's name says "No voice-dna.md yet" when rules exist)
- **Affected tasks:** T4, T7, T9   **Capabilities:** UI-cv-section-add, UI-cv-voice-text, UI-cv-accent, UI-sources-company, UI-sources-since, UI-skills-search
- **Found by:** a11y A-07 (1 method)
- **Evidence:** app/ux/evidence/A-07.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/#/cv
  2. Tab to the select after the section-order buttons. It has no accessible name.
  3. Tab to the voice textarea. Its name is "No voice-dna.md yet. Seed it from upstream's template…", although it holds rules.
  4. On Sources, "Only this company…" and "Last N days" lose their only label once typed into (also noted in H-sources-07).
- **Notes:** Users need every field labelled with what it is.

### F-032: Text inputs, chips and the status select have almost invisible boundaries
- **Severity:** 2 (fails WCAG 1.4.11; the placeholder still signals the URL field)
- **Affected tasks:** T2, T3, T5   **Capabilities:** UI-pipeline-url, UI-pipeline-search, UI-pipeline-status-cell, UI-pipeline-status-filter
- **Found by:** a11y A-14 (1 method)
- **Evidence:** app/ux/evidence/A-14.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/ in the light scheme.
  2. Observe: the URL field's border is 1.31:1 against white (1.42:1 in dark). The row status select is 1.12:1 until hovered.
- **Notes:** Low-vision users need to see where they can type and choose.

### F-033: "PDF" and "PDF ↻" do not say they write a CV tailored to this job, and the same actions carry different labels in the row and the detail
- **Severity:** 2 (P2 and P3 could not tell the CV was tailored, but every persona still found the button)
- **Affected tasks:** T5, T9   **Capabilities:** UI-pipeline-row-pdf, UI-pipeline-row-cover, UI-pipeline-detail-pdf, UI-pipeline-detail-cover, UI-pipeline-detail-tab-cover
- **Found by:** heuristic H-job-detail-03; walkthrough W-T5-02, W-T9-04; persona P2-T5-03, P3-T5-03 (3 methods)
- **Evidence:** app/ux/evidence/W-T5-02.png, app/ux/evidence/H-job-detail-03.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/
  2. Click row 12 (Cobalt Freight / Staff Software Engineer) and scroll to the detail.
  3. Observe:
     - the row says "PDF ↻" and "Cover", the detail says "Regenerate PDF" and "Cover letter";
     - the tab "Cover letter —" does nothing and gives no reason;
     - no label or tooltip uses the words "tailored CV", and "↻" is unexplained.
- **Notes:** P2 saw "standard template" in the run name and doubted the CV was tailored. Users need each action named by what it produces.

### F-034: Submitting a cover letter jumps to the Runs page, whose panel says "Queued" while its table says "Running"
- **Severity:** 2 (the user loses the job's context and sees contradictory states, but all T5 runs completed)
- **Affected tasks:** T5, T8   **Capabilities:** UI-pipeline-cover-submit, UI-runs-open, R-run-events, R-runs
- **Found by:** heuristic H-runs-01; walkthrough W-T5-04; persona P1-T5-03 (3 methods)
- **Evidence:** app/ux/evidence/W-T5-04.png, app/ux/evidence/H-runs-01.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/
  2. Filter "Granite". On row 6 click "Cover", fill A, B and C, choose "Direct …", and click "Draft and render the letter".
  3. Observe (first 3–5 s): the URL is `#/runs/<id>`, the page opens mid-scroll, and the panel reads "Queued — Waiting for a free slot" while the "Running" table lists the same run as "Running".
- **Notes:** P2's fear is "is it stuck?". Users need to stay with the job they are working on, and to see one consistent status.

### F-035: "Add to inbox" sits beside "Evaluate now" and reads as "save this job", but only parks the link on another page
- **Severity:** 2 (two methods predict the wrong choice; 0 of 3 T2 personas made it)
- **Affected tasks:** T2, T8   **Capabilities:** UI-pipeline-add-to-inbox, UI-pipeline-evaluate-now, R-inbox-add, UI-sources-inbox-toggle
- **Found by:** heuristic H-pipeline-09; walkthrough W-T2-01 (2 methods)
- **Evidence:** app/ux/evidence/W-T2-01.png, app/ux/evidence/H-pipeline-09.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/
  2. Paste `https://job-boards.greenhouse.io/lumengrid/jobs/4999999` and click "Add to inbox".
  3. Observe: grey "Added to the inbox." at the far right. Nothing on Pipeline shows the inbox, how many links wait, or where it is (Sources › "Show the inbox").
- **Notes:** Users need to know what each of the two buttons will do with their job, and where parked links go.

### F-036: The "voice rules saved" message appears at the top of the page, out of view; beside the button there is only a file path
- **Severity:** 2 (all three T9 personas could not see whether it saved, and two reloaded to check; the task still succeeded)
- **Affected tasks:** T9, T1   **Capabilities:** UI-cv-voice-save, R-cv-voice-put
- **Found by:** walkthrough W-T9-03; persona P1-T9-01, P2-T9-01, P3-T9-01 (2 methods)
- **Evidence:** app/ux/evidence/W-T9-03.png, app/ux/runs/P3-T9/step-03.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/#/cv
  2. Scroll to "Voice — writing rules" and add "- seamless" under "## Never write".
  3. Click "Save voice rules". Observe: nothing changes in view, and the status beside the button is still the path.
  4. Scroll to the top: "voice-dna.md saved. It applies to the next cover letter or PDF."
- **Notes:** The out-of-view sentence is the only place that says the rules apply to the next PDF (see F-041). Users need confirmation where they clicked, and to be told what happens next.

### F-037: An "ATS check passed" verdict sits beside font advisories and a page count, with no plain answer to "will a recruiter's system read this?"
- **Severity:** 2 (three personas could not tell whether to act on a passing CV; persona-only evidence)
- **Affected tasks:** T5, T7   **Capabilities:** UI-cv-ats-notes, UI-pipeline-detail-tab-pdf, R-cv-preview
- **Found by:** persona P1-T7-04, P2-T7-04, P3-T7-03, P3-T5-04 (1 method)
- **Evidence:** app/ux/runs/P2-T7/step-04.png, app/ux/runs/P3-T5/step-17.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state broken --port 4400`, open http://127.0.0.1:4400/#/cv
  2. Select report 012's CV and click the "Executive" card.
  3. Observe: "✓ ATS check passed · score 90/100 · 2 pages" and "1 advisory note". Open it: a list of font names including `var(--font-family)`, with "prefer Arial…".
  4. On Pipeline, open row 6's "PDF" tab after a PDF run: "ATS check passed · score 85/100", with no reason for the missing points.
- **Notes:** P3: "I wanted a plain yes or no." Users need a clear verdict and to know whether anything needs their action.

### F-038: Row "Re-evaluate" starts a paid agent run in one click, even on rows never evaluated
- **Severity:** 2 (spends money and creates unwanted artefacts; heuristic only)
- **Affected tasks:** T2, T8   **Capabilities:** UI-pipeline-row-evaluate, R-runs-start, UI-pipeline-autopdf
- **Found by:** heuristic H-pipeline-10 (1 method)
- **Evidence:** app/ux/evidence/H-pipeline-10.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/
  2. Scroll to row 40 (Mosaic Retail, Decision "Not evaluated", status "Discarded") and click "Re-evaluate".
  3. Observe: no confirmation. About 10 s later the row moves up with today's date, and a tailored PDF is generated for a discarded job.
- **Notes:** Users need to know an action costs money before starting it, and to be protected from slips among 40 identical button clusters.

### F-039: "Remove" deletes a tracked company immediately, with no confirmation and no undo
- **Severity:** 2 (from 3: heuristic only, no persona hit, and `portals.yml.bak` keeps the previous file)
- **Affected tasks:** T1, T4   **Capabilities:** UI-sources-remove, R-portals-delete, C-portals-yml
- **Found by:** heuristic H-sources-01 (1 method)
- **Evidence:** app/ux/evidence/H-sources-01.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/#/sources
  2. Click "Remove" on "Mosaic Retail".
  3. Observe: the row disappears, "(12)" becomes "(11)", and there is no dialog, message or undo.
- **Notes:** Users need a way back from removing a source by mistake.

### F-040: Inbox items can only be evaluated, not dismissed, and not evaluated in bulk
- **Severity:** 2 (heuristic only; clearing an unwanted posting costs a paid evaluation or a hand edit)
- **Affected tasks:** T4, T8   **Capabilities:** UI-sources-inbox-toggle, UI-sources-inbox-evaluate, UI-sources-inbox-link, R-inbox, U-pipeline
- **Found by:** heuristic H-sources-05 (1 method)
- **Evidence:** app/ux/evidence/H-sources-05.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/#/sources
  2. Click "Show the inbox".
  3. Observe: each of the 13 items has a link and one "Evaluate". There is no dismiss and no "evaluate all".
- **Notes:** P1 used `/career-ops pipeline` to process every pending link. Users need to triage the inbox.

### F-041: CV Studio's "Render this CV" looks like "make a fresh CV" but does not apply new writing rules
- **Severity:** 2 (from 3: walkthrough only, and 0 of 3 T9 personas took this path, since all used Pipeline's "PDF ↻")
- **Affected tasks:** T9, T7   **Capabilities:** UI-cv-render, UI-cv-document, UI-cv-voice-save, UI-pipeline-row-pdf
- **Found by:** walkthrough W-T9-06 (1 method)
- **Evidence:** app/ux/evidence/W-T9-06.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/#/cv
  2. Save new voice rules. At the top, select report 012's CV and click "Render this CV".
  3. Observe: "Render … · Finished · 0:02", "Rendered in … ms · no agent call". The wording is not rewritten, and nothing says that new rules apply only through a new tailored CV.
- **Notes:** Users need to know which action applies their new writing rules.

### F-042: The Voice textarea is the only large text box on the CV page; a pasted CV is saved as writing rules without warning
- **Severity:** 2 (from 3: walkthrough only; all three T1 personas visited CV Studio and none pasted here)
- **Affected tasks:** T1, T9   **Capabilities:** UI-cv-voice-text, UI-cv-voice-save, C-voice-dna-md
- **Found by:** walkthrough W-T1-03 (1 method)
- **Evidence:** app/ux/evidence/W-T1-03.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state empty --port 4400`, open http://127.0.0.1:4400/#/cv
  2. Scroll to "Voice — writing rules", paste the T1 CV text and click "Save voice rules".
  3. Observe: the status changes to a bare path. Pipeline still says "No cv.md in the data directory yet".
- **Notes:** Users need to be able to tell the writing-rules box from a place for their CV (see F-001).

### F-043: "Scan now" is enabled with no sources, and fails with "Run onboarding first", which does not exist in the app
- **Severity:** 2 (from 3: heuristic only; no T1 persona clicked it)
- **Affected tasks:** T1, T4   **Capabilities:** UI-sources-scan, R-runs-start
- **Found by:** heuristic H-empty-state-04 (1 method)
- **Evidence:** app/ux/evidence/H-empty-state-04.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state empty --port 4400`, open http://127.0.0.1:4400/#/sources
  2. Click "Scan now".
  3. Observe: "Scan portals · Failed · exit 1" and "Error: portals.yml not found. Run onboarding first."
- **Notes:** Users need the page's main action to work, or to say what to do first.

### F-044: Report-detail tabs have no tab panels and ignore the arrow keys
- **Severity:** 2 (Tab then Enter still works)
- **Affected tasks:** T2, T5   **Capabilities:** UI-pipeline-detail-tab-report, UI-pipeline-detail-tab-pdf, UI-pipeline-detail-tab-cover
- **Found by:** a11y A-12 (1 method)
- **Evidence:** app/ux/evidence/A-12.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/#/pipeline/12 and focus the "Report" tab.
  2. Press ArrowRight. Nothing happens, and there is no tab panel tied to the tabs.
- **Notes:** Screen-reader users need tabs that behave as announced.

### F-045: The toast's "Open log" vanishes after 6 seconds and is the last Tab stop on the page
- **Severity:** 2 (a keyboard user cannot reach it in time, and it is one of two keyboard routes to a log; see F-005)
- **Affected tasks:** T5, T9   **Capabilities:** UI-global-toast-open-log, UI-global-toast-dismiss
- **Found by:** a11y A-16 (1 method)
- **Evidence:** app/ux/evidence/A-16.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/
  2. Tab to row 1's "PDF ↻" and press Enter.
  3. Observe: "Open log" is Tab stop 189 of 190, and the toast is removed after 6 s.
- **Notes:** Users need time to act on a message.

### F-046: The scan result is the scanner's terminal output, with CLI instructions and temp-file paths; the one error is a log line
- **Severity:** 2 (from 3: all three T4 personas read the right answer from the log, with SEQ 6/7; the cost is effort and jargon, not failure)
- **Affected tasks:** T4   **Capabilities:** UI-sources-scan, R-scan-summary, R-run-events
- **Found by:** heuristic H-sources-06; walkthrough W-T4-02; persona P1-T4-01, P1-T4-02, P2-T4-01, P2-T4-02, P3-T4-01, P3-T4-02 (3 methods)
- **Evidence:** app/ux/evidence/H-sources-06.png, app/ux/runs/P2-T4/step-06.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/#/sources
  2. Click "Scan now".
  3. Observe:
     - box-drawing rules;
     - "⚠️ 1 target(s) unreachable (slug?): Juniper Mobility — run: node verify-portals.mjs";
     - "Results saved to C:\…\Temp\…\data\pipeline.md";
     - "→ Run /career-ops pipeline to evaluate new offers.";
     - a Discord link.
- **Notes:** Users need a plain summary (how many new, which ones, what went wrong and what to do in the app) above the raw log.

### F-047: Changing a status saves instantly and silently, with no undo, and the row vanishes from a filtered view
- **Severity:** 2 (every T3 persona reloaded to confirm the save; all succeeded)
- **Affected tasks:** T3   **Capabilities:** UI-pipeline-status-cell, UI-pipeline-status-filter, R-status
- **Found by:** heuristic H-pipeline-05; walkthrough W-T3-02; persona P1-T3-01, P1-T3-02, P2-T3-01, P3-T3-01 (3 methods)
- **Evidence:** app/ux/evidence/W-T3-02.png, app/ux/runs/P2-T3/step-03.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/
  2. Click "Evaluated 10". In row 12 (Cobalt Freight, Staff Software Engineer), set Status to "Applied".
  3. Observe: "saving…" for about 1 s, then the row disappears and row 13 slides into its place. Only the chip counts change, and there is no message or undo.
- **Notes:** P1 also could not tell what else a status change writes to the tracker. Users need to see that the change was saved and to undo a mistake.

### F-048: The score's scale and meaning are never explained, and the report detail omits the score altogether
- **Severity:** 2 (P2 and P3 asked "is 4.1 good?" and "says who?"; the answer was still reachable from the table)
- **Affected tasks:** T2   **Capabilities:** UI-pipeline-detail-tab-report, R-report, UI-pipeline-score-filter
- **Found by:** heuristic H-job-detail-02; walkthrough W-T2-04; persona P2-T2-02, P3-T2-02 (3 methods)
- **Evidence:** app/ux/evidence/H-job-detail-02.png, app/ux/evidence/W-T2-04.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/#/pipeline/12
  2. Observe: the summary strip shows "Decision Apply · Legitimacy … · Risk … · Confidence … · Next action", and the 4.2 from the table appears nowhere. No text says "out of 5" or what the bands mean.
- **Notes:** Users need the score in the detail, its scale, and how it was reached.

### F-049: Skills' coverage header is pipeline jargon, does not say how many jobs or how fresh, and offers a paid "Read with Claude" as the primary action
- **Severity:** 2 (P3 did not trust the count; the paid button names no cost; T6 still succeeded 3 of 3)
- **Affected tasks:** T6   **Capabilities:** R-skills, UI-skills-fetch, UI-skills-extract, R-skills-extract, UI-skills-help
- **Found by:** heuristic H-skills-02, H-skills-04; walkthrough W-T6-01; persona P3-T6-02 (3 methods)
- **Evidence:** app/ux/evidence/W-T6-01.png, app/ux/evidence/H-skills-04.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/#/skills
  2. Observe:
     - "73 postings · 70 with text (96%) · 30 read by Claude · 40 rules only · 3 could not be read · 41 evaluated";
     - two unlabelled bars;
     - "Fetch posting text" and "Read 40 postings with Claude (4 sessions)" both in solid orange, before the list;
     - no date, and no cost or time estimate.
- **Notes:** Users need to know what the ranking is based on, how current it is, and what improving it would cost.

### F-050: The CV selector lists file slugs and report numbers instead of the job each CV is for
- **Severity:** 2 (P2 could not confirm which of two Cobalt Freight CVs was the Staff role)
- **Affected tasks:** T7   **Capabilities:** UI-cv-document, R-cv-documents
- **Found by:** heuristic H-cv-studio-01; walkthrough W-T7-01; persona P2-T7-02 (3 methods)
- **Evidence:** app/ux/evidence/H-cv-studio-01.png, app/ux/evidence/W-T7-01.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state broken --port 4400`, open http://127.0.0.1:4400/#/cv
  2. Open the "CV" select.
  3. Observe: "Report 012 · cv-alex-rivera-cobaltfreight-012" and "Report 002 · cv-alex-rivera-cobaltfreight-002", with no role names.
- **Notes:** Users need to pick a CV by company and role.

### F-051: After a scan the bold number is the cumulative "17 waiting", and the inbox does not mark which postings are new
- **Severity:** 2 (from 3: the walkthrough predicted a wrong count, but 0 of 3 personas made that error)
- **Affected tasks:** T4   **Capabilities:** R-scan-summary, UI-sources-inbox-toggle, R-inbox
- **Found by:** walkthrough W-T4-03; persona P1-T4-03, P2-T4-04 (2 methods)
- **Evidence:** app/ux/evidence/W-T4-03.png, app/ux/runs/P2-T4/step-05.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/#/sources
  2. Note "13 URL(s) waiting". Click "Scan now".
  3. Observe: the bold number becomes "17", with "4 added" in grey after it. "Show the inbox" lists 17 items with no "new" mark.
- **Notes:** Users need to see what is new since they last looked.

### F-052: "board not found" looks the same before and after a scan, "Last seen" holds a status rather than a date, and the diagnose controls are on another page
- **Severity:** 2 (the answer stays findable; the user cannot tell whether the problem is current or what to do)
- **Affected tasks:** T4   **Capabilities:** R-portals, UI-sources-help, UI-pipeline-maint-probe, UI-pipeline-maint-validate, UI-sources-company, UI-sources-since
- **Found by:** heuristic H-sources-07, H-pipeline-08; walkthrough W-T4-04 (2 methods)
- **Evidence:** app/ux/evidence/W-T4-04.png, app/ux/evidence/H-sources-07.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/#/sources
  2. Note Juniper Mobility's "Last seen": "board not found". Click "Scan now".
  3. Observe: the row is identical, with no date and no fix ("Edit" and "Remove" only). "Probe sources" is in Pipeline's Maintenance bar, next to tracker tools.
- **Notes:** Users need to know when a source last worked and how to fix it from where it is shown.

### F-053: The status "Evaluated" does not read as "not acted on yet", and sits next to a "Decision" column with similar words
- **Severity:** 2 (P2 and P3 hesitated over which rows were untouched; all succeeded)
- **Affected tasks:** T3   **Capabilities:** UI-pipeline-status-filter, UI-pipeline-status-cell
- **Found by:** walkthrough W-T3-01; persona P1-T3-03, P3-T3-02 (2 methods)
- **Evidence:** app/ux/evidence/W-T3-01.png, app/ux/runs/P3-T3/step-01.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/
  2. Look at the chips, then the "Status" and "Decision" columns. Click "Evaluated 10".
  3. Observe: every row has been evaluated, but only 10 carry the status "Evaluated". No tooltip explains it, and "Decision: Apply" competes as a "what to do" signal.
- **Notes:** Users need status names that tell them what they have done.

### F-054: The cover-letter dialog speaks in engine terms, miscounts its own questions, marks nothing required, and does not warn before replacing a letter
- **Severity:** 2 (all personas completed the form, but P3 could not confirm the role)
- **Affected tasks:** T5   **Capabilities:** UI-pipeline-cover-dialog, UI-pipeline-cover-why, UI-pipeline-cover-problem, UI-pipeline-cover-approach, UI-pipeline-cover-tone, UI-pipeline-cover-submit
- **Found by:** heuristic H-job-detail-04; persona P2-T5-04 (2 methods)
- **Evidence:** app/ux/evidence/H-job-detail-04.png, app/ux/runs/P2-T5/step-09.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/
  2. Click row 2 (Cobalt Freight / Site Reliability Engineer), scroll to the detail and click "Cover letter".
  3. Observe:
     - "The cover-letter mode refuses to draft until you have answered these four questions … The session drafts …", although there are three boxes and a select;
     - no field is marked required, and submit is silently disabled;
     - nothing warns that the existing letter will be replaced;
     - "D. Tone" defaults to "Mirror the posting".
- **Notes:** Users need plain instructions, visible requirements, and a warning before overwriting.

### F-055: The Skills table's numbers are unexplained: "22 (12/10)", "Weighted demand", "Strong", "Gaps", a bar and a trend with no axis
- **Severity:** 2 (all three T6 personas had to guess what the numbers mean; all three still answered correctly)
- **Affected tasks:** T6   **Capabilities:** UI-skills-tab-learn, UI-skills-expand, R-skills
- **Found by:** heuristic H-skills-01; persona P1-T6-01, P2-T6-01, P2-T6-02, P3-T6-01 (2 methods)
- **Evidence:** app/ux/evidence/H-skills-01.png, app/ux/runs/P2-T6/step-02.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/#/skills
  2. Read the gRPC row: Postings "23 (12/11)", Strong "3", Gaps "8", a red bar and a sparkline. Hover the headers: no tooltip.
- **Notes:** "(12/11)" is required/nice-to-have, but personas guessed "Claude-read vs rules". Users need the numbers labelled where they read them.

### F-056: "Jobs I'd apply to" gives no visible feedback, and counts mix jobs the user already dismissed
- **Severity:** 2 (the "says who?" control appears not to work; P1 did not know which count to quote)
- **Affected tasks:** T6   **Capabilities:** UI-skills-strong, UI-skills-tab-learn
- **Found by:** walkthrough W-T6-02; persona P1-T6-02, P2-T6-03 (2 methods)
- **Evidence:** app/ux/evidence/W-T6-02.png, app/ux/runs/P2-T6/step-03.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/#/skills
  2. Note gRPC's numbers and "Learn next 16". Tick "Jobs I'd apply to".
  3. Observe: the tab still says 16 and the gRPC row is identical. Lower rows reorder or vanish with no explanation. Expanded evidence does not show the user's own status for each job.
- **Notes:** Users need to see what a filter changed, and whether a count includes jobs they have ruled out.

### F-057: An ATS failure is a wall of 13 bullets that does not lead to the fix, while "Render this CV" stays the primary action
- **Severity:** 2 (all three T7 personas still picked a passing theme)
- **Affected tasks:** T7   **Capabilities:** UI-cv-ats-notes, UI-cv-theme-pick, UI-cv-render, UI-cv-render-all, R-cv-preview
- **Found by:** heuristic H-cv-studio-05, H-broken-state-04; walkthrough W-T7-02 (2 methods)
- **Evidence:** app/ux/evidence/W-T7-02.png, app/ux/evidence/H-cv-studio-05.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state broken --port 4400`, open http://127.0.0.1:4400/#/cv
  2. Observe:
     - "ATS check failed … score 54/100 · 100% of keywords readable", then 13 bullets, eight of them repeating "heading … not in the PDF text";
     - "Render this CV" is still the filled primary button, beside "Re-render all in this theme";
     - "Themes" is two screens down the left column.
- **Notes:** "100% of keywords readable" next to "the name is not in the PDF text" is contradictory. Users need a short diagnosis and a direct route to a passing design.

### F-058: A regenerated PDF looks identical to the old one; nothing says when it was written or under which rules
- **Severity:** 2 (all three T9 personas could not confirm the new CV followed the new rules; the data passed)
- **Affected tasks:** T9   **Capabilities:** UI-pipeline-detail-run-badges, UI-pipeline-detail-tab-pdf, R-report-pdf
- **Found by:** walkthrough W-T9-05; persona P1-T9-02, P2-T9-02, P3-T9-03 (2 methods)
- **Evidence:** app/ux/evidence/W-T9-05.png, app/ux/runs/P1-T9/step-07.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/
  2. Filter "Cobalt", click "PDF ↻" on row 12 and wait about 15 s.
  3. Click row 12 and open the "PDF" tab. Observe: "●" and "PDF ↻" unchanged, badges "Finished" with no time, and only "✓ ATS check passed · score 85/100". No generated-at time and no mention of the writing rules.
- **Notes:** Users need to know that a document is new and what it was made under.

### F-059: A server-side form error on Sources appears at the top of the page, far from the form, and stays after the form is cancelled
- **Severity:** 2 (from 3: heuristic only; T1's form was unreachable for personas)
- **Affected tasks:** T1   **Capabilities:** UI-sources-form-submit, UI-sources-form-cancel, R-portals-create
- **Found by:** heuristic H-sources-03, H-sources-04 (1 method)
- **Evidence:** app/ux/evidence/H-sources-03.png, app/ux/evidence/H-sources-04.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/#/sources
  2. Click "Add", scroll to the form, enter Name `Cobalt Freight` and Careers URL `https://example.com/careers`, and click "Add source".
  3. Observe: nothing changes near the form. "\"Cobalt Freight\" is already listed" appears in a banner about 1,000 px above.
  4. Click "Cancel", then "Scan now". The banner stays.
- **Notes:** Users need errors next to what caused them, and gone once resolved.

### F-060: Unsaved look changes are discarded without warning when the user changes page
- **Severity:** 2 (from 3: heuristic only, no persona lost work, and the lost choice is redoable in one click)
- **Affected tasks:** T7   **Capabilities:** UI-cv-theme-pick, UI-cv-save, UI-nav-pipeline, UI-nav-cv
- **Found by:** heuristic H-cv-studio-04 (1 method)
- **Evidence:** app/ux/evidence/H-cv-studio-04.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/#/cv
  2. Select report 008's CV and click "Modern". The panel reads "Unsaved changes…".
  3. Click "Pipeline", then "CV Studio". Observe: theme back to "Standard", status "Saved.", and no prompt was shown.
- **Notes:** W-T7-03 (merged in F-019) shows how this combines with the green preview. Users need to be warned before losing work.

### F-061: The render log reports pre-set style tokens and a section reorder the user did not ask for
- **Severity:** 2 (one persona; "the app doing something to your files you did not ask for" is P1's give-up condition)
- **Affected tasks:** T7   **Capabilities:** UI-cv-render, C-style-yml, UI-cv-section-add
- **Found by:** persona P1-T7-03 (1 method)
- **Evidence:** app/ux/runs/P1-T7/step-05.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state broken --port 4400`, open http://127.0.0.1:4400/#/cv
  2. Click "Executive", then "Save & render this CV".
  3. Observe the log: "Style applied: --accent-color, --font-family …, sections:summary>experience>…" and "CV section order diverges from cv.md (proceeding, --allow-reorder set)".
- **Notes:** Users need to know which of their saved settings were applied and why.

### F-062: The dedup preview is a raw log keyed by row numbers, and proposes merging distinct postings
- **Severity:** 2 (heuristic only, but a confirmed run rewrites tracker rows, so the preview must be judgeable)
- **Affected tasks:** —   **Capabilities:** UI-pipeline-maint-dedup, UI-pipeline-maint-confirm, UI-pipeline-maint-discard
- **Found by:** heuristic H-pipeline-07 (1 method)
- **Evidence:** app/ux/evidence/H-pipeline-07.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/
  2. Scroll to the bottom and click "Dedup tracker · preview first".
  3. Observe lines such as "🗑️ Remove #34 (Ember Payments — …, 1.5/5) → kept #14 (3.5/5)", then "Run dedup tracker for real" / "Discard". Rows 14 and 34 are different postings.
- **Notes:** Users need to see the actual pairs (dates, URLs) before confirming a merge.

### F-063: Muted text falls just below 4.5:1, including hover and selected states axe cannot see
- **Severity:** 2 (near misses, all at least 4.29:1)
- **Affected tasks:** —   **Capabilities:** UI-nav-pipeline, UI-pipeline-status-filter, UI-pipeline-addjob-help, UI-runs-help
- **Found by:** a11y A-09 (1 method; axe `color-contrast`, serious)
- **Evidence:** app/ux/evidence/A-09.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state broken --port 4400`, open http://127.0.0.1:4400/#/runs in the light scheme.
  2. Observe: inactive nav tabs and table headers are `#78716c` on `#f4f2f0`, 4.29:1. On Pipeline a hovered row drops to 4.30:1, and its score to 4.49:1.
- **Notes:** Low-vision users need all text at AA contrast.

### F-064: Changing page keeps the previous page's scroll position
- **Severity:** 1 (from 2: heuristic only; users land mid-page but recover by scrolling)
- **Affected tasks:** T4, T5, T8   **Capabilities:** UI-nav-pipeline, UI-nav-sources, UI-nav-skills, UI-nav-runs, UI-nav-cv
- **Found by:** heuristic H-global-03 (1 method)
- **Evidence:** app/ux/evidence/H-global-03.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/
  2. Scroll Pipeline down two screens and click "Runs".
  3. Observe: Runs opens mid-way through "Finished", with the heading and open-run panel above the fold.
- **Notes:** Users need each page to open at its top.

### F-065: Run logs show prompt internals, tool names, costs and JSON
- **Severity:** 1 (persona-only, each rated 1; the logs are secondary to the outcome, see F-018 and F-046)
- **Affected tasks:** T2, T5, T7   **Capabilities:** R-run-events, UI-runs-open, UI-cv-render
- **Found by:** persona P3-T2-03, P3-T5-05, P3-T7-04 (1 method)
- **Evidence:** app/ux/runs/P3-T2/step-05.png, app/ux/runs/P3-T5/step-12.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/
  2. Paste `https://job-boards.greenhouse.io/kestrelmedia/jobs/4134913` and click "Evaluate now".
  3. Observe log lines "Prompt: language + modes/_shared.md + …", "WebFetch", "$0.05". A CV render's log is a JSON object with temp paths.
- **Notes:** Users need progress described in their terms (also in H-pipeline-03, merged in F-009).

### F-066: Automatic follow-on runs (the tailored PDF, a reused report number) start without the user realising they asked for them
- **Severity:** 1 (persona-only; the "PDF if score ≥ 3.5" box is visible but pre-ticked)
- **Affected tasks:** T2, T8   **Capabilities:** UI-pipeline-autopdf, K-pdf
- **Found by:** persona P3-T2-04, P2-T8-05 (1 method)
- **Evidence:** app/ux/runs/P3-T2/step-01.png, app/ux/runs/P2-T8/step-06.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/
  2. Paste a posting URL and click "Evaluate now" without touching the checkbox.
  3. Observe: the PDF count rises after the run, and nothing beside "Evaluate now" said a PDF would follow.
- **Notes:** Users need to know what an action will set off before they start it.

### F-067: A malformed URL silently keeps both add-job buttons disabled, and the disabled "Evaluate now" looks enabled
- **Severity:** 1 (from 2: heuristic only; every persona pasted a valid URL)
- **Affected tasks:** T2   **Capabilities:** UI-pipeline-url, UI-pipeline-evaluate-now, UI-pipeline-add-to-inbox
- **Found by:** heuristic H-pipeline-01 (1 method)
- **Evidence:** app/ux/evidence/H-pipeline-01.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/
  2. Type `not a url` into "Paste a job posting URL…".
  3. Observe: both buttons stay disabled, with no message or tooltip. "Evaluate now" keeps a pale orange fill.
- **Notes:** Users need to be told why they cannot proceed.

### F-068: "Add" opens the source form at the very bottom of the page, with every advanced field shown
- **Severity:** 1 (from 2: heuristic only; on T1's path only once F-004 is fixed)
- **Affected tasks:** T1   **Capabilities:** UI-sources-add-company, UI-sources-form-name, UI-sources-form-careers-url, UI-sources-form-provider, UI-sources-form-api, UI-sources-form-scan-method, UI-sources-form-query
- **Found by:** heuristic H-sources-02 (1 method)
- **Evidence:** app/ux/evidence/H-sources-02.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/#/sources
  2. Click "Add" next to "Tracked companies (12)".
  3. Observe: nothing visible changes. The form is below "Job boards" and shows eight fields, including about 80 provider ids.
- **Notes:** Users need the common case (name and careers URL) first.

### F-069: Changing a skill's status makes it vanish after a delay, with no confirmation or undo
- **Severity:** 1 (from 2: heuristic only; no T6 persona changed a status)
- **Affected tasks:** T6   **Capabilities:** UI-skills-status, R-skills-overrides, UI-skills-reset
- **Found by:** heuristic H-skills-03 (1 method)
- **Evidence:** app/ux/evidence/H-skills-03.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/#/skills
  2. On the first row (gRPC), set Status to "Have".
  3. Observe: after 1–2 s gRPC disappears and "Learn next 16" becomes 15, with no message.
- **Notes:** Users need to see where the item went and how to undo the change.

### F-070: Switching CV keeps the previous CV's preview and ATS verdict on screen while the new one renders
- **Severity:** 1 (from 2: heuristic only; lasts about a second)
- **Affected tasks:** T7   **Capabilities:** UI-cv-document, R-cv-preview, R-cv-preview-pdf
- **Found by:** heuristic H-cv-studio-02 (1 method)
- **Evidence:** app/ux/evidence/H-cv-studio-02.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/#/cv
  2. Select report 012's CV, then immediately report 008's.
  3. Observe: "Rendering…" in small grey text, while the ATS box and the PDF still show report 012.
- **Notes:** Users need to know when what they see is out of date.

### F-071: On an empty workspace Skills' disabled button reads like a success: "Everything read by Claude"
- **Severity:** 1 (from 2: heuristic only; empty state only)
- **Affected tasks:** T6   **Capabilities:** UI-skills-extract, UI-skills-fetch
- **Found by:** heuristic H-empty-state-05 (1 method)
- **Evidence:** app/ux/evidence/H-empty-state-05.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state empty --port 4400`, open http://127.0.0.1:4400/#/skills
  2. Observe: "0 postings …", an enabled "Fetch posting text" with nothing to fetch, and a disabled "Everything read by Claude".
- **Notes:** Users need empty states that say what to do first.

### F-072: Nothing on the landing page or in the nav points to "check for new openings"
- **Severity:** 1 (from 2: walkthrough only; all three T4 personas guessed "Sources" in one click)
- **Affected tasks:** T4   **Capabilities:** UI-nav-sources, UI-sources-scan, UI-pipeline-maint-validate, UI-pipeline-maint-probe
- **Found by:** walkthrough W-T4-01 (1 method)
- **Evidence:** app/ux/evidence/W-T4-01.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/
  2. Observe: no mention of new openings, waiting links or the last scan date. The only company-related controls are "Validate sources" and "Probe sources" at the bottom.
- **Notes:** Users need a visible route to "what's new".

### F-073: The writing-rules editor is two screens below a page that is otherwise about looks
- **Severity:** 1 (from 2: walkthrough only; all three T9 personas found it)
- **Affected tasks:** T9   **Capabilities:** UI-nav-cv, UI-cv-voice-text
- **Found by:** walkthrough W-T9-01 (1 method)
- **Evidence:** app/ux/evidence/W-T9-01.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/
  2. Click "CV Studio".
  3. Observe: the first screen shows only the CV select, look tokens, themes and preview. "Voice" appears only after scrolling past them.
- **Notes:** Users need to find wording controls where they think of wording.

### F-074: The scan summary's dates and company counts disagree, and do not mention the paused company
- **Severity:** 1 (persona-only; small trust cost)
- **Affected tasks:** T4   **Capabilities:** R-scan-summary, UI-sources-scan
- **Found by:** persona P1-T4-04, P2-T4-03, P3-T4-04 (1 method)
- **Evidence:** app/ux/runs/P1-T4/step-04.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/#/sources
  2. Click "Scan now".
  3. Observe: the panel heading says "Portal Scan - 2026-10-04" while the summary line says "last scan 2026-10-05". "Scanning 11 companies" against "Tracked companies (12)" has no stated reason (Kestrel Media is paused).
- **Notes:** Users need one consistent date, and to be told why a company was skipped.

### F-075: A status change cannot record when the user applied, and rows for the same company are hard to tell apart
- **Severity:** 1 (persona-only)
- **Affected tasks:** T3   **Capabilities:** UI-pipeline-status-cell, R-status, C-status-log
- **Found by:** persona P2-T3-02 (1 method)
- **Evidence:** app/ux/runs/P2-T3/step-01.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/
  2. Set row 12's Status to "Applied".
  3. Observe: no date or note is asked for or shown. Cobalt Freight and Driftwood Analytics each have four rows, distinguished only by "#" and role.
- **Notes:** T3 says "yesterday you sent applications". Users need to record when.

### F-076: Small action buttons inside a clickable row are easy to miss; a click on the row opens the detail instead
- **Severity:** 1 (persona-only; cost one step)
- **Affected tasks:** T9   **Capabilities:** UI-pipeline-open-row, UI-pipeline-row-pdf
- **Found by:** persona P1-T9-03 (1 method)
- **Evidence:** app/ux/runs/P1-T9/step-04.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/
  2. On row 12, click just beside "PDF ↻".
  3. Observe: the row opens its detail (below the table) instead of starting the PDF.
- **Notes:** Users need clear targets.

### F-077: A skill's evidence list mixes scored and unscored postings, and its "flagged as a gap in report …" list is shorter than the posting count, unexplained
- **Severity:** 1 (persona-only)
- **Affected tasks:** T6   **Capabilities:** UI-skills-expand, UI-skills-evidence-report
- **Found by:** persona P3-T6-03 (1 method)
- **Evidence:** app/ux/runs/P3-T6/step-05.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/#/skills
  2. Click "▸ gRPC".
  3. Observe: "22 postings ask for gRPC · flagged as a gap in report 009, 011, …" lists 8 reports. Rule-read postings show a date but no score.
- **Notes:** Users need the evidence list to explain itself.

### F-078: "Learn next" ranks by raw demand only, with nothing relating a skill to the direction the user wants
- **Severity:** 1 (persona-only; the task's answer was still found)
- **Affected tasks:** T6   **Capabilities:** UI-skills-tab-learn, R-skills
- **Found by:** persona P3-T6-04 (1 method)
- **Evidence:** app/ux/runs/P3-T6/step-03.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/#/skills
  2. Observe: gRPC ranks first. "Machine Learning", the career-changer's goal, is fourth, and nothing connects the ranking to target roles.
- **Notes:** P3 had to weigh the list against their goal alone. Users need to judge relevance to the move they want.

### F-079: Adding a banned word means editing the whole free-text rules file
- **Severity:** 1 (persona-only; all three succeeded, but felt the risk of losing rules)
- **Affected tasks:** T9   **Capabilities:** UI-cv-voice-text, C-voice-dna-md
- **Found by:** persona P2-T9-03, P3-T9-04 (1 method)
- **Evidence:** app/ux/runs/P2-T9/step-01.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/#/cv
  2. Scroll to "Voice — writing rules".
  3. Observe: one raw markdown textarea, with no "add a word" control.
- **Notes:** Users need to add a rule without risking the others. This does not need a new file format (§12.7).

---

## Out of scope

Recorded, not ranked, because they conflict with PROJECT_PLAN.md §9.1 (human in the loop) or §12.7 (no file-format or upstream changes for UX).

| Raised in | What was asked for | Why out of scope |
|---|---|---|
| P2-T5-01 (friend summary: "how to get them into an email") | A way to send the CV and letter by email from the app | §9.1 and §12.7: the console never emails or applies for the user. Opening and downloading the files stays in scope as F-011. |
| W-T8-06 | Changing how an evaluation of an already-tracked company and role is folded into the existing row | The folding is upstream `merge-tracker` behaviour over the tracker's data contract. §12.7: "A better UX is never a reason to change a file format", and §4 keeps upstream paths untouched. The missing notice is in scope as F-015. |

## Not a problem (severity 0)

| Raised in | What was raised | Why rejected |
|---|---|---|
| P1-T2-01 | Report body is placeholder text ("A fixture report written by fake-claude.js") and the log names the model "fake-claude" | Sandbox artefact of the fake CLI, fixed in the fake before later runs. Not UI behaviour. |
| P1-T5 run | The cover letter P1-T5 produced was placeholder bytes | Sandbox artefact, fixed before P2-T5. The UI showed what the fake wrote. |
| P1-T2, P3-T2, P2-T5, P2-T9 (moments of confusion) | Evaluations finish in about 8 s, which felt "too quick to trust" | The fake agent's `--delay 8000`. Real evaluations take minutes. The waiting experience is a separate question (F-028). |
| `heuristics/cv-studio.md` (sandbox note) | The fake's "Ada Lovelace" payload became the default CV in CV Studio and failed ATS everywhere | Fixture artefact, fixed. The evaluator checked findings on the seeded CVs. |
| W-T8-06 as a T8 blocker | The retry merged into row 21, so T8's "new row" criterion could not be met | The seed collision (failing posting same company and role as row 21) was fixed: T8 now fails on Driftwood Analytics, Data Engineer. The missing merge notice is kept as F-015, without the blocker weight. |
| P3-T4-03 | "Scan now" adds postings with no confirmation and finishes instantly | Adding new postings to the inbox is the scan's purpose, and "Preview only" sits beside the button. The instant finish comes from the sandbox's offline boards. |
| P3-T7-06 | Cover letter and "Re-render all" not verified | The tester's note of what it did not exercise, not a problem in the UI. |
