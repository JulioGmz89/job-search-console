# Review: skills-cv-workspace
Sandbox: http://127.0.0.1:4401/ (POPULATED), http://127.0.0.1:4403/ (BROKEN) · Date: 2026-10-06
Verdict: **FAIL**

This phase fails on one finding:
- **R-skills-cv-workspace-02 (severity 3).** In My CV, typed changes to the CV (**Content**), the **Profile** form and **All rules** are thrown away without a word when the user clicks another section link or a top-bar destination. The page shows "Unsaved changes" beside **Save** but never warns, unlike **Design**, which does. One click on **Design** to "see how it looks" discards the edit.

Every claimed severity-3/4 fix is closed: F-001, F-002, F-007, F-019, F-021, WP-T6-01 and WP-T9-01. The new **Profile** page exists, saves, and keeps unknown keys and comments in `profile.yml`. All three top tasks pass their success criteria, checked against the API:
- **T6.** The filtered top three are gRPC, Prometheus and Machine Learning. gRPC is "3 good-fit postings", with Cobalt Freight among them.
- **T7 (BROKEN).** `style.template` is `executive`. The `cv-render` run for `cv-alex-rivera-cobaltfreight-012` succeeded, and report 12 has `ats.verdict: pass`, checked at 05:02Z.
- **T9.** `voice-dna.md` holds seamless, cutting-edge, robust and spearheaded. A `pdf` run for report 12 succeeded, queued 9 s after the rules were saved.

The other findings are severity 2 or lower:
- focus falls to `<body>` after most in-place actions;
- the skills page goes stale after **Improve the analysis**;
- Workspace › Tidy up shows raw script logs, and one tool always fails;
- codes and paths show in labels;
- the Workspace page scrolls sideways at 320 px.

How I tested:
- Viewport 1280 × 800, with a full reload (and session storage cleared) in each sandbox first.
- Keyboard first: Tab, Space, Enter, Escape and arrows. Then mouse.
- Live regions read from `#announce` and `#alert`, focus from `document.activeElement`. Data checked through `/api/skills`, `/api/profile`, `/api/cv/voice`, `/api/cv/style`, `/api/reports/:id` and `/api/runs`.
- Also checked in the dark scheme, at 640 × 400 (200 % zoom) and at 320 px.

State I left behind:
- **POPULATED:**
  - the skills analysis was improved (66 read by Claude);
  - `cv.md` gained the line "- **Learning:** gRPC", so gRPC now counts as "in your CV" and Learn next's order changed;
  - in the profile, "Lowest pay" is now $155K;
  - "seamless", "cutting-edge" and "robust" were added to the writing rules ("game-changing" was added and then removed);
  - report 12's CV was made again;
  - one **Remove links already in Applications** preview failed.
- **BROKEN:**
  - Executive is the saved design (I switched to broken and back once to reproduce WP-T7-05);
  - report 12's CV was laid out again;
  - the Tidy-up previews ran (nothing was merged).
- The browser is on POPULATED **Today**, 1280 × 800, in the light scheme.

## Claimed fixes

