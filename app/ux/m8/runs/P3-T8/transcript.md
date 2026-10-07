# P3-T8: transcript

- **Persona:** Alex Rivera
- **Goal:** "You have been using this app for a few weeks. Earlier today you asked it to look at a job posting for you and something went wrong. Find out what happened and why, then get that job looked at after all. Tell me what went wrong."
- **Steps used:** 8 of 40. This count includes the first navigate, 3 screenshots, 1 failed click, 2 waits and 1 snapshot.
- **Outcome (my judgment):** succeeded
- **Single Ease Question:** 7/7: The failure was the first card on Today, it explained itself in plain words, and one "Try again" button fixed it.

## Steps
| # | Thinking aloud | Action | What happened | Screenshot |
|---|---|---|---|---|
| 1 | I will open the app and look for what went wrong earlier. | Navigate to the URL | Today page. The top card under "Needs you" reads "a fit check didn't finish". It names Driftwood Analytics, Data Engineer. The header also shows "Activity · 1 failed". | step-01.png |
| 2 | I want the why. I will open "Technical details". | Click "Technical details" | I did not check whether it opened. I only took a screenshot and did not read the contents. | step-02.png |
| 3 | The card says it usually works the second time. I will try again. | Click "Try again" | A "Working now" card appeared, with "Second attempt — the first one didn't finish". It also said "Usually 2–5 min. You can leave this page; it carries on." | none |
| 4 | I will wait and see. | Wait 5 s, then wait 30 s | The screen showed no change in the screenshot I took. | step-03.png |
| 5 | I will find the Activity button. | Click a vaguely described "Activity" button | The click failed because the target was ambiguous. I took a snapshot instead. | none |
| 6 | Did it finish? | Snapshot | "Just finished" card: Driftwood Analytics — Data Engineer, Fit 4.1 / 5, Recommendation: Apply, with an "Open the job" link. The header said "Activity · 1 done". The "reviewed but not applied" count went from 10 to 11. | step-04.png |

What I would tell a friend: The fit check for the Driftwood Analytics Data Engineer posting failed at 00:08 today. The app said the assistant opened the posting but stopped before writing the fit report. It called this usually temporary, such as a slow page or a session that ended early. I pressed "Try again" and it finished with a fit of 4.1 out of 5 and a recommendation to apply. The report is now in my list as job #41. I did not open the technical details or the finished report.

## Wrong turns
- I clicked "Technical details" hoping for the real cause. I never read what it showed.
- My Activity click failed because I described the button badly. This was my mistake, not the app's.

## Moments of confusion
- The reason is generic ("usually temporary — a slow page or a session that ended early"). It does not say which cause it was. I would ask "says who?".
- "Try again ... uses your Claude plan again" is a cost warning I did not fully understand.
- Retrying did not stop the first failure card from being replaced. It disappeared once the retry started. I did not check whether the failed attempt is still recorded in Activity.
- The retry said 2–5 min but finished in well under a minute.

## Problems I would report
### P3-T8-01: The failure reason is generic
- **Severity (my guess):** 1
- **Where:** The "What happened" text on the failed-check card on Today.
- **What I expected vs what happened:** I expected the actual cause. I got a hedge between two possible causes.
- **Evidence:** app/ux/m8/runs/P3-T8/step-01.png

### P3-T8-02: "Technical details" gave me no visible feedback
- **Severity (my guess):** 1
- **Where:** The "Technical details" disclosure on the failed card.
- **What I expected vs what happened:** I expected it to expand. The screenshot I took afterwards (step-02) did not show it clearly, and I did not check further.
- **Evidence:** app/ux/m8/runs/P3-T8/step-02.png

### P3-T8-03: The wait estimate does not match the real time
- **Severity (my guess):** 1
- **Where:** The "Working now" card.
- **What I expected vs what happened:** It said "Usually 2–5 min". It finished in under about 40 seconds.
- **Evidence:** app/ux/m8/runs/P3-T8/step-03.png
