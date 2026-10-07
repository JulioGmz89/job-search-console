# Review: final-recheck
Sandbox: POPULATED http://127.0.0.1:4401/, EMPTY http://127.0.0.1:4402/, BROKEN http://127.0.0.1:4403/ (fresh, fake agent, 8 s per AI session) · Date: 2026-10-07
Verdict: PASS

Branch `feat/m8-ux-build` at 5c827a5a (fixes in 1a2f8594 and 5c827a5a). Chromium through the Playwright MCP, 1280×800,
light unless stated. Storage was cleared before each sandbox. This is a single pass per finding from `final.md`.

Both severity-3 findings (R-final-04, R-final-05) are closed. Two severity-2 findings stay open: R-final-02 (not
closed) and R-final-06 (partly closed). There are two new severity-2 findings. Nothing open is severity 3 or 4.

**Data side effects.** POPULATED: #12 was re-checked twice, and rows 14 and 15 were re-checked from the row menu (all
are now fit 4.1, "Updated"). #12 was remade from Writing rules. Both Workspace checks ran. EMPTY: CV saved, Kestrel
Media followed with the careers-page link, two scans, and first job checked (row 1, "Fake Co — Test Engineer"). BROKEN:
T8 Try again (#41), then Executive made the design for every CV and #12 was laid out again in Executive.

## Claimed fixes

| ID | Sev | Status | Evidence |
|---|---|---|---|
| R-final-04 | 3 | **Closed** | EMPTY, Kestrel Media + `https://kestrelmedia.example.com/careers`. The "You're set up" card shows an amber note under "✓ Following Kestrel Media": "The app doesn't recognise this link as a job board it can read, so checks may find nothing at Kestrel Media. If the company posts its jobs on Greenhouse, Lever or Ashby, use that link instead (Companies › Edit)." The header says "1 thing needs you". The Needs-you card reads "Kestrel Media's link isn't a job board the app can read" and has **Fix Kestrel Media's link**. Companies: "Careers page (kestrelmedia.example.com) · This link isn't a job board the app can read · checks find nothing here", before and after a scan. Focus lands on **You're set up**. `R-recheck-04-today.png` |
| R-final-05 | 3 | **Closed** | EMPTY: Enter on **Check for new openings**. A run card appears under the "Last checked…" card: "Done · Check for new openings · No new openings this time. No company could be checked: their links aren't job boards the app can read. Check the links in Companies." It was still there 6 s later. Focus stayed on the button. POPULATED: the card stays with "4 new openings: … Juniper Mobility: the job board couldn't be reached (board not found). Fix it in Companies." See R-recheck-01 for focus in POPULATED. `R-recheck-05-empty.png`, `R-recheck-05-populated.png`, `R-recheck-05-320-dark.png` |
| R-final-01 | 2 | **Closed** | After **Check fit again** on #12, Writing rules › #12 reads "Made Oct 6, 00:23, before your rules changed", which matches the job page ("Made Oct 6, 00:23 · written before your writing rules changed"). After **Make it again**: "✓ Made Oct 7, 11:58, under your current rules". `R-recheck-01.png` |
| R-final-02 | 2 | **Not closed** | Applications › row 14 **Actions** › **Check fit again** › confirm (focus on Cancel, correct). The row text was polled every second. It stayed "14 Ember Payments — Software Engineer, Payments 3.5 Apply Reviewed — not applied — Aug 28" until it changed to "Updated 4.1 … Oct 7". "Checking fit" never appeared. Row 15 (Fernhill Robotics) gave the same result over 8 s. The code has a `working` map for this (`Applications.jsx` line 151), but nothing showed on screen. `R-recheck-02.png` |
| R-final-03 | 2 | **Closed** | Activity: "Check companies' job boards · Found 1 problem: Juniper Mobility: board not found." and "Check my list for problems · Found 22 problems: Possible duplicates: #4, #24 (Ember Payments — Backend Engineer (Go)); … and 19 more." The status region announces the same text. See R-recheck-02 for the Workspace card. `R-recheck-03.png` |
| R-final-06 | 2 | **Partly closed** | Design (BROKEN): focus goes to the run card's link and then to "Laid out again Oct 7 in Executive: Readable by screening systems…". **Closed.** Writing rules (POPULATED): focus goes to the card's link and then to the #12 row's job link. **Closed.** Job page **Check fit again** (POPULATED, twice): `activeElement` is BODY right after Enter and stays BODY for the 12 s of the run and after. **Not closed.** See R-recheck-01. `R-recheck-06-job.png` |
| R-final-07 | 2 | **Closed** | BROKEN Today, before the click, the failed card says: "Your CV design fails the screening check, so this try won't make a tailored CV by itself. Choose a design that passes in My CV › Design, then make the CV from the job's page." After the retry ("Tried again: that worked. Fit 4.1 / 5"), #41 shows Documents › Tailored CV "Not made yet" with the red notice about the broken design. No automatic CV was made. `R-recheck-07-before.png`, `R-recheck-07-after.png` |
| R-final-08 | 2 | **Closed** | POPULATED Applications: Enter on **Activity** puts focus on the panel's "Activity" heading. Shift+Tab closes the panel, and focus goes to the row 15 **Actions** button, which is fully visible. Escape and **Close** (named "Close Activity") both close the panel and return focus to **Activity** (`aria-expanded="false"`). `R-recheck-08.png` |

## Findings

### R-recheck-01: Focus still falls to the page body when a run replaces the button that started it
- Severity: 2. WCAG 2.4.3. A keyboard or screen-reader user has to start again from the top of the page. The status region still announces the result. This is the rest of R-final-06, and the same thing happens in two more places.
- Where: job page › Summary › **Check fit again**; Today (POPULATED) › New since you last looked › **Check for new openings**; Companies › **Check companies' job boards**
- Expected (ia.md §3, focus moves when an action replaces its own button): the run card's link while it runs, then the updated Summary, the new-openings card or the result line.
- What happened: job page: `activeElement` was BODY right after Enter, for the whole run and after it. Checked twice. Today (POPULATED): after Enter, the "Last checked" card turned into "4 new openings at the companies you follow" and focus was BODY. Companies: after the click, the section reads "Checked Oct 7. The status beside each company above is up to date." and focus is BODY. In EMPTY, Today's button is not replaced and keeps focus. The fix in `RunItem.jsx` (line 78) only applies when focus is already inside the run card. On these three pages focus never gets there.
- Reproduction: 1. `node app/ux/sandbox.mjs --state populated` 2. `#/applications/12`, Tab to **Check fit again**, press Enter, check `document.activeElement`. 3. `#/today`, Enter on **Check for new openings**. 4. `#/companies`, activate **Check companies' job boards**.
- Evidence: app/ux/m8/evidence/R-recheck-06-job.png

### R-recheck-02: Workspace says a green "Done:" when the list check found 22 problems, and shows the raw engine output
- Severity: 2. It contradicts Activity ("Found 22 problems") on the page where the user clicked. The only details are engine lines with emoji and file paths, outside Technical details.
- Where: Workspace › Tidy up › **Check my list for problems**
- Expected (ia.md §3, the outcome in words where the user clicked; codes and paths only in Technical details): "Found problems:" with the problems in sentences, as Find duplicate applications does.
- What happened: a green notice reads "Done:" with nothing after the colon. Under it, "What it printed" is open by default and shows "📊 Checking 40 entries in applications.md … ⚠️ Orphan report — no tracker row references #12: reports/012-cobaltfreight-2026-08-25.md …". Some of the 22 come from the app's own re-checks: each **Check fit again** adds "Duplicate reports for same company+role" and "Orphan report" lines. So normal use makes this check look worse over time. (Component: `Workspace.jsx` line 72. `found` is false for this run.)
- Reproduction: 1. `node app/ux/sandbox.mjs --state populated` 2. Re-check one job (job page › **Check fit again**). 3. Workspace › **Check my list for problems**.
- Evidence: app/ux/m8/evidence/R-recheck-03-workspace.png

### Smaller observations (severity 1, not filed separately)
- EMPTY Today, "You're set up": the line keeps its "✓" next to the warning. "Next: … or look for new openings at Kestrel Media" suggests the scan the warning says will find nothing.
- EMPTY scan run card: green "Done", and its main button is **Open To review** (empty) with "then: read the new postings for Skills". The useful action, Fix in Companies, is only a sentence. The Needs-you card above has the link.
- **Fix Kestrel Media's link** opens Companies with focus on the h1, not on the row's **Edit**.
- POPULATED Today after a scan: two buttons do the same thing, **Look at the 4 new openings** and **See the 4 new openings**.

## Regression walk (P2, keyboard first)

| Task | Sandbox | Completes | Notes |
|---|---|---|---|
| T1 | EMPTY | **Yes** | Typed the CV, Tab ×2 to **Save my CV**, Enter: "Saved: Alex Rivera · Summary, Experience (1 role), Education, Skills.", with focus on it and the save announced. Followed Kestrel Media with Enter, and focus went to **You're set up** (R-final-04 closed). First job: "Check fit · Fake Co — Test Engineer · Fit 4.1 / 5", row 1, focus on **Open the job**. No regressions. |
| T8 | BROKEN | **Yes** | Skip link, then Tab ×3 to **Try again**. The new **My CV › Design** link adds one stop. Focus goes to "still working" and then to **Open the job** at 8 s. The card keeps "What happened the first time". **Open the job** opens #41 with focus on the h1 and no automatic CV (R-final-07 closed). No regressions. |

## Tokens and layout
- Hard-coded colours outside `tokens.css`: still 15 in `app/ui/src/app.css` and 1 in `pages/mycv/Design.jsx` (the
  same ones listed in final.md). These commits added none.
- Today's new cards (the set-up warning, the "link the app can't read" Needs-you card, the scan run card and the failed
  card's screening note) were checked in light at 1280 and in dark at 320 px. There is no sideways scroll (scrollWidth
  305 at 320 px, scrollbar included) and nothing is cut off. Amber, red and green tones are readable in both schemes.
  `R-recheck-today-320-dark.png`, `R-recheck-05-320-dark.png`

## Strengths
- A first-timer who pastes a careers page is now told three times, in plain words, that it won't be watched: on the
  set-up card, on Needs you, and on Companies. Each place has a way to fix it.
- Scan results stay where the user clicked. They name companies and openings, and they match the Activity rows and
  the announcements.
- Try again now warns before the click and keeps its promise: no CV is made in the failing design.
- The Activity panel no longer hides focused controls, and Escape and Close return focus to **Activity**.
