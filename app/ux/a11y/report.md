# Accessibility audit (M6, method 6): WCAG 2.2 AA

Auditor: `a11y-auditor`. Date: 2026-10-04. UI as of `feat/m6-ux-baseline` @ 82f26a59. No UI code was changed.
(The harness keeps subagents from writing report files, so the orchestrator saved this report verbatim from the auditor's reply.)

## Method

1. **Scripted pass.** `node app/ux/a11y/audit.mjs` ran axe-core 4.13 (tags wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa) over 18 views × 2 schemes × 2 zooms = 72 scans. It used its own sandboxes on ports 4410–4412. Output: `axe-results.json`, `axe-summary.md`.
2. **Manual passes** were run in Playwright's Chromium at 1280×800 (unless stated) against fresh sandboxes:
   - `populated`: http://127.0.0.1:4400/ (T2–T6, T9, all page checks)
   - `broken`: http://127.0.0.1:4401/ (T7, T8)
   - `empty`: http://127.0.0.1:4402/ (T1)

   Each sandbox ran `--delay 8000` and `--scenario auto`.
   - **Keyboard only.** Only Tab, Shift+Tab, Enter, Space, Escape and the arrow keys were used. There were two exceptions: free text was entered with Playwright `fill` (it is typing, not pointing), and focus was occasionally placed programmatically to *re-test a behaviour* once its reachability was already established. Focus was traced with a `focusin` logger and `document.activeElement`.
   - **Contrast.** Exact colours came from `getComputedStyle`. Ratios were computed with the WCAG relative-luminance formula, in `prefers-color-scheme: light` and `dark`.
   - **Names and roles.** `browser_snapshot` (the accessibility tree) plus DOM queries for landmarks, headings, `aria-*` and live regions.
   - **Reflow.** 640×400 (200% of 1280×800) and 320×640 (400%).
3. **Severity** follows `app/ux/README.md`:
   - 4: a keyboard or screen-reader user cannot complete the task.
   - 3: the task is completed only with great difficulty, or content is lost.
   - 2 and 1: lesser barriers.

   axe impact was an input, not the rating.

## 1. Scripted pass (axe)

| Scheme | Critical | Serious | Moderate | Minor |
|---|---|---|---|---|
| light | 3 | 18 | 0 | 0 |
| dark | 3 | 14 | 0 | 0 |

Counts are distinct (rule, view) pairs per scheme, at any zoom (from `axe-summary.md`).

| Rule | Impact | Fails on | Finding |
|---|---|---|---|
| `select-name` | critical | cv-studio in all three states (empty, populated, broken), both schemes, both zooms: `.section-order > select` ("Add a section to order…") | A-07 |
| `color-contrast` | serious | **Light:** every page. Muted `#78716c` on `#f4f2f0` = 4.29:1 (inactive nav tabs, table headers, `summary` help toggles, `.pdf-frame` text). **Dark:** sources, sources-add-form, skills, skills-expanded, cv-studio; `.chip.primary` white on `#fbbf24` = 1.66:1 and white on `#fb7185` (`.ats-badge.ats-fail`) = 2.69:1. Also pipeline, report-detail, cover-dialog, report-pdf-tab: selected-chip count `.n` `#73716f` on `#f5f5f4` = 4.45:1 | A-08, A-09 |

axe passed the scan inputs, the voice textarea and the Skills status selects. They are named by placeholder or `title`, which satisfies the rule but not the user (see A-07, A-11). axe cannot see keyboard operability, focus management, live regions, hover or selected states, or reflow. Those come from the manual passes below.

## 2. Manual passes: results

### 2.1 Keyboard only, per task

| Task | Result | Traps | Mouse-only elements met on the path | Notes |
|---|---|---|---|---|
| T1 (empty) | **Fail** (for everyone) | none | Disabled "Evaluate now" and "Add" are not focusable, so their `title` reasons cannot be reached | No keyboard-specific blocker beyond the UI's own dead end. The "1 issue(s) in portals.yml" summary is reachable. |
| T2 (populated) | **Pass**, with barriers | none | Row click to open the report (UI-pipeline-open-row) | URL field, then Tab, then Enter on "Evaluate now". Focus fell to `<body>` and nothing was announced. Row 41 "Kestrel Media · 4.1 · Apply" can be read in the table, but the report itself cannot be opened from Pipeline (A-01). |
| T3 (populated) | **Pass**, with a hazard | none | Column-header sort (UI-pipeline-sort) | "Evaluated" chip, Enter, then the row 12 status select, ArrowDown. The first arrow press **saves** and the row leaves the view, with focus on `<body>`. Row 13 likewise. Any other target status is reachable only through intermediate saves (A-04). |
| T4 (populated) | **Pass** | none | none | Enter on "Scan now". Result text (4 new, Juniper Mobility unreachable, "board not found") is readable in the page, but focus fell to `<body>` and completion was not announced (A-06, A-15). |
| T5 (populated) | **Pass, with great difficulty** | none (the dialog fails to contain focus rather than trapping it) | Row click for the detail tabs (step 8) | Enter on "PDF" (focus lost). Then Enter on "Cover": the dialog opens, focus stays on the row button behind the scrim, and **18 background stops** (filtered to 4 rows) or about 160 (all 41 rows) precede the first field. Escape does nothing. The tone select works with arrows. Submit jumps to Runs with focus on `<body>` (A-02). |
| T6 (populated) | **Pass** | none | none | Tab to "▸ gRPC", then Enter (`aria-expanded` toggles); the evidence is readable. Report links in the evidence (`#/pipeline/NNN`) are the only keyboard route into a report detail. |
| T7 (broken) | **Pass** | none | none | The CV select is pre-set to Cobalt Freight 012. Tab to the "Compact · ATS pass" card, Enter (`aria-pressed` true), then about 9 Tabs to "Save & render this CV", Enter. The run succeeded and the verdict became "✓ ATS check passed", but neither was announced and focus fell to `<body>`. |
| T8 (broken) | **Fail** | none | **Run rows on Runs (UI-runs-open)** | The Runs page has six tab stops: five nav buttons and "How runs work". The failed run's row cannot be focused, and its text ("Failed · Evaluate job-boards.greenhouse.io · report 041") names neither the job nor the reason. The log and the cause cannot be reached, so the user cannot say what went wrong or which job to retry (A-03). |
| T9 (populated) | **Pass** | none (Tab passes through the PDF preview iframe, and Tab in the textarea moves focus) | none | Edit the textarea, then Tab and Enter on "Save voice rules". The confirmation appears in an unannounced `div.notice` at the top of the page, out of view, and focus falls to `<body>`. Row 12 "PDF ↻": run succeeded. |

Summary: 6 pass, 1 passes only with great difficulty (T5), 2 fail (T1 for everyone; **T8 for keyboard and screen-reader users only**).

### 2.2 Focus visibility and order

| Page / element | Visible? | Order follows visual order? |
|---|---|---|
| All pages: nav, chips, buttons, inputs, selects, summaries | Yes. The app has no `:focus`/`:focus-visible` rules and no `outline: none`, so Chromium's default two-tone ring shows in both schemes | Yes (Pipeline, Sources, Skills, CV Studio traced) |
| Selected chips (`aria-pressed="true"`: current nav page, active status filter, Skills view) in **light** mode | **No** (A-05) | Yes |
| Selected chips in dark mode | Yes | Yes |
| Cover-letter dialog | Ring visible, but focus is not moved into the dialog, not held, and not returned (A-02) | No: background controls come first |
| After actions (Evaluate now, PDF, Scan now, Save voice rules, Save & render, status select change, Draft and render) | Focus is lost to `<body>` (A-15, A-04) | n/a |
| CV preview iframe (PDF viewer) | Enters and exits with Tab; no trap | Yes |
| Toast "Open log" / "×" | Visible | Tab stop 189 of 190 on Pipeline; gone after 6 s (A-16) |

### 2.3 Contrast, both schemes

| Element / state | Light | Dark | Result |
|---|---|---|---|
| Body text | `#1c1917` on `#fbfaf9` | `#f5f5f4` on `#1c1917` | Pass |
| Primary chip (`.chip.primary`: Scan now, Save & render, Render this CV, Learn next, Add submit) | white on `#b45309` 5.02 | white on `#fbbf24` **1.67** | Dark **fail** (A-08) |
| ATS fail badge | white on `#9f1239` 8.02 | white on `#fb7185` **2.69** | Dark **fail** (A-08) |
| Muted text on `--surface-2` (nav tabs, `th`, help summaries) | **4.29** | 5.56 | Light **fail** (A-09) |
| Muted text on a hovered row / selected row (not seen by axe) | **4.30 / 4.31** | 5.56 / 5.78 | Light **fail** (A-09) |
| Green score on a hovered row / selected row | **4.49 / 4.50** | 8.0 | Light fail on hover (A-09) |
| Selected-chip count `.n` (opacity 0.6) | pass | **4.45** | Dark **fail** (A-09) |
| ATS warn badge, "required" badge, pending hint (`#b45309` on `#fef3c7`) | 4.51 | 8.73 | Pass (margin 0.01) |
| Error/warn text ("board not found", `.warn-text`) | `#9f1239`, pass | `#fb7185` on `#262322` 5.80 | Pass |
| Input and chip boundaries (`--border`) against the surface | **1.31** | **1.42** | **Fail 1.4.11** (A-14) |
| Status-cell select fill against the row | 1.12 (border transparent until hover/focus) | n/a | Fail 1.4.11 (A-14) |
| Focus ring | UA two-tone | UA two-tone | Pass, except on selected chips in light mode (A-05) |
| Disabled controls (opacity 0.5) | n/a | n/a | Exempt |

Note: there is no `color-scheme` declaration. In dark mode the scan inputs, checkboxes and some native controls stay white, which jars but does not fail contrast.

### 2.4 Zoom and reflow

| Page | 640×400 (200%) | 320 wide (400%) |
|---|---|---|
| Pipeline | Pass. Only the data table scrolls inside `.table-wrap`, which 1.4.10 allows. | **Fail**: page scrolls horizontally (381 px in 305 px). The nav does not wrap and "CV Studio" is off-screen (A-10). |
| Sources | Pass | **Fail** (same nav overflow) |
| Skills | Pass | **Fail** (same) |
| Runs | Pass | **Fail** (same) |
| CV Studio | Pass | **Fail**: 439 px wide. Nav overflow, the voice-dna.md path does not wrap, and the CV select is clipped at the edge. |
| Cover-letter dialog | Pass: the dialog gets `max-height` and scrolls internally, so all buttons stay reachable | not measured (blocked by the page-level overflow) |

No overlapping controls were observed at either size.

### 2.5 Names, roles, landmarks, status messages

| Check | Result |
|---|---|
| Landmarks | `banner` (header) and `navigation` only. **No `main`**, no skip link (A-13) |
| Headings | Pipeline: h1 then h4 (only inside the maintenance help). Skills: only the h1. Runs: h1, h2. CV Studio: h1, h3, h4. The detail panel has h2 and h3 (A-13) |
| Page title | Always "Job Search Console" on all five pages and the report deep links (A-13) |
| Nav | Buttons with `aria-pressed`, not links with `aria-current` (A-13, minor) |
| Clickable rows and headers | Pipeline `tr` and `th.sortable`, and Runs `tr`: no role, no tabindex, no key handler (A-01, A-03) |
| Tabs | Report detail: three `role="tab"` without `role="tabpanel"`, `aria-controls` or roving tabindex; arrows do nothing (A-12). Skills views are `aria-pressed` toggle buttons (acceptable) |
| Dialog | `div.dialog` without `role="dialog"`, `aria-modal` or `aria-labelledby` (A-02) |
| Controls without a usable name | Section-order select (no name). Voice textarea, accent hex input, scan "Only this company…" and "Last N days", Skills "Find a skill…": placeholder only (A-07). Repeated or ambiguous names: row buttons, status selects, Skills status, inbox "Evaluate", Edit/Remove, "↑ ↓ ×" (A-11) |
| Live regions | Exactly one: the toast's `role="status"`, inserted together with its text and removed after 6 s. Run panel (start, progress, Finished/Failed), save notices, ATS verdict and scan result: none (A-06) |
| Progress | `<progress>` in the run panel has no accessible name (A-06) |
| Disabled reasons | Carried only in `title` on disabled (unfocusable) buttons (A-15 notes, T1) |
| Target size (2.5.8) | Row chips 47–77×21, section buttons 21×18, table checkboxes 13×13. All pass through the spacing exception |

### 2.6 Suspects listed before the audit

| Suspect | Verdict |
|---|---|
| Clickable table rows and sortable headers not reachable by keyboard | **Confirmed**: Pipeline rows and headers (A-01). Runs rows too, which blocks T8 (A-03) |
| Cover-letter dialog: no `role="dialog"`, no focus trap, no Escape | **Confirmed**, and focus is not moved in or returned (A-02) |
| No `:focus-visible` styles | **Confirmed but mostly harmless.** The UA ring is visible almost everywhere; it fails only on selected chips in light mode (A-05) |
| White text on `#fbbf24` in dark mode (`.chip.primary`) | **Confirmed**, 1.67:1. The ATS-fail badge at 2.69:1 also fails (A-08) |
| Unlabelled inputs | Section-order select **confirmed** (no name at all). Voice textarea and scan inputs: named only by placeholder; the voice one is misleading (A-07). Skills per-row select: has a `title` name that does not identify the skill (A-11) |
| Tabs without tabpanels or arrow keys | **Confirmed** for the report detail (A-12). Not applicable to Skills (toggle buttons) |
| No `<main>` landmark or skip link | **Confirmed** (A-13) |
| Run progress and save results not announced | **Confirmed** (A-06) |

---

## Findings

### A-01: Pipeline rows and sortable column headers are mouse-only, so the report detail cannot be opened from the table
- **Severity:** 3
- **Where:** Pipeline › table › any row (opens the detail) and the headers "#", "Date", "Company", "Role", "Score ↓", "Status", "Decision"
- **Tasks:** T2, T5 (also every "read the report" step)
- **Capabilities:** UI-pipeline-open-row, UI-pipeline-sort, UI-pipeline-detail-tab-report, UI-pipeline-detail-tab-pdf, UI-pipeline-detail-tab-cover, UI-pipeline-detail-run-badges
- **Method:** a11y (WCAG 2.1.1 Keyboard; 4.1.2 Name, Role, Value)
- **Evidence:** app/ux/evidence/A-01.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/
  2. Tab to "Filter company, role, notes…", then press Tab once more.
  3. Observe: focus jumps to the first row's "Status for Brightwater Health" select. No header or row ever gets focus. `th.sortable` and `tbody tr` have `onClick` but no tabindex, role or key handler. Enter and Space on a row's buttons do not open the detail.
- **Notes:** Keyboard and screen-reader users cannot open a report's reasoning, its PDF and cover-letter tabs, or its run badges from Pipeline. The only keyboard routes are both undiscoverable: the "report NNN" links inside Skills evidence, or typing `#/pipeline/<id>` into the address bar. The table cells keep score and decision readable, so T2's answer is still reachable. The sort headers also carry `aria-sort`, which tells a screen reader they sort even though they cannot be operated. Fix with a real `<button>` (or link) in the company/role cell and buttons inside the `th`.

### A-02: The cover-letter dialog is not a dialog: focus stays behind it, Tab walks the page first, Escape does nothing
- **Severity:** 3
- **Where:** Pipeline › row "Cover" › "Cover letter for <company>" dialog
- **Tasks:** T5
- **Capabilities:** UI-pipeline-row-cover, UI-pipeline-cover-dialog, UI-pipeline-cover-why, UI-pipeline-cover-problem, UI-pipeline-cover-approach, UI-pipeline-cover-tone, UI-pipeline-cover-submit, UI-pipeline-cover-cancel
- **Method:** a11y (WCAG 2.4.3 Focus Order; 4.1.2 Name, Role, Value; 2.1.2 No Keyboard Trap (containment); 2.4.11 Focus Not Obscured (Minimum))
- **Evidence:** app/ux/evidence/A-02.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/ and type "Granite" into "Filter company, role, notes…".
  2. Tab to row 6's "Cover" and press Enter.
  3. Observe: the dialog opens, but focus stays on "Cover" behind the scrim (screenshot). `div.dialog` has no `role="dialog"`, `aria-modal` or `aria-labelledby`.
  4. Press Escape: nothing happens.
  5. Press Tab: focus goes through 18 dimmed background controls (status selects, Re-evaluate/PDF/Cover on three rows, five maintenance buttons and a summary) before "A. Why this role / company?". With the filter cleared it is about 160 stops.
  6. "Draft and render the letter" navigates to Runs with focus on `<body>`. "Cancel" removes the dialog without returning focus to "Cover".
- **Notes:** A screen-reader user is never told a dialog opened, and the form is appended at the end of the DOM. Background controls stay operable, so they can queue another row's PDF while the dialog is open. Inside the dialog the fields are labelled correctly (wrapping `<label>`). Use `<dialog>`/`showModal()` or equivalent: move focus to the heading or first field, contain Tab, close on Escape, and return focus to "Cover".

### A-03: Run logs cannot be opened by keyboard, so a failed run cannot be diagnosed
- **Severity:** 4
- **Where:** Runs › "Finished" table › any row (e.g. "Failed · Evaluate job-boards.greenhouse.io")
- **Tasks:** T8 (also T4, T5 and T7 whenever the user wants the log)
- **Capabilities:** UI-runs-open, UI-global-toast-open-log, R-runs-post
- **Method:** a11y (WCAG 2.1.1 Keyboard; 4.1.2 Name, Role, Value)
- **Evidence:** app/ux/evidence/A-03.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state broken --port 4401`, open http://127.0.0.1:4401/#/runs
  2. Press Tab repeatedly.
  3. Observe: focus visits "Pipeline", "Sources", "Skills", "Runs", "CV Studio", "How runs work", then leaves the page. The failed run's `tr` has `tabIndex -1` and contains no button or link. Its visible text names neither the job (only "job-boards.greenhouse.io", "report 041") nor the cause.
- **Notes:** The log is the only place that says the session ended without writing a report. A keyboard or screen-reader user therefore cannot learn what went wrong, or even which posting to retry, so T8 cannot be completed. The only keyboard routes to a log are the toast's "Open log" (gone after 6 s, see A-16) and the jump after submitting a cover letter. Make the run label a button or link (`#/runs/<id>`), and show the failure reason and URL in the row.

### A-04: The Pipeline status select saves on the first arrow key, then drops focus
- **Severity:** 3
- **Where:** Pipeline › table › "Status for <company>" select
- **Tasks:** T3
- **Capabilities:** UI-pipeline-status-cell, R-pipeline-status
- **Method:** a11y (WCAG 3.2.2 On Input; 2.4.3 Focus Order; 3.3.4 Error Prevention (Legal, Financial, Data) as a contributing factor)
- **Evidence:** app/ux/evidence/A-04.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/, Tab to the "Evaluated" chip and press Enter.
  2. Tab to row 12's "Status for Cobalt Freight" (value Evaluated) and press ArrowDown once.
  3. Observe: `PATCH /api/pipeline/rows/12/status` is sent at once ("Applied"), the row leaves the filtered table, and `document.activeElement` is `<body>` (screenshot: no focus anywhere).
  4. In the "All" view, focus row 1's select (Hired) and press ArrowUp twice: the first press saves "SKIP" and drops focus, and the second press goes nowhere.
- **Notes:** On Windows Chromium, arrowing a closed select fires `change` for every option. A keyboard user who wants "Interview" from "Evaluated" writes Applied, then Responded, and so on, each as a tracker edit, and must re-find the select after every step. A user exploring the options with arrows changes their records without meaning to, which defeats T3's "nothing else should change". The ambiguous name is covered in A-11. Commit on blur or Enter (or use a listbox/menu button), and keep focus on the control after the save.

### A-05: The focus ring is invisible on selected chips in the light scheme
- **Severity:** 2
- **Where:** All pages › nav (current page pill); Pipeline › status filter chips (the active one, e.g. "All 41"); Skills › "Learn next" / "Deepen" / "Most demanded" (the active one)
- **Tasks:** T2–T9 (the first or second Tab on every page lands on the current-page pill)
- **Capabilities:** UI-nav-pipeline, UI-nav-sources, UI-nav-skills, UI-nav-runs, UI-nav-cv, UI-pipeline-status-filter, UI-skills-tab-learn
- **Method:** a11y (WCAG 2.4.7 Focus Visible; 2.4.13 Focus Appearance (AAA, for reference))
- **Evidence:** app/ux/evidence/A-05.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/ in the light scheme and Tab to "Evaluated 9", then press Shift+Tab.
  2. Observe: "All 41" is focused (`:focus-visible` matches) but no ring can be seen. Chromium's dark inner ring merges with the `#1c1917` chip, and its white outer ring is lost on the `#fbfaf9` page. The same happens on the current nav pill.
- **Notes:** The app sets no focus styles at all. The UA ring works on every other control in both schemes, and on selected chips in dark mode, so the suspect "no `:focus-visible` styles" is mostly refuted. A single `:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }` would fix this case and make the ring consistent.

### A-06: Run progress, completion, save results and the ATS verdict are never announced
- **Severity:** 3
- **Where:** Pipeline › run panel under "Paste a job posting URL…"; Sources › scan run panel; CV Studio › "Save & render this CV" run panel, ATS verdict, "voice-dna.md saved…" notice; Skills › fetch/extract; global toast
- **Tasks:** T2, T4, T5, T7, T9
- **Capabilities:** UI-pipeline-evaluate-now, UI-sources-scan, UI-cv-render, UI-cv-voice-save, UI-cv-save, UI-skills-extract, UI-global-toast-open-log, UI-shared-run-close
- **Method:** a11y (WCAG 4.1.3 Status Messages; 4.1.2 Name, Role, Value for the unnamed `<progress>`)
- **Evidence:** app/ux/evidence/A-06.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/#/cv, Tab to the "Voice — writing rules" textarea, edit it, Tab to "Save voice rules" and press Enter.
  2. Observe: the confirmation "voice-dna.md saved. It applies to the next cover letter or PDF." is inserted as a `div.notice` without a role at the **top** of the page, out of view (screenshot taken at the button). Focus is on `<body>`.
  3. On Pipeline, evaluate a URL: the run panel goes "Running → Finished" with an unnamed `progressbar`. No ancestor has `aria-live` or `role="status"/"log"/"alert"`; a MutationObserver recorded 0 live insertions.
- **Notes:** A screen-reader user is not told that the agent started or finished, whether it failed, that the scan found 4 new postings and one unreachable board, or that the ATS verdict changed from fail to pass. They must hunt for the outcome after an indeterminate wait of up to minutes. The only live region in the app is the toast (`role="status"`), inserted together with its text, which several screen readers ignore, and removed after 6 s. Add a persistent polite live region per run panel for state changes (not every log line), give `<progress>` an `aria-label`, and place save notices next to their button with `role="status"`.

### A-07: Several form fields have no label, only a placeholder, or a misleading placeholder
- **Severity:** 2
- **Where:** CV Studio › Look › section order › "Add a section to order…" select (no name); CV Studio › Voice — writing rules › textarea (name = placeholder "No voice-dna.md yet. Seed it from upstream's template…", even when the file exists); CV Studio › Accent colour › hex text box (name = "theme default"); Sources › "Only this company…", "Last N days"; Skills › "Find a skill…"
- **Tasks:** T7, T9, T4
- **Capabilities:** UI-cv-section-add, UI-cv-voice-text, UI-cv-accent, UI-sources-company, UI-sources-since, UI-skills-search
- **Method:** a11y (WCAG 1.3.1 Info and Relationships; 3.3.2 Labels or Instructions; 4.1.2 Name, Role, Value; axe `select-name`, critical)
- **Evidence:** app/ux/evidence/A-07.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/#/cv and Tab to the select after the section-order buttons.
  2. Observe: the accessibility tree gives it no name (axe `select-name`).
  3. Tab on to the voice textarea, which holds the seeded rules. Observe: its accessible name is "No voice-dna.md yet. Seed it from upstream's template, or write your own rules.", which contradicts what is in it. The "Voice — writing rules" h3 is not associated with it.
  4. On Sources, the two scan filters are named only by placeholder, which disappears as soon as the user types.
- **Notes:** The section-order select is optional, so this is a 2. The voice textarea matters for T9: a screen-reader user is told there are no rules, then finds text. Associate visible labels (the h3, "Accent colour", the scan options) with `<label for>` or `aria-labelledby`.

### A-08: Dark scheme: white text on amber primary buttons (1.67:1) and on the ATS-fail badge (2.69:1)
- **Severity:** 3
- **Where:** Sources › "Scan now", "Add" (form submit); Skills › selected "Learn next" view; CV Studio › "Save & render this CV", "Render this CV", gallery badge "ATS fail · <n> critical"
- **Tasks:** T4, T6, T7, T9
- **Capabilities:** UI-sources-scan, UI-sources-form-submit, UI-skills-tab-learn, UI-cv-render, UI-cv-theme-pick
- **Method:** a11y (WCAG 1.4.3 Contrast (Minimum); axe `color-contrast`, serious)
- **Evidence:** app/ux/evidence/A-08.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/#/sources with `prefers-color-scheme: dark`.
  2. Observe: "Scan now" is `#ffffff` on `#fbbf24` = 1.67:1 at 12.5 px. `.chip.primary` hard-codes `color: #fff` while `--accent` becomes `#fbbf24` in dark mode.
  3. Open http://127.0.0.1:4401/#/cv (`--state broken`) in dark mode: the selected "broken" card's "ATS fail" badge is white on `#fb7185` = 2.69:1 at 11 px.
- **Notes:** These are the primary action of each page and the one warning meant to be impossible to miss. For a low-vision user in dark mode the labels are effectively blank. Use `color: var(--bg)` (dark text) on the amber and rose fills, or darker fills.

### A-09: Muted text falls just below 4.5:1, including states axe cannot see
- **Severity:** 2
- **Where:** All pages › inactive nav tabs, table column headers, help `summary` toggles (light: `#78716c` on `#f4f2f0` = 4.29); Pipeline › hovered row (muted cells 4.30, green score 4.49) and selected row (muted 4.31); Pipeline › selected status chip count (dark: 4.45)
- **Tasks:** —
- **Capabilities:** UI-nav-pipeline, UI-pipeline-status-filter, UI-pipeline-addjob-help, UI-runs-help
- **Method:** a11y (WCAG 1.4.3 Contrast (Minimum))
- **Evidence:** app/ux/evidence/A-09.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state broken --port 4401`, open http://127.0.0.1:4401/#/runs in the light scheme.
  2. Observe: "Sources", "Skills", "CV Studio" and the table headers "STATUS", "RUN"… are `#78716c` on `#f4f2f0` = 4.29:1 at 13 px and 11.5 px.
  3. On Pipeline, the row hover background is `--surface-2`, so dates and "not stated" drop to 4.30:1 and scores to 4.49:1.
- **Notes:** These are near misses (all ≥ 4.29), so a 2. Darkening `--muted` in light mode to about `#6b645f` clears every case, including the hover and selected states axe does not test.

### A-10: At 320 px wide (400% zoom) every page scrolls horizontally and the nav is cut off
- **Severity:** 2
- **Where:** All pages › masthead nav; CV Studio › "CV" select and the voice-dna.md path
- **Tasks:** T2–T9 at high zoom
- **Capabilities:** UI-nav-cv, UI-cv-document, UI-cv-voice-text
- **Method:** a11y (WCAG 1.4.10 Reflow)
- **Evidence:** app/ux/evidence/A-10.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, resize the browser to 320×640 and open http://127.0.0.1:4400/#/cv
  2. Observe: the document is 439 px wide in a 305 px viewport. The `nav.tabs` row does not wrap (361 px), so "CV Studio" sits off-screen. The CV select runs past the right edge, and the long `C:\…\voice-dna.md` path does not break. Pipeline, Sources, Skills and Runs are 381 px wide from the nav alone.
- **Notes:** 640×400 (200%) passes on every page; only data tables scroll, which is allowed. Fix with `flex-wrap: wrap` on the nav, `max-width: 100%` on `.studio-bar select`, and `overflow-wrap: anywhere` on paths.

### A-11: Repeated controls share one name, so screen-reader users cannot tell which row they act on
- **Severity:** 2
- **Where:** Pipeline › row buttons "Re-evaluate", "PDF"/"PDF ↻", "Cover" (×41 each); Pipeline › "Status for Cobalt Freight" (4 rows), "Status for Granite Cloud" (4 rows), etc.; Skills › per-skill status select named "Not found on your CV" (every row); Sources › inbox "Evaluate" (×13), companies "Edit"/"Remove"; CV Studio › section order "↑", "↓", "×"; Skills › "▸ gRPC" (the glyph is read aloud)
- **Tasks:** T3, T5, T6, T8, T9
- **Capabilities:** UI-pipeline-row-evaluate, UI-pipeline-row-pdf, UI-pipeline-row-cover, UI-pipeline-status-cell, UI-skills-status, UI-skills-expand, UI-sources-inbox-evaluate, UI-sources-edit, UI-sources-remove, UI-cv-section-move, UI-cv-section-remove
- **Method:** a11y (WCAG 2.4.6 Headings and Labels; 1.3.1 Info and Relationships; 2.5.3 Label in Name for "▸ gRPC")
- **Evidence:** app/ux/evidence/A-11.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/#/skills and Tab to the first Status select.
  2. Observe: its accessible name is its `title`, "Not found on your CV", identical on every row. It never names the skill (gRPC), so a list of form controls reads "Not found on your CV" 16 times.
  3. On Pipeline, a screen reader's buttons list shows "Cover" 41 times. Rows 2, 12, 22 and 32 all expose "Status for Cobalt Freight".
- **Notes:** Inside table navigation the row gives context, but in a form-controls or buttons list (the common way to work a page this size) it does not. Name them "Cover letter for Cobalt Freight, Staff Software Engineer", "Status of gRPC", "Move Summary up", and so on. Hide the ▸/▾ glyph from the name (`aria-hidden`).

### A-12: Report-detail tabs have no tab panels and ignore the arrow keys
- **Severity:** 2
- **Where:** Pipeline › report detail › "Report" / "PDF" / "Cover letter" tabs
- **Tasks:** T2, T5
- **Capabilities:** UI-pipeline-detail-tab-report, UI-pipeline-detail-tab-pdf, UI-pipeline-detail-tab-cover
- **Method:** a11y (WCAG 4.1.2 Name, Role, Value; 1.3.1 Info and Relationships)
- **Evidence:** app/ux/evidence/A-12.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/#/pipeline/12 and focus the "Report" tab.
  2. Press ArrowRight. Observe: nothing happens; "Report" stays selected and focused.
  3. Inspect: the three `role="tab"` buttons have no `aria-controls` or `id`, there is no `role="tabpanel"`, the tablist has no name, and all three tabs are separate Tab stops.
- **Notes:** A screen reader announces "tab, 1 of 3" and then the conventional keys fail, and the content that changes is not tied to the tab. Tab then Enter does work, so a 2. Either complete the pattern (roving tabindex, arrows, Home/End, panels) or use plain `aria-pressed` buttons like the rest of the app.

### A-13: No main landmark, no skip link, skipped heading levels and an unchanging page title
- **Severity:** 2
- **Where:** All pages › document structure; masthead nav
- **Tasks:** T2–T9
- **Capabilities:** UI-nav-pipeline, UI-nav-sources, UI-nav-skills, UI-nav-runs, UI-nav-cv
- **Method:** a11y (WCAG 1.3.1 Info and Relationships; 2.4.1 Bypass Blocks; 2.4.2 Page Titled; 2.4.6 Headings and Labels)
- **Evidence:** app/ux/evidence/A-13.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/#/skills and list landmarks and headings (e.g. the accessibility tree).
  2. Observe: only `banner` and `navigation`; content sits in generic `div`s with no `main`. The page has one heading (h1 "Job Search Console"); "Learn next", the table and the evidence have none. Pipeline's only other headings are two h4s inside the maintenance help. There is no skip link.
  3. Switch pages with the nav: the `<title>` stays "Job Search Console" on all five pages and on `#/pipeline/<id>`. The nav is a set of `aria-pressed` buttons rather than links with `aria-current="page"`.
- **Notes:** Screen-reader users cannot jump to the content or to page sections, and do not hear that the page changed. Add `<main>`, one h2 per page and h3 per section, per-route titles ("Skills — Job Search Console"), and a skip link.

### A-14: Text inputs, chips and the status select have almost invisible boundaries
- **Severity:** 2
- **Where:** Pipeline › "Paste a job posting URL…", "Filter company, role, notes…", status chips, row status select; Sources › scan inputs, Edit/Remove; CV Studio › token inputs
- **Tasks:** T2, T3, T5
- **Capabilities:** UI-pipeline-url, UI-pipeline-search, UI-pipeline-status-cell, UI-pipeline-status-filter
- **Method:** a11y (WCAG 1.4.11 Non-text Contrast)
- **Evidence:** app/ux/evidence/A-14.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/ in the light scheme.
  2. Observe: the URL field's border is `#e4e0dc` on `#ffffff` = 1.31:1 (dark: `#423b38` on `#262322` = 1.42:1). The row status select has a transparent border and a `#f4f2f0` fill on white = 1.12:1 until hovered or focused.
- **Notes:** The placeholder alone signals the URL field, and it is the entry point of T2. Low-vision users see a blank panel. A `--border` of at least 3:1 against the surface (e.g. `#8a837e` light, `#6f6661` dark) for form controls fixes it.

### A-15: Focus is lost to the page body after most actions
- **Severity:** 2
- **Where:** Pipeline › "Evaluate now", row "PDF", status select (A-04), "Draft and render the letter"; Sources › "Scan now"; CV Studio › "Save voice rules", "Save & render this CV"
- **Tasks:** T2, T4, T5, T7, T9
- **Capabilities:** UI-pipeline-evaluate-now, UI-pipeline-row-pdf, UI-pipeline-cover-submit, UI-sources-scan, UI-cv-voice-save, UI-cv-render
- **Method:** a11y (WCAG 2.4.3 Focus Order)
- **Evidence:** app/ux/evidence/A-15.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/#/sources, Tab to "Scan now" and press Enter.
  2. Observe: `document.activeElement` is `<body>` and no ring is visible (screenshot); the button was re-rendered or disabled under the focus. The same happens after every action listed above.
- **Notes:** Chromium keeps a sequential-navigation starting point, so the next Tab usually lands near the old place, which is why tasks still completed. A screen reader, though, resets to the top of the page or says nothing, and the user loses the context of the result they are waiting for (compounding A-06). Keep the button mounted and focused (use `aria-disabled` instead of `disabled` while running), or move focus to the run panel heading.

### A-16: The toast's "Open log" vanishes after 6 seconds and is the last stop on the page
- **Severity:** 2
- **Where:** Global toast "<run> started · Open log · ×" (Pipeline, Sources, Skills)
- **Tasks:** T5, T9 (any queued run)
- **Capabilities:** UI-global-toast-open-log, UI-global-toast-dismiss
- **Method:** a11y (WCAG 2.2.1 Timing Adjustable; 2.4.3 Focus Order)
- **Evidence:** app/ux/evidence/A-16.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/, Tab to row 1's "PDF ↻" and press Enter.
  2. Observe: the toast "PDF for Brightwater Health started · Open log · ×" appears, fixed bottom-right. Its "Open log" is Tab stop 189 of 190, and the toast is removed after 6 s (`App.jsx` line 122). Focus is on `<body>`.
- **Notes:** A keyboard user cannot reach "Open log" in time. Because run rows are mouse-only (A-03), it is one of only two keyboard routes to a run log. Keep the toast until it is dismissed (or pause it on focus or hover), put it early in the focus order or move focus to it, and give the runs table real links.

## Findings by severity

| Severity | Findings |
|---|---|
| 4 | A-03 |
| 3 | A-01, A-02, A-04, A-06, A-08 |
| 2 | A-05, A-07, A-09, A-10, A-11, A-12, A-13, A-14, A-15, A-16 |
| 1 | — |

No keyboard trap was found anywhere, including the PDF preview iframe in CV Studio.
