You are running **non-interactively** inside Job Search Console, a local web app built on career-ops. Nobody can answer a question: never ask one, never wait for confirmation. Follow `modes/cover.md` above in **slug mode**, with these adjustments. Where this section and the mode disagree, this section wins.

### Inputs for this run

- **Report:** `{{REPORT_PATH}}` (report number `{{REPORT_NUM}}`) — read it first. Use its `## Cover Letter Draft` section as the starting point, as slug mode describes, and its header for the company, role and job URL.
- **Job URL:** {{URL}} — fetch it with **WebFetch** if you need the full posting (no browser tools exist in this session). If it is gone, work from the report.
- **Date:** {{DATE}}
- **Working directory:** the career-ops repository root. All paths below are relative to it.

### The user's answers (Step 5 gaps and Step 6 prompts)

The four mandatory answers were collected from the user in the console **before** this run started. Treat them as the user's explicit, final answers — do not re-ask, do not "improve" them, do not substitute your own angle:

{{ANSWERS}}

For any Step 5 gap prompt (notice period, language level, title mismatch): use what `config/profile.yml` and `cv.md` already state; if they are silent, leave that gap unaddressed in the letter and list it in your final summary. Never invent a notice period, a language level or a title.

### Approval steps

- **Step 8** (present the draft, wait for approval) and **Step 9**'s "only after explicit user approval": the user's answers above are the approval. Draft the letter, then render it in the same run.
- Show the full final letter text in your output anyway, so the user can read it in the run log.

### Rendering

- Write the payload to **`{{PAYLOAD_PATH}}`**, not `/tmp`.
- Set `"output_path"` in the payload to exactly **`{{COVER_PDF_PATH}}`**. The console checks for that file when you finish.
- Run exactly `node generate-cover-letter.mjs --payload {{PAYLOAD_PATH}}` — with **no** `--report` flag. (Upstream's renderer would otherwise replace the CV's entry for this report in `data/pdf-index.tsv` with the cover letter; the console keeps its own record of cover letters.)
- Template: run `node cv-templates.mjs resolve cover` as the mode says; do not pass a template name.
- Slug-mode step 5 (append `PDF generated: … on {{DATE}}` to the report's `## Cover Letter Draft` section): do it, with the path above.
- Do not edit `data/applications.md` and do not run `merge-tracker.mjs`.

### Writing register

This is candidate-facing prose: apply the Voice DNA section below in full (Tier 1 and Tier 2) and `modes/_writing.md`, under the user's own `## Writing Style` in `modes/_profile.md` where present. Facts come only from `cv.md` and `article-digest.md`.

### Commands

You may only run `node …` commands from the repository root. Do not install anything and do not run git.

### How to finish

End with: the PDF path and size, the word count against the 350–420 target, the keywords that could not be worked in, and which gap acknowledgements were included or omitted. If no PDF was produced, say exactly which step failed and why.
