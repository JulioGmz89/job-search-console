# Heuristic evaluation (M8): Today (`#/today`)

Spec: `app/ux/design/ia.md` §2.1. Day one evaluated in EMPTY (`:4402`); every day in
POPULATED (`:4401`) and BROKEN (`:4403`). 1280×800. Evaluator: heuristic-evaluator, 2026-10-07.

**Dark scheme: not exercised** (no way to switch `prefers-color-scheme` with the available
tools). The red / green card borders were judged in the light scheme only.

## 1. Visibility of system status

### H8-today-02: "Check for new openings" reports "Every board answered" when no company was checked
- **Severity:** 3
- **Where:** Today › Just finished › "Check for new openings" card
- **Tasks:** T1, first-job, T4
- **Capabilities:** R-runs-start (scan), R-scan-summary, UI-shell-nav-to-review
- **Method:** heuristic (H1 Visibility of system status)
- **Evidence:** app/ux/m8/evidence/H8-today-02.png (also H8-to-review-01.png, H8-companies-03.png)
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state empty --port 4402`, open http://127.0.0.1:4402/
  2. **Add your CV**: paste any CV with a `#` name line → **Save my CV**.
  3. **Follow a company**: **Company name** "Kestrel Media", **Careers page link** `https://kestrelmedia.example.com/careers` → **Follow company**.
  4. On the "You're set up" screen, click **Check for new openings**.
  5. Observe: a green "Done · Check for new openings · No new openings this time. Every board answered." To review, for the same run, says "0 companies checked", and Companies still shows Kestrel Media as "Not checked yet".
- **Notes:** the user's only company was never checked, yet Today tells them all is well and
  nothing is new. They will wait for openings that can never arrive. Say "Kestrel Media couldn't
  be checked: its link is a careers page the app can't read. Fix in Companies."

### H8-today-04: After "Try again" succeeds, the card the user acted on vanishes and the result appears below the fold
- **Severity:** 2
- **Where:** Today › Needs you › "Check fit · Driftwood Analytics — Data Engineer" › **Try again**
- **Tasks:** T8
- **Capabilities:** R-run-retry, UI-shell-panel-see-all
- **Method:** heuristic (H1 Visibility of system status)
- **Evidence:** app/ux/m8/evidence/H8-today-04.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state broken --port 4403`, open http://127.0.0.1:4403/ and wait for Today to load.
  2. In the first card ("Failed · Check fit · Driftwood Analytics — Data Engineer") click **Try again**. The card shows "Tried again: still working."
  3. Wait about 10–30 s without scrolling.
  4. Observe: the card disappears from the top of Needs you; the viewport now starts with "1 application could not be read". The success ("Done · Driftwood Analytics — Data Engineer · Fit 4.1 / 5 · Open the job") is in a new "Just finished" section below the three remaining red cards, out of view.
- **Notes:** ia.md §3 says "Done or failed updates the same spot". The user who clicked Try
  again sees their card vanish and must scroll to learn whether it worked (the Activity button
  does change to "1 done"). Keep the card in place with "Tried again: that worked · Open the job".

### H8-today-06: Today shows only "Loading…" for about four seconds on every full load
- **Severity:** 1
- **Where:** Today › page body
- **Tasks:** all
- **Capabilities:** R-today-get
- **Method:** heuristic (H1 Visibility of system status)
- **Evidence:** app/ux/m8/evidence/H8-today-06.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4401`, open http://127.0.0.1:4401/#/today (or reload it).
  2. Observe: "Today · Loading…" for roughly 3–4 s in all three sandboxes before any card appears.
- **Notes:** it is the landing page; four seconds of nothing on every visit is noticeable. Show
  the cards that are ready (set-up state, applications) and fill in slower ones.

## 2. Match between system and the real world

### H8-today-03: The screening-failure card uses the design's file name "broken" and checker wording
- **Severity:** 2
- **Where:** Today › Needs you › "Your CV design fails the screening check"
- **Tasks:** T7
- **Capabilities:** R-cv-design-check, R-cv-style-get
- **Method:** heuristic (H2 Match between system and the real world)
- **Evidence:** app/ux/m8/evidence/H8-today-03.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state broken --port 4403`, open http://127.0.0.1:4403/
  2. Read the third red card.
  3. Observe: "Tailored CVs made with the "broken" design lose text when an applicant-tracking system reads them: No email address found. ATS and recruiters need a parseable contact email in the body of the CV."
- **Notes:** "broken" is the sandbox theme's id, but any user-made theme will show its slug here.
  "ATS" and "parseable" are the checker's words, pasted mid-sentence after a colon. ia.md asks for
  "the name and 3 headings are lost"-style plain words.

## 3. User control and freedom

No issues found. Checked: **Got it** dismisses the set-up summary and Just finished cards;
**Dismiss** sits under the failed card (see H8-today-07 for its placement); set-up never blocks
the other pages (Applications, To review and Skills show their own empty states in EMPTY).

## 4. Consistency and standards

### H8-today-07: The failed-check card is built differently from every other Needs-you card
- **Severity:** 1
- **Where:** Today › Needs you › failed check card › **Dismiss**
- **Tasks:** T8
- **Capabilities:** UI-today-dismiss (Today card dismiss)
- **Method:** heuristic (H4 Consistency and standards)
- **Evidence:** app/ux/m8/evidence/H8-today-03.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state broken --port 4403`, open http://127.0.0.1:4403/
  2. Compare the first card with the three below it.
  3. Observe: its "Needs you · A fit check didn't finish" label sits outside the box, the body is the Activity row (badge, timestamp, link title), and **Dismiss** floats under the card's border; the other cards have the label inside, a heading, a sentence and one button inside.
