# P3-T8: transcript

- **Persona:** Alex Rivera
- **Goal:** "You have been using this app for a few weeks. Earlier today you asked it to look at a job posting for you and something went wrong. Find out what happened and why, then get that job looked at after all. Tell me what went wrong."
- **Steps used:** 10 of 40 (navigate, 2 screenshots-only steps not counted separately; counted actions: navigate, Runs, row click, help click, hover, Pipeline, data issue, Sources, wait, plus snapshots)
- **Outcome (my judgment):** partly succeeded. I found what went wrong; I could not re-run the job.
- **Single Ease Question:** 3/7. The failed run was easy to find, but the reason was vague and there was no way to retry it.

## Steps
| # | Thinking aloud | Action | What happened | Screenshot |
|---|---|---|---|---|
| 1 | Start at the app; where would a failed request show up? | Navigate to URL | Pipeline table of 40 jobs, a paste-a-URL box. No error or notice about a failure. | step-01.png |
| 2 | "Runs" sounds like where today's attempt lives. | Click Runs | One finished item, red "Failed", "Evaluate job-boards.greenhouse.io", report 041, 22:33:38. | step-02.png |
| 3 | Open it to see why. | Click the row | Log: "I looked at the page but wrote nothing." Then "the agent exited without writing reports/041-*.md". Run took 0:00 / 1s, $0.05. | step-03.png |
| 4 | Maybe the help explains failures and retry. | Click "How runs work" | Long text on lanes and chains. Nothing on why an evaluation writes nothing, nothing on retrying. | step-04.png |
| 5 | Maybe a retry button appears on hover. | Hover the row | Nothing new. | step-05.png |
| 6 | Maybe the Pipeline shows the failure. | Click Pipeline, then the "1 data issue found" note | Only "row-unparseable", unrelated. No row for my job. | step-07.png |
| 7 | Maybe a Sources inbox holds the URL. | Click Sources | "Nothing here yet." No URL. | step-09.png |

I stopped there. To retry I need the full posting address. The log cuts it off at "https://job-boards.greenhous" and there is no way to copy it or retry from the run. I would not guess the rest of the address.

**What I would tell a friend:** The request failed. The app started a Claude session for the Greenhouse job (report number 041). The session opened the page, then finished in about one second without writing a report, so the app marked it Failed. The app does not say why. It might have been a page it could not read, or the assistant simply gave up. I could not get the job looked at again. The Runs page has no "retry" button and cuts the link off, so I would have to find the original posting link myself and paste it into the Pipeline box. I have not done that, so the job is still not evaluated.

## Wrong turns
- Help text under "How runs work" (hoping for failure reasons or retry). It only described the normal flow.
- Pipeline "data issue" note: I thought it might be my failed job. It was a tracker row problem.
- Sources page: hoped for a saved inbox of URLs. It was empty.

## Moments of confusion
- "I looked at the page but wrote nothing." Did the page fail to load, was it blocked, or did it decide it was not a job? I could not tell.
- Report number 041 was reserved, but the Pipeline has only 40 rows. Is it gone, and will a retry get 041 or 042? Unclear.
- The Pipeline gave no sign anything had failed; I only found it by guessing "Runs".

## Problems I would report
### P3-T8-01: Failed run gives no real reason
- **Severity (my guess):** 3
- **Where:** Runs > the failed "Evaluate job-boards.greenhouse.io" detail
- **What I expected vs what happened:** I expected something like "page could not be read" or "login required". I got "I looked at the page but wrote nothing" and "the agent exited without writing reports/041-*.md", which reads like a file-system message.
- **Evidence:** app/ux/runs/P3-T8/step-03.png

### P3-T8-02: No way to retry from a failed run
- **Severity (my guess):** 3
- **Where:** Runs list and run detail; no button on the row or in the detail
- **What I expected vs what happened:** I expected a "Try again" button. Nothing on the row, hover or detail.
- **Evidence:** app/ux/runs/P3-T8/step-05.png

### P3-T8-03: Posting URL is cut off in the log
- **Severity (my guess):** 3
- **Where:** Log line "Received: Evaluate this job posting. URL: https://job-boards.greenhous"
- **What I expected vs what happened:** I expected the full link so I could copy it. It stops at about 70 characters and the title shows only the host name.
- **Evidence:** app/ux/runs/P3-T8/step-03.png

### P3-T8-04: Failure not visible from the Pipeline
- **Severity (my guess):** 2
- **Where:** Pipeline page, top area
- **What I expected vs what happened:** No banner, no row, no note that today's evaluation failed. I only found it by trying Runs.
- **Evidence:** app/ux/runs/P3-T8/step-07.png

### P3-T8-05: Help does not cover failures
- **Severity (my guess):** 2
- **Where:** "How runs work"
- **What I expected vs what happened:** I expected causes of failure and what to do next. It explains only the happy path and jargon (lanes, chains, JSC_MAX_AGENTS).
- **Evidence:** app/ux/runs/P3-T8/step-04.png
