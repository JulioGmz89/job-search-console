# Heuristic evaluation — The whole app in the `empty` state (first run)

Scope: every page as a first-time user sees it right after install: no `cv.md`, no
`portals.yml`, no tracker, no reports (`node app/ux/sandbox.mjs --state empty`). This is
T1's starting point and P2's first impression.

Evaluated on 2026-10-04 against `empty` (port 4402). I clicked "Scan now" once (it failed,
harmlessly); nothing else was changed.

Summary: 2 × sev 4, 2 × sev 3, 2 × sev 2, 0 × sev 1.

---

## 1. Visibility of system status

### H-empty-state-01: The first screen says what is missing but offers no way to provide it
- **Severity:** 4
- **Where:** Pipeline › add-job box warning "No cv.md in the data directory yet"; table "No applications match these filters."
- **Tasks:** T1
- **Capabilities:** UI-pipeline-evaluate-now, R-agent-status, C-cv-md, UI-cv-document
- **Method:** heuristic (H1 Visibility; H9 Recover from errors; H10 Help)
- **Evidence:** app/ux/evidence/H-empty-state-01.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state empty --port 4400`, open http://127.0.0.1:4400/
  2. Observe: masthead "0 applications · 0 PDFs"; under the URL field an amber box "No cv.md in the data directory yet"; "Evaluate now" disabled; "1 data issue found"; the table says "No applications match these filters." although no filter is set.
  3. Visit every page: no page, button or field accepts CV text or a CV file. CV Studio offers only "Sample CV (fictional)" (see H-empty-state-06).
- **Notes:** P2 does not know what "cv.md" or "the data directory" is, and the app gives no instruction, link or upload. Every core feature (evaluate, PDF, cover letter, Skills' "have/missing") depends on the CV, so a first-time user cannot start. There is no welcome, checklist or onboarding at all. (Known gap: §5 page 4 moved to M8; recorded here because it is the first thing a new user meets.)

## 2. Match between system and the real world

### H-empty-state-06: CV Studio shows a ready-made CV, with no way to replace it with your own
- **Severity:** 2
- **Where:** CV Studio › "CV" select "Sample CV (fictional)"; "Voice — writing rules"
- **Tasks:** T1, T7
- **Capabilities:** UI-cv-document, UI-cv-voice-text, UI-cv-voice-seed, C-cv-md, C-voice-dna-md
- **Method:** heuristic (H2 Match; H4 Consistency and standards)
- **Evidence:** app/ux/evidence/H-empty-state-06.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state empty --port 4400`, open http://127.0.0.1:4400/#/cv
  2. Observe: the selected CV is "Sample CV (fictional)" with "A fictional CV, for trying themes before you have generated one."; the preview passes ATS. Scroll down: "Voice — writing rules" has an editable textarea, "Save voice rules" and "Seed from template" that create `voice-dna.md` in place.
- **Notes:** The page lets a newcomer create the voice file from the browser but not the CV, which is the file the whole app needs; P2 looking for "upload my CV" in a page called CV Studio finds themes for someone else's CV. In this sandbox the sample happens to carry the persona's own name, which makes it even easier to believe a CV is already loaded (the sandbox seeds may differ from a real install; ambiguous).

## 3. User control and freedom

No issues found beyond the dead ends above.

## 4. Consistency and standards