| ID | Status | Evidence |
|---|---|---|
| F-001 (4) no way to give the app your CV | **Closed.** **My CV › Content** is an editor holding the user's `cv.md` with **Save** and **Import from a file**. Save shows "Saved Oct 6, 22:56: Alex Rivera · Summary, … Skills." in view, focuses it, announces it and updates "Last saved". The edit survives a reload. Remaining: there is no preview (R-…-08), and unsaved edits are lost on navigation (R-…-02). | R-skills-cv-workspace-F-001.png, R-skills-cv-workspace-F-001-saved.png |
| F-002 (4) example rules replace saved rules with no confirm or undo | **Closed.** **All rules › Start from the example rules…** opens "Start from the example rules?", which mentions the `.bak` and Undo. Focus starts on **Cancel**. **Replace my rules** is announced. **Undo** sits in the bottom bar and stays in the Activity panel; clicking it restored all 5 words and the tone notes ("Undone: …"). Small points: focus returns to the trigger, not to **Undo**, and the dialog says "your 5 rules" although tone and bullet notes are replaced too. | R-skills-cv-workspace-F-002.png, R-skills-cv-workspace-F-002-replaced.png |
| F-007 (3) failing design silently produces failing PDFs | **Closed in this phase's scope.** Six places now speak up: <br>• Today: "Your CV design fails the screening check" with **Choose a design that passes**. <br>• The Design preview: "Screening problems" with **Show a design that passes**. <br>• Each gallery card: a verdict badge. <br>• Making a failing design the default asks "Use broken even though it fails screening?" and lists the designs that pass, with focus on **Cancel**. <br>• "Update 6 CVs to the broken design?" now warns. <br>• Applications shows no false "fails screening" (all 6 existing PDFs pass per the API). <br>Residual: **Make it again** on the job page does not warn (WP-T7-05). | R-skills-cv-workspace-T7-start.png, R-skills-cv-workspace-WP-T7-01.png |
| F-019 (3) unclear what makes a design the default; no confirmation | **Closed.** One primary button, **Make this my design for every CV**. Before saving, the page says "Unsaved changes: the preview shows them; your CVs don't use them until you make this your design." Saving shows "Executive is now your design for every new CV." in view, focused and announced. The card reads "Executive · your design". | R-skills-cv-workspace-WP-T7-03.png |
| F-021 (3) unreadable row named only by a code | **Closed (BROKEN).** Today shows "Quarry Systems #57: it has 9 columns instead of 10, so the score and status are in the wrong places." **Show me** goes to Workspace › Data health with the same text, plus "open data/applications.md in your editor, go to line 45, and make the row match the others …". Line 45 is correct in the sandbox file. | R-skills-cv-workspace-F-021.png |
| WP-T6-01 (3) fit filter changes only the headline | **Closed.** With **Only jobs I'd apply to (fit 4 and up)** ticked: <br>• the status reads "Counting only the 8 postings whose fit is 4 or more: every number, the evidence and the order below use just those. 6 skills with no good-fit posting are hidden."; <br>• the counts, the required / nice-to-have split, the bars and the order change ("Asked for in 3 good-fit postings (2 required, 1 nice to have)"); <br>• the evidence lists only the 3 good-fit postings and "Flagged as a gap in your fit reports (fit 4 and up)"; <br>• Strengthen re-ranks too; <br>• focus stays on the checkbox. | R-skills-cv-workspace-WP-T6-01.png |
| WP-T6-04 (1) same-name postings; no way back from a report | **Not closed.** Brightwater Health still lists "Data Engineer ↗ … Data Engineer ↗" and "Backend Engineer (Go) ↗ … Backend Engineer (Go) · fit 3.7 ↗", and Ember Payments' "Software Engineer, Payments ↗" has no fit. A gap link opens the job with only "← Applications". Browser Back returns to Skills with focus on the h1 and the evidence closed. | R-skills-cv-workspace-WP-T6-04.png |
| WP-T6-06 (1) Improve the analysis drops focus | **Not closed.** After Enter on **Improve the analysis**, the button becomes a Waiting card and `activeElement` is `<body>`. See also R-…-01 and R-…-09. | R-skills-cv-workspace-WP-T6-06.png |
| WP-T7-01 (2) Update existing CVs spreads a failing design without warning | **Partly closed.** The dialog now adds "This design fails the screening check. The updated PDFs would lose part of their text …". Initial focus is on **Update 6 CVs**, the harmful choice, not **Cancel**, so one Enter spreads the failing design (R-…-10). | R-skills-cv-workspace-WP-T7-01.png |
| WP-T7-03 (2) layout update scrolls to the top; progress and result off screen | **Partly closed.** The page no longer jumps. A Working card, then "Laid out again Oct 6 in executive: Readable by screening systems. Open the job's documents", appear where the button was, and both are announced. Focus still falls to `<body>` at start and at end (R-…-09). | R-skills-cv-workspace-WP-T7-03.png, R-skills-cv-workspace-T7-done.png |
| WP-T7-05 (2) job page Make it again rewrites in the failing design without warning | **Partly closed.** A confirm now appears: "The assistant rewrites it … in your design (broken)." It does not say that this design fails screening. Focus starts on **Make it again**, and a passing PDF would be replaced by a failing one (R-…-10). | R-skills-cv-workspace-WP-T7-05.png |
| WP-T7-06 (1) Choose a design that passes does nothing on the Design page | **Closed.** **Show a design that passes** selects and previews ATS Friendly ("Readable, 1 small issue") with the Unsaved note. Small points: it picks a design with an issue over the clean passes, and focus drops to `<body>`. | R-skills-cv-workspace-WP-T7-06.png |
| WP-T9-01 (3) target job cut off the remake list | **Closed.** "Your tailored CVs (6)" lists every job with a CV. **Cobalt Freight — Staff Software Engineer** is row 6, with "#12 · fit 4.2", **Open** and **Make it again**. | R-skills-cv-workspace-T9-words.png |
| WP-T9-05 (1) layout-only update reads as "made Oct 6" | **Closed.** After **Lay out this CV again in executive** (BROKEN), the Writing rules row still reads "Made Oct 6, 00:23, before your rules changed". | — |
| WP-T9-06 (2) Make it again in the list drops focus | **Partly closed.** During the run the next Tab lands on the row's own progress link, so the place is kept. But `activeElement` is `<body>` both during and after the run. After completion the next Tab goes to **All rules**, past the row's new **Open**. A screen-reader user is left with no focus at the moment the result appears (R-…-09). | R-skills-cv-workspace-WP-T9-06.png, R-skills-cv-workspace-T9-done.png |
| WP-T9-07 (1) target is last of six, below a same-company row; fit hidden | **Partly closed.** Rows now show "#12 · fit 4.2", so "best fit first" can be read. The target is still the 6th row, below "Cobalt Freight — Site Reliability Engineer". | R-skills-cv-workspace-T9-words.png |
| Profile page (PROJECT_PLAN §5 page 4) | **Exists and saves.** Its groups are About you, What you're looking for and How the app works for you, with **Make a tailored CV automatically when the fit is at least**. An out-of-range 7 gives "Enter a fit between 0 and 5, for example 3.5" next to the field, with `aria-invalid` and focus. **Save profile** shows "Profile saved Oct 6, 22:56." in view, focused and announced. After saving, `profile.yml` still holds its comment, `narrative`, `archetypes`, `location` and the other unknown keys. **Advanced files** lists `modes/_profile.md` and `article-digest.md` with their purpose. | — |

