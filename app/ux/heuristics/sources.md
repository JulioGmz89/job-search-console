# Heuristic evaluation — Sources

Scope: the Sources page (`#/sources`): scan bar ("Scan now", "Preview only", "Verify each
posting is live", "Only this company…", "Last N days", "What the scan options do"), the
scan run panel, the inbox line and "Show the inbox" with per-item "Evaluate", "How
sources work", "Tracked companies" (On, Edit, Remove), "Job boards", "Filters", and the
"Add a company" / "Edit <company>" form.

Evaluated on 2026-10-04 against `populated` (port 4400), with `broken` and `empty` checked
for comparison (empty-state issues are in `empty-state.md`).

Summary: 0 × sev 4, 3 × sev 3, 3 × sev 2, 1 × sev 1.

---

## 1. Visibility of system status

### H-sources-04: An error banner from the form stays on the page after the form is cancelled
- **Severity:** 1
- **Where:** Sources › error banner at the top of the page
- **Tasks:** T1
- **Capabilities:** UI-sources-form-cancel, R-portals-create
- **Method:** heuristic (H1 Visibility of system status)
- **Evidence:** app/ux/evidence/H-sources-04.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/#/sources
  2. Reproduce H-sources-03 (banner "\"Cobalt Freight\" is already listed").
  3. Click "Cancel" on the form, then "Show the inbox", then "Scan now".
  4. Observe: the banner stays at the top through all of these, now unrelated to anything on screen.
- **Notes:** Stale errors teach users to ignore banners.

## 2. Match between system and the real world

### H-sources-06: The scan result is the scanner's terminal output, including CLI instructions and temp-file paths
- **Severity:** 3
- **Where:** Sources › "Scan now" › run panel "Scan portals"
- **Tasks:** T4
- **Capabilities:** UI-sources-scan, R-scan-summary, R-run-events
- **Method:** heuristic (H2 Match; H9 Help users recognize, diagnose, recover)
- **Evidence:** app/ux/evidence/H-sources-06.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/#/sources
  2. Click "Scan now"; it finishes in about a second.
  3. Observe the panel: box-drawing rules, "Companies scanned: 10 … New offers added: 4", "⚠️ 1 target(s) unreachable (slug?): Juniper Mobility — run: node verify-portals.mjs", "Results saved to C:\Users\…\AppData\Local\Temp\jsc-ux-populated-…\data\pipeline.md and …scan-history.tsv", "→ Run /career-ops pipeline to evaluate new offers.", "→ Share results and get help: https://discord.gg/…".
- **Notes:** T4 asks "how many, which ones, did anything go wrong". The answers are in the log, but the one error is phrased as "(slug?)" and tells the user to run a terminal command; the next step is a slash command that does not exist in this app (the equivalent is "Show the inbox" → "Evaluate"). P2 explicitly gives up when asked to use files or terminals. A structured summary ("4 new · 1 board could not be reached: Juniper Mobility — Edit / Remove") above the raw log would answer T4 directly. (My own run showed 3 new because I had removed Mosaic Retail earlier; a fresh sandbox shows 4.)

### H-sources-07: "Last seen" holds a status, and the scan filters are unlabelled fields
- **Severity:** 2
- **Where:** Sources › "Tracked companies" › "Last seen" column; scan bar › "Only this company…", "Last N days"
- **Tasks:** T4
- **Capabilities:** UI-sources-company, UI-sources-since, R-portals
- **Method:** heuristic (H2 Match; H6 Recognition)
- **Evidence:** app/ux/evidence/H-sources-07.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/#/sources
  2. Observe: the "Last seen" column reads "reachable", "board not found", "never scanned" — no date, although the header promises one. The two small inputs right of the checkboxes have only placeholders ("Only this company…", "Last N days"); once typed into, nothing says what they are.
- **Notes:** "board not found" in red is the right signal for T4, but "Last seen" makes it read like a timestamp column. The phrase "13 URL(s) waiting to be evaluated … 51 duplicate(s)" uses programmer plurals.

## 3. User control and freedom

### H-sources-01: "Remove" deletes a tracked company immediately, with no confirmation and no undo
- **Severity:** 3
- **Where:** Sources › "Tracked companies" › row › "Remove"
- **Tasks:** T1, T4
- **Capabilities:** UI-sources-remove, R-portals-delete, C-portals-yml
- **Method:** heuristic (H3 User control and freedom; H5 Error prevention)
- **Evidence:** app/ux/evidence/H-sources-01.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/#/sources
  2. Click "Remove" on "Mosaic Retail".
  3. Observe: the row disappears and the heading goes from "Tracked companies (12)" to "(11)". No dialog, no message, no "Undo"; the entry (with any notes and API settings) is gone from `portals.yml`.
- **Notes:** "Remove" sits 40 px from "Edit" on every row. Unticking "On" already exists for "pause"; removal is the destructive action and should confirm or offer undo.

### H-sources-05: Inbox items can only be evaluated — not dismissed, not evaluated in bulk
- **Severity:** 2
- **Where:** Sources › "Show the inbox" › list items
- **Tasks:** T4, T8
- **Capabilities:** UI-sources-inbox-toggle, UI-sources-inbox-evaluate, UI-sources-inbox-link, R-inbox
- **Method:** heuristic (H3 User control and freedom; H7 Flexibility and efficiency)
- **Evidence:** app/ux/evidence/H-sources-05.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/#/sources
  2. Click "Show the inbox".
  3. Observe: each of the 13 items has a link and one "Evaluate" button. There is no way to drop an item the user is not interested in, and no "Evaluate all" / select-several.
- **Notes:** After every scan the inbox only grows; the only way to clear an uninteresting posting is to pay for its evaluation or edit `data/pipeline.md` by hand. P1 used to run `/career-ops pipeline` to process all pending links in one command and will look for the equivalent.

## 4. Consistency and standards

No separate finding. Checked: "Add" buttons for both lists, Edit/Remove per row, the same run panel component as Pipeline. Inconsistency with Pipeline's maintenance bar is recorded in H-pipeline-08.

## 5. Error prevention

### H-sources-02: "Add" opens the form at the very bottom of the page, with every advanced field shown
- **Severity:** 2
- **Where:** Sources › "Tracked companies" › "Add" › "Add a company" form
- **Tasks:** T1
- **Capabilities:** UI-sources-add-company, UI-sources-form-name, UI-sources-form-careers-url, UI-sources-form-provider, UI-sources-form-api, UI-sources-form-scan-method, UI-sources-form-query
- **Method:** heuristic (H8 Aesthetic and minimalist design; H5 Error prevention)
- **Evidence:** app/ux/evidence/H-sources-02.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/#/sources
  2. Click "Add" next to "Tracked companies (12)".
  3. Observe: nothing visible changes; the form appears after "Job boards", below the fold. Scrolled into view, it shows eight fields at once: Name, Careers URL, Provider (a list of ~80 ids such as "a16z-speedrun-talent", "hecklerkoch", "local-parser"), API endpoint, Scan method ("playwright", "websearch", "local_parser"), Search query, Notes, Include in scans. Required fields are not marked; submitting empty triggers the browser's own bubble.
- **Notes:** The help text under each field is excellent, but the common case (name + careers URL) is buried among options that the help itself says to leave alone ("Rarely needed", "Leave on detect"). Help text also cites "templates/portals.example.yml" and "(arriving in a later milestone)". "Edit" behaves better: it scrolls to the form.

## 6. Recognition rather than recall

Covered by H-sources-07.

## 7. Flexibility and efficiency of use

Covered by H-sources-05.

## 8. Aesthetic and minimalist design

Covered by H-sources-02.

## 9. Help users recognize, diagnose, and recover from errors

### H-sources-03: A server-side form error is shown at the top of the page, out of view of the form
- **Severity:** 3
- **Where:** Sources › "Add a company" › "Add source"
- **Tasks:** T1
- **Capabilities:** UI-sources-form-submit, R-portals-create
- **Method:** heuristic (H9 Help users recognize, diagnose, and recover from errors)
- **Evidence:** app/ux/evidence/H-sources-03.png (full page: banner at top, form at bottom)
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/#/sources
  2. Click "Add"; scroll to the form; Name `Cobalt Freight`, Careers URL `https://example.com/careers`; click "Add source".
  3. Observe: nothing changes around the form or the button (the viewport stays on the form). The message "\"Cobalt Freight\" is already listed" appears in a banner at the top of the page, ~1,000 px above.
- **Notes:** The user sees a button that "did nothing". The Name field is not highlighted either.

## 10. Help and documentation

No issues found. "What the scan options do" and "How sources work" are clear and even set expectations ("a quiet log with a running clock is normal, not stuck").

---

## Strengths
- "Preview only" makes scanning safe to try; the help says so.
- "board not found" is shown in red on the company row, so the T4 error is findable without reading the log.
- Field-level help in the add form explains how to find a careers URL ("open any of the company's job postings and look at the address bar"), which is exactly P2's missing knowledge.
- Paused companies keep their note visible ("Paused: hiring freeze until January").
- The inbox lists title, company, location and posting date with a direct "Evaluate".
