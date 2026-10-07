# P2-first-job: transcript

Saved verbatim from the persona-tester's reply: its own write was refused, because the file held an earlier run. This is the third run, on the build after the discoverability work (e039c489). The earlier runs, on d5abd208 and before, are in git history. `verdict.md` checks the sandbox's data, not this text.

- **Persona:** Alex Rivera
- **Goal:** "You have just installed this app and opened it for the first time. Get it ready for your job search: it needs your CV (below), and it should keep an eye on one company for new openings, Kestrel Media, whose careers page is https://job-boards.greenhouse.io/kestrelmedia. Then use the app to find out whether this job is a good fit for you: https://job-boards.greenhouse.io/kestrelmedia/jobs/4134913. Tell me what the app concluded. Do everything inside the app; do not open a terminal or edit files."
- **Steps used:** 17 of 60
- **Outcome (my judgment):** succeeded
- **Single Ease Question:** 7/7: The welcome page walked me through each step in order, and the fit check finished in 8 seconds with a clear verdict.

## Steps
| # | Thinking aloud | Action | What happened | Screenshot |
|---|---|---|---|---|
| 1 | Open the app and see what it wants. | Navigate to the URL, screenshot, snapshot | "Welcome. Let's get you set up." with 2 steps left: Add your CV, Follow a company. The AI assistant step already shows done. | step-01.png |
| 2 | Paste my CV into the box and save it. | Fill the "Your CV" box, click "Save my CV" | Step marked done: "Saved: Alex Rivera · Summary, Experience (2 roles), Education, Skills." A status line confirmed it. | none |
| 3 | Add Kestrel Media so the app watches it. | Fill company name and careers link, click "Follow company" | Page switched to "You're set up" with ticks for CV, Following Kestrel Media, and AI assistant ready. A "Check your first job" form appeared. | none |
| 4 | The job form is right there, so I'll paste the job link and check the fit. | Type the job link, click "Check fit now" | An Activity card appeared. | step-02.png |
| 5 | Waiting to see whether it finishes. The text says 2–5 minutes. | Wait 30 s, snapshot | The card read "Done, took 8 s. Fit 4.1 / 5. The fit report is ready." The job was added to Applications. | none |
| 6 | I'll open the job to read what it concluded. | Click "Open the job" | The job page shows Fit 4.1 / 5, Recommendation: Apply, and a full fit report. | step-03.png |

What I would tell a friend: the app says Kestrel Media's Senior Backend Engineer role is a strong fit, 4.1 out of 5, and recommends applying. It rates the posting as real, with high confidence and low risk. My settlement pipeline, scheduler and PostgreSQL work match what they ask for. The one medium gap is gRPC. It suggests leading with the settlement pipeline and the incident reduction. The pay isn't advertised, and it lists my target as $165K-190K. The job is saved as "Reviewed — not applied", and I can make a tailored CV or a cover letter from that page.

## Wrong turns
None.

## Moments of confusion
- "Your note: Fixture evaluation" appeared on the job page, and I never wrote a note.
- The fit report sections are labelled A) to F), and the interview plan mentions "STAR", which I'd have to guess at.
- The check took 8 seconds, but the page said 2–5 minutes. I wasn't sure it had really read the posting.

## Problems I would report
### P2-first-job-01: Odd "Your note: Fixture evaluation" on a job I just added
- **Severity (my guess):** 1
- **Where:** Job page, under "Check fit again"
- **What I expected vs what happened:** I expected no note, since I wrote none. It showed a note I didn't write.
- **Evidence:** app/ux/m8/runs/P2-first-job/step-03.png

### P2-first-job-02: Time estimate does not match what happened
- **Severity (my guess):** 1
- **Where:** The "about 2–5 min" text next to "Check fit now", versus "took 8 s" on the result
- **What I expected vs what happened:** I expected minutes. It was done in 8 seconds, which made me doubt it.
- **Evidence:** app/ux/m8/runs/P2-first-job/step-02.png
