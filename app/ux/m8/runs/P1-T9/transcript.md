# P1-T9: transcript

- **Persona:** Alex Rivera
- **Goal:** "You have been using this app for a few weeks. The CVs and letters it writes for you still sound machine-made. The words "seamless", "cutting-edge" and "robust" keep turning up, and they are not how you talk. Make sure it stops using them, without losing the writing rules you already set up. Then get a fresh tailored CV for the Cobalt Freight Staff Software Engineer job, written under the new rules."
- **Steps used:** 12 of 40
- **Outcome (my judgment):** succeeded
- **Single Ease Question:** 6/7: "Writing rules" under My CV was easy to find once I skipped Skills, and the remake button sat right next to the rules; the only doubt is that I could not read the new CV's text to confirm the words are gone.

## Steps
| # | Thinking aloud | Action | What happened | Screenshot |
|---|---|---|---|---|
| 1 | Open the app. | navigate | Today page | step-01.png |
| 2 | "Skills" sounds like where rules live. | click Skills | Wrong: job-market skills gaps | |
| 3 | Maybe Workspace. | click Workspace | Folder and tidy-up; mentions "writing rules" are set up, no editor | |
| 4 | Try My CV. | click My CV | CV markdown editor; saw "Writing rules" tab | |
| 5 | Open it. | click Writing rules | "Words to avoid" list with 5 existing words, add box, list of 6 tailored CVs with "Make it again" | |
| 6-8 | Add the three words. | type + Enter x3 | Each appeared in list, old 5 kept | step-02.png |
| 9 | Remake Cobalt Staff CV. | click "Make it again for Cobalt Freight — Staff Software Engineer" | Status: started, about 3 min | |
| 10 | Wait. | wait 30s | Activity showed "1 done"; status "Your tailored CV is ready." | step-03.png |
| 11-12 | Verify. | snapshot, screenshot | Stale CVs count dropped from 6 to 5 | step-04.png |

## Wrong turns
Skills (guessed it was a skills/style area) and Workspace (looked for settings).

## Moments of confusion
- Top nav has no obvious label for rules; "My CV" tab "Writing rules" was only found via the page subtitle "how the assistant writes".
- My first wait matched old "Made Oct" text, so the wait was meaningless; I had to check Activity.
- I could not open and read the new PDF to confirm the banned words are absent.

## Problems I would report
### P1-T9-01: Writing rules hidden under My CV
- **Severity (my guess):** 1
- **Where:** top nav (Today, Applications, To review, Companies, Skills, My CV)
- **What I expected vs what happened:** expected something named rules/style; had to guess Skills and Workspace first.
- **Evidence:** app/ux/m8/runs/P1-T9/step-01.png

### P1-T9-02: No confirmation of the new CV's content
- **Severity (my guess):** 1
- **Where:** "Your tailored CVs" list after remake
- **What I expected vs what happened:** expected a "made under new rules" timestamp on the row; only the stale count fell from 6 to 5.
- **Evidence:** app/ux/m8/runs/P1-T9/step-04.png

## What I would tell a friend
Added seamless, cutting-edge and robust under My CV > Writing rules; the five old words are still there. Then hit "Make it again" for Cobalt Freight Staff Software Engineer; it said the CV was ready after about 30 seconds. I did not open the PDF to check the wording, and the other 5 CVs still carry the old wording.
