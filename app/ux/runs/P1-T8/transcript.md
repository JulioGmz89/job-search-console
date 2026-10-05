# P1-T8: transcript

- **Persona:** Alex Rivera
- **Goal:** "You have been using this app for a few weeks. Earlier today you asked it to look at a job posting for you and something went wrong. Find out what happened and why, then get that job looked at after all. Tell me what went wrong."
- **Steps used:** 13 of 40 (counting the navigate, 7 clicks, 1 wait, 1 failed hover, plus screenshots not counted)
- **Outcome (my judgment):** partly succeeded. I found the failed run and its stated reason. I re-ran an evaluation, but I had to guess which posting it was, so I am not sure I re-ran the right job.
- **Single Ease Question:** 4/7: Runs was easy to find and the failure was listed, but the URL was cut off, there was no Retry button, and I had to guess which inbox item to re-run.

## Steps
| # | Thinking aloud | Action | What happened | Screenshot |
|---|---|---|---|---|
| 1 | Open the app. | Navigate to URL | Pipeline table, a paste box with "Evaluate now", 40 applications. No sign of a failure. | step-01.png |
| 2 | Something failed earlier. "Runs" sounds like the history. | Click Runs | One row, Failed, "Evaluate job-boards.greenhouse.io", report 041. | step-02.png |
| 3 | Open the failed row for the reason. | Click row | Log: Claude session 1s, "I looked at the page but wrote nothing", "the agent exited without writing reports/041-*.md". URL cut off at "job-boards.greenhous". | step-03.png, step-04.png |
| 4 | Is there a retry? Nothing on the row. Check "How runs work". | Click How runs work | Long explanation. Nothing about retrying a failed run. | step-05.png |
| 5 | I need the full URL. Tried hovering the title. | Hover | Error, the page had re-rendered. Wasted action. | - |
| 6 | Pending links are probably under Sources (13 URLs waiting). | Click Sources | Page with scan controls and "13 URL(s) waiting to be evaluated". | step-06.png |
| 7 | Show the inbox. | Click Show the inbox | 13 postings, each with Evaluate. Only one says "posting could not be read" (Driftwood, Senior Backend Engineer). Nothing marks which one failed earlier. | step-07.png |
| 8 | That "could not be read" one fits "looked at the page but wrote nothing". Best guess. Click Evaluate. | Click Evaluate | No visible feedback on the page. | step-08.png |
| 9 | Check Runs. | Click Runs, wait 20s | Chain ran: Evaluate (report 041, Finished), Merge tracker, PDF for Driftwood Analytics, Render (script, "broken template"), Reconcile inbox, Mark PDF ready. | step-09.png |
| 10 | Check the tracker. | Click Pipeline | Back on the table. I did not scroll to look for the new row. | step-10.png |

**What I would tell a friend:** The evaluation failed in the Runs tab. Claude opened the posting for 1 second, wrote no report, and the app marked it failed ("agent exited without writing reports/041-*.md"). It does not say why Claude gave up. My guess is the posting page could not be read. I re-ran Evaluate from the Sources inbox on the Driftwood Senior Backend Engineer posting, which is flagged "posting could not be read". It then finished as report 041 and queued a PDF. That PDF step mentions "broken template", so the PDF may not be good. I am not sure that was the same posting you originally sent.

## Wrong turns
- Hover on the run title (step 5). I wanted the full URL, but the page had re-rendered and the click failed.
- "How runs work" (step 4). I hoped for a retry hint. It was long and did not help.

## Moments of confusion
- The log says "wrote nothing" but not why (page blocked? login wall? model gave up?).
- The URL is truncated in the title and in the log, so I could not tell which posting it was.
- No Retry on the failed run. I had to go to another tab and find the posting myself.
- The inbox has no marker for "this one just failed".
- After clicking Evaluate in the inbox, nothing on the page said it had started.
- The new run is also named "Evaluate job-boards.greenhouse.io", so it looks the same as the failed one. Both use "report 041".
- The PDF run said "broken template" and I did not know what that meant.
- The failed run was not shown as an inbox item with an error.

## Problems I would report
### P1-T8-01: Failed run gives no real reason
- **Severity (my guess):** 3
- **Where:** Runs, failed row detail.
- **Expected vs happened:** I expected a cause (page blocked, no content, and so on). I got "I looked at the page but wrote nothing" and "agent exited without writing reports/041-*.md".
- **Evidence:** app/ux/runs/P1-T8/step-03.png

### P1-T8-02: Run name and log truncate the URL, so I cannot tell which job it was
- **Severity (my guess):** 3
- **Where:** Runs list "Evaluate job-boards.greenhouse.io" and the "Received: ... URL: https://job-boards.greenhous" line.
- **Expected vs happened:** I expected the full URL or the company and role. All runs of this kind look identical.
- **Evidence:** app/ux/runs/P1-T8/step-03.png, step-09.png

### P1-T8-03: No Retry on a failed run
- **Severity (my guess):** 3
- **Where:** Failed run detail, and the empty last column of the row.
- **Expected vs happened:** I expected a Retry button. I had to go to Sources, open the inbox, and guess the posting.
- **Evidence:** app/ux/runs/P1-T8/step-04.png, step-07.png

### P1-T8-04: Inbox does not link to the failed attempt
- **Severity (my guess):** 2
- **Where:** Sources, "Show the inbox".
- **Expected vs happened:** A failed posting should say "evaluation failed" with a link to the run. The only hint was "posting could not be read" on one item, which may or may not be the same thing.
- **Evidence:** app/ux/runs/P1-T8/step-07.png

### P1-T8-05: No feedback after clicking Evaluate in the inbox
- **Severity (my guess):** 2
- **Where:** Sources inbox, Evaluate button.
- **Expected vs happened:** I expected a "queued" message or a link to the run. Nothing changed on screen. I only learned it started by going to Runs.
- **Evidence:** app/ux/runs/P1-T8/step-08.png

### P1-T8-06: Pipeline hides the failure, and the Runs tab has no badge
- **Severity (my guess):** 2
- **Where:** Pipeline (first screen) and the nav.
- **Expected vs happened:** Nothing on the first screen said an evaluation had failed. I only found it by guessing "Runs".
- **Evidence:** app/ux/runs/P1-T8/step-01.png

### P1-T8-07: Follow-on PDF run says "broken template"
- **Severity (my guess):** 2
- **Where:** Runs, "PDF for Driftwood Analytics" and "Render ... broken template".
- **Expected vs happened:** I did not ask for a PDF and the label "broken template" is unexplained. I could not tell if the PDF was produced.
- **Evidence:** app/ux/runs/P1-T8/step-09.png
