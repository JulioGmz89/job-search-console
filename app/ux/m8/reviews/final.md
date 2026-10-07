# Review: final
Sandbox: POPULATED http://127.0.0.1:4401/, EMPTY http://127.0.0.1:4402/, BROKEN http://127.0.0.1:4403/ (all fresh, default `--delay 8000`) · Date: 2026-10-07
Verdict: FAIL

Branch `feat/m8-ux-build` at d5abd208. Chromium through the Playwright MCP, 1280×800, light scheme unless stated.
Before each sandbox the page was fully reloaded with `sessionStorage` and `localStorage` cleared. The shared tab
still held an earlier session's Applications filter (Reviewed — not applied, sorted by Number). That came from the
browser, not from the product's defaults.

The FAIL rests on H8-today-01 (severity 3), which is not closed, and on H8-today-02 (severity 3), which is only partly
closed and leaves a severity-3 remainder (R-final-04, R-final-05). All other claimed fixes are closed or leave
severity 2 or lower.

**Data side effects of this review.** In POPULATED, rows 12, 13 and 14 were re-checked (all now fit 4.1, "Updated")
to verify H8-job-01 and H8-applications-01. Juniper Mobility was removed and restored with Undo. Rows 12 and 13 are
Applied (T3). Words were added and #12 was remade (T9). Kestrel Media was added as row 41 (A8-02). Because #12 was
re-checked first, the T9 remake ran against report 41, the report #12 now points to. On screen it is
correct: job #12 shows the new CV. But `check-task.mjs` T9 criterion 2 (`meta.reportId` 12) would not match. EMPTY
follows Kestrel Media through `https://kestrelmedia.example.com/careers` (the H8-today-01 input) and has row 1.
BROKEN ran T8, then T7 with Executive.

## Claimed fixes

