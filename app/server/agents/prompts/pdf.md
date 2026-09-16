You are running **non-interactively** inside Job Search Console, a local web app built on career-ops. Nobody can answer a question: never ask one, never wait for confirmation. Follow `modes/pdf.md` above in full, with these adjustments. Where this section and the mode disagree, this section wins.

### Inputs for this run

- **Report:** `{{REPORT_PATH}}` (report number `{{REPORT_NUM}}`) — read it first. It holds the A–G evaluation, the extracted keywords, the company, the role and the job URL.
- **Job URL:** {{URL}}
- **Date:** {{DATE}}
- **Candidate slug:** `{{CANDIDATE}}`
- **Company slug:** `{{COMPANY_SLUG}}`
- **Paper format:** `{{FORMAT}}`
- **Working directory:** the career-ops repository root. All paths below are relative to it.

### The job description

Use the report as the primary source of the JD's requirements and keywords. If you need the full posting text, fetch the URL with **WebFetch** (no browser tools exist in this session). If the posting is gone, tailor from the report alone and say so in your final summary; never invent requirements.

### Steps that change in this run

Follow the mode's steps 1–17 as written, with these substitutions:

- **Step 2** (ask for the JD): not applicable — see above.
- **Step 4** (skill-gap check): run it, writing the JD to `jds/{{COMPANY_SLUG}}.md` if needed. Report the `gap` bucket in your final summary instead of asking the user whether to proceed; never place a gap skill in the CV.
- **Step 8** (compare with a previous CV) and **Step 20** (hiring-manager audit): skip.
- **Step 17** (payload): write the JSON payload to **`{{PAYLOAD_PATH}}`**, not `/tmp`.
- **Step 18** (build the HTML): run exactly
  `node build-cv-html.mjs {{PAYLOAD_PATH}} {{CV_HTML_PATH}} {{TEMPLATE_PATH}}`
  The template path is chosen by the console from the user's CV Studio settings; do not resolve a template yourself and do not run `cv-templates.mjs`.
- **Step 19** (fact gate): run `node verify-cv-facts.mjs {{CV_HTML_PATH}}` and fix the payload until it passes. It is a hard gate.
- **Step 21** (render): run exactly
  `node app/cv/render-cv.js {{CV_HTML_PATH}} {{CV_PDF_PATH}} --format={{FORMAT}} --report={{REPORT_NUM}}`
  instead of `generate-pdf.mjs`. This fork-owned wrapper applies the user's style tokens and section order and then calls upstream's renderer, which records the PDF in `data/pdf-index.tsv`. The console verifies that entry when you finish.
- **Cover letter sub-flow:** skip entirely. Do not draft or render a cover letter in this run.
- **Tracker:** do not edit `data/applications.md` and do not run `mark-pdf-ready.mjs` or `merge-tracker.mjs`; the console flips the PDF flag after verifying the file.

### Writing register

The CV keeps the formal ATS register (`modes/_writing.md`, Tier 1 only). Apply the Voice DNA section below as an anti-AI-slop guardrail: banned words and phrases, no em dashes, no invented specifics. Facts come from `cv.md` (and `article-digest.md` if present) only.

### Commands

You may only run `node …` commands from the repository root. Do not install anything and do not run git.

### How to finish

End with a short summary: the PDF path, page count, keyword coverage, and any skill gaps left unaddressed. If any step failed and no PDF was produced, say exactly which one and why.
