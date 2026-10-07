# Heuristic evaluation (M8): My CV (`#/my-cv/content`, `/profile`, `/design`, `/writing`)

Spec: `app/ux/design/ia.md` §2.7. POPULATED (`:4401`), BROKEN (`:4403`, design fails
screening), EMPTY (`:4402`). 1280×800. Evaluator: heuristic-evaluator, 2026-10-07.

**Dark scheme: not exercised** (no way to switch `prefers-color-scheme` with the available
tools). The screening verdict chips (green / amber / red) also carry words, so colour is not
the only signal.

## 1. Visibility of system status

### H8-my-cv-02: Design: the main button is disabled with no reason, while the other two stay live during "Drawing your CV…"
- **Severity:** 2
- **Where:** My CV › Design › **Make this my design for every CV**, **Update existing CVs to this design (6)**, **Lay out this CV again in Standard**
- **Tasks:** T7
- **Capabilities:** R-cv-style-put, R-cv-render-all, R-cv-preview
- **Method:** heuristic (H1 Visibility of system status)
- **Evidence:** app/ux/m8/evidence/H8-my-cv-02.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4401`, open http://127.0.0.1:4401/#/my-cv/design
  2. Observe while the preview reads "Updating… · Drawing your CV…": **Make this my design for every CV** is pale (disabled) with no text saying why; **Update existing CVs to this design (6)** and **Lay out this CV again in Standard** are fully enabled for a design whose preview has not appeared.
  3. Once drawn, the gallery shows "Standard · your design" with a purple border and a second card (the hovered/focused one) with a dark border; the primary stays disabled with no reason.
- **Notes:** ia.md §3 "Empty states": never present a disabled main action without the reason
  in view ("Standard is already your design"). The count "(6)" is also stale after a re-check
  detaches a CV (Writing rules then lists 5; see H8-job-01).

## 2. Match between system and the real world

### H8-my-cv-01: The screening failure still reads as checker output
- **Severity:** 2
- **Where:** My CV › Design › Preview › "Screening problems" box
- **Tasks:** T7
- **Capabilities:** R-cv-design-check
- **Method:** heuristic (H2 Match between system and the real world)
- **Evidence:** app/ux/m8/evidence/H8-my-cv-01.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state broken --port 4403`, open http://127.0.0.1:4403/#/my-cv/design and wait for the preview.
  2. Observe: "Screening problems. An applicant-tracking system reading this CV loses part of it: No email address found. ATS and recruiters need a parseable contact email in the body of the CV. Found 1 <table> element(s). Table-based layouts scramble the reading order ATS extractors follow; use a single-column flow."
- **Notes:** shorter than M6's 13 bullets, and **Show a design that passes** is right there,
  but "<table> element(s)", "ATS extractors" and "parseable" are the checker's words. ia.md asks
  for a 3-line diagnosis like "the name and 3 headings are lost". Same text on Today (H8-today-03).

### H8-my-cv-05: Profile asks for a language code
- **Severity:** 1
- **Where:** My CV › Profile › How the app works for you › **Language of reports and documents**
- **Tasks:** —
- **Capabilities:** R-profile-put
- **Method:** heuristic (H2 Match between system and the real world)
- **Evidence:** app/ux/m8/evidence/H8-my-cv-05.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4401`, open http://127.0.0.1:4401/#/my-cv/profile
  2. Observe: a free-text field holding "en", hint "A language code, e.g. en, es, de".
- **Notes:** a select of language names would prevent typos the engine cannot use.

## 3. User control and freedom

No issues found. Leaving Content, Profile or Design with unsaved changes asks "Leave without
saving your CV/profile?" with **Leave without saving** / **Stay** (fixes H-cv-studio-04);
**Update 6 CVs to the broken design?** can be cancelled; word chips have ×.

## 4. Consistency and standards

### H8-my-cv-04: Content has no preview of the CV, only a list of what was read
- **Severity:** 1
- **Where:** My CV › Content
- **Tasks:** T1
- **Capabilities:** R-cv-content-get, R-cv-content-put
- **Method:** heuristic (H4 Consistency and standards)
- **Evidence:** app/ux/m8/evidence/H8-my-cv-04.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4401`, open http://127.0.0.1:4401/#/my-cv/content
  2. Observe: a Markdown text area, **Save** (disabled: "Nothing to save yet: edit your CV above."), **Import from a file**, and "What the app reads from it: Alex Rivera · Summary, Core competencies, Experience (3 roles), Projects (1 role), Education, Certifications, Skills".
- **Notes:** ia.md §2.7 specifies "a Markdown editor with a preview". P2 has never written
  Markdown; the summary helps, but a rendered view is what tells them "#" became a name.
  ("Projects (1 role)" is also odd wording.)

