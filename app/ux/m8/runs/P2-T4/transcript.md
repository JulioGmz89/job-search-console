# P2-T4: transcript

- **Persona:** Alex Rivera
- **Goal:** "You have been using this app for a few weeks. It is Monday morning. Check whether any new openings have appeared at the companies you follow since you last looked. Tell me how many new ones there are, which ones, and whether anything went wrong while checking."
- **Steps used:** 5 of 40
- **Outcome (my judgment):** succeeded
- **Single Ease Question:** 6/7: The "Check for new openings" button was right on the front page and the result named every opening, but the "something went wrong" part is only implied by a separate warning, not by the result itself.

## Steps
| # | Thinking aloud | Action | What happened | Screenshot |
|---|---|---|---|---|
| 1 | I want to see if there is anything new at my companies. | Open the app | The Today page. A "Needs you" card says Juniper Mobility's board is not found since Sep 24. "New since you last looked" says last checked Sep 24, with a "Check for new openings" button and the note "a few seconds; no AI". | step-01.png |
| 2 | That button is what I need. I expect it to look at my 11 companies. | Click "Check for new openings" | It finished quickly. A "Just finished" card says "4 new openings", listing them. The To review tab got a "4 new" badge. | step-02.png |
| 3 | Did anything go wrong? The Juniper warning is still there, so I'll check the Companies page. | Wait 5 s, read the page, click Companies | Companies page: 12 companies. Juniper Mobility is "Board not found since Sep 24" with a Fix button. Kestrel Media is "Paused". The other 10 are "Working · last checked Oct 6". | step-03.png |

## Wrong turns
None.

## Moments of confusion
- The result card only listed the new openings. It did not say "1 company could not be checked". I had to connect the Juniper warning to the check myself.
- The Today page says it checks "the 11 companies you follow", but the Companies page lists 12 (one is paused). I worked out the difference myself.
- The greeting said "Good evening" on what I was told is Monday morning. Small thing.
- Juniper still says "since Sep 24" after I just checked. I assume it was tried again and failed again, but the app doesn't say so.

## Problems I would report
### P2-T4-01: The check result doesn't say what went wrong
- **Severity (my guess):** 2
- **Where:** The "Just finished" card for "Check for new openings" on Today.
- **What I expected vs what happened:** I expected one line such as "Checked 10 companies, 1 could not be checked (Juniper Mobility)". It listed only the 4 new openings. The failure appears in a separate card higher up and doesn't show whether it was retried just now.
- **Evidence:** app/ux/m8/runs/P2-T4/step-02.png

### P2-T4-02: The company count differs between pages
- **Severity (my guess):** 1
- **Where:** Today ("Checks the 11 companies you follow") vs Companies ("12 companies").
- **What I expected vs what happened:** I expected the same number on both pages. Paused Kestrel Media explains the gap, but nothing says so.
- **Evidence:** app/ux/m8/runs/P2-T4/step-03.png

## What I would tell a friend
I clicked "Check for new openings" and it took a few seconds. There are 4 new openings: Driftwood Analytics — Site Reliability Engineer, Harbor Learning — Full Stack Engineer, Lumen Grid — Platform Engineer and Mosaic Retail — Platform Engineer. They are waiting in "To review". One thing is wrong: Juniper Mobility's job board has not been found since Sep 24, so the app can't see their openings until I fix the link or pause them. Kestrel Media is paused on purpose, so it was skipped. The other companies checked fine today.
