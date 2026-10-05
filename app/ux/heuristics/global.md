# Heuristic evaluation — Global (masthead, navigation, toasts, cross-page consistency, colour schemes)

Scope: what every page shares: the masthead ("Job Search Console", nav buttons
"Pipeline", "Sources", "Skills", "Runs", "CV Studio", the counter "40 applications · 6
PDFs"), routing and scroll behaviour between pages, toasts ("… started · Open log · ×"),
shared patterns (run panel, help disclosures, chips, buttons), window width, and colour
schemes.

Evaluated on 2026-10-04 against `populated` (port 4400) at 1707×876 and 800×900, with
`empty` and `broken` for comparison.

Summary: 0 × sev 4, 0 × sev 3, 4 × sev 2, 0 × sev 1.

---

## 1. Visibility of system status

### H-global-03: Changing page keeps the previous page's scroll position
- **Severity:** 2
- **Where:** Masthead nav › any page switch
- **Tasks:** T4, T5, T8
- **Capabilities:** UI-nav-pipeline, UI-nav-sources, UI-nav-skills, UI-nav-runs, UI-nav-cv
- **Method:** heuristic (H1 Visibility of system status)
- **Evidence:** app/ux/evidence/H-global-03.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/
  2. Scroll Pipeline down about two screens (into the table).
  3. Click "Runs" in the masthead (or follow any in-app link to another page).
  4. Observe: Runs opens scrolled down, showing the middle of the "Finished" table; the masthead, the open-run panel and the "Running"/"Waiting" sections are above the fold.
- **Notes:** Seen repeatedly: after "Draft and render the letter" the Runs page opened mid-page; after a Skills → report link and Back, Skills reloaded. Users land on a page without its heading or primary controls and may think the page is empty or wrong.

### H-global-04: Only Pipeline shows the masthead counter, and nothing global shows that runs are in progress
- **Severity:** 2
- **Where:** Masthead (right of the nav)
- **Tasks:** T2, T5, T8
- **Capabilities:** UI-nav-runs, R-runs, R-events
- **Method:** heuristic (H1 Visibility; H4 Consistency)
- **Evidence:** app/ux/evidence/H-global-04.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/
  2. Note "40 applications · 6 PDFs" right of the nav.
  3. Paste a posting URL, click "Evaluate now", and immediately click "Skills", then "Runs".
  4. Observe: on Sources, Skills, Runs and CV Studio the counter is gone; while the evaluation runs, the "Runs" nav item shows no count or spinner. The browser tab title is always "Job Search Console" whatever the page or state.
- **Notes:** A start toast appears once ("… started · Open log"), but after it is dismissed or times out, there is no way to know from another page that two agents are working. P2 ("did that actually do anything?") benefits most from a persistent "2 running" indicator on "Runs".

## 2. Match between system and the real world

### H-global-01: Toasts name the job board's host instead of the job
- **Severity:** 2
- **Where:** Global toast (bottom right) "Evaluate job-boards.greenhouse.io started · Open log · ×"
- **Tasks:** T2, T8
- **Capabilities:** UI-global-toast-open-log, UI-global-toast-dismiss
- **Method:** heuristic (H2 Match between system and the real world)
- **Evidence:** app/ux/evidence/H-global-01.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/
  2. Scroll to row 40 (Mosaic Retail, Full Stack Engineer) and click "Re-evaluate".
  3. Observe: toast "Evaluate job-boards.greenhouse.io started". The user clicked a Mosaic Retail row; the toast does not say Mosaic Retail, and every Greenhouse job produces the same text.
- **Notes:** Same naming as the run panel and the Runs table (H-pipeline-03, H-runs-04). When the run finishes no completion toast was observed on Pipeline; the row simply changes.

## 3. User control and freedom

No issues found. Back/forward work with the hash routes (`#/pipeline/12`, `#/runs/<id>`), and run logs have stable URLs.

## 4. Consistency and standards

No separate finding beyond H-global-04. Shared patterns are consistent: the same run panel on Pipeline, Sources and Runs; the same "What … do" / "How … works" disclosures on every page; the same chip style for filters and tabs; primary actions in the same burnt-orange. Two inconsistencies are folded into page files: disabled primary buttons look enabled in pale orange (H-pipeline-01) and action labels differ between row and detail (H-job-detail-03). Navigation items are buttons rather than links, so they cannot be opened in a new tab (noted; a11y auditor to judge).

## 5. Error prevention

No global issues beyond the page findings (H-pipeline-10, H-sources-01, H-cv-studio-04).

## 6. Recognition rather than recall

No issues found. The nav is always visible, with the current page shown as a dark pill.

## 7. Flexibility and efficiency of use

### H-global-02: At a narrower window the Pipeline table clips its PDF and action columns
- **Severity:** 2
- **Where:** Pipeline › table at 800 px window width
- **Tasks:** T3, T5
- **Capabilities:** UI-pipeline-row-pdf, UI-pipeline-row-cover, UI-pipeline-row-evaluate
- **Method:** heuristic (H7 Flexibility and efficiency of use; H8)
- **Evidence:** app/ux/evidence/H-global-02.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/
  2. Resize the window to 800 × 900 (e.g. a half-screen browser beside an editor).
  3. Observe: role names wrap to three lines, the "PDF" column and the "Re-evaluate / PDF / Cover" buttons are cut off at the right edge of the card.
- **Notes:** P1 works beside a terminal and editor; a half-width window is common. The a11y auditor should confirm the reflow/zoom behaviour (WCAG 1.4.10).

## 8. Aesthetic and minimalist design

No issues found globally: calm palette, consistent spacing, one primary colour, plenty of white space. Density issues are page-specific.

## 9. Help users recognize, diagnose, and recover from errors

No global mechanism for errors exists (banners are per page; failures surface only on Runs); see H-broken-state-06.

## 10. Help and documentation

No issues found as a pattern: every page has collapsible inline help near its controls. The tone is consistently developer-oriented (file paths, script names, milestones), recorded per page (H-pipeline-02, H-runs-03).

## Colour schemes (dark mode)

Not assessed. I could not switch the browser's colour scheme with the tools available, and the UI has no theme control of its own (none in the masthead or on any page). In light mode, colour carries meaning in several places — score colours (green ≥ 3.5, orange 3.0–3.49, red < 3.0), status badges (Finished green, Failed red, Running amber), the ATS box (green/amber/red) and "board not found" in red — and in each case text accompanies the colour, so meaning survives without it. Contrast in both schemes is left to the a11y auditor.

---

## Strengths
- A small, stable information architecture: five pages, always visible, current page clearly marked.
- One run panel component everywhere, so learning it once pays off on every page.
- Hash-based deep links for report details and run logs.
- Inline help is present on every page and placed next to the controls it explains.
- Visual design is restrained and consistent; status colour always comes with a text label.
