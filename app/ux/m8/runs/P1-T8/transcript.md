# P1-T8: transcript

- **Persona:** Alex Rivera
- **Goal:** "You have been using this app for a few weeks. Earlier today you asked it to look at a job posting for you and something went wrong. Find out what happened and why, then get that job looked at after all. Tell me what went wrong."
- **Steps used:** 6 of 40
- **Outcome (my judgment):** succeeded
- **Single Ease Question:** 7/7 (1 = very difficult, 7 = very easy): The failure sat at the top of the first page with a plain reason and a Try again button, and the retry finished with a score.

## Steps
| # | Thinking aloud | Action | What happened | Screenshot |
|---|---|---|---|---|
| 1 | Open the app and look for something failed. | Navigate to URL | Today page. Top "Needs you" card: Check fit, Driftwood Analytics, Data Engineer, Failed, with what happened and what to do. The header also shows "Activity 1 failed". | step-01.png |
| 2 | Want the raw reason, not just the friendly text. | Click "Technical details" | The section expanded. I did not read the contents in a snapshot. | step-02.png |
| 3 | Just retry, it says that usually works. | Click "Try again" | The card became "Working now", marked "Second attempt", with a progress bar and "Usually 2-5 min. You can leave this page". | (snapshot only) |
| 4 | Wait for it. | Wait 5 s, snapshot | Still working, and the page told me so. | |
| 5 | Wait more. | Wait 30 s | It finished faster than the 2-5 min the page said. | step-05.png |
| 6 | Check the result. | Snapshot | "Just finished": Driftwood Analytics, Data Engineer, Fit 4.1/5, Recommendation: Apply. There is an Open the job link, and it now shows in the "reviewed but not applied" list. | step-05.png |

Answer for a friend: The fit check on the Driftwood Analytics Data Engineer posting failed at 23:45 and took under a second. The assistant opened the posting but stopped before it wrote the fit report. The app calls this usually temporary, such as a slow page or a session that ended early. I pressed Try again and it came back with fit 4.1/5, Apply. The job is now in my reviewed list. The app does not say exactly why it failed beyond that generic reason. I did not read Technical details.

## Wrong turns
None.

## Moments of confusion
- Retrying used the Claude plan again, and I only knew that from the card text. The retry finished in about 30 s or less, much quicker than the "2-5 min" it quoted.
- I opened Technical details but did not read the contents, so I do not know whether they give a more specific cause.

## Problems I would report
### P1-T8-01: The cause is generic
- **Severity (my guess):** 1
- **Where:** The "What happened" text on the failed Check fit card.
- **What I expected vs what happened:** I expected a specific cause. It said only "usually temporary", which is a guess, and the app does not say which cause it was.
- **Evidence:** app/ux/m8/runs/P1-T8/step-01.png