## Findings

### R-skills-cv-workspace-01: After "Improve the analysis" finishes, Skills keeps showing the old numbers and offers the same paid run again
- Severity: 2. "The skills analysis is up to date." is announced, but the screen still reads "30 read by Claude, 36 by quick rules" with **Improve the analysis** ("Reads 36 postings with Claude · about 4 sessions · uses your Claude plan"). A user may pay for a second run, or believe nothing happened. Only a full reload shows "66 read by Claude, 0 by quick rules".
- Where: Skills › basis line and **Improve the analysis**, in every view.
- Expected (ia.md §2.6): the basis line "shows the date the postings were last read, which updates after **Improve the analysis**, and accounts for every posting"; ia.md §3 Run feedback says "Done or failed updates the same spot".
- What happened:
  - The run card disappears, and the old basis line and button come back.
  - Switching to **Most asked for** still shows the old line.
  - After a reload the counts are right, but the date still says "last read Sep 25".
  - The announcement and the four Activity entries say only "The skills analysis is up to date.", not how many postings were read. Each of the four entries is titled "Improve the skills analysis".
  - While waiting, the card says "Waiting — 2 others are running"; the "others" are its own sessions.
- Reproduction: 1. `node app/ux/sandbox.mjs --state populated` 2. Open #/skills/learn and click **Improve the analysis**. 3. Wait about 20 s for "The skills analysis is up to date." 4. Observe the basis line still reads "30 read by Claude, 36 by quick rules" and the button is offered again. 5. Reload the page: "66 read by Claude, 0 by quick rules, … last read Sep 25".
- Evidence: app/ux/m8/evidence/R-skills-cv-workspace-01.png

