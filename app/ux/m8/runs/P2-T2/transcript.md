# P2-T2: transcript

- **Persona:** Alex Rivera
- **Goal:** "You have been using this app for a few weeks. Today you came across a job you like: https://job-boards.greenhouse.io/kestrelmedia/jobs/4134913 (Senior Backend Engineer at Kestrel Media). Find out how well it fits you and whether it is worth applying, and make sure it is kept with the rest of your job applications. Tell me what the app concluded."
- **Steps used:** 6 of 40 (navigate, click Applications, type link, click Check fit now, wait, click Open the job; plus snapshots and screenshots)
- **Outcome (my judgment):** succeeded
- **Single Ease Question:** 7/7: The "Add a job" box was on the Applications page, said what each button does and how long it takes, and the result told me the score and where it was saved.

## Steps
| # | Thinking aloud | Action | What happened | Screenshot |
|---|---|---|---|---|
| 1 | Open the app and see what is here. | Navigate to the URL | Today page: "Good evening, Alex", sections Needs you / New since you last looked / Waiting for you. No obvious place to paste a job link. | step-01.png |
| 2 | I want to add a job I found. "Applications" sounds like where my jobs live. | Click Applications | Page has an "Add a job" form at the top: link box, "Check fit now" and "Save for later", with a line explaining time (2-5 min) and that it uses my Claude plan. | none |
| 3 | I want to know the fit, so paste the link and press Check fit now. | Type the link, click Check fit now | A card appeared, the top bar showed "Activity · 1 working", and a message said "Started: Check fit ... About 2 to 5 minutes." | step-02.png |
| 4 | Told it takes minutes, so wait. | Wait 30 s | Card said Done, "took 8 s": "Fit 4.1 / 5. The fit report is ready." and "then: added to Applications". The table now showed 41 jobs, with Kestrel Media at 4.1, Apply. | step-03.png |
| 5 | Open it to see why. | Click "Open the job" | Detail page: Fit 4.1 / 5, Recommendation Apply, status "Reviewed — not applied", and a fit report with real-posting check, risk, confidence, CV match, gaps, comp and interview plan. | step-04.png |

What I would tell a friend: The app scored Kestrel Media, Senior Backend Engineer, 4.1 out of 5 and says Apply. It says the job is probably real (high confidence), risk is low, and the level matches. My Go settlement-pipeline and reliability work match their needs. The one medium gap is gRPC. The salary is not stated in the posting. It is saved in my Applications list as number 41, status "Reviewed — not applied". I have not applied yet, and no tailored CV or cover letter has been made yet (the page has buttons for both).

## Wrong turns
None. I looked at Today first, saw no add-a-job option, then Applications had it.

## Moments of confusion
- On Today I did not see where to add a job; I guessed Applications.
- The page said "2-5 min" but it finished in 8 seconds, so I briefly wondered if it was real.
- The detail page shows "Your note: Fixture evaluation", which I never wrote and do not understand.
- "Is the posting real?" shows "High Confidence" and the report has a separate "Confidence: High", so I was unsure what each one means.

## Problems I would report
### P2-T2-01: No way to add a job from the Today page
- **Severity (my guess):** 1
- **Where:** Today page; the add form only lives on Applications.
- **What I expected vs what happened:** I expected an "Add a job" shortcut on the home page; I had to guess the Applications tab.
- **Evidence:** app/ux/m8/runs/P2-T2/step-01.png

### P2-T2-02: Mystery note "Fixture evaluation" on my job
- **Severity (my guess):** 2
- **Where:** Kestrel Media detail page, Summary: "Your note: Fixture evaluation".
- **What I expected vs what happened:** I expected no note, or one that makes sense; it shows text I did not write, and looks like leftover test data.
- **Evidence:** app/ux/m8/runs/P2-T2/step-04.png

### P2-T2-03: Two near-identical confidence labels
- **Severity (my guess):** 1
- **Where:** Fit report header: "Is the posting real? High Confidence" and "Confidence: High".
- **What I expected vs what happened:** I could not tell the two apart.
- **Evidence:** app/ux/m8/runs/P2-T2/step-04.png