### H-empty-state-03: Sources says "add a company to create one" while both "Add" buttons are disabled
- **Severity:** 4
- **Where:** Sources › banner "1 issue(s) in portals.yml" › "portals-missing: No portals.yml yet — add a company to create one."; "Tracked companies (0) · Add" (disabled); "Job boards (0) · Add" (disabled)
- **Tasks:** T1
- **Capabilities:** UI-sources-issues, UI-sources-add-company, UI-sources-add-board, R-portals-create, C-portals-yml
- **Method:** heuristic (H4 Consistency; H9 Recover from errors)
- **Evidence:** app/ux/evidence/H-empty-state-03.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state empty --port 4400`, open http://127.0.0.1:4400/#/sources
  2. Click "1 issue(s) in portals.yml".
  3. Observe: the instruction "add a company to create one"; hover or click either "Add": both are disabled, with no tooltip or reason. "Nothing here yet." under each list.
- **Notes:** The app's own instruction is impossible to follow. T1's second goal (follow Kestrel Media) cannot be done in the UI. The banner also uses an internal code ("portals-missing") and a file name.

## 5. Error prevention

### H-empty-state-04: "Scan now" is enabled with no sources and fails with "Run onboarding first", which does not exist
- **Severity:** 3
- **Where:** Sources › "Scan now" › run panel "Scan portals · Failed · exit 1"
- **Tasks:** T1, T4
- **Capabilities:** UI-sources-scan, R-runs-start
- **Method:** heuristic (H5 Error prevention; H9 Recover from errors)
- **Evidence:** app/ux/evidence/H-empty-state-04.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state empty --port 4400`, open http://127.0.0.1:4400/#/sources
  2. Click "Scan now".
  3. Observe: "Scan portals · Failed · 0:00 · exit 1", log "Error: portals.yml not found. Run onboarding first."; a failed run is added to Runs.
- **Notes:** The primary button on the page is the one that cannot work, while the two that would help are disabled. "Onboarding" is an upstream CLI concept with no equivalent here; "exit 1" means nothing to P2.

## 6. Recognition rather than recall

No issues found beyond H-empty-state-01.

## 7. Flexibility and efficiency of use

Not applicable in this state.

## 8. Aesthetic and minimalist design

### H-empty-state-05: Skills' disabled button reads like a success: "Everything read by Claude"
- **Severity:** 2
- **Where:** Skills › header › disabled "Everything read by Claude" with "No cv.md in the data directory yet"
- **Tasks:** T6
- **Capabilities:** UI-skills-extract, UI-skills-fetch
- **Method:** heuristic (H8 Aesthetic and minimalist design; H2 Match)
- **Evidence:** app/ux/evidence/H-empty-state-05.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state empty --port 4400`, open http://127.0.0.1:4400/#/skills
  2. Observe: "0 postings · 0 with text (0%) · 0 read by Claude · 0 rules only · 0 evaluated", "CV: no cv.md found", an enabled "Fetch posting text" (there are no postings to fetch) and a disabled "Everything read by Claude" with the reason "No cv.md in the data directory yet".
- **Notes:** With zero postings "everything read" is vacuously true and misleading; the one enabled button has nothing to do. The empty-state sentence below ("Nothing to analyse yet — scan your sources first, or paste a few job URLs on the Pipeline page") is good but both suggestions are blocked in this state (H-empty-state-01, -03).

## 9. Help users recognize, diagnose, and recover from errors

### H-empty-state-02: The tracker issue tells the user to run an evaluation, which is blocked by the missing CV
- **Severity:** 3
- **Where:** Pipeline › "1 data issue found" › "tracker-missing: No applications tracker yet — run an evaluation to create one."
- **Tasks:** T1, T2
- **Capabilities:** UI-pipeline-issues, UI-pipeline-evaluate-now
- **Method:** heuristic (H9 Help users recognize, diagnose, and recover from errors)
- **Evidence:** app/ux/evidence/H-empty-state-02.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state empty --port 4400`, open http://127.0.0.1:4400/
  2. Click "1 data issue found".
  3. Observe: the advice is to run an evaluation, and directly above, "Evaluate now" is disabled because of "No cv.md in the data directory yet".
- **Notes:** A missing tracker on first run is not an "issue" but the normal state, and the amber styling makes a new install look broken. The order of steps (add CV → add companies/paste a job → evaluate) is nowhere stated.

## 10. Help and documentation

No separate finding: there is no getting-started help anywhere; the per-page help disclosures assume a configured workspace. Folded into H-empty-state-01.

---

## Strengths
- Every page renders without errors on an empty workspace; empty lists say "Nothing here yet." or "Nothing running." rather than breaking.
- The disabled "Evaluate now" states its reason in a visible box, not only on hover.
- Skills' empty state names the feeding loop (scan or paste URLs), which is P3's key missing insight.
- CV Studio still lets a newcomer explore themes and the ATS check with a sample CV before having their own.
