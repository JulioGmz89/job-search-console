# Heuristic evaluation — CV Studio

Scope: the CV Studio page (`#/cv`): "CV" document select, "Look — style tokens" (accent,
fonts, size, margin, density, section order, "Save as default", "Revert"), "Themes" cards
with ATS badges and "Refresh with these tokens", the preview column (theme name, ATS
verdict box, "Render this CV" / "Save & render this CV", "Re-render all in this theme",
embedded PDF), "Voice — writing rules" ("Save voice rules", "Seed from template"),
"Writing samples", and the closing help.

Evaluated on 2026-10-04 against `populated` (port 4400) and `broken` (port 4401, read
only: I changed nothing there). `empty` is in `empty-state.md`.

Note on the sandbox: after I evaluated a posting in `populated`, the fake CLI wrote a
placeholder CV ("Ada Lovelace") as "Report 041 · cv-candidate-kestrel-media", which then
became the default selection and fails ATS in every theme. That is a fixture artefact, not
a finding; findings below were checked on the seeded CVs.

Summary: 0 × sev 4, 1 × sev 3, 4 × sev 2, 0 × sev 1.

---

## 1. Visibility of system status

### H-cv-studio-02: Switching CV keeps showing the previous CV's preview and ATS verdict while it renders
- **Severity:** 2
- **Where:** CV Studio › "CV" select › preview column
- **Tasks:** T7
- **Capabilities:** UI-cv-document, R-cv-preview, R-cv-preview-pdf
- **Method:** heuristic (H1 Visibility of system status)
- **Evidence:** app/ux/evidence/H-cv-studio-02.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/#/cv
  2. Select "Report 012 · cv-alex-rivera-cobaltfreight-012" and wait for the preview.
  3. Select "Report 008 · cv-alex-rivera-ironleafsecurity-008" and look immediately.
  4. Observe: the select says 008, the small grey text at the top right says "Rendering…", but the ATS box, page count and PDF still belong to 012 for about a second. With a slower render (or the first theme render) the stale verdict lingers longer.
- **Notes:** T7 hinges on reading the ATS verdict for the right CV. The stale area should dim or show a spinner.

## 2. Match between system and the real world

### H-cv-studio-01: The CV selector lists file slugs instead of the job each CV is for
- **Severity:** 2
- **Where:** CV Studio › "CV" select and the line beside it
- **Tasks:** T7
- **Capabilities:** UI-cv-document, R-cv-documents
- **Method:** heuristic (H2 Match between system and the real world)
- **Evidence:** app/ux/evidence/H-cv-studio-01.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/#/cv
  2. Open the "CV" select.
  3. Observe: options "Report 012 · cv-alex-rivera-cobaltfreight-012", "Report 002 · cv-alex-rivera-cobaltfreight-002", … "Sample CV (fictional)". Beside it: "Structured data: output/cv-alex-rivera-cobaltfreight-012.json · current PDF cv-alex-rivera-cobaltfreight-012-2026-08-25.pdf".
- **Notes:** T7 says "the version you would send to Cobalt Freight for the Staff Software Engineer job". There are two Cobalt Freight CVs; only the report number (which the user must look up on Pipeline) distinguishes them. "Cobalt Freight — Staff Software Engineer (report 012)" would be recognisable.

## 3. User control and freedom

### H-cv-studio-04: Unsaved look changes are discarded without warning when the user changes page
- **Severity:** 3
- **Where:** CV Studio › theme card / style tokens › navigation to another page
- **Tasks:** T7
- **Capabilities:** UI-cv-theme-pick, UI-cv-save, UI-nav-pipeline, UI-nav-cv
- **Method:** heuristic (H3 User control and freedom; H5 Error prevention)
- **Evidence:** app/ux/evidence/H-cv-studio-04.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/#/cv
  2. Select "Report 008 · cv-alex-rivera-ironleafsecurity-008"; click the "Modern" theme card. The left panel now says "Unsaved changes — the preview shows them already."
  3. Click "Pipeline", then "CV Studio".
  4. Observe: theme is back to "Standard", the CV select is back to its default document, and the status reads "Saved." No prompt appeared on leaving.
