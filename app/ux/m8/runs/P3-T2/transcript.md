# P3-T2: transcript

- **Persona:** Alex Rivera
- **Goal:** "You have been using this app for a few weeks. Today you came across a job you like: https://job-boards.greenhouse.io/kestrelmedia/jobs/4134913 (Senior Backend Engineer at Kestrel Media). Find out how well it fits you and whether it is worth applying, and make sure it is kept with the rest of your job applications. Tell me what the app concluded."
- **Steps used:** 8 of 40
- **Outcome (my judgment):** succeeded
- **Single Ease Question:** 6/7: The Applications page had an obvious "Add a job" box that did the check and the saving in one go; only finding that page, and the row not opening on click, slowed me down.

## Steps
| # | Thinking aloud | Action | What happened | Screenshot |
|---|---|---|---|---|
| 1 | Open the app and look for where to put a job link. | Navigate to URL | Today page, "Good morning, Alex". No add-job field visible. Only a search box ("Find a job, company or document"). | step-01.png |
| 2 | A job I want to keep belongs under Applications. | Click "Applications" | Page has an "Add a job" form: link box, "Check fit now" (2-5 min, uses Claude plan) or "Save for later". | step-02.png |
| 3 | Paste the link. | Type URL in "Link to the job posting" | Accepted. | - |
| 4 | I want the fit and a verdict, not just saving. | Click "Check fit now" | A "Check fit" card appeared under the form. | step-05.png |
| 5 | It says 2-5 min, so wait. | Wait 30 s | Table now has 41 rows, including Kestrel Media. Activity says "1 done". Status line: "Fit 4.1 / 5. The fit report is ready." | step-07.png |
| 6 | I want the reasoning, so open the row. | Click the row | Nothing happened. Only the title is a link. | - |
| 7 | Click the title link. | Click "Kestrel Media — Senior Backend Engineer" | Detail page opened with the fit report. | step-09.png |
| 8 | Read the report. | Snapshot/screenshot | Fit 4.1/5, Recommendation Apply, posting real (High Confidence), Risk Low, Confidence High. Matches: Go settlement pipeline, on-call and incident reduction, PostgreSQL, each with a source in the CV. Gap: gRPC (medium), with a mitigation. Level matches. Comp not advertised. Status "Reviewed — not applied". History: "added to Applications". | step-09.png |

What I would tell a friend: The app scored Kestrel Media's Senior Backend Engineer role 4.1 out of 5 and recommended Apply. It rated the posting as very likely real, with low risk and high confidence. My Go settlement pipeline, the on-call and incident work, and PostgreSQL map to what they want. The one medium gap is gRPC. The pay is not stated in the posting, and my target is $165-190K. The job is saved in Applications as number 41, with the status "Reviewed — not applied". I haven't applied yet, and I haven't made a CV or letter for it.

## Wrong turns
- On Today I looked for an add-job place and found none. Applications was the right page.
- I clicked the table row to open it, and nothing happened.

## Moments of confusion
- The Today page gave no hint where to add a new job.
- The detail page shows "Your note: Fixture evaluation", which I never wrote. It looks like leftover test text.
- The fit report is a score and a list, but "says who?": it does not show how many postings or which employers sit behind the 4.1. It shows only my CV against this one posting. For a fit this is acceptable, but the "How the fit is worked out" link is the only explanation.
- "Reviewed — not applied" is clear, but it is not obvious that it is a saved state and not a failure.

## Problems I would report
### P3-T2-01: Table row is not clickable; only the title link opens the job
- **Severity (my guess):** 1
- **Where:** Applications table, row "Kestrel Media — Senior Backend Engineer"
- **What I expected vs what happened:** I expected the row to open the job. Clicking it did nothing.
- **Evidence:** app/ux/m8/runs/P3-T2/step-07.png

### P3-T2-02: No add-job entry point on Today
- **Severity (my guess):** 1
- **Where:** Today page
- **What I expected vs what happened:** I expected a way to add a job link there. It was only on Applications, so I had to guess the right menu.
- **Evidence:** app/ux/m8/runs/P3-T2/step-01.png

### P3-T2-03: Stray "Your note: Fixture evaluation" on a job I just added
- **Severity (my guess):** 2
- **Where:** Summary section of the job page
- **What I expected vs what happened:** I expected no note, or one I wrote. A note I did not write appears, and it reads like test data.
- **Evidence:** app/ux/m8/runs/P3-T2/step-09.png
