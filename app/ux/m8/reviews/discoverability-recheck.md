# Review: discoverability re-check (6ea5997c server · ba7e1371 UI · fb488ae3 seeds)
Sandbox: POPULATED http://127.0.0.1:4401/ · BROKEN http://127.0.0.1:4403/ · EMPTY http://127.0.0.1:4402/ (fake agent, 8 s) · Date: 2026-10-07
Verdict: **PASS** (with notes). No severity-3 or -4 finding is open. Both severity-3 findings (R-disc-01, R-disc-02) are closed. Two severity-2 findings are only partly closed (R-disc-03, R-disc-04).

**Browser cache note.** At first the shared browser showed a cached `index.html` with the old bundle (`index-CPrsXZ9E.js`, which has no `scroll-padding`). The server was already serving `index--2ntMG9C.js`. Every check below was made after a cache-busting reload (`/?r=2#/…`).

**Sandbox data I changed.**
- POPULATED: I added a `style:` key and `cv.sections` to `config/profile.yml`, then restored the original text (written back with LF line endings).
- POPULATED: I added "seamless, robust" to Words to avoid, then removed both. I saved the writing rules once and undid the save. #14 and #12 were set to Applied; #14 was undone and #12 was left as Applied. The re-check added job #42 (Ember Payments).
- EMPTY: I followed "Acme Robotics".
- BROKEN: Compact is now the design for every CV.

## Claimed fixes
| ID | Status | Evidence |
|---|---|---|
| R-disc-01 (sev 3) | **Closed.** At 640×400, `scroll-padding-bottom` is 128 px against an 89 px bar. I moved focus through all 15 Profile controls and none ended up even partly behind Save. Six real Tabs from "Writing rules" land on "Where and how you want to work", which is fully visible above the bar. | R-disc-re-01.png |
| R-disc-02 (sev 3) | **Closed.** I pressed Enter on report 41 (Ember Payments). The in-place Working card appeared under the banner ("Usually 2–5 min. You can leave this page…", with Cancel) and focus moved to its title. At 10 s the same spot read "Done · Fit 4.1 / 5. The fit report is ready. then: added to Applications · **Open the job**", and Open the job goes to #42 Ember Payments. Leftover: R-re-01. | R-disc-re-02.png |
| R-disc-03 (sev 2) | **Partly closed.** POPULATED, on Companies and on Workspace › Tidy up: "Check the companies list for mistakes, Oct 7: No problems found." appears in place, focus moves to it, and it is announced. EMPTY after following one company: the same result. **EMPTY with no company: unchanged.** The in-place result and the Activity item still read "Found problems. Technical details shows what they are." with **Open Workspace**. The details show `validate-portals failed: file not found: C:\…\portals.yml`, exit 1, and the item is marked Done. Cause: the new "There is no companies list yet: follow a company first." wording in `summarizeFindings` never runs, because the hook returns early when the run didn't succeed (`app/server/queue/specs.js:460`, `if (hookCtx.provisional.status !== 'succeeded') return {}`). The case is covered by a unit test, but on screen it is not fixed. | R-disc-re-03.png |
| R-disc-04 (sev 2) | **Partly closed.** The Fix panel now answers directly, in place: "No board for Juniper Mobility was found on Greenhouse, Lever or Ashby. Open their careers page to see where they post jobs now, or pause Juniper Mobility." Two problems remain. (a) Focus drops to `<body>` within 300 ms of the click and stays there. (b) The announcement and the Activity item still say "Check companies' job boards: Found 1 problem: Juniper Mobility: board not found." with **Open Companies**, so screen-reader users hear the old, off-topic answer under another action's name. | R-disc-re-04.png |
| R-disc-05 (sev 2) | **Closed.** For **Try the 3 failed postings again**, focus goes to the Working card ("Read new postings"), then to "Done: Finished reading postings. The line above says how many could not be loaded." The basis line updates to "last read Oct 7 … 3 couldn't be loaded", which is truthful. For **Read my CV's skills again**, focus goes to the card, then to "Done: Your CV's skills were read again; Skills uses them now.", and the line updates to "Read by Claude Oct 7". In neither case does focus reach `<body>`. Small leftover: the retry's card and Activity item are titled "Read new postings", not the button's words. | R-disc-re-05.png |
| R-disc-06 (sev 1) | **Closed.** History is one list, newest first. On #1: Aug 27 Offer → Hired … Aug 12 added. On #3: Aug 23 … Aug 14 added. The original repro on #14 (Applied, dated Yesterday, then Undo) reads Oct 7 → Oct 6 → Aug 28. | on screen |
| R-disc-07 (sev 2) | **Closed, one word left (sev 1).** The notice now reads "Your Profile sets its own CV colours and fonts and order of CV sections, which win over the settings on this page; the preview already shows them." The hint still says "Removes only those settings from **profile.yml**", where it could say "from your Profile". | R-disc-re-07.png |
| R-disc-08 (sev 1) | **Mostly closed.** Fixed: "since Oct 2026 / Sep 2026" (matching the seeded `2026-10` and `2026-09`); the Data health link is named "Open the fit report for Ember Payments — Infrastructure Engineer"; adding avoid-words is announced once ("Added seamless, robust to the words to avoid."); and Make this my design now says "…Lay out this CV again below the preview". Not fixed: an open writing-sample disclosure still reads "Open design-note-idempotent-retries.md…". | on screen |
| Writing rules Save + Undo | **Closed.** Save is announced as "Saved your writing rules. Undo is available.", and Undo sits in the bar. Undo restored the whole file and the chips: I had accidentally saved an almost empty file, and it came back intact. Focus goes to the result line after Save and to the `<h1>` after Undo. | R-disc-re-rules-undo.png |
| Companies form "Job board's data link (API)" | **Closed.** It is under More options, in that wording. | on screen |

