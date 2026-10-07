# P1-T4: transcript

- **Persona:** Alex Rivera
- **Goal:** "You have been using this app for a few weeks. It is Monday morning. Check whether any new openings have appeared at the companies you follow since you last looked. Tell me how many new ones there are, which ones, and whether anything went wrong while checking."
- **Steps used:** 6 of 40
- **Outcome (my judgment):** succeeded
- **Single Ease Question:** 6/7: the "Check for new openings" button was on the first screen and the result named the openings; the only snag is that "did anything go wrong" is answered by the Juniper card plus a buried log, not by the result card itself.

## Steps
| # | Thinking aloud | Action | What happened | Screenshot |
|---|---|---|---|---|
| 1 | Open the app, find the scan thing. | navigate to URL | Today page. "New since you last looked": "Last checked Sep 24", button "Check for new openings", "11 companies, a few seconds, no AI". Also a "Needs you" card: Juniper Mobility board not found since Sep 24. | step-01.png |
| 2 | That's the scan command. Click it. | click "Check for new openings" | No visible change right away. | - |
| 3 | Give it a few seconds. | wait 5s, snapshot | "Just finished: Done. 4 new openings: Driftwood Analytics, Site Reliability Engineer; Harbor Learning, Full Stack Engineer; Lumen Grid, Platform Engineer; Mosaic Retail, Platform Engineer." To review badge shows 4 new. Juniper card still there. | step-04.png |
| 4 | Did anything fail? The result card says nothing about errors. Try Activity. | click "Activity" | Panel shows the run under "Earlier today", with the same text and a "Technical details" fold. | step-06.png |
| 5 | Open the details for the log. | click "Technical details" | Log: 11 companies scanned, 80 jobs found, 6 filtered by title, 70 duplicates, 4 new. Warning: 1 target unreachable, Juniper Mobility. Exit 0. | step-08.png |
| 6 | Enough. | none | Answer found. | - |

Told to a friend: 4 new openings, at Driftwood Analytics (Site Reliability Engineer), Harbor Learning (Full Stack Engineer), Lumen Grid (Platform Engineer) and Mosaic Retail (Platform Engineer). One problem: Juniper Mobility's job board wasn't found, so it couldn't be checked. The app flags it as "needs you" and it needs a fixed link or a pause. Everything else (10 other companies) scanned fine.

## Wrong turns
None significant. Opening Activity and its technical details was a check, not a wrong turn.

## Moments of confusion
- The "Just finished" card says "Done" with no mention of the Juniper failure. I had to cross-check the "Needs you" card, which said "since Sep 24", so I could not tell from the screen whether this run hit it again until I read the log.
- The log is raw terminal output, including "run /career-ops pipeline" and a Discord link. Those are meaningless in this app.
- Activity says "then: read the new postings for Skills" and I do not know what that means.
- It said "Good evening" on a Monday morning (clock-based, minor).

## Problems I would report
### P1-T4-01: Scan result card does not say whether anything went wrong
- **Severity (my guess):** 2
- **Where:** "Just finished: Check for new openings" card after the scan
- **What I expected vs what happened:** I expected a line like "11 checked, 1 couldn't be reached (Juniper Mobility)". It only lists the 4 new openings. The failure appears only in the separate "Needs you" card and in the raw log under Activity, Technical details.
- **Evidence:** app/ux/m8/runs/P1-T4/step-04.png, step-08.png

### P1-T4-02: Raw script output and CLI advice leak into the log
- **Severity (my guess):** 1
- **Where:** Activity, Technical details
- **What I expected vs what happened:** I expected readable results. I got terminal text with "Run /career-ops pipeline" and a Discord link, which do not apply to the app.
- **Evidence:** app/ux/m8/runs/P1-T4/step-08.png

### P1-T4-03: Unclear "then: read the new postings for Skills" line
- **Severity (my guess):** 1
- **Where:** Activity entry for the scan
- **What I expected vs what happened:** I did not know what this follow-up meant or whether it ran.
- **Evidence:** app/ux/m8/runs/P1-T4/step-06.png
