# P2-T8: transcript

- **Persona:** Alex Rivera
- **Goal:** "You have been using this app for a few weeks. Earlier today you asked it to look at a job posting for you and something went wrong. Find out what happened and why, then get that job looked at after all. Tell me what went wrong."
- **Steps used:** 11 of 40
- **Outcome (my judgment):** partly succeeded (evaluation re-ran and finished, but I am inferring it was the same job)
- **Single Ease Question:** 4/7: Runs page had the failure, but the reason was vague, the URL was cut off, and there was no retry button there.

## Steps
| # | Thinking aloud | Action | What happened | Screenshot |
|---|---|---|---|---|
| 1 | Start at the app. | Navigate | Pipeline table, 40 applications. No sign of an error. | step-01 |
| 2 | Something "ran" earlier, so look at Runs. | Click Runs | One Failed run: "Evaluate job-boards.greenhouse.io", report 041. | step-02 |
| 3 | Open it for details. | Click row | Log: "I looked at the page but wrote nothing." Reason: "the agent exited without writing reports/041-*.md". URL cut off. | step-03 |
| 4 | Look for a retry button. | Hover the empty last cell | Nothing. | step-04 |
| 5 | Maybe help explains. | Click "How runs work" | Long technical text. Nothing about retrying, or about why an agent writes nothing. | - |
| 6 | Need the full URL, so try Sources. | Click Sources | Shows "13 URL(s) waiting to be evaluated". | - |
| 7 | Open inbox. | Click "Show the inbox" | List of 13. One, Driftwood Analytics "Senior Backend Engineer", says "posting could not be read". I guess this is the one. | - |
| 8 | Evaluate it. | Click Evaluate on that row | No visible feedback on the page. | step-05 |
| 9 | Did it do anything? | Wait 5s, open Runs | New Evaluate run Finished (0:08), report 041. A PDF run is Running for Driftwood, and a reconcile is queued. | step-06 |

Total counted actions: about 11 including waits and snapshots.

What I would tell a friend: The evaluation of a Greenhouse posting failed at 22:32. The assistant opened the page but wrote no report, so nothing was saved. The app does not say why. My guess is the page could not be read, since the Driftwood Senior Backend Engineer inbox entry is flagged "posting could not be read". I re-ran Evaluate from the Sources inbox and the second run finished. It also started a PDF, so the score must be 3.5 or higher. I did not open the new report to confirm the score, and I am not 100% sure it was the same job.

## Wrong turns
- Looked for a retry button on the failed run; none exists.
- Opened "How runs work"; it was too technical to help.

## Moments of confusion
- "wrote nothing" with no explanation of why, and no next step.
- The run title shows only the site name, so I could not tell which job failed.
- After clicking Evaluate in the inbox, nothing on that page showed it started.
- A PDF started on its own and I did not know why.

## Problems I would report
### P2-T8-01: Failed run gives no human reason or next step
- **Severity (my guess):** 3
- **Where:** Runs, open the Failed run
- **What I expected vs what happened:** I expected "page could not be read, try again" and a retry button. I got "the agent exited without writing reports/041-*.md".
- **Evidence:** app/ux/runs/P2-T8/step-03.png

### P2-T8-02: Run is named by website, not job; URL truncated
- **Severity (my guess):** 3
- **Where:** Runs list and run detail ("Evaluate job-boards.greenhouse.io", "Received: ...https://job-boards.greenhous")
- **What I expected vs what happened:** I expected company and role. Every Greenhouse job looks the same, so I had to guess which job failed.
- **Evidence:** app/ux/runs/P2-T8/step-02.png

### P2-T8-03: No retry from the failed run; the retry is hidden in Sources inbox
- **Severity (my guess):** 2
- **Where:** Run detail vs Sources, "Show the inbox"
- **What I expected vs what happened:** I expected Retry on the run. I only found Evaluate by luck in a collapsed inbox list.
- **Evidence:** app/ux/runs/P2-T8/step-03.png

### P2-T8-04: No feedback after clicking Evaluate in the inbox
- **Severity (my guess):** 2
- **Where:** Sources inbox, Evaluate button
- **What I expected vs what happened:** I expected a message that it started. The page showed nothing; I only saw it by going to Runs.
- **Evidence:** app/ux/runs/P2-T8/step-05.png

### P2-T8-05: Same report number 041 reused, and a PDF auto-started
- **Severity (my guess):** 1
- **Where:** Runs after retry
- **What I expected vs what happened:** The retry reused 041 and queued a PDF unasked; a short note would help.
- **Evidence:** app/ux/runs/P2-T8/step-06.png