## Findings
### R-re-01: Report 41's banner still says it isn't in Applications after it was added
- Severity: 1. The Done card right under it says "added to Applications" and offers Open the job, so this is confusing but harmless.
- Where: `#/applications/report/41`, the banner after the run.
- Expected: once the run is done, the banner says the report is now in Applications. The page also still shows the old fit (3.7) beside the new 4.1.
- Reproduction: 1. `node app/ux/sandbox.mjs --state populated` 2. Workspace › Data health › Open › **Check fit again and add it to Applications** 3. Wait 10 s.
- Evidence: app/ux/m8/evidence/R-disc-re-02.png

### R-re-02: The remaining parts of R-disc-03 and R-disc-04 (severity 2)
See the table. For R-disc-04, the fix is to keep focus on the new answer, and to name the run and its announcement after the action the user clicked.

### R-re-03: "When did you apply…?" opens with focus on Cancel
- Severity: 1. This looks deliberate (`focusConfirm={false}` in StatusControl.jsx). By keyboard it takes three Shift+Tabs to reach the date choice, and a first-timer who presses Enter cancels. I can't tell whether this was already the case before this phase, and it is not a regression in the flow.

## Regression walk (brief)
- **T3 (POPULATED, keyboard): pass.** In Applications, I focused Cobalt Freight's Status, pressed Enter, ArrowDown to Applied and Enter. In **When did you apply…?** I chose Yesterday with the arrow keys and pressed Save as Applied. The row reads "Moved to Applied", the change is announced with Undo, and focus moves to the next row's Status. #14 by mouse: the same, and Undo works.
- **T7 (BROKEN): pass.** Today › **Choose a design that passes** goes to Design with focus on the `<h1>`. I pressed Enter on Compact: the card reads "Readable by screening systems", **Discard changes** appears, and **Make this my design for every CV** is enabled. Clicking it announces "Compact is now your design for every new CV.", with focus on that line.
- **T9 (POPULATED): pass.** Adding words gives the chips, a single announcement, and focus stays in the field. **Make it again** for Brightwater gives the in-place Working card, then "✓ Made Oct 7, 13:28, under your current rules".

## Tokens and layout
- I found no new hard-coded colours or inline styles. The same `app.css` lines as in the first review remain: the top bar and search (47–65, 265–266, 344) and the white paper (216, 217, 242, 336). `Skills.jsx:45` has a data-driven bar width, and `Design.jsx:283` has the colour input's fallback.
- At 320 px there is no sideways scroll on the report page, Companies, Skills, Profile, Design or job #1. Workspace is still 71 px wide (B8-71, already known).
- Light scheme: the Skills basis line, with its Done result, reads well (R-disc-re-light.png). Dark scheme was used for the rest of the re-check.

## Strengths
- Both severity-3 findings are properly fixed. The scroll padding covers every Profile field. The orphan-report action now follows the run-feedback pattern from start to finish, including Open the job.
- Results now appear in words where the user clicked, for both the companies-list check and the Skills re-runs. Focus moves to them, and the basis lines report honestly.
