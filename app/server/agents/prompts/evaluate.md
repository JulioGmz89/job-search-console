You are running **non-interactively** inside Job Search Console, a local web app built on career-ops. Nobody can answer a question: never ask one, never wait for confirmation. Follow `modes/oferta.md` above in full, with these adjustments. Where this section and the mode disagree, this section wins.

### Inputs for this run

- **Job URL:** {{URL}}
- **Report number:** `{{REPORT_NUM}}` (already reserved for you — see below)
- **Date:** {{DATE}}
- **Working directory:** the career-ops repository root. All paths below are relative to it.

### Getting the job description

1. You have no browser tools in this session (no Playwright, no MCP). Fetch the posting with **WebFetch** on the URL above. If the page is an SPA that returns no usable text, try WebFetch once more on the same URL asking for the raw text of the job description.
2. If, after that, you still have no job description (fewer than ~80 words of real posting content), **stop**: write no report, no TSV, and end with the failure JSON below with `"error": "could not extract the job description"`. Never fabricate a description from the URL, the company name or a search result.
3. Because liveness could not be checked in a browser, the report header must carry `**Verification:** unconfirmed (headless)` in place of the liveness line.

### Gates that normally ask the user

- **Blacklist gate:** if `data/blacklist.md` lists this company, do **not** evaluate. Write no report and no TSV, and end with the failure JSON with `"error": "blacklisted: {reason from the file}"`.
- **Score < 4.0 / "do you still want a PDF?" prompts:** not applicable — this run never generates a PDF. The console decides afterwards whether to queue one.
- Anything else the mode phrases as "ask the user": pick the option the mode itself recommends, note the choice in the report's notes, and continue.

### Research budget

At most 5 WebSearch calls for Blocks D and G, as the mode says. No subagents: the `Task` tool is not available.

### Report number and file

- The report number is **`{{REPORT_NUM}}`**. It was reserved before you started. Do **not** run `node reserve-report-num.mjs`, do not compute `max + 1`, and do not release anything — the console handles both.
- Write the report to exactly `reports/{{REPORT_NUM}}-{company-slug}-{{DATE}}.md` with the header and sections the mode specifies (Machine Summary YAML included). The console verifies that file exists when you finish.
- Do not generate a CV PDF, HTML or cover-letter PDF in this run, even for a high score. Write the header line as `**PDF:** not generated — use the console's Generate PDF button` (localized to `language.output`; keep the words "not generated", upstream's tooling keys on them).

### Tracker

- **Never edit `data/applications.md`**, and never run `node merge-tracker.mjs` — the console merges after you exit, when nothing else is writing.
- Instead write exactly one TSV line, no header, to `batch/tracker-additions/{{REPORT_NUM}}-{company-slug}.tsv`, in the format upstream's batch workers use (9 tab-separated columns plus the URL):

  ```text
  {{REPORT_NUM}}\t{{DATE}}\t{company}\t{role}\tEvaluated\t{score}/5\t❌\t[{{REPORT_NUM}}](reports/{{REPORT_NUM}}-{company-slug}-{{DATE}}.md)\t{one concise sentence}\t{{URL}}
  ```

  Status comes **before** score in the TSV. Use canonical statuses from `templates/states.yml` only. If the posting reached you through an agency, append a labelled `via={Agency}` field after the URL. If the job's posting date is known from the inbox line, add it to the notes as a trailing `; posted: YYYY-MM-DD` segment; never invent one.
- Do not touch `data/pipeline.md`; the console reconciles it.

### Commands

You may only run `node …` commands from the repository root (for example `node jd-skill-gap.mjs …`). Do not install anything, do not run git, do not run upstream's `batch/` scripts.

### How to finish

End your final message with one fenced ```json block, built with a JSON serializer (never by string interpolation), using upstream's batch shape:

```json
{
  "status": "completed",
  "report_num": "{{REPORT_NUM}}",
  "company": "{company}",
  "role": "{role}",
  "score": {score as a number},
  "legitimacy": "{High Confidence|Proceed with Caution|Suspicious}",
  "pdf": null,
  "report": "reports/{{REPORT_NUM}}-{company-slug}-{{DATE}}.md",
  "error": null
}
```

On failure use `"status": "failed"`, `"score": null`, `"report": null` and a one-line `"error"`. The console reads the report file and this block, not your prose.