- **Notes:** cosmetic, but it makes **Dismiss** look like it belongs to the next card.

## 5. Error prevention

### H8-today-01: "Follow a company" accepts a link the app cannot check and declares set-up complete
- **Severity:** 3
- **Where:** Today › Get set up › 2 Follow a company › **Follow company**
- **Tasks:** T1, first-job
- **Capabilities:** R-portals-create, UI-today-setup-follow
- **Method:** heuristic (H5 Error prevention)
- **Evidence:** app/ux/m8/evidence/H8-today-01.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state empty --port 4402`, open http://127.0.0.1:4402/
  2. Save any CV in step 1.
  3. Step 2: **Company name** "Kestrel Media", **Careers page link** `https://kestrelmedia.example.com/careers` → **Follow company**.
  4. Observe: "Set-up complete · You're set up · ✓ Following Kestrel Media · Companies you follow". No board type, no "N open roles", no warning. Companies later labels it "Careers page (kestrelmedia.example.com) · Not checked yet".
- **Notes:** ia.md §2.1 specifies "Following Kestrel Media · Greenhouse job board found · 6 open
  roles or, on failure, the problem and the fix". A first-timer (P2) who pastes the company's
  marketing careers page, not its Greenhouse board, is told they are done; together with
  H8-today-02 nothing ever tells them the company is not being watched.

## 6. Recognition rather than recall

No issues found. Checked: the set-up summary repeats what was saved ("Your CV: Alex Rivera ·
Summary, Experience (1 role), Skills · Edit in My CV"); "Waiting for you" names each job and
what is missing ("Interviewing · no cover letter"); "10 jobs reviewed but not applied" names
the best three with fit.

## 7. Flexibility and efficiency of use

### H8-today-05: The "Just finished" card for a re-check does not say what changed
- **Severity:** 2
- **Where:** Today › Just finished › "Cobalt Freight — Staff Software Engineer · Fit 4.1 / 5"
- **Tasks:** T2
- **Capabilities:** R-runs, UI-today-just-finished
- **Method:** heuristic (H7 Flexibility and efficiency of use)
- **Evidence:** app/ux/m8/evidence/H8-today-05.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4401`, open http://127.0.0.1:4401/#/applications
  2. Row 12 › **Actions for Cobalt Freight — Staff Software Engineer** › **Check fit again**; wait ~10 s.
  3. Open **Today**.
  4. Observe: "Done · Cobalt Freight — Staff Software Engineer · Fit 4.1 / 5 · Recommendation: Apply · Open the job". Nothing says the fit dropped from 4.2, that the row was updated rather than added, or that its tailored CV is no longer attached (see H8-job-01).
- **Notes:** ia.md §3 "Merged results": badge **Updated** and a sentence on what changed. The job
  page has that sentence; the summary the user actually sees first does not.

## 8. Aesthetic and minimalist design

No issues found. Checked the fixed group order (Needs you, Just finished, New since you last
looked, Waiting for you), that empty groups are hidden, and that each card has one primary
action. (During an earlier scan, the same four openings were listed both in "Just finished"
and in "New since you last looked" with differently worded buttons, "See the 4 new openings" and
"Look at the 4 new openings"; this could not be reproduced for a screenshot once the openings
had been seen, so it is noted here, not ranked.)

## 9. Help users recognize, diagnose, and recover from errors

No new issues beyond H8-today-02/03. Checked in BROKEN: the failed check says **What happened**
("stopped before writing the fit report… usually temporary") and **What to do** ("Try again…
uses your Claude plan again") with **Try again** and **Open the posting ↗**; the data problem
names the row ("Quarry Systems #57: it has 9 columns instead of 10") and links **Show me**.
Empty set-up fields give inline errors ("Paste your CV first, or choose a file.", "Type the
company name.", "Paste the careers page link, starting with https://").

## 10. Help and documentation

No issues found. "What a check costs" and "What the screening check is" link to Help topics
from the cards that need them.

## Strengths

- Day one is now a working set-up, not a dead end: paste a CV, follow a company, see the AI
  assistant ticked, then **Check your first job** in place (fixes H-empty-state-01 and -03).
- Every card is backed by real data and leads to its home (Fix Juniper Mobility → Companies,
  Show me → Workspace › Data health, Review them → Applications filtered).
- Failures speak in plain words with a retry beside them; the failed check is on Today, not
  only on the Activity page (fixes H-broken-state-06).

## M6 findings re-checked

| M6 ID | M6 problem | Status in M8 | Note |
|---|---|---|---|
| H-empty-state-01 | First screen says what is missing but offers no way to provide it | **Fixed** | Get set up, three steps in place. |
| H-empty-state-02 | Tracker issue tells user to run an evaluation that the missing CV blocks | **Fixed** | No such card in EMPTY. |
| H-empty-state-03 | "Add a company" while Add is disabled | **Fixed** | Follow a company works on day one and creates the list. (New: H8-today-01.) |
| H-empty-state-04 | Scan enabled with no sources, fails with "Run onboarding first" | **Not re-tested** | EMPTY was set up before the scan was tried; with one company the scan ran (see H8-today-02). |
| H-broken-state-06 | Failed evaluation visible only on Runs | **Fixed** | Needs you card on Today, red Activity button. |
| H-broken-state-02 | Failed run in engine terms, hides URL, no retry | **Fixed** | What happened / What to do / Try again / Open the posting. |
| H-broken-state-01 | "1 data issue found" names only a code; row disappears | **Fixed** | "Quarry Systems #57: it has 9 columns instead of 10…" and says it is left out. |
| H-broken-state-05 | No warning that auto PDFs use an ATS-failing theme | **Partly fixed** | Today warns; the job page and the automatic CV do not (H8-job-02). |
