# P1-T2: transcript

- **Persona:** Alex Rivera
- **Goal:** "You have been using this app for a few weeks. Today you came across a job you like: https://job-boards.greenhouse.io/kestrelmedia/jobs/4134913 (Senior Backend Engineer at Kestrel Media). Find out how well it fits you and whether it is worth applying, and make sure it is kept with the rest of your job applications. Tell me what the app concluded."
- **Steps used:** 9 of 40
- **Outcome (my judgment):** succeeded
- **Single Ease Question:** 6/7: "Add a job" with a paste box sat on the Applications page and did everything in one click; I only lost a click on To review first.

## Steps
| # | Thinking aloud | Action | What happened | Screenshot |
|---|---|---|---|---|
| 1 | Open the app. | Navigate to URL | Today page: 1 needs-you item, waiting list, reviewed-not-applied. No obvious paste box. | step-01.png |
| 2 | Pending links used to live in a file, so "To review" is the home. | Click To review | Lists 13 links with Check fit buttons, but nowhere to paste my own link. | (none) |
| 3 | The tracker is Applications; maybe adding is there. | Click Applications | "Add a job" box at the top with a link field, "Check fit now" and "Save for later". | (none) |
| 4 | Paste the link. | Type URL | Filled. | (none) |
| 5 | I want the fit now, which is the fastest-looking control. | Click Check fit now | A progress card appeared. | step-05.png |
| 6 | Evaluations take minutes; wait. | Wait 30 s | Card said Done, took 8 s: "Fit 4.1 / 5. The fit report is ready. then: added to Applications". | step-07.png |
| 7 | Open the result. | Click Open the job | Job page: Fit 4.1/5, Recommendation Apply, status Reviewed — not applied, full A–F report. | step-09.png |

Answer for a friend: Kestrel Media, Senior Backend Engineer, fit 4.1/5, recommendation Apply. The posting looks real (high confidence), risk low, confidence high. It matches on Go backend services (settlement pipeline), on-call and reliability ownership, and PostgreSQL. The one gap is gRPC, medium severity (mitigation: name the internal service APIs). The level is senior, which matches. Advertised pay is not stated; my target is $165K-190K. It is saved in Applications as #41, "Reviewed — not applied". No tailored CV or letter has been made yet.

## Wrong turns
- To review (step 2): I thought pending links go there. It has no way to add my own link.

## Moments of confusion
- The check took 8 s, not the "2–5 min" the app promised. I wondered if it really ran. The report's note says "Fixture evaluation", which looked odd.
- The job-page title is "Fit report", but the A–G format is shown only as A–F; there is no G.

## Problems I would report
### P1-T2-01: To review has no way to add my own link
- **Severity (my guess):** 2
- **Where:** To review page, "Job links waiting to be checked: found at the companies you follow, or saved by you."
- **What I expected vs what happened:** I expected a paste box, since this is where my pending-links list would live. Adding is only on Applications ("Add a job"). I had to go back and forth.
- **Evidence:** app/ux/m8/runs/P1-T2/step-01.png

### P1-T2-02: The time estimate does not match what happened
- **Severity (my guess):** 1
- **Where:** Add a job form: "about 2–5 min"
- **What I expected vs what happened:** It finished in 8 s, so I could not tell whether a real check ran. The report said "Your note: Fixture evaluation".
- **Evidence:** app/ux/m8/runs/P1-T2/step-07.png

### P1-T2-03: The report shows sections A to F only
- **Severity (my guess):** 1
- **Where:** Fit report on the job page
- **What I expected vs what happened:** I know the report as A–G. G is missing, so I wondered if something was cut off.
- **Evidence:** app/ux/m8/runs/P1-T2/step-09.png