### R-skills-cv-workspace-02: Unsaved edits to the CV, the profile and All rules are discarded without warning
- Severity: 3. The user loses what they typed, silently, in the place that closes F-001. The section links (**Content · Profile · Design · Writing rules**) look like tabs, and moving between them is the natural next step ("now let me see the design"). The sibling **Design** section warns ("Leave without saving your design?"), so users have no reason to expect the others won't.
- Where: My CV › **Content** (Your CV (Markdown)), **Profile** (every field), **Writing rules › All rules** (Your writing rules (voice-dna.md)). The component is `app/ui/src/pages/mycv/Content.jsx`, which tracks `dirty` only to show "Unsaved changes". The leave guard exists only in `Design.jsx`.
- Expected (ia.md §2.7 says "**Unsaved changes** warns before leaving" for Design; §3 Destructive actions: "confirm … or offer Undo"): leaving with unsaved edits asks first, or keeps the draft.
- What happened:
  - Content: I typed "- **Learning:** gRPC". "Unsaved changes" showed beside **Save**. I clicked **Profile**, then **Content**: the line was gone.
  - The same happened with the top-bar **Today** and browser Back.
  - **Profile**: I changed "Target pay" and clicked **Writing rules**. No prompt.
  - **All rules**: I typed one character and clicked **Content**. No prompt.
- Reproduction: 1. `node app/ux/sandbox.mjs --state populated` 2. Open #/my-cv/content and type a new line at the end of the CV. Observe "Unsaved changes". 3. Click **Design** (or **Today**). 4. Click **Content** again: the line is gone, and no dialog was shown.
- Evidence: app/ux/m8/evidence/R-skills-cv-workspace-02a.png (before), app/ux/m8/evidence/R-skills-cv-workspace-02.png (after returning)

### R-skills-cv-workspace-03: Workspace › Tidy up tools report failures that are not temporary, or not failures
- Severity: 2. **Remove links already in Applications** fails every time, in both sandboxes. It says "What happened: It stopped before it finished. What to do: Try again.", and trying again cannot help. **Check my list for problems** shows "Found problems: …" in its card but is filed in Activity as "Failed … It stopped before it finished … Try again", with an assertive "Check my list for problems didn't finish." Each attempt turns the top bar to **Activity · N failed**. It is not a top task and no data is at risk, but the user is misled about what went wrong and how to fix it. If a real workspace without `batch/batch-state.tsv` hits the same failure, this is a 3.
- Where: Workspace › Tidy up › **Remove links already in Applications** (the `reconcile` spec in `app/server/queue/specs.js`, which runs `reconcile-pipeline.mjs --dry-run`) and **Check my list for problems**. Also the Activity panel.
- Expected (ia.md §2.9): "Each has a preview first where upstream supports it, then a confirm". ia.md §2.8 Failed: **What happened** / **What to do** should say what actually happened.
- What happened:
  - The run's log says `Invalid --state: cannot resolve path (…\batch\batch-state.tsv)`, exit 1.
  - **Technical details** shows only "reconcile · lane script · exit 1", without the log line.
  - Validation exits non-zero when it finds problems, and the app files that as a failure.
- Reproduction: 1. `node app/ux/sandbox.mjs --state populated` (or `broken`) 2. Open #/workspace and click **Remove links already in Applications**. 3. Observe "Failed … It stopped before it finished. Try again." 4. In BROKEN, click **Check my list for problems**, then open **Activity**: it is listed as Failed, beside a card that says "Found problems".
- Evidence: app/ux/m8/evidence/R-skills-cv-workspace-03.png

