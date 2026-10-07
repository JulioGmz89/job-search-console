# P2-first-job: transcript

Re-run on the final M8 build (after the gate, heuristic, walkthrough and accessibility fixes). The first run on an earlier build is in git history.

- **Persona:** Alex Rivera
- **Goal:** "Get it ready for your job search: it needs your CV, and it should keep an eye on Kestrel Media (https://job-boards.greenhouse.io/kestrelmedia). Then use the app to find out whether https://job-boards.greenhouse.io/kestrelmedia/jobs/4134913 is a good fit. Tell me what the app concluded."
- **Steps used:** 12 of 60
- **Outcome (my judgment):** succeeded
- **Single Ease Question:** 7/7: The first screen was a two-step checklist, and the job check sat right below it.

## Steps
| # | Thinking aloud | Action | What happened | Screenshot |
|---|---|---|---|---|
| 1 | Open the app and see what it wants. | Navigate to the URL | Welcome page with "Get set up": Add your CV, Follow a company, AI assistant ready (already done) | step-01.png |
| 2 | Paste my CV into the box. | Typed the CV into "Your CV" | Text accepted | |
| 3 | Save it. | Clicked "Save my CV" | Step ticked: "Saved: Alex Rivera · Summary, Experience (2 roles), Education, Skills." A "Check your first job" box appeared. | |
| 4 | Follow Kestrel Media. | Typed the company name and the careers link | Fields filled | |
| 5 | Submit. | Clicked "Follow company" | "You're set up" card: following Kestrel Media | |
| 6 | Paste the job link. | Typed the job URL | Filled | |
| 7 | Run the check. | Clicked "Check fit now" | A progress card appeared | step-02.png |
| 8 | It says 2–5 min, so wait. | Waited 30 s | Done (it took 8 s): "Fit 4.1 / 5. The fit report is ready." The job was added to Applications. | |
| 9 | I want the reasons. | Clicked "Open the job" | Job page: Fit 4.1 / 5, Recommendation: Apply, with a full fit report | step-03.png |

What I'd tell a friend: The app set up my CV and is following Kestrel Media. It says the Kestrel Media Senior Backend Engineer job is a strong fit, 4.1 out of 5, and recommends Apply. It rates the posting as very likely real, risk low and confidence high. My settlement pipeline rebuild and my scheduler/incident work match the role. PostgreSQL also matches. The one gap is gRPC, rated medium. The salary isn't stated in the posting. It is a small remote team with on-call duty. I haven't applied. The app doesn't apply for me, and the next step is to make a tailored CV.

## Wrong turns
None.

## Moments of confusion
- The check finished in 8 s although the page said 2–5 min. I wondered briefly whether it was real. The report content and the "Your note: Fixture evaluation" line made it look like sample data.
- "Is the posting real?" followed by "High Confidence" was slightly odd.

## Problems I would report
### P2-first-job-01: Time estimate does not match what happened, and the note reads "Fixture evaluation"
- **Severity (my guess):** 1
- **Where:** The job page, where it says "Your note: Fixture evaluation", and the "about 2–5 min" text
- **What I expected vs what happened:** I expected a real multi-minute check. It finished in 8 s and carried a test-looking note, which made me doubt whether the result was real.
- **Evidence:** app/ux/m8/runs/P2-first-job/step-03.png

Screenshots step-01.png, step-02.png and step-03.png are saved in app/ux/m8/runs/P2-first-job/.
