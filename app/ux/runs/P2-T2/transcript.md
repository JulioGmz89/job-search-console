# P2-T2: transcript

- **Persona:** Alex Rivera
- **Goal:** "You have been using this app for a few weeks. Today you came across a job you like: https://job-boards.greenhouse.io/kestrelmedia/jobs/4134913 (Senior Backend Engineer at Kestrel Media). Find out how well it fits you and whether it is worth applying, and make sure it is kept with the rest of your job applications. Tell me what the app concluded."
- **Steps used:** 6 of 40
- **Outcome (my judgment):** succeeded
- **Single Ease Question:** 6/7: the paste box and Evaluate now were obvious and it finished in seconds, but I had to work out what "4.1" means and the report opened below the long table.

## Steps
| # | Thinking aloud | Action | What happened | Screenshot |
|---|---|---|---|---|
| 1 | Open the app and look for where to add a job. | Navigate to URL | Pipeline page with 40 applications, a "Paste a job posting URL…" box, "Evaluate now" and "Add to inbox". | step-01.png |
| 2 | Paste the link, expecting it to be scored. | Typed the URL | Evaluate now became enabled. | none |
| 3 | "Evaluate now" sounds like what I want. | Clicked Evaluate now | A progress panel appeared with live lines ("Looking at the posting…", "Report written"). | step-02.png |
| 4 | Is it done? I waited a bit. | Waited 20 s, took snapshot | Panel said "Finished 0:08", "score 4.1/5", "Score 4.1 >= 3.5: queuing the tailored PDF". Counter went from 40 to 41 applications and 6 to 7 PDFs. New row 41 Kestrel Media, 4.1, Evaluated, Apply. | none |
| 5 | I want the reasons, so I clicked the new row. | Clicked row 41 | A detail panel opened (at the bottom of the page, below the table): Decision Apply, Legitimacy High Confidence, Risk Low, Confidence High, plus sections A to F. | step-03.png |
| 6 | Enough to answer. | Stopped | | none |

**What I would tell a friend:** I pasted the Kestrel Media link and a few seconds later the app had added it to my list as entry #41 with a score of 4.1 out of 5. It says "Apply". The company looks legitimate and low risk, with high confidence. It says my seniority matches and suggests leading with my settlement pipeline and incident reduction work. The pay is not stated in the posting. The app suggests aiming for $165K-190K. It also made a tailored CV PDF. So yes, it looks worth applying to, and it is saved with my other applications. I have not applied yet. The status says "Evaluated", not "Applied".

## Wrong turns
None.

## Moments of confusion
- Is 4.1 good? The table scale never says "out of 5" until the progress log. I guessed from the "Apply" label and the 3.5 PDF threshold.
- After clicking the row I saw nothing change at the top. The detail panel is at the bottom of a long list, so I almost missed it.
- Whether the job is "kept" was only clear from the 41 count and the new row, not from any message.
- "Legitimacy", "Confidence" and "Next action: Apply" read like jargon.
- I did not see the CV Match section's content in my view (collapsed or hidden); I did not check it.

## Problems I would report
### P2-T2-01: Evaluation detail opens far below the table
- **Severity (my guess):** 2
- **Where:** after clicking row 41 in the Pipeline table; panel titled "Evaluation: Kestrel Media - Senior Backend Engineer"
- **What I expected vs what happened:** I expected it to appear next to or above the list. It opened at the bottom of a 41-row page.
- **Evidence:** app/ux/runs/P2-T2/step-03.png

### P2-T2-02: Score has no scale or meaning in the table
- **Severity (my guess):** 2
- **Where:** Score column and filter "Auto-CV (>= 3.5)"
- **What I expected vs what happened:** I expected "4.1 / 5" or a short explanation. Only the progress log said "/5".
- **Evidence:** app/ux/runs/P2-T2/step-02.png

### P2-T2-03: No clear "saved to your list" message
- **Severity (my guess):** 1
- **Where:** progress panel after Evaluate now
- **What I expected vs what happened:** I expected "Added to your applications". It said "Report written" and the header count quietly went from 40 to 41.
- **Evidence:** app/ux/runs/P2-T2/step-02.png
