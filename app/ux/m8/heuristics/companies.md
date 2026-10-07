# Heuristic evaluation (M8): Companies (`#/companies`)

Spec: `app/ux/design/ia.md` §2.5. POPULATED (`:4401`), EMPTY (`:4402`, after set-up). 1280×800.
Evaluator: heuristic-evaluator, 2026-10-07.

**Dark scheme: not exercised** (no way to switch `prefers-color-scheme` with the available
tools). The red "Board not found since Sep 24" chip and the yellow Fix panel were judged in the
light scheme only.

## 1. Visibility of system status

### H8-companies-01: After removing a company, its "board moved or closed" panel moves to the next company, and stays there after Undo
- **Severity:** 3
- **Where:** Companies › list › **Fix** panel; **Remove** → **Stop following** → **Undo**
- **Tasks:** T4
- **Capabilities:** R-portals-delete, R-portals-create, UI-shell-undo
- **Method:** heuristic (H1 Visibility of system status)
- **Evidence:** app/ux/m8/evidence/H8-companies-01.png (right after Remove); app/ux/m8/evidence/H8-companies-02.png (after Undo)
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4401`, open http://127.0.0.1:4401/#/companies
  2. On Juniper Mobility ("Board not found since Sep 24") click **Fix Juniper Mobility**; the yellow panel "Juniper Mobility's job board moved or closed … Pause Juniper Mobility · Edit the link · Open their careers page ↗" opens under it.
  3. Click **Remove Juniper Mobility** → **Stop following**.
  4. Observe: the yellow panel is now under **Kestrel Media** (Paused, never broken): "Kestrel Media's job board moved or closed … You can pause Kestrel Media for now", with **Pause Kestrel Media** offered for an already-paused company.
  5. Click **Undo** in the bar. Observe: Juniper Mobility returns (at the end of the list, see H8-companies-02), but the "moved or closed" panel stays under Kestrel Media.
- **Notes:** the app tells the user a healthy company's board is gone and invites them to edit
  its link. It persists until the page is reloaded. A user who acts on it breaks a working
  company.

### H8-companies-04: "Check companies' job boards" reports success without saying what it found
- **Severity:** 2
- **Where:** Companies › Check companies' job boards › result
- **Tasks:** T4
- **Capabilities:** UI-pipeline-maint-validate, R-runs-start (validate)
- **Method:** heuristic (H1 Visibility of system status)
- **Evidence:** app/ux/m8/evidence/H8-companies-04.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4401`, open http://127.0.0.1:4401/#/companies
  2. At the bottom, click **Check companies' job boards**.
  3. Observe: a green box "Checked Oct 7. The status beside each company above is up to date." Nothing says that one board (Juniper Mobility) still fails; the user has to scroll up and scan twelve rows. Activity records the same run as "No problems found." (H8-activity-01).
- **Notes:** ia.md §2.5: "a button with the result in words" — "11 boards work · Juniper
  Mobility: board not found · Fix".

### H8-companies-03: A company followed by its careers page stays "Not checked yet" forever, with no explanation
- **Severity:** 2
- **Where:** Companies › list › Kestrel Media · "Careers page (kestrelmedia.example.com)"
- **Tasks:** T1, first-job
- **Capabilities:** R-portals, R-scan-summary
- **Method:** heuristic (H1 Visibility of system status)
- **Evidence:** app/ux/m8/evidence/H8-companies-03.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state empty --port 4402`, open http://127.0.0.1:4402/
  2. Save a CV; follow "Kestrel Media" with `https://kestrelmedia.example.com/careers`; click **Check for new openings**.
  3. Open **Companies**.
  4. Observe: "Kestrel Media · Careers page (kestrelmedia.example.com) · Not checked yet", switch on, no Fix, no hint that the app cannot read this kind of page.
- **Notes:** the scan just "finished" (H8-today-02), so "Not checked yet" is the only clue,
  and it reads as "wait". Explain and offer **Find the right job board** here.

## 2. Match between system and the real world

No issues found on the main list. "Greenhouse", "Working · last checked Oct 7", "Paused",
"Board not found since Sep 24", "Stop following Juniper Mobility?" are plain. (The **More
options** › Board type list mixes product names with raw provider ids such as "local-parser",
"local_parser" and "playwright"; it is behind a disclosure for advanced users, not ranked.)

## 3. User control and freedom

