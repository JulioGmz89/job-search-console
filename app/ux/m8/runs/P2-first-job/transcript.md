# P2-first-job: transcript

- **Persona:** Alex Rivera
- **Goal:** "Get it ready for your job search: it needs your CV, and it should keep an eye on Kestrel Media (https://job-boards.greenhouse.io/kestrelmedia). Then use the app to find out whether https://job-boards.greenhouse.io/kestrelmedia/jobs/4134913 is a good fit. Tell me what the app concluded."
- **Steps used:** 9 of 60
- **Outcome (my judgment):** succeeded
- **Single Ease Question:** 7/7: The first screen walked me through each step, and every action confirmed itself.

## Steps
| # | Thinking aloud | Action | What happened | Screenshot |
|---|---|---|---|---|
| 1 | Opening the app for the first time. | Navigate to URL | "Welcome. Let's get you set up." with 2 steps left | step-01.png |
| 2 | Step 1 asks for my CV, so I'll paste it. | Filled "Your CV" textbox | Text accepted | |
| 3 | Save it. | Clicked "Save my CV" | Step marked done: "Saved: Alex Rivera · Summary, Experience (2 roles), Education, Skills." That told me it was read correctly. | |
| 4 | Step 2: follow Kestrel Media. | Filled company name and careers link | Fields filled | |
| 5 | Submit. | Clicked "Follow company" | "You're set up" card with three ticks, including "Following Kestrel Media" | |
| 6 | The job link goes in "Check your first job". | Typed the posting URL | Field filled | |
| 7 | I want the fit now. | Clicked "Check fit now" | No visible progress on the page; the Activity button was the only hint. | step-02.png |
| 8 | Waiting. | Waited 30s | Activity showed "1 done". A "Waiting for you" card listed "Kestrel Media — Senior Backend Engineer (fit 4.1)". | |
| 9 | Open the result. | Clicked the job link | Detail page: Fit 4.1 / 5, Recommendation: Apply, plus a fit report | step-03.png |

What I'd tell a friend: the app says this Kestrel Media Senior Backend Engineer job is a strong fit, 4.1 out of 5, and recommends applying. The posting looks real, risk is low and confidence is high. My Go settlement pipeline, the reliability work and my PostgreSQL experience match well. The one gap is gRPC, rated medium. The report says to lead with the settlement pipeline and the 60% incident reduction. It doesn't know the salary, since the posting doesn't state one. I haven't applied, and the app says it never applies for me.

## Wrong turns
None.

## Moments of confusion
- After "Check fit now" nothing visibly changed on the page. I didn't know whether it had started.
- The check finished within about 30 seconds, not the 2–5 minutes it promised.
- The detail page shows "Your note: Fixture evaluation", which I never wrote.
- "Is the posting real? High Confidence" is a little odd as a label.
- The Today page says "Nothing needs you right now" while a reviewed job is waiting.

## Problems I would report
### P2-first-job-01: No visible progress after "Check fit now"
- **Severity (my guess):** 2
- **Where:** Today page, "Check your first job" form after I clicked "Check fit now"
- **What I expected vs what happened:** I expected a "working on it" message near the button. The form just disappeared, and only the Activity button changed.
- **Evidence:** app/ux/m8/runs/P2-first-job/step-02.png

### P2-first-job-02: A note I never wrote ("Fixture evaluation")
- **Severity (my guess):** 1
- **Where:** Top of the job detail page, "Your note: Fixture evaluation"
- **What I expected vs what happened:** I expected no note, or one I wrote. A note appeared that I didn't write, which makes me doubt the result is real.
- **Evidence:** app/ux/m8/runs/P2-first-job/step-03.png