### R-skills-cv-workspace-04: Tidy-up previews and results are raw script logs, not words
- Severity: 2. The preview is the decision point before a destructive merge. P2 cannot judge from it which applications would disappear.
- Where: Workspace › **Find duplicate applications**, **Check my list for problems** and **Find the right job board for a company** result areas.
- Expected (ia.md §2.9 "each issue in words", §2.2 "preview of the pairs, then confirm"; §3 Errors: "Codes and paths only under **Technical details**"): pairs and problems in plain sentences, with technical output folded away.
- What happened:
  - The duplicates preview is a monospaced log with emoji: "⚠️ Keep #4 and #24: exact-title match but advanced status requires exact report identity", "🗑️ Remove #23 … → kept #13", "(dry-run — no changes written)".
  - The list check prints "Non-canonical status", "No stale reservation sentinels", "No pending TSVs" and report file names.
  - The job-board finder prints "verify-portals: C:\…\portals.yml", "greenhouse/junipermobility (slug not found) — HTTP 404". It names no suggested board.
  - Its announcement is "Check companies' job boards: Done.", a different name from the button.
  - **Don't change anything** drops focus to `<body>`.
- Reproduction: 1. `node app/ux/sandbox.mjs --state broken` 2. Open #/workspace and click **Find duplicate applications**. 3. Read the preview. 4. Click **Check my list for problems** and **Find the right job board for a company**.
- Evidence: app/ux/m8/evidence/R-skills-cv-workspace-04.png

### R-skills-cv-workspace-05: Workspace scrolls sideways at 320 px, and the assistant path is cut off
- Severity: 2. This fails reflow (WCAG 1.4.10) on one page, and the text is clipped.
- Where: Workspace › **AI assistant** ("Claude Code version 2.1.0 is installed (C:\Users\…\fake-claude.js)"). My CV › Writing rules › Writing samples ("… writing-samples folder of your workspace (C:\Users\…\writing-samples)") overflows by 2 px.
- Expected (ia.md §1 Reflow): "At 320 px every page is one column with no sideways scroll."
- What happened: at 320 × 640, `scrollWidth` is 391 against `clientWidth` 305. The unbroken path runs past the card. 640 × 400 is fine on every page in scope.
- Reproduction: 1. `node app/ux/sandbox.mjs --state populated` 2. Resize to 320 × 640 and open #/workspace. 3. Scroll to **AI assistant**.
- Evidence: app/ux/m8/evidence/R-skills-cv-workspace-05.png

### R-skills-cv-workspace-06: Codes and file names appear in labels: "Lay out this CV again in ats", "standard design", "cv-alex-rivera-cobaltfreight-012"
- Severity: 2. The **Preview with** list shows the same job twice, once as a file code. Design names appear as lowercase ids in buttons.
- Where: My CV › Design › **Preview with**, the layout button and its result line. The job page's Tailored CV card.
- Expected (ia.md §2.7: **Preview with** "naming CVs by job"; §3 Labels and Errors: codes only under Technical details).
- What happened:
  - After T9, **Preview with** lists both "Cobalt Freight — Staff Software Engineer, Oct 6" and "cv-alex-rivera-cobaltfreight-012, Oct 6".
  - The buttons read "Lay out this CV again in standard / in executive / in ats", and the result line "Laid out again Oct 6 in standard". The gallery shows "ATS Friendly", "Executive" and "Standard".
  - The job card says "standard design", and the Today card says "the “broken” design".
  - The screening diagnosis shows raw checker text, "Found 1 <table> element(s). Table-based layouts scramble the reading order ATS extractors follow". ia.md asks for a 3-line diagnosis ("the name and 3 headings are lost").
  - The use-anyway dialog ends with "…in the body of the CV..".
  - Writing samples and Profile print full paths and file names (`config/profile.yml`, `C:\…\writing-samples`).
- Reproduction: 1. `node app/ux/sandbox.mjs --state populated` 2. Make it again on Cobalt Freight — Staff Software Engineer from My CV › Writing rules, and wait. 3. Open My CV › Design and expand **Preview with**. 4. Click **ATS Friendly** and read the layout button.
- Evidence: app/ux/m8/evidence/R-skills-cv-workspace-design-populated.png

