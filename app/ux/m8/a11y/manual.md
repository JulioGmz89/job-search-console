# M8 accessibility re-measure: the manual half (PROJECT_PLAN.md §12.2 method 6)

The scripted half is `app/ux/m8/a11y/axe-summary.md`: 0 axe violations on 35 views, both
colour schemes, 100% and 200%. It was not re-run. This file holds the manual passes that
axe cannot do: keyboard only, focus visibility, contrast of states, reflow, accessible
names in context and live regions. Severity uses the 0–4 scale of `app/ux/README.md`.
axe impact is an input to severity, not the severity itself. IDs are `A8-NN`. Evidence
is in `app/ux/m8/a11y/evidence/A8-NN.png` (CSS scale).

## Method

- **Date:** 2026-10-07. Branch `feat/m8-ux-build` at 7cbc1d60.
- **Browser:** Chromium through the Playwright MCP, at 1280×800 unless stated.
  `browser_emulate_media` set `colorScheme` to `light` and to `dark`.
- **Sandboxes (fresh, started by the orchestrator, default `--delay 8000`, scenario `auto`):**

  | State | URL | Used for |
  |---|---|---|
  | empty | http://127.0.0.1:4402/ | T1, then first-job in the same session |
  | populated | http://127.0.0.1:4401/ | T2, T3, T5, T4, T6, T9 (in that order), contrast, reflow, names |
  | broken | http://127.0.0.1:4403/ | T8, then T7, the dark ATS-fail badge |

- **Keyboard only.** Every task used Tab, Shift+Tab, Enter, Space, Escape and the arrows.
  Text was typed into the focused field (Playwright `fill` on the field that already had
  focus). A page load between tasks was the only non-keyboard step.
- **Instrumentation.** A `focusin` listener logged every focus stop with its accessible
  name, outline style and colour, and `:focus-visible`. `document.activeElement` was read
  after every action. A `MutationObserver` logged every change to `#announce` and
  `#alert`. Contrast was computed from `getComputedStyle` colours, with ancestor opacity
  and translucent backgrounds composited, and checked against `app/ui/src/tokens.css`.
- **Data side effects of the audit.** In populated, T2 ran before T3, so row 41 (Kestrel
  Media, 4.1) sat between rows 12 and 13 during T3. Rows 12 and 13 were set to Applied as
  T3 expects. Row 14 was set to Applied while testing the Undo bar, then restored to
  "Reviewed — not applied". In broken, two extra checks of a made-up posting
  (`nosuchcompany`) were run after T7 and T8 had finished, to watch the live regions and
  the focus move.

## Pass 1: Keyboard only through the top tasks

