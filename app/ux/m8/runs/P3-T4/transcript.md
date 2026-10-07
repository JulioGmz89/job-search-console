# P3-T4: transcript

- **Persona:** Alex Rivera
- **Goal:** "You have been using this app for a few weeks. It is Monday morning. Check whether any new openings have appeared at the companies you follow since you last looked. Tell me how many new ones there are, which ones, and whether anything went wrong while checking."
- **Steps used:** 4 of 40 (navigate, click Check, wait, open Companies)
- **Outcome (my judgment):** succeeded
- **Single Ease Question:** 7/7: the Today page had one obvious "Check for new openings" button and the result named every opening.

## Steps
| # | Thinking aloud | Action | What happened | Screenshot |
|---|---|---|---|---|
| 1 | Open the app and see what is on the home page. | Navigate to URL | Today page: "Needs you: Juniper Mobility board not found since Sep 24"; "Last checked for new openings Sep 24"; a "Check for new openings" button. | step-01.png |
| 2 | That button is what I want. I expect it to look at my companies. | Click "Check for new openings" | No visible change right away. | none |
| 3 | Give it a few seconds. | Wait 5s | A "Just finished" card said "4 new openings" and listed them. The To review tab shows "4 new". Activity says "1 done". | step-02.png |
| 4 | Did anything go wrong? The red flag was Juniper Mobility, so I want to check Companies. | Click Companies | 12 companies. Ten show "Working · last checked Oct 7". Kestrel Media is Paused. Juniper Mobility still says "Board not found since Sep 24", with a Fix button. | step-04.png |

Answer for a friend: the check found 4 new openings, all from today's check. They are Driftwood Analytics, Site Reliability Engineer; Harbor Learning, Full Stack Engineer; Lumen Grid, Platform Engineer; and Mosaic Retail, Platform Engineer. One thing is wrong: Juniper Mobility's job board cannot be found. It has been failing since Sep 24 and wasn't checked, so there may be openings there I don't know about. Kestrel Media is paused on purpose, so it was skipped. The other ten companies checked fine.

## Wrong turns
None.

## Moments of confusion
- After clicking the button nothing changed for a moment, and I wasn't sure it had started. The result showed up within a few seconds.
- The page says "Checks the 11 companies you follow" but Companies lists 12 (one is paused). I had to work out the difference.
- The "just finished" message lists the 4 openings but does not mention Juniper. I had to read the Needs you card and the Companies page to know the failure was still there. Whether Juniper was retried in this run isn't clear.

## Problems I would report
### P3-T4-01: Check result does not say what went wrong
- **Severity (my guess):** 2
- **Where:** "Just finished" card after "Check for new openings"
- **What I expected vs what happened:** I expected "4 new, 1 company couldn't be checked (Juniper Mobility)". It only listed the 4 new openings, so a quick reader could think everything worked.
- **Evidence:** app/ux/m8/runs/P3-T4/step-02.png

### P3-T4-02: Company count mismatch (11 vs 12)
- **Severity (my guess):** 1
- **Where:** "Checks the 11 companies you follow" on Today versus "12 companies" on Companies
- **What I expected vs what happened:** I expected one number. The paused company explains the gap, but the page doesn't say so.
- **Evidence:** app/ux/m8/runs/P3-T4/step-04.png

### P3-T4-03: No feedback while the check runs
- **Severity (my guess):** 1
- **Where:** the button, right after I clicked it
- **What I expected vs what happened:** I expected a "checking..." message. I saw no visible change until the result appeared.
- **Evidence:** none