### R-skills-cv-workspace-07: Skills lacks Category, Find a skill and the bar's axis label
- Severity: 2. **Most asked for** has about 60 rows, and there is no way to find one skill or to narrow by kind. The bars have no scale.
- Where: Skills, all three views.
- Expected (ia.md §2.6 Filters: **Category**, **Find a skill**; each row "a bar with an axis label").
- What happened: only **Only jobs I'd apply to (fit 4 and up)** and **Show skills I ignored** are present. The bar is decorative (`aria-hidden`) with no axis. Category shows as a slug under the name ("cloud-infra", "ai-ml").
- Reproduction: 1. `node app/ux/sandbox.mjs --state populated` 2. Open #/skills/asked and look for a way to find "Kafka".
- Evidence: app/ux/m8/evidence/R-skills-cv-workspace-skills-learn.png

### R-skills-cv-workspace-08: My CV › Content has no preview, and Save is disabled with no reason in view
- Severity: 2. People who do not read Markdown (P2) cannot see what their CV will look like while they edit it.
- Where: My CV › Content.
- Expected (ia.md §2.7 "A Markdown editor with a preview"; §3 Empty states: "Never present a disabled main action without the reason in view").
- What happened: "What the app reads from it" summarises the sections, but no rendered preview exists. With no edits, **Save** is disabled and nothing says "No changes to save". The same holds for **Save** in All rules and for **Make this my design for every CV** when the current design is already selected.
- Reproduction: 1. `node app/ux/sandbox.mjs --state populated` 2. Open #/my-cv/content.
- Evidence: app/ux/m8/evidence/R-skills-cv-workspace-F-001.png

### R-skills-cv-workspace-09: Focus falls to the page body after in-place actions
- Severity: 2. Keyboard and screen-reader users meet it on T6, T7 and T9.
- Where:
  - Skills: **Improve the analysis**, and choosing a value in "Your CV has …" (the row leaves the list).
  - Design: **Lay out this CV again in …** (start and end), **Show a design that passes**.
  - Writing rules: **Make it again** on a list row (start and end).
  - Workspace: **Don't change anything**.
- Expected (ia.md §3 Focus): "After an action that replaces its own button, focus moves to the new state's heading or primary action."
- What happened: `document.activeElement` is `<body>` after each of these. After a skill status change the Undo bar is bottom-left and is not focused. **Undo** in the Activity panel works and is announced. Good counter-examples in the same phase: **Save**, **Save profile**, **Make this my design for every CV** and the confirm dialogs all move focus correctly.
- Reproduction: 1. `node app/ux/sandbox.mjs --state populated` 2. My CV › Writing rules, Tab to **Make it again for Cobalt Freight — Staff Software Engineer**, and press Enter. 3. Check `document.activeElement` (body). 4. Wait about 10 s for "✓ Made Oct 6, …, under your current rules", press Tab, and observe focus on **All rules**, past the row's new **Open**.
- Evidence: app/ux/m8/evidence/R-skills-cv-workspace-WP-T9-06.png, app/ux/m8/evidence/R-skills-cv-workspace-WP-T6-06.png

### R-skills-cv-workspace-10: Risky confirms start on the risky button, and Make it again does not mention a failing design
- Severity: 2. A single Enter spreads a design that screening systems cannot read, or replaces a readable CV with an unreadable one.
- Where:
  - "Update 6 CVs to the broken design?" (focus on **Update 6 CVs**);
  - "Make the tailored CV for … again?" (focus on **Make it again**, and no screening warning);
  - "Leave without saving your design?" (focus on **Leave without saving**, not **Stay**).
- Expected (ia.md §3 Destructive actions; F-020 practice elsewhere in the build): destructive or harmful confirms focus **Cancel**. The Make-it-again confirm names the screening failure as the Update dialog now does. "Use broken even though it fails screening?" already gets both right.
- Reproduction: 1. `node app/ux/sandbox.mjs --state broken` 2. Open #/applications/4 and click **Make it again**. 3. Read the dialog ("in your design (broken)") and note that focus is on **Make it again**.
- Evidence: app/ux/m8/evidence/R-skills-cv-workspace-WP-T7-05.png, app/ux/m8/evidence/R-skills-cv-workspace-WP-T7-01.png