| Task | Sandbox | Completable by keyboard alone | Trap | Lost focus (`activeElement` = BODY) | Invisible focus |
|---|---|---|---|---|---|
| T1 First run | empty | **Pass** | none | none: focus goes to "Saved: Alex Rivera…", then to **You're set up** | "Choose a file…": the file input takes focus with no visible ring (A8-04) |
| first-job | empty | **Pass** | none | none: focus goes to the run card, then to **Open the job**, then to the job's h1 | none |
| T2 Add job by URL | populated | **Pass** | none | none, but on completion focus is pulled from wherever the user is to **Open the job** (A8-02) | none |
| T3 Mark two Applied | populated | **Pass** | none. The status listbox and the "When did you apply…?" dialog hold focus and return it on Escape | none: after **Save as Applied**, focus goes to the next row's status button | none |
| T4 Scan | populated | **Pass** | none | none: focus goes to the scan summary section | none |
| T5 CV + cover letter | populated | **Pass** (search combobox → row 6 → **Make tailored CV** → **Write cover letter**, three answers, Tone, **Write the letter**) | none | none. The finished CV did not pull focus out of the letter form | none |
| T6 Learn next | populated | **Pass** (**Only jobs I'd apply to** with Space, then **Show the evidence for gRPC** with Enter) | none | none | none |
| T7 Design + ATS | broken | **Pass**, with effort: the PDF preview adds about 9 Tab stops each way between the designs and **Make this my design** (A8-07) | none: Tab leaves the PDF viewer | **Yes**: after **Lay out this CV again in Standard** finishes (A8-01) | the PDF viewer's first stops (A8-07) |
| T8 Failed run | broken | **Pass**: Today › **Try again**, then the run link › **Open the job** (row 41). The run log opens from the run title link | none | **Yes**: straight after **Try again**, and still after the retry finishes (A8-01) | none |
| T9 Writing voice | populated | **Pass** (**Add a word** "seamless, cutting-edge, robust" + Enter, then **Make it again for Cobalt Freight — Staff Software Engineer**) | none | **Yes**: when the remake finishes (A8-01) | none |

The success criteria were checked against the API after each task. T1: cv saved,
Kestrel Media followed. first-job: row 1, fit 4.1. T2: row 41. T3: rows 12 and 13 are
Applied. T4: scan succeeded; the announcement names 4 new openings and Juniper Mobility.
T5: `/api/reports/6` has `pdf.exists` true and a cover letter. T6: gRPC with its
evidence. T7: `style.template` is `standard`; the `cv-render` run for
`cv-alex-rivera-cobaltfreight-012` succeeded; `ats.verdict` is `pass`, checked 13:32Z.
T8: a succeeded evaluate run and row 41, Driftwood Analytics, Data Engineer. T9: the
voice text contains the three words and "spearheaded"; a pdf run for report 12
succeeded.

**Other keyboard checks.**

| Check | Result |
|---|---|
| Skip link | First stop on every page. It moves focus to `main` |
| Route change | Focus moves to the page h1 and the title changes ("Kestrel Media — Senior Backend Engineer — Job Search Console") |
| Applications grid (React Aria) | One Tab stop. The arrows move between rows and cells, and the status button and **Actions** button are reached inside the cells. ArrowUp reaches the column headers; Enter sorts, and `aria-sort` changes to `ascending` |
| Status select (row and job page) | Enter opens the listbox. The arrows move without saving. Enter on **Applied** opens the "When did you apply…?" alertdialog with focus on **Cancel**. Tab wraps inside the dialog. Escape closes it and returns focus to the status button |
| Row **Actions** menu | Enter opens it with focus on **Open the job**. Escape closes it and returns focus to the button |
| Activity panel | Enter on **Activity** moves focus to the panel heading. Escape inside the panel closes it and returns focus to **Activity**. The panel is non-modal: Shift+Tab leaves it for the page beneath (A8-03). Escape does nothing while focus is on the page beneath |
| Top-bar search | It is a combobox with `aria-activedescendant`. The arrows move through the results, Enter opens one, and Escape closes the list |
| Menu at 640 px | **Menu** has `aria-expanded` and opens the six page links |

## Pass 2: Focus visibility by element type

Light scheme: the ring is a 3 px solid `#6d28d9` outline with a 2 px offset (6.81:1 on
`--bg`), and `#c4b5fd` in the top bar (on `#18181b`). Dark scheme: `#c4b5fd` (10.37:1 on
`#0f0f11`).

| Element type | Example | Visible in light | Visible in dark |
|---|---|---|---|
| Links | nav links, "What a check costs", row links | Pass | Pass |
| Buttons, primary and secondary | **Check fit now**, **Save for later**, **Try again** | Pass | Pass |
| Chips, selected and unselected (M6 A-05) | **All (40)** selected | Pass: the ring sits outside the dark fill | Pass |
| React Aria Select (status) | trigger, then options with an inset outline | Pass | Pass |
| React Aria Menu (Actions, Tidy up) | menu items | Pass | Pass |
| React Aria table | row, cell and column header: inset outline | Pass | Pass |
| Switches | "Check Brightwater Health for new openings" | Pass: the ring is around the track | Pass |
| Checkboxes | To review row checkbox | Pass | Pass |
| `<details>` summaries | "Show the evidence for gRPC", "Technical details" | Pass | Pass |
| Search combobox | the input has a ring; the active option is shown by fill and text colour | Input pass. Active option weak (A8-06) | Input pass. Active option weak (A8-06) |
| Dialog (alertdialog) | "When did you apply…?" | Pass: focus on **Cancel**, ringed | Pass |
| Activity panel | heading (tabindex −1), **Close**, run links | Pass, but page controls beneath the panel can be focused while hidden (A8-03) | Same |
| Undo bar | **Undo**, **Hide** | Pass: the ring is inverted to `--bg` on the dark bar | Pass |
| Hidden file inputs | "Choose a file…" (Today), "Import from a file" (My CV) | **Fail** (A8-04) | **Fail** |
| PDF preview iframe | My CV › Design | **Fail** on entry (A8-07) | Same |

Focus order follows the visual order on every page tested. The one exception is the
Activity panel, which comes after `main` in the DOM although it sits on the top right.

## Pass 3: Contrast in both schemes

The token pairs listed in `tokens.css` were confirmed on rendered elements. The cases
axe cannot see are shown with the rendered (composited) values.

| Item | Light | Dark | Result |
|---|---|---|---|
| Primary button text (F-008) | `#ffffff` on `#6d28d9`, 7.10:1; hover `#ffffff` on `#5b21b6`, 8.98:1 | `#18181b` on `#a78bfa`, 6.51:1; hover on `#c4b5fd`, 9.60:1 | Pass |
| ATS-fail badge, "Screening problems" (F-008) | `--danger-text` on `--danger-soft` | `#fca5a5` on `#450a0a`, 8.51:1 | Pass |
| Warn and OK badges | — | `#fcd34d` on `#422006`, 10.11:1; `#86efac` on `#052e16`, 10.62:1 | Pass |
| Focus ring | `#6d28d9` on `#fafafa`, 6.81:1 | `#c4b5fd` on `#0f0f11`, 10.37:1 | Pass |
| Control boundaries (inputs, selects, chips, secondary buttons, menu buttons) | `#71717a` on `#ffffff`, 4.83:1 | `#a1a1aa` on `#18181b`, 6.91:1; on `#0f0f11`, 7.47:1 | Pass |
| Switch off state | track border and thumb `#71717a` on `#ffffff`, 4.83:1 | `--border-strong` | Pass |
| Activity button "done" ring | — | `#4ade80` 2 px on `#09090b`, 11.42:1 | Pass |
| Whole-page text scan (every visible text node, opacity composited) | Applications, Design: 0 failures except disabled controls | Applications, Design: 0 failures except disabled controls | Pass |
| Row just moved by a status change (`tr.moved td { opacity: 0.7 }`) | "Moved to Applied" `#166534` at 70% on white, **3.57:1**; status select border at 70%, **2.74:1** | `#86efac` at 70%, 6.72:1; border 4.04:1 | **Fail in light** (A8-05) |
| Search combobox active option | fill `#ede9fe` vs `#ffffff`, **1.19:1** | fill `#2e1065` vs `#18181b`, **1.16:1** | Weak (A8-06) |
| Disabled buttons (opacity 0.55) | 3.15:1 | 2.80:1 | Exempt (WCAG 1.4.3 inactive components) |

## Pass 4: 200% zoom (640×400) and 320 px wide (400%)

Fifteen views were measured: Today, Applications, the job page (6), To review,
Companies, the three Skills views, the four My CV sections, Workspace, Activity and Help.

| Width | Sideways page scroll | Cut off or unreachable | Overlap | Result |
|---|---|---|---|---|
| 640 (200%) | none on all 15 views | Applications hides the **Documents** and **Checked** columns below 1024 px (A8-08) | none. The top bar folds into **Menu**, **Search**, **Activity**, **Workspace** | Pass, apart from A8-08 |
| 320 (400%) | Workspace scrolls 86 px sideways (A8-09). My CV › Writing rules scrolls 2 px (negligible) | Applications becomes cards with labelled cells, but the column headers, and so all sorting, are gone at 600 px and below (A8-08) | none | Pass, apart from A8-08 and A8-09 |

The Activity panel is full width at 600 px and below. At 640 px it covers about two
thirds of the page; see A8-03.

## Pass 5: Accessible names (accessibility snapshot)

| Repeated control | Name in the accessibility tree | Result |
|---|---|---|
| Status select (Applications rows, job page) | "Status for Cobalt Freight — Staff Software Engineer", with the value as the button text | Pass |
| Row menu | "Actions for Cobalt Freight — Staff Software Engineer"; the menu takes the same name | Pass |
| To review: Check fit / Open the posting / Remove | "Check fit for Brightwater Health — Data Engineer", "Open the posting ↗ Brightwater Health — Data Engineer (new tab)", "Remove Brightwater Health — Data Engineer" | Pass |
| To review checkboxes | the job title, location and posting date | Pass |
| Companies: Edit / Remove / Fix / switch | "Edit Brightwater Health", "Remove Brightwater Health", "Fix Juniper Mobility", "Check Brightwater Health for new openings" | Pass |
| Words to avoid | "Remove spearheaded", … | Pass |
| Writing rules: Open / Make it again | "Open the tailored CV for … (new tab)", "Make it again for …" | Pass |
| Documents: Open / Download | "Open the tailored CV for Granite Cloud — Software Engineer, Payments (new tab)", "Download the cover letter for …" | Pass |
| Today: Try again / Dismiss / Got it | "Try again Check fit · Driftwood Analytics — Data Engineer", "Dismiss Check fit · …", "Got it : Check fit · …" | Pass |
| Cancel (cover-letter form, status dialog) | "Cancel", inside the form "Cover letter questions for Granite Cloud — …" or the dialog "When did you apply to …?" | Pass (named by its container) |
| Today "Open the job" (two links to the same job) | "Open the job" | Minor (A8-11) |
| Search results | two options both read "Job Granite Cloud — Senior Backend Engineer" (application #16, Aug 30, and a later one, Sep 24) | Minor (A8-11) |
| Landmarks | skip link, `banner`, `navigation "Main"`, `main`, sub-navigation "Skills views" / "My CV sections" with `aria-current="page"`, named regions | Pass |
| Headings | one h1 per page. My CV › Writing rules and › Design place h2 sections under an h2 sub-page heading | Minor (A8-10) |
| Skills ranking | a `section` of `div` rows with `<b>1. gRPC</b>`: no list, no headings | Minor (A8-10) |
| Design cards | toggle buttons with `aria-pressed`: "Standard Readable by screening systems" | Pass |
| PDF preview iframe | title "Preview of Driftwood Analytics — Data Engineer, Oct 7 in the broken design" | Pass |

## Pass 6: Live regions (`#announce` polite, `#alert` assertive)

Text read from the regions as each event happened:

| Event | Region | Text |
|---|---|---|
| CV saved (T1) | announce | "Your CV is saved: Alex Rivera · Summary, Experience (2 roles), Education, Skills" |
| Company followed, set-up done (T1) | announce | "You're set up." |
| Check started (first-job, T2) | announce | "Started: Check fit · greenhouse.io/kestrelmedia, job 4134913. About 2 to 5 minutes." |
| Check finished (first-job, T2) | announce | "Check fit · Kestrel Media — Senior Backend Engineer: Fit 4.1 / 5. The fit report is ready." |
| Status saved (T3) | announce | "Cobalt Freight — Staff Software Engineer set to Applied, applied Oct 7. Undo is available." |
| Scan started and finished (T4) | announce | "Started: Check for new openings", then "Check for new openings: 4 new openings: Driftwood Analytics — Site Reliability Engineer; Harbor Learning — Full Stack Engineer; Lumen Grid — Platform Engineer; Mosaic Retail — Platform Engineer. Juniper Mobility: the job board couldn't be reached (board not found). Fix it in Companies." |
| Tailored CV started and finished (T5) | announce | "Started: Tailored CV · Granite Cloud — Software Engineer, Payments", then "…: Your tailored CV is ready." |
| Cover letter started and finished (T5) | announce | "Started: Cover letter · Granite Cloud — …", then "…: Your cover letter is ready." |
| Skills filter (T6) | in-page `role=status` | "Counting only the 9 postings whose fit is 4 or more: …" |
| Words added (T9) | announce | "Added seamless, cutting-edge, robust to the words to avoid." |
| Remake started and finished (T9) | announce | "Started: Tailored CV · Cobalt Freight — Staff Software Engineer. About 3 minutes.", then "…: Your tailored CV is ready." |
| Design saved (T7) | announce | "Standard is now your design for every new CV." |
| Re-layout started and finished (T7) | announce | "Started: Update design · Cobalt Freight — …", then "…: The CV was laid out again. Readable by screening systems." |
| Retry started and finished (T8) | announce | "Started again: Check fit · Driftwood Analytics — Data Engineer", then "Check fit · Driftwood Analytics — Data Engineer: Fit 4.1 / 5. The fit report is ready." |
| A run **fails** | alert | Not observed live: the only failing run (broken's launcher) fails before the page opens, and `--scenario auto` succeeds afterwards. In code (`app/ui/src/runs.jsx` line 49), a run that ends `failed` announces "`<title>` didn't finish. `<what happened>`" on `#alert` (assertive). Rejected input and save errors also go to `#alert` (`AddJob.jsx` lines 54 and 77, `StatusControl.jsx` line 108) |
| Bulk selection in To review | none | Ticking a checkbox shows **Check fit for selected (1)** and **Remove selected (1)** without any announcement (A8-12) |

## M6 accessibility findings: status

| M6 | Statement | Status in M8 | Evidence from this pass |
|---|---|---|---|
| F-005 (A-03) | Run logs cannot be opened from the keyboard | **Closed** | Every run card's title is a link to `#/activity/<id>`. Today's failed card names the job, says "What happened" and "What to do", and offers **Try again**. T8 passes by keyboard. **Technical details** is a native `<details>` |
| F-006 (A-06) | Run progress, completion and saves are never announced | **Closed** | `#announce` carried every start, finish and save in all ten tasks (Pass 6). Failures go to `#alert` (in code; not observed live, see Pass 6) |
| F-008 (A-08) | Dark scheme: white on amber buttons (1.67:1) and the ATS-fail badge (2.69:1) | **Closed** | Dark primary: `#18181b` on `#a78bfa`, 6.51:1. "Screening problems" badge: `#fca5a5` on `#450a0a`, 8.51:1 |
| F-014 (A-01) | Pipeline rows and sortable headers are mouse-only | **Closed** at widths above 600 px. Each row has a link; the grid reaches its headers with the arrows; Enter sorts and `aria-sort` follows | At 600 px and below the headers are hidden, so sorting is lost there (A8-08, a new and smaller issue) |
| F-020 (A-02) | The cover-letter dialog does not behave as a dialog | **Closed** | The cover letter is now an inline form in the Documents card. Focus moves into it, and **Cancel** is next to **Write the letter**. The one modal left, the "When did you apply…?" alertdialog, takes focus, wraps Tab, closes on Escape and returns focus to its trigger |
| F-022 (A-04) | The status select saves on the first arrow key, then drops focus | **Closed** | The arrows only move inside the listbox. Saving needs Enter and then **Save as Applied**. Focus then moves to the next row's status button |

Other M6 a11y findings re-checked along the way: A-05 (ring invisible on selected
chips) is closed. A-11 (repeated controls share one name) is closed; Pass 5 has two
minor leftovers (A8-11). A-12 (tabs without panels) is closed: the sub-pages are links
with `aria-current`. A-13 (no main, no skip link, one title for every page) is closed.
A-14 (faint boundaries) is closed: 4.83:1 and 6.91:1. A-16 (toast "Open log" vanishes
after 6 s) is closed: the Undo bar lasts 10 s, stays while focused, and its Undo is
repeated in the Activity panel. A-15 (focus lost to the body) is mostly closed; three
run-card paths remain (A8-01). A-10 (sideways scroll at 320 px) is closed except
Workspace (A8-09).

## Findings

### A8-01: Focus falls to the page body when a run started from a card is retried or finishes there
- **Severity:** 2
- **Where:** Today › Needs you › "Check fit · Driftwood Analytics — Data Engineer" › **Try again**; My CV › Design › **Lay out this CV again in …**; My CV › Writing rules › When rules apply › **Make it again for …**
- **Tasks:** T7, T8, T9
- **Capabilities:** UI-run-retry, UI-cv-render, UI-mycv-remake
- **Method:** a11y (WCAG 2.4.3 Focus Order)
- **Evidence:** app/ux/m8/a11y/evidence/A8-01.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state broken --port 4400`, open http://127.0.0.1:4400/
  2. Tab to the skip link and press Enter. Press Tab twice, to **Try again**, and press Enter.
  3. Observe: `document.activeElement` is `BODY` at once. The card re-renders as "Failed, tried again", and the "Needs you · a fit check didn't finish" label goes. When the retry finishes, focus is still on `BODY`, and the card's **Open the job** is not focused.
  4. Same pattern on My CV › Design: focus moves to the run link after **Lay out this CV again in Standard**, then falls to `BODY` when the run finishes. On Writing rules, the same happens after **Make it again for Cobalt Freight — Staff Software Engineer**.
- **Notes:** The live regions still announce the start and the result, and the next Tab lands on the card's first link, so the task can be finished. But a screen-reader user's point of regard is lost at the moment the task's main action is taken. `RunItem.jsx` keeps `justRetried` in component state, and that state is lost because the card is remounted under a new group on Today. `Design.jsx` and `Writing.jsx` focus a run link that is replaced when the run ends. The focus should move to the element that replaces it: the retry outcome's **Open the job**, or the re-layout result line.

### A8-02: A finished check pulls focus from wherever the user is to "Open the job"
- **Severity:** 2
- **Where:** Applications › Add a job (also Today › Check your first job) › the run card's **Open the job**
- **Tasks:** T2, first-job
- **Capabilities:** UI-pipeline-evaluate-now, UI-run-outcome-open
- **Method:** a11y (WCAG 2.4.3 Focus Order; WCAG 3.2.5 Change on Request is the AAA form)
- **Evidence:** app/ux/m8/a11y/evidence/A8-02.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/#/applications
  2. Type a posting link into **Link to the job posting** and press Enter. Then Tab on to the **All (40)** chip, or into **Search** and start typing.
  3. Observe: about 8 s later focus jumps to **Open the job** in the run card above. Keys typed into Search go to the link, and Enter would open the job.
- **Notes:** `AddJob.jsx` line 42 focuses the result unconditionally. `Documents.jsx` line 48 already has the right guard: move focus only if it is on the body or inside the card. With real checks taking 2–5 minutes, the user is very likely to be somewhere else on the page when this fires.

### A8-03: The Activity panel hides focused controls on the page beneath it
- **Severity:** 2
- **Where:** Top bar › **Activity** panel (non-modal) over Applications › table › **Actions** and **Status** columns, and over the top bar's search and **Workspace**
- **Tasks:** T2, T3, T5, T8
- **Capabilities:** UI-shell-panel-close, UI-pipeline-status-cell
- **Method:** a11y (WCAG 2.4.11 Focus Not Obscured (Minimum))
- **Evidence:** app/ux/m8/a11y/evidence/A8-03.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/#/applications
  2. Tab to **Activity** and press Enter. Press Shift+Tab: focus leaves the panel for the last table row. Press ArrowRight until **Actions for Ironleaf Security — Site Reliability Engineer** has focus.
  3. Observe: the focused button (x 1101–1192) lies entirely under the 400 px panel. Escape does nothing, because the panel's Escape handler only listens inside the panel.
- **Notes:** At 640 px wide the panel covers about two thirds of the page, so most page controls can be focused unseen. Options: close the panel when focus leaves it, or make Escape work from anywhere while it is open, or reserve its width in the layout.

### A8-04: The hidden file inputs take focus with no visible indicator
- **Severity:** 2
- **Where:** Today › Get set up › Add your CV › **Choose a file…**; My CV › Content › **Import from a file**
- **Tasks:** T1, first-job
- **Capabilities:** UI-today-cv-file, UI-mycv-content-import
- **Method:** a11y (WCAG 2.4.7 Focus Visible)
- **Evidence:** app/ux/m8/a11y/evidence/A8-04.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state empty --port 4400`, open http://127.0.0.1:4400/
  2. Tab to **Your CV**, then press Tab once more.
  3. Observe: focus is on `input#cv-file`, a 1×1 px `visually-hidden` input. The "Choose a file…" label next to it shows no ring, and nothing on screen marks the focus. Enter does open the file picker.
- **Notes:** Pasting is the main route, so T1 is not blocked. A rule such as `.visually-hidden:focus-visible + .file-button` cannot apply here, because the label comes before the input. Put the input before the label, or style the label with `:has(+ input:focus-visible)`.

### A8-05: Light scheme: a row moved by a status change drops below contrast minimums
- **Severity:** 2
- **Where:** Applications › table › a row just saved to another status ("Moved to Applied")
- **Tasks:** T3
- **Capabilities:** UI-pipeline-status-cell
- **Method:** a11y (WCAG 1.4.3 Contrast (Minimum); WCAG 1.4.11 Non-text Contrast)
- **Evidence:** app/ux/m8/a11y/evidence/A8-05.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/#/applications in the light scheme.
  2. Press Enter on the **Reviewed — not applied** chip, then set row 12 to Applied (status button › Enter › ArrowDown › Enter › **Save as Applied**).
  3. Observe: `tr.moved td { opacity: 0.7 }`. "Moved to Applied" (13 px bold, `#166534`) composites to 3.57:1 on white. The row's status button border composites to 2.74:1. The row stays fully operable.
- **Notes:** Dark passes (6.72:1 and 4.04:1). The dimming signals "this row has left the filter", but the row is still live and its text is the confirmation. Keep the cue without opacity: for example a muted background, or full-strength text with a "Moved" badge.

### A8-06: The search combobox shows its active option only by a faint fill and a text-colour change
- **Severity:** 1
- **Where:** Top bar › **Find a job, company or document** › results list
- **Tasks:** T5
- **Capabilities:** UI-shell-search
- **Method:** a11y (WCAG 1.4.11 Non-text Contrast)
- **Evidence:** app/ux/m8/a11y/evidence/A8-06.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/ with `prefers-color-scheme: dark`.
  2. Tab to the search box, type "co" and press ArrowDown.
  3. Observe: the active option differs from the others by fill `#2e1065` on `#18181b` (1.16:1; light `#ede9fe` on white, 1.19:1) and a text colour shift. The React Aria menus and listboxes add a 3 px outline (`.menu-item[data-focus-visible]`); this list has none.
- **Notes:** `aria-activedescendant` is set correctly, so screen readers are fine. Add the same inset outline to `.menu-item[data-focused]` inside `.search-popover`.

### A8-07: The PDF preview on My CV › Design adds about 9 invisible Tab stops in the middle of the T7 path
- **Severity:** 2
- **Where:** My CV › Design › Preview (iframe "Preview of … in the … design"), between the design cards and **Make this my design for every CV**
- **Tasks:** T7
- **Capabilities:** UI-cv-theme-pick, UI-cv-save, UI-cv-render
- **Method:** a11y (WCAG 2.4.7 Focus Visible; WCAG 2.4.3 Focus Order)
- **Evidence:** app/ux/m8/a11y/evidence/A8-07.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state broken --port 4400`, open http://127.0.0.1:4400/#/my-cv/design
  2. Choose **Standard** with Enter, then press Tab past **Chinese Minimal**, **Fine-tune** and **Details**.
  3. Observe: focus enters the iframe (`activeElement` = IFRAME, outline none) and then walks the Chromium PDF viewer's toolbar. About 9 more Tabs are needed to reach **Update existing CVs to this design**, and the first stop shows nothing. Getting back to **Preview with** from the action buttons takes about 20 Shift+Tabs. It is not a trap.
- **Notes:** T7 needs the preview document to be chosen *before* the design actions, so a keyboard user crosses the viewer at least twice. Options: `tabindex="-1"` on the iframe with an **Open the preview** link, or put the action buttons before the preview in the DOM.

### A8-08: At 200% and 400% zoom the Applications table drops two columns, then all sorting
- **Severity:** 2
- **Where:** Applications › table, at viewport widths of 1023 px and below, and of 600 px and below
- **Tasks:** T3
- **Capabilities:** UI-pipeline-sort, UI-pipeline-open-row
- **Method:** a11y (WCAG 1.4.10 Reflow)
- **Evidence:** app/ux/m8/a11y/evidence/A8-08.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/#/applications at 640×400 (200% of 1280×800).
  2. Observe: the **Documents** and **Checked** columns are `display: none` (`.hide-md`), so which documents exist and the check date are not shown, and sorting by date is gone.
  3. Resize to 320 px wide. Observe: the rows become cards with labelled values ("Fit: 4.1"), but `thead` is `display: none`. There is no column header and no other sort control, so the list can only be read in the default order (fit, best first).
- **Notes:** T3 still passes, because the default order is the one it needs. Reflow may restack content, but should not remove content or functions. Keep Documents and Checked as labelled card lines (the ≤600 px CSS already has `::before` labels for them), and add a **Sort by** select for narrow widths.

### A8-09: Workspace scrolls sideways at 320 px because of the assistant's install path
- **Severity:** 1
- **Where:** Workspace › AI assistant › "Claude Code version 2.1.0 is installed (C:\Users\…\fake-claude.js)"
- **Tasks:** —
- **Capabilities:** UI-workspace-ai-check
- **Method:** a11y (WCAG 1.4.10 Reflow)
- **Evidence:** app/ux/m8/a11y/evidence/A8-09.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/#/workspace at 320 px wide.
  2. Scroll to **AI assistant**.
  3. Observe: the unbroken path overflows its paragraph (`scrollWidth` 351 vs 223), and the whole page scrolls 86 px sideways (`documentElement.scrollWidth` 391 vs 305).
- **Notes:** A real install path is just as long. Add `overflow-wrap: anywhere` to paths, as for `code` elsewhere. The other 14 views do not scroll sideways at 320 px.

### A8-10: The Skills ranking and two My CV sub-pages lack list and heading structure
- **Severity:** 1
- **Where:** Skills › Learn next / Strengthen / Most asked for › the ranked rows; My CV › Writing rules and › Design › section headings
- **Tasks:** T6, T7, T9
- **Capabilities:** UI-skills-expand, UI-mycv-subnav
- **Method:** a11y (WCAG 1.3.1 Info and Relationships)
- **Evidence:** app/ux/m8/a11y/evidence/A8-10.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/#/skills/learn
  2. Observe in the accessibility tree: `section "Learn next: skills list"` holds `div.skill-row` items whose names are `<b>1. gRPC</b>`. There is no list, no list items and no heading, so a screen-reader user cannot jump from skill to skill or hear "16 items".
  3. Open #/my-cv/writing. Observe: h2 "Writing rules" is followed by h2 "Words to avoid" and h2 "When rules apply", which belong under it. #/my-cv/design has the same pattern: h2 "Design", then h2 "Designs" and h2 "Preview".
- **Notes:** Use `ol`/`li` (or `role=list`) for the ranking, and an h3 for each skill name; make the sub-page sections h3.

### A8-11: A few repeated links and search results share a name
- **Severity:** 1
- **Where:** Top-bar search results; Today › Needs you and Just finished › **Open the job**
- **Tasks:** T5, T8
- **Capabilities:** UI-shell-search, UI-today-done-open, UI-run-outcome-open
- **Method:** a11y (WCAG 2.4.6 Headings and Labels; WCAG 2.4.4 Link Purpose (In Context))
- **Evidence:** app/ux/m8/a11y/evidence/A8-11.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/. Tab to the search box and type "Gran".
  2. Observe: two options read "Job Granite Cloud — Senior Backend Engineer" (application #16, Aug 30, fit 3.3, and a later one, Sep 24, fit 2.2). They cannot be told apart by sight or by ear.
  3. In `--state broken`, after **Try again** finishes, Today shows two links named only "Open the job" (in the retried card and in Just finished).
- **Notes:** Add the application number or date to search labels, as the Applications table does ("#16"). The two "Open the job" links go to the same place and each sits next to the job's name, so they pass "in context". Naming them ("Open the job: Driftwood Analytics — Data Engineer") helps link-list navigation.

### A8-12: Selecting links in To review shows bulk buttons without announcing them
- **Severity:** 1
- **Where:** To review › link list › row checkbox › **Check fit for selected (n)** / **Remove selected (n)**
- **Tasks:** T4
- **Capabilities:** UI-review-select, UI-review-bulk-check, UI-review-bulk-remove
- **Method:** a11y (WCAG 4.1.3 Status Messages)
- **Evidence:** app/ux/m8/a11y/evidence/A8-12.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/#/to-review
  2. Tab to the first row's checkbox and press Space.
  3. Observe: **Check fit for selected (1)** and **Remove selected (1)** appear in the list header, above and behind the focus, and neither `#announce` nor any `role=status` changes.
- **Notes:** A polite "1 selected. Check fit for selected and Remove selected are above the list." would tell a screen-reader user that the bulk actions exist. The Applications filter already does this with its "Showing 9 of 41 (filtered)." status.

## Summary

| Severity | Count | IDs |
|---|---|---|
| 4 | 0 | — |
| 3 | 0 | — |
| 2 | 7 | A8-01, A8-02, A8-03, A8-04, A8-05, A8-07, A8-08 |
| 1 | 5 | A8-06, A8-09, A8-10, A8-11, A8-12 |
| 0 | 0 | — |

All ten tasks (T1–T9 and first-job) can be completed with the keyboard alone, and none
has a keyboard trap. T7 costs the most keystrokes (A8-07). T7, T8 and T9 each lose
focus once, at the moment their run ends or is retried (A8-01). All six M6 findings
named in the brief (F-005, F-006, F-008, F-014, F-020, F-022) are closed.