## 5. Error prevention

### H8-my-cv-06: "Lay out this CV again in broken" is offered without a warning when the design fails screening
- **Severity:** 2
- **Where:** My CV › Design › **Lay out this CV again in <design>**
- **Tasks:** T7
- **Capabilities:** R-cv-preview-pdf, R-runs-start (cv-render)
- **Method:** heuristic (H5 Error prevention)
- **Evidence:** app/ux/m8/evidence/H8-my-cv-01.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state broken --port 4403`, open http://127.0.0.1:4403/#/my-cv/design
  2. With "broken · your design · Screening problems" selected, look under the preview.
  3. Observe: **Lay out this CV again in broken** ("A few seconds · no AI · wording unchanged") with no warning; by contrast **Update existing CVs to this design (6)** opens a dialog that says "This design fails the screening check. The updated PDFs would lose part of their text…".
- **Notes:** the bulk action got the warning; the single one, which T7 uses to "produce the
  version you would send to Cobalt Freight", did not. M6 H-broken-state-04 is partly fixed.

## 6. Recognition rather than recall

No issues found. **Preview with** names CVs by job ("Ironleaf Security — Site Reliability
Engineer, Oct 6") (fixes H-cv-studio-01); every design card shows the user's own CV and a
verdict chip.

## 7. Flexibility and efficiency of use

No issues found. Writing rules lists every tailored CV with fit, date, "before your rules
changed", **Open** and **Make it again**; **Add a word** appends one rule without rewriting the
file; **All rules** opens the full editor for P1.

## 8. Aesthetic and minimalist design

No issues found. Four sub-pages, one job each.

## 9. Help users recognize, diagnose, and recover from errors

No new issues. Profile rejects a fit threshold of 9 under the field ("Enter a fit between 0
and 5, for example 3.5"); **Add** with an empty word says "Type a word or short phrase first."

## 10. Help and documentation

### H8-my-cv-03: Writing samples can only be added by dropping a file into a folder, and cannot be opened
- **Severity:** 2
- **Where:** My CV › Writing rules › Writing samples
- **Tasks:** T9
- **Capabilities:** R-cv-writing-samples
- **Method:** heuristic (H10 Help and documentation)
- **Evidence:** app/ux/m8/evidence/H8-my-cv-03.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4401`, open http://127.0.0.1:4401/#/my-cv/writing
  2. Scroll to **Writing samples**.
  3. Observe: two file names in monospace ("design-note-idempotent-retries.md · changed Oct 6") with no **Open**, and "To add one, put a text or Markdown file in the writing-samples folder of your workspace (C:\Users\…\writing-samples). It appears here by itself."
- **Notes:** the section calls samples "the strongest way to sound like you", then sends P2 to
  the file system. ia.md §2.7 lists samples "with **Open**". An **Add a sample** (paste or choose
  a file, as on Today's CV step) would match the rest of the app.

## Strengths

- One home for content, profile, design and voice, each saving through its own file without
  rewriting what it does not own ("comments and everything else in the file stay as they are").
- The design gallery shows each design with the user's CV and a screening verdict in words;
  the bulk update warns when the design fails.
- "These rules apply to the next tailored CV or letter. Already-made documents keep their
  wording." plus a per-CV **Make it again** answers T9's "will my old CVs change?".
- Unsaved-changes guards on every editable sub-page.

## M6 findings re-checked (H-cv-studio-*, H-empty-state-06, H-broken-state-04)

| M6 ID | M6 problem | Status in M8 | Note |
|---|---|---|---|
| H-cv-studio-01 | CV selector lists file slugs | **Fixed** | Named by job and date. |
| H-cv-studio-02 | Switching CV shows the previous preview while rendering | **Fixed** | "Updating… · Drawing your CV…". |
| H-cv-studio-03 | Two save actions; render button changes label and meaning | **Partly fixed** | Three clearly worded buttons, but the primary's disabled state is unexplained (H8-my-cv-02). |
| H-cv-studio-04 | Unsaved changes discarded on page change | **Fixed** | Leave-without-saving dialog. |
| H-cv-studio-05 | ATS failure is a wall of bullets | **Partly fixed** | Short, with a fix link, but still checker wording (H8-my-cv-01). |
| H-empty-state-06 | CV Studio shows a ready-made CV, no way to replace it | **Fixed** | Content: paste, Import from a file, Save. |
| H-broken-state-04 | With an ATS-failing theme, "Render this CV" is the one-click primary | **Partly fixed** | Bulk update warns; single re-layout does not (H8-my-cv-06). |
