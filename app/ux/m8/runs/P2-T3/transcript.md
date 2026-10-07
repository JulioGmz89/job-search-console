# P2-T3: transcript

- **Persona:** Alex Rivera
- **Goal:** "You have been using this app for a few weeks. Yesterday you sent applications for the two best-rated jobs on your list that you had not done anything about yet. Update your records so they show you have applied to those two. Nothing else should change."
- **Steps used:** 17 of 40
- **Outcome (my judgment):** succeeded
- **Single Ease Question:** 6/7: The Today page led straight to the right list and the status change asked "when did you apply", though I never saw the dropdown options and had to trust the choice.

## Steps
| # | Thinking aloud | Action | What happened | Screenshot |
|---|---|---|---|---|
| 1 | Start at the app. | Navigate to URL | Today page: "10 jobs reviewed but not applied", Best: Cobalt Freight 4.2, Driftwood 3.9, Ember 3.5 | step-01.png |
| 2 | I want the full list to confirm the top two. | Click "Review them" | Applications list filtered to "Reviewed — not applied (10)", sorted by fit | step-03.png |
| 3 | Cobalt (4.2) is first; change its status. | Click its status button | Menu did not appear in the page snapshot (hidden select) | step-05.png |
| 4 | Pick Applied. | Select "Applied" | Dialog "When did you apply to Cobalt Freight…?" with Today preselected | |
| 5 | I sent it yesterday. | Click "Yesterday (Oct 5)" | Selected | |
| 6 | Save. | Click "Save as Applied" | Row says "Moved to Applied" | step-09.png |
| 7 | Now Driftwood (3.9). | Select "Applied" on its row | Same date dialog | |
| 8 | Yesterday again. | Click Yesterday | Selected | |
| 9 | Save. | Click "Save as Applied" | Row left the list; counts now Reviewed 8, Applied 8 (was 10 and 6) | |
| 10 | Check the Applied list. | Click "Applied (8)" | Filter shown | step-17.png |

(Some actions were failed attempts at clicking by wrong reference, about 7 wasted.)

Friend summary: I marked Cobalt Freight (Staff Software Engineer, fit 4.2) and Driftwood Analytics (Backend Engineer (Go), fit 3.9) as Applied, dated yesterday, Oct 5. Counts went from 10 to 8 reviewed and 6 to 8 applied, so nothing else changed. I did not open the two jobs afterwards to check the date was saved.

## Wrong turns
None real. A couple of my clicks failed on technicalities.

## Moments of confusion
- After clicking the status button I saw no visible list of options in my view and had to pick Applied directly.
- Whether a note or date was required was not clear at first. It was optional, with a default of Today, which I had to change.
- I could not tell if "Moved to Applied" persisted, until the counts changed.

## Problems I would report
### P2-T3-01: Status dropdown options not visible or exposed after click
- **Severity (my guess):** 1
- **Where:** the status button in the Applications list row
- **What I expected vs what happened:** I expected a visible menu of statuses; it was not exposed to my view (possibly a native select).
- **Evidence:** app/ux/m8/runs/P2-T3/step-05.png

### P2-T3-02: Date defaults to Today, easy to mis-save
- **Severity (my guess):** 1
- **Where:** "When did you apply to…?" dialog
- **What I expected vs what happened:** I applied yesterday, and the default was Today, so a hasty save would record the wrong date.
- **Evidence:** app/ux/m8/runs/P2-T3/step-09.png