| ID | Sev | Status | Evidence |
|---|---|---|---|
| H8-job-01 | 4 | **Closed** | After **Check fit again** on #12 (POPULATED), Tailored CV stays **Ready**: "cv-alex-rivera-cobaltfreight-012-2026-08-25.pdf · From your earlier check of this posting (report #12)", with Open and Download. Applications row 12 keeps "CV", and the search for "cobalt" still lists "Document · Tailored CV · Cobalt Freight — Staff Software Engineer". Leftovers: R-final-01 (Writing rules mislabels it), and History and the banner now say "first added Oct 7" (was Aug 25, severity 1). `R-final-H8-job-01.png` |
| H8-today-01 | 3 | **Not closed** | EMPTY, step 2 with `https://kestrelmedia.example.com/careers`: "Set-up complete · You're set up · ✓ Following Kestrel Media · Companies you follow"; "Nothing needs you right now". No board type and no warning. Companies: "Careers page (kestrelmedia.example.com) · Not checked yet". See R-final-04. `R-final-H8-today-01.png` |
| H8-today-02 | 3 | **Partly closed** | The false "Every board answered" is gone. The status region and the Activity panel now say "No new openings this time. No company could be checked: their links aren't job boards the app can read. Check the links in Companies." But Today, where the user clicked, shows only "Last checked for new openings Oct 7" with no result, under "Nothing needs you right now". Companies still says "Not checked yet". See R-final-05. `R-final-H8-today-02.png` |
| H8-applications-01 | 3 | **Partly closed** | Row menu › **Check fit again** now opens "Check the fit of Driftwood Analytics — Backend Engineer (Go)? … 2–5 minutes; uses your Claude plan. Your tailored CV and letter for this job stay." with **Check fit again** / **Cancel** (focus on Cancel). While the check runs, the row shows nothing (R-final-02). `R-final-H8-applications-01.png`, `R-final-02.png` |
| H8-job-02 | 3 | **Partly closed** | BROKEN #6: a red notice beside **Make tailored CV** reads "Your design (broken) fails the screening check … Choose a design that passes first." But T8's **Try again** still makes an automatic tailored CV in "broken", which is **Fails screening** on #41 (R-final-07). `R-final-H8-job-02.png`, `R-final-W8-T8-03.png` |
| H8-companies-01 | 3 | **Closed** | **Fix Juniper Mobility** → **Remove** → **Stop following**: no "moved or closed" panel appears under Kestrel Media or anywhere else. After **Undo**, Juniper returns with its own "Board not found since Sep 24" and **Fix** (it returns at the end of the list; that is H8-companies-02, not in scope). |
| H8-activity-01 | 3 | **Partly closed** | The previews now read "Preview only: nothing was changed." The false "No problems found." is gone. But both checks now say only "Finished. Technical details shows what it found." What they found (Juniper Mobility board not found; 8 possible duplicates) is only in the engine output (R-final-03). "Find the right job board for a company" is still logged as "Check companies' job boards" (H8-activity-02, not in scope). `R-final-03.png` |
| H8-workspace-help-02 | 3 | **Closed** | **Find duplicate applications** now shows "Preview — nothing has changed yet. This is what would change:" and one sentence per pair, e.g. "Application #23 (Driftwood Analytics — Backend Engineer (Go), fit 3.4/5) would be merged into #13 (fit 4.1/5), keeping the higher fit, the furthest status and every note." The engine log is under **Technical details**. `R-final-H8-workspace-help-02.png` |
| W8-T7-01 | 2 | **Partly closed** | The save confirmation now says "CVs you already have keep their old layout until you update them: Update existing CVs, or Lay out this CV again beside the preview." Other job pages offer **Update the layout to Executive** (checked on #2). Remainder, severity 1: with the Cobalt CV previewed, the viewport still shows only the green verdict. **Lay out this CV again in Executive** is still the last thing on the page, and no design is named for the old file. `R-final-W8-T7-01.png` |
| W8-T7-03 | 2 | **Closed** | After the re-layout, #12 reads "Made Oct 7, 07:59 · Executive design · written before your writing rules changed (Oct 6)". |
| W8-T8-01 | 2 | **Closed** | When the retry finishes, the card stays in place: "Tried again: that worked. · Fit 4.1 / 5. The fit report is ready." Focus is on **Open the job**, in view at y 381. `R-final-W8-T8-01.png` |
| W8-T8-02 | 2 | **Closed** | "What happened the first time: The assistant opened the posting but stopped before writing the fit report…" stays on the Today card and on the Activity row after the retry. |
| W8-T8-03 | 2 | **Partly closed** | The Activity done row now says "then: made the tailored CV (in a design that fails the screening check: choose one that passes in My CV › Design)". Before the retry, Today's card still does not mention a CV. The CV is still made in the failing design (R-final-07). `R-final-W8-T8-03.png` |
| A8-01 | 2 | **Partly closed** | Today › **Try again**: focus goes to the card's "still working" link, then to **Open the job**. Closed there. My CV › Design › **Lay out this CV again in Executive** and Writing rules › **Make it again for Cobalt Freight…** still end with `activeElement` = BODY. The job page's **Check fit again** does the same (R-final-06). `R-final-A8-01-design.png`, `R-final-A8-01-writing.png` |
| A8-02 | 2 | **Closed** | On Today › Check your first job (EMPTY) and on Applications › Add a job (POPULATED), the check was submitted and focus was moved to Search. Focus stayed in Search when the run ended about 8 s later. |
| A8-03 | 2 | **Partly closed** | Escape now closes the panel from the page beneath and returns focus to **Activity**. Shift+Tab still leaves the open panel. The arrows then reach the row 14 "Oct 7" cell (x 1007–1093), which is hidden under the panel (x 865–1265) (R-final-08). `R-final-A8-03.png` |
| A8-04 | 2 | **Closed** | Today › **Choose a file…** and My CV › **Import from a file** show the purple ring when their input has keyboard focus. `R-final-A8-04.png`, `R-final-A8-04-mycv.png` |
| A8-05 | 2 | **Closed** | The moved row now has opacity 1 on a muted `rgb(244,244,245)` background. "Moved to Applied" `#166534` is 6.49:1, and the status border is `#71717a`. `R-final-A8-05.png` |
| A8-07 | 2 | **Closed** | The preview iframe has `tabindex="-1"`. From **Executive**, Tab goes through the remaining cards, **Fine-tune**, **Details**, then **Make this my design for every CV** (8 stops, all visible). |
| A8-08 | 2 | **Partly closed** | A **Sort by** select (Best fit first, Newest first, Oldest first, Company A–Z, Status, Number) works at every width. At 320 px every cell is a labelled line ("Documents: —", "Checked: Oct 7"). At 640 px, **Documents** and **Checked** are still `display: none` (remainder severity 1: the job page has both). `R-final-A8-08-640.png` |

## Findings

### R-final-01: After a re-check, Writing rules says the job's CV was "Made outside the app; rules unknown"
- Severity: 2. The T9 path lists the target CV with a false origin and no rules state, and this contradicts the job page.
- Where: My CV › Writing rules › When rules apply › "Cobalt Freight — Staff Software Engineer #12 · fit 4.1"
- Expected (ia.md §3, documents show file, date, design, rules): the same rules state as the job page ("Made Oct 6, 00:23 · written before your writing rules changed (Oct 6)").
- What happened: the row reads "Made outside the app; rules unknown". The summary above it still says "6 CVs were written before your rules last changed", which counts this one. The CV was made by the app.
- Reproduction: 1. `node app/ux/sandbox.mjs --state populated` 2. Open `#/applications/12` and click **Check fit again**. Wait about 10 s. 3. Open `#/my-cv/writing` and scroll to #12.
- Evidence: app/ux/m8/evidence/R-final-01.png

### R-final-02: The row menu's "Check fit again" shows nothing on the row while it runs
- Severity: 2. This is what remains of H8-applications-01. The paid action is now confirmed, but the row gives no sign that it is running.
- Where: Applications › row **Actions** › **Check fit again** › confirm
- Expected (ia.md §3 run feedback where the user clicked and in Activity): a working state on or beside the row.
- What happened: after **Check fit again** in the dialog, row 14 still read "3.5 · Apply · Reviewed — not applied · —" for the whole 8 s run. Focus went back to **Actions for Ember Payments…**. The only signs were the status region ("Started: Check fit · Ember Payments — …") and the top bar, which was scrolled out of view. When the check finished, the row changed to 4.1 with **Updated**.
- Reproduction: 1. `node app/ux/sandbox.mjs --state populated` 2. Open `#/applications` and scroll to row 14. 3. Click **Actions for Ember Payments — Software Engineer, Payments** › **Check fit again** › **Check fit again**.
- Evidence: app/ux/m8/evidence/R-final-02.png

### R-final-03: Activity says "Technical details shows what it found" instead of what the checks found
- Severity: 2. This is what remains of H8-activity-01. The result is now true but empty, and the findings are only in engine output.
- Where: Activity › "Check companies' job boards" and "Check my list for problems" rows
- Expected (ia.md §3, codes and engine output only in Technical details; outcomes in words): e.g. "Juniper Mobility: board not found (1 of 11)", "8 possible duplicates".
- What happened: both rows read "Finished. Technical details shows what it found." Opening the details shows "❌ Juniper Mobility — greenhouse/junipermobility (slug not found) — HTTP 404" and "⚠️ Possible duplicates: #4, #24 …".
- Reproduction: 1. `node app/ux/sandbox.mjs --state populated` 2. Workspace › **Check my list for problems**. Companies › **Check companies' job boards**. 3. Open `#/activity`.
- Evidence: app/ux/m8/evidence/R-final-03.png

### R-final-04: "Follow a company" still accepts a careers page the app cannot check and declares set-up complete (H8-today-01, not closed)
- Severity: 3. A first-timer is told they are done while their only company is never watched.
- Where: Today › Get set up › 2 Follow a company › **Follow company**
- Expected (ia.md §2.1): "Following Kestrel Media · Greenhouse job board found · N open roles", or on failure the problem and the fix.
- What happened: "Set-up complete · You're set up · ✓ Following Kestrel Media · Companies you follow", and the page header says "Nothing needs you right now." The only new text is the hint under the field: "Greenhouse, Lever, Ashby and most other job boards are recognised from the link." Companies lists "Careers page (kestrelmedia.example.com) · Not checked yet".
- Reproduction: 1. `node app/ux/sandbox.mjs --state empty` 2. Save any CV. 3. **Company name** "Kestrel Media", **Careers page link** `https://kestrelmedia.example.com/careers` → Enter.
- Evidence: app/ux/m8/evidence/R-final-H8-today-01.png

### R-final-05: After "Check for new openings", Today shows no result; only the Activity panel says no company could be checked
- Severity: 3. This is what remains of H8-today-02. Together with R-final-04, nothing on the screen where P2 acted tells them Kestrel Media is not being watched.
- Where: Today › New since you last looked › **Check for new openings**
- Expected (ia.md §3, run feedback where the user clicked and in the Activity panel): the outcome on Today, e.g. "Kestrel Media couldn't be checked: its link is a careers page the app can't read. Fix in Companies."
- What happened: the card's heading changes to "Last checked for new openings Oct 7" and nothing else appears. The header still says "Nothing needs you right now." The words are correct in the status region and in the Activity panel, under a green "Done" ("No company could be checked: their links aren't job boards the app can read. Check the links in Companies."). To review says "0 new openings · 0 companies checked". Companies still says "Not checked yet".
- Reproduction: 1. Do R-final-04. 2. Tab to **Check for new openings** on Today and press Enter. Wait 5 s.
- Evidence: app/ux/m8/evidence/R-final-H8-today-02.png

### R-final-06: Focus still falls to the page body when a re-layout, a remake or a job-page re-check finishes
- Severity: 2. This is what remains of A8-01, plus one new place (WCAG 2.4.3).
- Where: My CV › Design › **Lay out this CV again in …**; My CV › Writing rules › **Make it again for …**; job page › **Check fit again**
- Expected (ia.md §3, focus moves when an action replaces its own button): the result line, the remade row, or the updated Summary.
- What happened: focus moves to the run card's title link when the run starts. When the card is replaced, `document.activeElement` is BODY in all three places. The status region still announces the result.
- Reproduction: 1. `node app/ux/sandbox.mjs --state broken`, `#/my-cv/design`: choose Executive, **Make this my design for every CV**, **Preview with** "Cobalt Freight — Staff Software Engineer, Oct 6", focus **Lay out this CV again in Executive** and press Enter. Wait 10 s. 2. `--state populated`, `#/my-cv/writing`: press Enter on **Make it again for Cobalt Freight — Staff Software Engineer**. Wait 10 s. 3. `--state populated`, `#/applications/12`: press Enter on **Check fit again**. Wait 10 s.
- Evidence: app/ux/m8/evidence/R-final-A8-01-design.png, app/ux/m8/evidence/R-final-A8-01-writing.png

### R-final-07: "Try again" still makes a tailored CV in the design that fails screening, without saying so beforehand
- Severity: 2. This is what remains of W8-T8-03 and the second half of H8-job-02.
- Where: Today › failed "Check fit · Driftwood Analytics — Data Engineer" › **Try again**; job #41 › Documents
- Expected (H8-job-02 notes; ia.md §3 costs and slips): no automatic CV in a failing design, or a warning on the card before the click.
- What happened: before the retry, the card says only "Try again. It usually works the second time and uses your Claude plan again." After it, #41 has "Fails screening · cv-alex-rivera-driftwood-analytics-2026-10-07.pdf · broken design". The Activity done row now discloses it after the fact. Activity's **Documents (0)** filter does not count this CV.
- Reproduction: 1. `node app/ux/sandbox.mjs --state broken` 2. Today › **Try again**. Wait 10 s. 3. **Open the job**.
- Evidence: app/ux/m8/evidence/R-final-W8-T8-03.png

### R-final-08: The open Activity panel still hides focused page controls
- Severity: 2. This is what remains of A8-03 (WCAG 2.4.11). Escape now works from the page, so the user can recover.
- Where: Top bar › **Activity** panel over Applications › table
- Expected: focus never lands on a control hidden under the panel. The panel could close when focus leaves it, or reserve its width.
- What happened: Enter on **Activity**, then Shift+Tab, puts focus on row 14. ArrowRight moves through the cells to "Oct 7" (x 1007–1093), which is entirely under the 400 px panel.
- Reproduction: 1. `node app/ux/sandbox.mjs --state populated`, open `#/applications`. 2. Tab to **Activity** and press Enter, then Shift+Tab, then ArrowRight ×7.
- Evidence: app/ux/m8/evidence/R-final-A8-03.png

### Smaller observations (severity 1, not filed separately)
- Today (BROKEN, after the retry): the header says "3 things need you" while the resolved card still sits under "Needs you · a fit check didn't finish". **Dismiss** sits outside its card.
- POPULATED #12 after a re-check: History drops "Aug 25 · added" for "Oct 7 · added to Applications". The banner says "It was first added Oct 7". **Update the layout to Standard** disappears.
- The "Open the job's documents" link after a re-layout lands on the job's h1, not on Documents.
- Workspace still scrolls 86 px sideways at 320 px (A8-09, not in scope). Writing rules scrolls 2 px.

## Regression walk (P2, keyboard first)

| Task | Sandbox | Completes | Notes |
|---|---|---|---|
| T1 | EMPTY | **Yes**: CV saved ("Saved: Alex Rivera · Summary, Experience (2 roles), Education, Skills", focus on it, announced); company followed; focus on **You're set up** | Walked with the H8-today-01 careers-page link, so R-final-04 and R-final-05 apply. The first-job continuation also passed: Fit 4.1, row 1, **Open the job** present, focus not stolen. |
| T3 | POPULATED | **Yes**: rows 12 and 13 Applied (API) | The chip, status listbox (Enter, ArrowDown, Enter), alertdialog with focus on Cancel, the Yesterday radio and **Save as Applied** all work by keyboard. Focus goes to the next row after saving, and the change is announced with Undo. Default order is fit, best first. |
| T8 | BROKEN | **Yes**: a retry evaluate succeeded; row 41 Driftwood Analytics — Data Engineer | Skip link, then two Tabs to **Try again**. Focus stays on the card and lands on **Open the job**, which opens #41 with focus on the h1. R-final-07 applies. |
| T9 | POPULATED | **Yes**: voice contains seamless, cutting-edge, robust and spearheaded; the #12 remake succeeded | **Add a word** accepts the comma list and Enter, and it is announced. R-final-01 and R-final-06 apply. See the data note above about report 41. |
| T7 (for the fixes) | BROKEN | **Yes**: Executive saved; #12 laid out again in Executive, readable | The PDF viewer is no longer in the Tab order. R-final-06 applies on Design. |

Compared with the M7 prototype, T7 still lacks the "The CV for … is still in <old design>" line beside the preview
(W8-T7-01 remainder, severity 1). Nothing else that worked in M7 was found broken.

## Tokens and layout
- Hard-coded colours outside `tokens.css` (unchanged since the earlier phase reviews):
  - `app/ui/src/app.css` lines 47, 50, 57, 58, 59, 60, 63, 65 (top bar `#ffffff`, `#a1a1aa`, `#27272a`, `#fafafa`, `#d4d4d8`, `#4ade80`)
  - lines 216, 217 (`.preview` `#ffffff` and `#18181b`), 242 (`iframe.doc` `#ffffff`), 265, 266 (`.search-input`), 336 (`.thumb-img` `#ffffff`), 344 (`.search-toggle` `#a1a1aa`)
  - `app/ui/src/pages/mycv/Design.jsx` line 283: the default accent `#1f4e79`. This is a data default, not a UI colour.
- Inline styles: `app/ui/src/pages/Skills.jsx` line 45 (the bar width; computed, acceptable).
- 320 px: no sideways scroll on Today, the job page, To review, Companies, Skills, My CV Content and Design, or Activity. Writing rules scrolls 2 px and Workspace 86 px (A8-09). Applications at 320 px in dark: cards with labelled lines and a **Sort by** select, nothing cut off (`R-final-320-dark-applications.png`).
- 640×400 (200%): no sideways scroll on Applications. Documents and Checked are hidden (A8-08 remainder).

## Strengths
- The severity-4 issue is gone. A re-check keeps the tailored CV attached and visible on the job page, in the
  Applications row and in search, and says where it came from ("From your earlier check of this posting").
- The T8 recovery now lands well: the card stays, keeps "What happened the first time", and ends with focus on **Open the job**.
- The duplicate merge preview is in plain sentences with names and fits. Declined previews are logged as
  "Preview only: nothing was changed."
- Paid repeat actions from the row menu are confirmed, with cost and a promise about the documents.
- Keyboard: the PDF viewer no longer sits in the Tab order on Design. File inputs show their ring. A finished check
  no longer steals focus from Search. The status dialog flow on Applications is clean.
- The live regions carried every start, finish and save in this pass, with correct wording, including the
  "No company could be checked" scan result.