- **Notes:** T7 involves trying several themes and then checking something elsewhere (e.g. the job on Pipeline). The work is lost silently; "Saved." on return suggests nothing was lost.

## 4. Consistency and standards

### H-cv-studio-03: Two different save actions, and the render button changes its label and meaning
- **Severity:** 2
- **Where:** CV Studio › "Save as default" (left) and "Render this CV" / "Save & render this CV" (right)
- **Tasks:** T7
- **Capabilities:** UI-cv-save, UI-cv-render, UI-cv-render-all
- **Method:** heuristic (H4 Consistency and standards)
- **Evidence:** app/ux/evidence/H-cv-studio-03.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/#/cv
  2. Select report 008's CV; click the "Modern" card.
  3. Observe: on the left "Save as default" becomes active with "Unsaved changes — the preview shows them already"; on the right, the primary button changes from "Render this CV" to "Save & render this CV", next to "Re-render all in this theme". Three buttons now save the default theme, with different side effects.
- **Notes:** T7's "make that the design for every CV … from now on" maps to "Save as default", but the more prominent primary button also saves it. A user who only wants a one-off render in another theme cannot tell whether the default will change. (Also: the theme cards are 200 px tall thumbnails that push the preview column down when the page reflows.)

## 5. Error prevention

Covered by H-cv-studio-04, and H-broken-state-04 (rendering with an ATS-failing theme is one click).

## 6. Recognition rather than recall

Covered by H-cv-studio-01.

## 7. Flexibility and efficiency of use

No issues found. Live preview on every token change, theme cards with ATS badges for the current CV, "Re-render all in this theme".

## 8. Aesthetic and minimalist design

### H-cv-studio-05: The ATS failure is a wall of 13 bullets with a contradictory headline metric
- **Severity:** 2
- **Where:** CV Studio › preview › ATS box (seen in `broken`, theme "broken")
- **Tasks:** T7
- **Capabilities:** UI-cv-ats-notes, R-cv-preview
- **Method:** heuristic (H8 Aesthetic and minimalist design; H9 Recognize errors)
- **Evidence:** app/ux/evidence/H-cv-studio-05.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state broken --port 4400`, open http://127.0.0.1:4400/#/cv
  2. Observe: "ATS check failed — an applicant-tracking system will lose part of this CV · score 54/100 · 100% of keywords readable · 1 page", then a red sentence, then 13 bullets, eight of which repeat "The "<X>" heading is in the document but not in the PDF text — it is hidden, zero-size, or drawn as an image."
- **Notes:** "100% of keywords readable" next to "the candidate name is not in the PDF text" contradicts itself for P3, who cares exactly about this. One summary ("Headings, name and email are invisible to ATS in this theme") and the most actionable next step (pick a theme marked "ATS pass") would be clearer; the detail can be collapsed.

## 9. Help users recognize, diagnose, and recover from errors

Covered by H-cv-studio-05. The red sentence "This is a custom theme, and it is not ATS-safe. Fix the template or pick another before sending a CV made with it." is a good diagnosis.

## 10. Help and documentation

No issues found. Each token has a one-line explanation; the closing "Content, look, voice and the ATS check — what each changes" is helpful. Some text is file-oriented ("Saved to config/cv/style.yml", "drop an HTML template into config/cv/templates/"), which suits P1 more than P2/P3.

---

## Strengths
- Live, agent-free preview: every change re-renders in about a second, and the header says "no agent, no tokens spent".
- Every theme card carries its own ATS badge for the selected CV ("ATS pass", "ATS ok · 1 warning", "ATS fail · 2 critical"), so the user can choose safely before rendering — the core of T7.
- The ATS verdict is prominent, colour-coded and explains each failure.
- "Unsaved changes — the preview shows them already" and "Revert" make the draft state explicit (within the page).
- Voice rules are editable in place, with the full path shown and "Seed from template" for a first start.