### Lower findings (severity 1)
- **R-skills-cv-workspace-11.** WP-T6-04 remains: same-title postings cannot be told apart, and Back from a report closes the evidence (see Claimed fixes).
- **R-skills-cv-workspace-12.** Writing samples are listed without **Open** (ia.md §2.7).
- **R-skills-cv-workspace-13.** Workspace › Tidy up has 4 tools. **Check companies' job boards** (ia.md §2.9) is missing, and the job-board finder announces itself under that name instead.
- **R-skills-cv-workspace-14.** Profile hints repeat the sandbox user's own values: "e.g. Austin, TX (remote)", "e.g. Remote in the US; a week a quarter on site is fine" and "e.g. $165K–190K" (hard-coded in `Profile.jsx` lines 21–22). The first-run placeholder rule (PW-A-T1-02) says examples should be neutral. Also, "Language of reports and documents" expects a code ("en").
- **R-skills-cv-workspace-15.** Adding a word gives no visible confirmation; only the announcement and the new chip show it (the M7 prototype showed "Added "robust". It applies to the next tailored CV or letter."). The placeholder stays "e.g. seamless" after "seamless" is added.
- **R-skills-cv-workspace-16.** A file name made at 22:57 on Oct 6 is dated `…-2026-10-07.pdf` (UTC), next to "Made Oct 6, 22:57".
- **R-skills-cv-workspace-17.** The Design gallery takes about 15–25 s on first open while it says "a few seconds the first time…".
- **R-skills-cv-workspace-18.** The skill status select is labelled "Your CV has gRPC" with the value "Missing". Read together, it says "Your CV has gRPC: Missing".

## Tokens and layout
- **Hard-coded colours outside `tokens.css`:**
  - this phase's surfaces: `app/ui/src/app.css:216` (`.preview` `#ffffff`, `#18181b`), `:217` (`#18181b`), `:242` (`iframe.doc` `#ffffff`), `:336` (`.thumb-img` `#ffffff`);
  - the shell top bar (from earlier phases, still present): `app.css:47`, `:50`, `:57`, `:58`, `:59`, `:60`, `:63`, `:65`, `:265`, `:266`, `:344` (`#ffffff`, `#a1a1aa`, `#27272a`, `#fafafa`, `#d4d4d8`, `#4ade80`);
  - `app/ui/src/pages/mycv/Design.jsx:298` uses `#1f4e79` as the colour picker's fallback value (data, not styling).
- **Inline styles:** `app/ui/src/pages/Skills.jsx:45` sets the bar width (`style={{ width: … }}`). It is computed, but it is the only inline style.
- **Dark scheme:** Skills, My CV (all four sections), Workspace and Help are legible. The verdict badges, chips and the Activity "failed" button hold contrast.
- **640 × 400:** no sideways scroll on any page in scope.
- **320 px:** Workspace overflows (R-…-05) and Writing rules overflows by 2 px. All other pages are one column.

## Strengths
- The fit filter on Skills is now honest end to end. One sentence says what changed and how many skills are hidden, and every number, bar, list and the order follow it. The T6 answer is quick by keyboard or mouse.
- Design guards against the F-007 harm in the right places. Choosing a failing design asks first, names the designs that pass and focuses **Cancel**. Every card carries its screening verdict. The save confirmation names the design, in view and focused.
- The writing-rules chips do what T9 needs without touching the rest of the file. Adding is quick by Enter or **Add**, × offers Undo, and the example-rules replace is confirmed, backed up and undoable from the Activity panel.
- The remake list is complete and counted, rows show fit, and a remade row says "✓ Made Oct 6, 22:57, under your current rules" in place, with **Open**.
- Data health turns the old "row-unparseable" into a sentence with the company, the row, the line and the fix.
- The Profile page round-trips YAML safely: comments and unknown keys survive, errors sit next to the field, and saving is confirmed with focus.
- Help topics all exist, each has its own `<title>` and focuses its h1, and an unknown topic falls back to the list with a sentence.
