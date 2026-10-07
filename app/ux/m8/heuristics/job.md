# Heuristic evaluation (M8): One job (`#/applications/:id`)

Spec: `app/ux/design/ia.md` §2.3. Pages evaluated: `#/applications/12` (Cobalt Freight — Staff
Software Engineer) and `#/applications/6` (Granite Cloud — Software Engineer, Payments) in
POPULATED (`:4401`) and BROKEN (`:4403`), plus `#/applications/41` in BROKEN after the retry.
1280×800. Evaluator: heuristic-evaluator, 2026-10-07.

**Dark scheme: not exercised** (no way to switch `prefers-color-scheme` with the available
tools). The red "Fails screening" text was judged in the light scheme only.

## 1. Visibility of system status

### H8-job-01: "Check fit again" makes the job's tailored CV disappear from the app
- **Severity:** 4
- **Where:** One job › Summary › **Check fit again** (also Applications › row **Actions** › **Check fit again**) › Documents › Tailored CV
- **Tasks:** T2, T5, T7, T9
- **Capabilities:** R-runs-start (evaluate), R-report, R-report-pdf, R-cv-documents, UI-job-status
- **Method:** heuristic (H1 Visibility of system status; H5 Error prevention)
- **Evidence:** app/ux/m8/evidence/H8-job-01.png (after the check, POPULATED); app/ux/m8/evidence/H8-job-01-before.png (the same job before any re-check, BROKEN, CV **Ready**); app/ux/m8/evidence/H8-job-01-writing-rules.png (My CV › Writing rules now lists 5 tailored CVs, #12 missing)
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4401`, open http://127.0.0.1:4401/#/applications/12
  2. Before: Documents › Tailored CV is **Ready** ("cv-alex-rivera-cobaltfreight-012-2026-08-25.pdf · Made Oct 6 … · Open · Download · Make it again"); the top-bar search for "cobalt" lists "Document · Tailored CV · Cobalt Freight — Staff Software Engineer"; My CV › Writing rules lists #12 among its tailored CVs.
  3. Click **Check fit again** (beside "About 2–5 min · uses your Claude plan"); wait ~10 s.
  4. Observe on the job page: a blue "Updated · Merged into your application #12 …: fit 4.2 → 4.1 … It was first added Oct 7"; Documents › Tailored CV now reads **Not made yet** with **Make tailored CV**; History shows only "Check fit … done, Oct 7" and "Oct 7 · added to Applications · now Reviewed — not applied".
  5. Observe elsewhere: Applications row 12's Documents is "—"; search "cobalt" no longer offers the Tailored CV document; My CV › Writing rules says "Your tailored CVs (5)" without #12; Design still says "Update existing CVs to this design (6)".
- **Notes:** the user asked only for a fresh fit score. Without warning, the CV they may already
  have sent is no longer reachable from the job, from search or from Writing rules, and the
  job's history now claims it was "first added Oct 7" (it was checked Aug 25). Whether the PDF
  is still on disk cannot be told from the screen, and that is the problem: P2 believes it is
  gone, P1 must go to the folder. T7 and T9 both aim at this exact CV (Cobalt Freight #12), so
  a user who re-checks first cannot finish them as the tasks expect. Keep documents attached
  across a re-check, or say before the check what will happen to them.

## 2. Match between system and the real world

### H8-job-03: Machine-written notes are shown as "Your note"
- **Severity:** 2
- **Where:** One job › Summary › "Your note"
- **Tasks:** T2
- **Capabilities:** R-report, R-pipeline
- **Method:** heuristic (H2 Match between system and the real world)
- **Evidence:** app/ux/m8/evidence/H8-job-01.png; app/ux/m8/evidence/H8-job-02-auto-cv.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4401`, run H8-job-01 steps 1–3.
  2. Observe: "Your note: Re-eval 2026-10-07 (4.2→4.1) — Superseded report [12] (was 4.2/5): Fixture evaluation".
  3. `node app/ux/sandbox.mjs --state broken --port 4403`; on Today click **Try again** on the failed check, then open http://127.0.0.1:4403/#/applications/41: "Your note: Fixture evaluation".
- **Notes:** the user wrote none of this. ia.md §2.1: notes are shown as notes, never parsed;
  equally, the engine's bookkeeping should not be presented as the user's words.

## 3. User control and freedom

No issues found. Checked: **Write cover letter** opens an inline form with **Cancel**; the
status select offers Undo; **← Applications** returns to the list.

## 4. Consistency and standards

### H8-job-04: The cover-letter card hides the time and cost that the CV card states
- **Severity:** 1
- **Where:** One job › Documents › Cover letter › **Write cover letter**
- **Tasks:** T5
- **Capabilities:** UI-pipeline-detail-cover, R-runs-start (cover)
- **Method:** heuristic (H4 Consistency and standards)
- **Evidence:** app/ux/m8/evidence/H8-job-02.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4401`, open http://127.0.0.1:4401/#/applications/6
  2. Compare the two Documents cards.
  3. Observe: Tailored CV says "About 3 min · uses your Claude plan" under its button; Cover letter says only "A one-page letter for this role from three short answers." The opened form gives no time or cost next to **Write the letter** either.
- **Notes:** ia.md §3: every assistant action states time and cost beside the button.

## 5. Error prevention

### H8-job-02: "Make tailored CV" uses a design that fails screening, with no warning on the job page
- **Severity:** 3
- **Where:** One job › Documents › Tailored CV › **Make tailored CV** / **Make it again**; automatic CV after a fit check
- **Tasks:** T5, T7, T8
- **Capabilities:** R-runs-start (pdf), R-cv-style-get, R-cv-design-check
- **Method:** heuristic (H5 Error prevention)
- **Evidence:** app/ux/m8/evidence/H8-job-02.png; app/ux/m8/evidence/H8-job-02-auto-cv.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state broken --port 4403`, open http://127.0.0.1:4403/#/applications/6
  2. Observe: Tailored CV "Your CV rewritten for this role, in your design (broken). About 3 min · uses your Claude plan · **Make tailored CV**", with no mention that this design fails the screening check.
  3. Go to Today, click **Try again** on the failed Driftwood Analytics check, wait for it to finish, then open http://127.0.0.1:4403/#/applications/41.
  4. Observe: the check also made a tailored CV automatically (Activity: "then: made the tailored CV"), and the job page shows it as **Fails screening** — "an applicant-tracking system will lose part of this CV".
- **Notes:** the warning exists on Today and after the fact on the document, but not at the
  button that spends three minutes of the Claude plan producing an unusable file. Warn beside
  the button ("Your design fails the screening check · Choose a design that passes"), and do not
  make automatic CVs in a failing design. M6 H-broken-state-05 is only partly fixed.

## 6. Recognition rather than recall

No issues found. The header carries "Fit 4.1 / 5 · Recommendation: Apply", status and **Open
the posting ↗**; a ready CV shows file name, date, design, writing-rules state ("written before
your writing rules changed (Oct 6)") and the screening verdict.

## 7. Flexibility and efficiency of use

No issues found. Today's "Get documents ready" deep-links straight to `#documents`; each job
has a stable URL; **I've sent my application** sets Applied with a date.

## 8. Aesthetic and minimalist design

No issues found. Summary, Documents (two cards), Fit report (A–F rendered, with a plain-words
lead-in), History, in that order.

## 9. Help users recognize, diagnose, and recover from errors

No new issues. Empty cover-letter answers get one inline error per field ("Say why you want
this role.", "Say what problem you would solve for them.", "Say how you would start."); a
failing CV says what is lost and links **Choose a design that passes**.

## 10. Help and documentation

No issues found. "How the fit is worked out" and "What the app never does" are linked in place.

## Strengths

- The job is a page of its own with a URL, not a panel under the table (fixes H-job-detail-01).
- The score leads the page, with its meaning one click away (fixes H-job-detail-02).
- Documents are cards that say which file, made when, in which design, under which writing
  rules, and whether screening systems can read it (fixes H-job-detail-06).
- The cover-letter questions are plain, counted correctly, inline and cancellable (fixes
  H-job-detail-04 and -05).

## M6 findings re-checked (H-job-detail-*)

| M6 ID | M6 problem | Status in M8 | Note |
|---|---|---|---|
| H-job-detail-01 | Detail opens below the table, out of sight | **Fixed** | Own page. |
| H-job-detail-02 | Report detail never shows the score | **Fixed** | "Fit 4.1 / 5" in the header and atop the report. |
| H-job-detail-03 | Same actions with different labels; dash tab silently disabled | **Fixed** | Labels match between row menu and page; no tabs. |
| H-job-detail-04 | Cover dialog speaks engine terms, miscounts questions | **Fixed** | Three plain required questions plus Tone. |
| H-job-detail-05 | Escape doesn't close cover dialog; submit leaves page | **Fixed** | Inline form with Cancel. |
| H-job-detail-06 | ATS-failing PDF shown as done everywhere but its tab | **Fixed** | "Fails screening" badge and red verdict on the card. |
