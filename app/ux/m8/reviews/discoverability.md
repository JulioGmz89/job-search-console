# Review: discoverability (ac0c78da server · 0063ab11 UI · b7a7af1c sandbox)
Sandbox: POPULATED http://127.0.0.1:4401/ · BROKEN http://127.0.0.1:4403/ · EMPTY http://127.0.0.1:4402/ (fake agent, 8 s) · Date: 2026-10-07
Verdict: **FAIL**. There are two severity-3 findings: R-disc-01 (the sticky Save bar hides the focused field, WCAG 2.4.11) and R-disc-02 (no feedback on the new report page's paid action).

**Sandbox note.** The running sandboxes do not include b7a7af1c's fixtures. `app/ux/sandbox/seeds/{populated,broken}/data/` has no `status-log.tsv` and no `blacklist.md`. On screen:
- Job #1's History reads only "added to Applications · now Hired".
- Companies › Companies to skip reads "None".
- No state has a fit report without an application.

The seeds need regenerating (`node app/ux/sandbox/generate.mjs`). To test the UI anyway, I put sandbox data (no code) into the POPULATED temp folder:
- `data/blacklist.md`, with the generator's exact content;
- an extra report, `reports/058-quillworks-2026-10-01.md`;
- for a while, a `style:` block and `cv.sections` in `config/profile.yml`. I removed these afterwards.

I tested History with real ledger lines, written by the app's own status change on #14.

## Claimed fixes
| ID (sitemap row) | Item | Status | Evidence |
|---|---|---|---|
| R-reports-list | Workspace › Data health › "Fit reports not in Applications (N)" with Open | **Closed** (with the injected report): "Quillworks — Platform Engineer · fit report 58, Oct 1 · Open". The heading shows "(0)" with "None: every fit report belongs to an application" when there are none. | on screen |
| R-report (orphan) | A report page with "Check fit again and add it to Applications" | **Partly closed.** The page, its explanation and the cost line are right, and focus goes to the `<h1>`. The action gives no feedback on the page (R-disc-02). | R-disc-05.png |
| — | To review › Already checked links | **Closed.** `#/applications/report/1` redirects to `#/applications/1` (Brightwater Health), and focus goes to the `<h1>`. | on screen |
| C-status-log | Job › History shows ledger transitions | **Partly closed.** The ledger is read: after a status change, #14 shows "Oct 6 · Reviewed — not applied → Applied". I could not check the seeded #1, #3 and #23 (see the sandbox note). The entries are out of order (R-disc-06). | R-disc-04.png |
| UI-pipeline (sent) | "I've sent my application" beside Status | **Closed.** It sits under Status with "Sets the status to Applied, with the date you sent it." It opens **When did you apply…?** (Today / Yesterday / another day, plus a note). The save is announced, Undo is in the bar and in the Activity panel, and focus returns to Status. | on screen |
| C-blacklist-md | Companies › "Companies to skip" (read-only) | **Closed** (with the injected file): "Quarry Logistics · Withdrew an offer last year · since 2026-08", "Tallow & Finch · …", plus how to edit it and an **About this list** help topic. | on screen |
| K-validate-portals | "Check the companies list for mistakes" | **Not closed (sev 2).** The button runs, but the result is not in words and nothing appears where you clicked (R-disc-03). | R-disc-03.png, R-disc-09.png |
| K-verify-portals | Juniper Mobility › Fix › "Find the right job board for Juniper Mobility" | **Partly closed.** The button is present with an honest hint. The result is titled with a different action's name and does not answer the question (R-disc-04). | R-disc-02.png |
| — | Check results in words | **Partly closed.** "Check companies' job boards" says "Found 1 problem: Juniper Mobility: board not found." The validate check does not (R-disc-03). | R-disc-02.png |
| UI-skills-reset | "Back to automatic" on a skill you set | **Closed.** "You set this. Back to automatic for Java" appears with "Show skills I ignored" on. It reverts, announces "Java back to automatic", offers Undo, and moves focus to Java's select. | on screen |
| UI-skills-retry | "Try the 3 failed postings again" | **Partly closed.** It is present and runs, but focus drops to `<body>` and the outcome is misreported (R-disc-05). | R-disc-01.png |
| K-skills-cv | "Read my CV's skills again" | **Partly closed.** It is present, with "Read by Claude Sep 25 · one Claude session · uses your Claude plan". The in-progress card and the "Read by Claude Oct 7" date update work. Focus drops to `<body>` (R-disc-05). | — |
| UI-cv-save/revert layout | Design actions and Discard changes above the preview | **Closed.** **Make this my design for every CV**, **Discard changes** and **Update existing CVs to this design (6)** sit between the verdict and the preview frame. | R-disc-06.png |
| UI-cv-* Fine-tune | Fine-tune above the gallery | **Closed.** "Fine-tune broken: colour, fonts, size, spacing, section order" sits under Preview with. | R-disc-06.png |
| R-cv-templates / C-cv-templates | "Yours" on custom designs; "Make your own design" help | **Closed.** BROKEN shows "broken · your design" with the **Yours** badge. The link "Make your own design" goes to `#/help/own-design`. | R-disc-06.png |
| UI-cv-profile-warning | "Let this page decide", with Undo | **Closed, wording aside** (R-disc-07). The notice appears and the action removes only `style` and `cv.sections`. Undo restores profile.yml byte for byte, and focus moves to Undo. | on screen |
| R-cv-writing-samples | Writing rules order; Open on each sample | **Closed.** The order is Words to avoid › All rules › Writing samples › When rules apply. Each sample is a disclosure, "Open design-note-idempotent-retries.md · changed Oct 6", that shows the text inline and opens with Enter. | on screen |
| C-modes-profile-md | Profile › Advanced files at the top | **Closed.** "Advanced files: two more files that shape your checks" is the first control. | — |
| — | Profile sticky Save bar | **Not closed (sev 3).** It hides the focused field at 200% zoom (R-disc-01). | R-disc-07.png, R-disc-08.png |
| — | Top bar Help link and new topics | **Closed.** **Help** sits at the far right. The topics now include "Installing the AI assistant (Claude Code)", "Make your own design" and "Companies to skip". | on screen |

## Findings

### R-disc-01: At 200% zoom the sticky Save bar on Profile completely hides the field that has focus
- Severity: 3. This fails WCAG 2.4.11 (AA). A keyboard user at 200% zoom tabs into fields they cannot see, and so types blind into Location, "Where and how you want to work" and so on.
- Where: My CV › Profile › sticky bar ("Save profile" plus "Saved in config/profile.yml…").
- Expected (ia.md §5 Targets and WCAG 2.2 AA; brief: the sticky bar must not cover focused fields): every focused control stays at least partly visible. The usual fix is `scroll-padding-bottom` equal to the bar's height.
- What happened: at 640×400 the bar is 88 px tall (22% of the viewport, 312–400). Tabbing forward from the sub-navigation, measured after the scroll settled:
  - **Advanced files** summary at 321–345: covered 24 of 24 px;
  - **Location** at 350–391: covered 41 of 41 px;
  - **Where and how you want to work** at 346–387: covered 41 of 41 px;
  - **Lowest pay you would accept**: covered 21 of 41 px.

  The browser scrolls each field just into the viewport, which is behind the bar. At 1280×800 nothing is covered.
- Reproduction:
  1. `node app/ux/sandbox.mjs --state populated`, open `#/my-cv/profile`.
  2. Resize the window to 640×400 (or zoom to 200%).
  3. Click the "Writing rules" sub-nav link, then press Tab six times. Focus is on "Where and how you want to work", and the field is not visible.
- Evidence: app/ux/m8/evidence/R-disc-08.png (focus on "Where and how you want to work", hidden behind the bar) and R-disc-07.png ("Lowest pay" half covered).

### R-disc-02: "Check fit again and add it to Applications" shows nothing on the page while it runs or when it finishes
- Severity: 3. It is a paid action (2–5 min, uses the Claude plan), and the page looks exactly as it did before the click. A first-timer will think nothing happened and click again, paying twice. When it finishes, nothing on the page leads to the new application.
- Where: the orphan fit-report page `#/applications/report/:n` › "Check fit again and add it to Applications".
- Expected (ia.md §3 Run feedback): "Starting an action shows 'Started' inline where the user clicked, the button becomes the in-progress state… Done or failed updates the same spot." After it is done, there should be a way to the job ("Open the job").
- What happened:
  - At 0.5 s the button label and the page are unchanged. Only the off-screen live region says "Started: Check fit · Quillworks — Platform Engineer".
  - At 10 s it has finished: the page is still unchanged, and the top bar reads "Activity · 1 done".
  - The banner still says "This fit report isn't in your Applications."
- Reproduction:
  1. `node app/ux/sandbox.mjs --state populated`. Add a report with no tracker row (none of the seeds has one, see the sandbox note), for example by copying a report as `reports/058-quillworks-2026-10-01.md` with a new company.
  2. Go to Workspace › Data health › **Open**.
  3. Click **Check fit again and add it to Applications** and watch the page for 10 s.
- Evidence: app/ux/m8/evidence/R-disc-05.png (after completion: same banner, same button; only the Activity button changed).

### R-disc-03: "Check the companies list for mistakes" gives its result only in the raw log, and nothing where you clicked
- Severity: 2. It is not blocking, but a first-timer cannot tell what was found. It misleads on the empty workspace.
- Where: Companies › Check companies' job boards card › **Check the companies list for mistakes**, and its Activity item.
- Expected (ia.md §2.5 "a button with the result in words"; §3 Run feedback and Errors: "codes and paths only under Technical details"; the brief: "Check results are in words"): something like "No mistakes found in your companies list", or "You don't follow any company yet, so there is no list to check", shown under the button.
- What happened:
  - POPULATED: nothing appears under the button. The live region and the Activity panel say "Finished. Technical details shows what it found." The log says "0 errors, 0 warnings".
  - EMPTY: "Found problems. Technical details shows what they are." with **Open Workspace**. The only "problem" is "validate-portals failed: file not found: C:\…\portals.yml" (the user simply follows no company yet), and the item is marked **Done** in green.
- Reproduction:
  1. `node app/ux/sandbox.mjs --state empty`, open `#/companies`.
  2. Click **Check the companies list for mistakes**.
  3. Nothing appears in place. Open **Activity**.
- Evidence: app/ux/m8/evidence/R-disc-09.png (EMPTY) and R-disc-03.png (POPULATED).

### R-disc-04: Juniper's "Find the right job board…" reports under another action's name and doesn't answer the question
- Severity: 2. The user asked where Juniper's board is now. The answer repeats what they already knew, under a different heading.
- Where: Companies › Juniper Mobility › **Fix** › **Find the right job board for Juniper Mobility**.
- Expected (ia.md §2.5 **Fix** "(the probe suggestion)"; the card's own hint, "asks Greenhouse, Lever and Ashby whether Juniper Mobility has one now… If one is found, use Edit the link"): a result named after the action, saying either "Found: lever.co/juniper…" or "None of Greenhouse, Lever or Ashby has a board for Juniper Mobility".
- What happened: the inline result card is titled "**Check companies' job boards**", which is the name of the separate button lower down the page. It reads "Found 1 problem: Juniper Mobility: board not found." with **Open Companies**, while the user is already on Companies. The raw log shows that every company was checked, not Juniper alone. Focus moves to the result's title link.
- Reproduction:
  1. `node app/ux/sandbox.mjs --state populated`, open `#/companies`.
  2. Click **Fix** on Juniper Mobility, then **Find the right job board for Juniper Mobility**.
- Evidence: app/ux/m8/evidence/R-disc-02.png.

### R-disc-05: Skills' new re-run buttons drop focus to the page body, and the retry's outcome is misreported
- Severity: 2. Keyboard users lose their place, and the retry seems to succeed when it did not.
- Where: Skills › basis line › **Try the 3 failed postings again** and **Read my CV's skills again**.
- Expected (ia.md §3 Focus: "after an action that replaces its own button, focus moves to the new state"; Run feedback: "Done… updates the same spot"): focus stays on the action or on its in-progress card. The retry's outcome says how many postings could be read, for example "Still couldn't load 3 postings (the jobs were taken down)".
- What happened:
  - In both cases `document.activeElement` becomes `<body>` straight after the click: the button row is replaced by the Working card, and later the card is replaced by the buttons.
  - When the run ends, the card vanishes and no outcome appears on the spot.
  - The retry is announced and listed in Activity as "Read new postings: The skills analysis is up to date." The basis line still says "3 couldn't be loaded", and the same button is still offered.
- Reproduction:
  1. `node app/ux/sandbox.mjs --state populated`, open `#/skills/learn`.
  2. Tab to **Try the 3 failed postings again** and press Enter.
  3. Press Tab: focus starts again from the top of the page.
- Evidence: app/ux/m8/evidence/R-disc-01.png (after the retry: same "3 couldn't be loaded", same button, while Activity says "1 done").

### R-disc-06: Job › History lists entries out of date order
- Severity: 1. It is cosmetic, but it makes "what happened when" harder to read.
- Where: Job page (#14) › History.
- Expected (ia.md §2.3 item 4, History): one consistent order (newest first, as the "added to Applications" line at the bottom suggests).
- What happened: after Applied (dated Oct 6) and then Undo (Oct 7), History reads "Oct 6 · Reviewed — not applied → Applied", then "Oct 7 · Applied → Reviewed — not applied", then "Aug 28 · added to Applications".
- Reproduction:
  1. POPULATED, open `#/applications/14`.
  2. **I've sent my application** › Yesterday › **Save as Applied**.
  3. Undo it from the Activity panel and look at History.
- Evidence: app/ux/m8/evidence/R-disc-04.png.

### R-disc-07: The profile-override notice speaks in file names and keys
- Severity: 2. "Its own style and section order" doesn't tell a first-timer which settings win (in this case the accent colour and the section list). The path belongs under Technical details.
- Where: My CV › Design › notice above Preview with.
- Expected (sitemap UI-cv-profile-warning, "Your Profile sets the page size and photo. **Change in Profile**"; ia.md §3 Errors: paths only under Technical details): name the settings in words.
- What happened: "Your profile (config/profile.yml) has its own style and section order, which wins over the settings here…" and "Removes only those settings from profile.yml". The behaviour itself is good: it removes only those keys, Undo restores the file exactly, and focus moves to Undo.
- Reproduction:
  1. POPULATED. Add `style:` (any key) and `cv: sections: [...]` to `config/profile.yml`.
  2. Open `#/my-cv/design`.

### R-disc-08: Small wording and naming slips on the new surfaces
- Severity: 1.
- Where and what:
  - Companies to skip shows "since 2026-08", where every other date in the app reads "Oct 6".
  - The Data health **Open** link's accessible name is "Open fit report 58", without the company.
  - Adding avoid-words is announced twice ("Added "seamless", …" and "Added seamless, … to the words to avoid").
  - After **Make this my design**, the text points to "Lay out this CV again beside the preview", but the button is below a 70vh frame.
  - The writing-sample disclosures still say "Open" when they are open.
- Reproduction: POPULATED, on the pages named above.

## Regression walk (P2, keyboard first, then mouse)
- **T3 (POPULATED): pass.**
  - Keyboard: the **Reviewed — not applied** chip, then "Status for Cobalt Freight — Staff Software Engineer", Enter, ArrowDown to Applied, Enter. In **When did you apply…?**, Yesterday, then **Save as Applied**. The row stays greyed as "Moved to Applied", and the change is announced with Undo.
  - Focus then lands on the next row's Status. This is efficient, but unannounced.
  - Mouse: the same for #13.
  - Note: the earlier orphan re-check added a fake-agent row, "#59 Fake Co — Test Engineer 4.1", to the list. This is a sandbox artefact.
- **T7 (BROKEN): pass.**
  - Today › **Choose a design that passes** goes to Design with focus on the `<h1>`.
  - Keyboard: **Compact** card, Enter. The preview reads "Readable by screening systems", and **Discard changes** appears above the preview.
  - It took 8 Tabs past the remaining cards to reach **Make this my design for every CV**. Enter confirms "Compact is now your design for every new CV", with focus on that line.
  - Mouse: **Preview with** "Cobalt Freight — Staff Software Engineer", then **Lay out this CV again in Compact**: "Laid out again Oct 7 in Compact: Readable by screening systems".
  - Hesitation point: **Make this my design** is still disabled with no reason while the broken design is selected (already in the backlog).
- **T9 (POPULATED): pass.**
  - Keyboard: **Add a word** "seamless, cutting-edge, robust" and Enter adds three chips. The five existing words stay, and focus stays in the field.
  - **When rules apply** › **Make it again for Cobalt Freight — Staff Software Engineer**: the in-place Working card, focus on it, then "✓ Made Oct 7, 13:07, under your current rules".
- I found no regression against the M7 prototype in these three flows.

## Tokens and layout
- **Hard-coded colours outside tokens.css.** All are in `app/ui/src/app.css` and look pre-existing (top bar, search field and preview paper), not new in 0063ab11:
  - lines 47, 50, 57, 58, 59, 60, 63, 65 and 265, 266, 344 (`#ffffff`, `#a1a1aa`, `#27272a`, `#fafafa`, `#d4d4d8`, `#4ade80`);
  - lines 216, 217, 242, 336 (`#ffffff`, `#18181b`, the white CV paper).

  `app/ui/src/pages/mycv/Design.jsx:283` has `'#1f4e79'` as the colour input's fallback value (data, not styling).
- **Inline styles:** only `app/ui/src/pages/Skills.jsx:45` (the bar width, which is data-driven and acceptable).
- **Colour schemes.**
  - Dark: Skills, Companies' Fix panel, the job page and the Design gallery checked visually.
  - Light: the Design notice text is 6.8:1, its hint 7.5:1 and the buttons 17.7:1.
  - New badges ("Yours") and notices use the token colours in both schemes.
- **320 px.** No sideways scroll on Companies, Skills, Design, Writing rules, Profile, the job page, the orphan report page or the Help topic. Workspace still scrolls 71 px because of the assistant's install path (already in the backlog as B8-71; the new Data health list does not add to it).
- **200% zoom (640×400):** R-disc-01.

## Strengths
- The orphan-report path hangs together: a Data health entry, a real report page with a plain explanation and a cost-stated action, and the old "Job not found" links now redirect to the job.
- "Let this page decide" is a model of a safe change: it removes only the two keys, Undo restores the file exactly, and focus moves to Undo.
- "I've sent my application" reuses the **When did you apply…?** dialog, so the date is never silently "today". History picks the change up at once.
- "Back to automatic for Java" is labelled with the skill, announced, undoable, and keeps focus on the row.
- Help gains real topics (installing the assistant, making your own design, companies to skip), linked in context from Design and Companies.
- T3, T7 and T9 survive the rearrangement by keyboard and by mouse.