### H8-companies-02: Undo brings a removed company back at the end of the list
- **Severity:** 1
- **Where:** Companies › undo bar › **Undo**
- **Tasks:** —
- **Capabilities:** UI-shell-undo, R-portals-create
- **Method:** heuristic (H3 User control and freedom)
- **Evidence:** app/ux/m8/evidence/H8-companies-02.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4401`, open http://127.0.0.1:4401/#/companies
  2. **Remove Juniper Mobility** → **Stop following** → **Undo**.
  3. Observe: the otherwise alphabetical list now ends "… Lumen Grid, Mosaic Retail, Juniper Mobility".
- **Notes:** small, but "undo" should mean "as it was"; the companies file is also reordered.

## 4. Consistency and standards

### H8-companies-06: The number of companies differs between pages
- **Severity:** 1
- **Where:** Companies › "12 companies"; Today › "Checks the 11 companies you follow"; Workspace › "11 companies followed"
- **Tasks:** T4
- **Capabilities:** R-portals, R-workspace
- **Method:** heuristic (H4 Consistency and standards)
- **Evidence:** app/ux/m8/evidence/H8-companies-04.png; app/ux/m8/evidence/H8-today-05.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4401`, open http://127.0.0.1:4401/#/companies — heading "12 companies".
  2. Open Today — "Checks the 11 companies you follow."
- **Notes:** the difference is the paused Kestrel Media. Say "12 companies · 11 checked (1 paused)".

## 5. Error prevention

No issues found. **Remove** asks "Stop following Juniper Mobility? … Links already in To review
stay. You can undo this right after, and a backup of your list is kept too." Following a company
already listed is refused next to the form ("Cobalt Freight" is already listed). Empty and
invalid edits show "Type the company name." / "Paste a link starting with https://" under the
fields.

## 6. Recognition rather than recall

### H8-companies-07: "Fix Juniper Mobility" on Today lands at the top of Companies, not at Juniper
- **Severity:** 1
- **Where:** Today › **Fix Juniper Mobility** → Companies
- **Tasks:** T4
- **Capabilities:** UI-shell-nav-to-review (Today card link), R-portals
- **Method:** heuristic (H6 Recognition rather than recall)
- **Evidence:** app/ux/m8/evidence/H8-companies-04.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4401`, open http://127.0.0.1:4401/
  2. Click **Fix Juniper Mobility**.
  3. Observe: Companies opens at the top with "1 job board needs you: Juniper Mobility. Use Fix below."; Juniper Mobility is the ninth row, below the fold, and its Fix panel is closed.
- **Notes:** the button promised the fix; open the Fix panel and scroll to it.

## 7. Flexibility and efficiency of use

No issues found. One switch per company to pause, inline Edit, a job-board search section, and
the validate tool on the same page.

## 8. Aesthetic and minimalist design

No issues found worth ranking. Each switch repeats its full accessible name on screen ("Check
Brightwater Health for new openings" ×12), which makes the right-hand side of the list
ragged; a visible "Checking on/Paused" with the long name kept for screen readers would be
quieter (cosmetic).

## 9. Help users recognize, diagnose, and recover from errors

No new issues beyond H8-companies-01/03. The Fix panel for a broken board explains the likely
cause ("moved to another job board system, or stopped hiring there") and gives three ways out.

## 10. Help and documentation

### H8-companies-05: "What jobs to keep" can only be changed by editing portals.yml by hand
- **Severity:** 2
- **Where:** Companies › What jobs to keep
- **Tasks:** T1
- **Capabilities:** R-portals (title_filter)
- **Method:** heuristic (H10 Help and documentation)
- **Evidence:** app/ux/m8/evidence/H8-companies-04.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4401`, open http://127.0.0.1:4401/#/companies
  2. Scroll to **What jobs to keep**.
  3. Observe: "Job titles containing Engineer, SRE, Developer, except titles with Intern, Recruiter, Account Executive. To change these, edit the title filter in your companies file (portals.yml) with your editor; the app picks the change up by itself. Files in your workspace folder".
- **Notes:** ia.md allows this read-only fallback, and the summary in words is good. But P2's
  card says "being asked to edit files by hand" is a reason to give up, and in EMPTY the default
  ("Every job title, except titles with Intern, Interns, Internship") keeps every non-intern
  posting, so the first thing a first-timer may want to change is the one thing they cannot.

## Strengths

- Removing a company confirms in plain words and can be undone (fixes H-sources-01).
- The Follow form is short (name and link) with advanced fields behind **More options**, opens
  where you clicked, and shows errors under the fields (fixes H-sources-02, -03).
- A broken board is named in red with a dated cause and a three-way Fix.

## M6 findings re-checked (H-sources-01…04)

| M6 ID | M6 problem | Status in M8 | Note |
|---|---|---|---|
| H-sources-01 | Remove deletes immediately, no confirm, no undo | **Fixed** | Confirm + Undo + backup. (New: H8-companies-01, -02.) |
| H-sources-02 | Add opens at the very bottom with every advanced field | **Fixed** | Inline at the top; More options. |
| H-sources-03 | Server-side form error shown at the top, out of view | **Fixed** | Error next to the form's buttons. |
| H-sources-04 | Error banner stays after the form is cancelled | **Fixed** | Cancel closed the form and its error. |
