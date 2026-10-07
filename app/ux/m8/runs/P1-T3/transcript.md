# P1-T3: transcript

- **Persona:** Alex Rivera
- **Goal:** "You have been using this app for a few weeks. Yesterday you sent applications for the two best-rated jobs on your list that you had not done anything about yet. Update your records so they show you have applied to those two. Nothing else should change."
- **Steps used:** 15 of 40 (including screenshots/snapshots counted conservatively)
- **Outcome (my judgment):** succeeded
- **Single Ease Question:** 6/7: "Reviewed - not applied" on Today led straight to a sorted list, and the status control plus a Yesterday option made it quick; only the date not being visible afterwards left a little doubt.

## Steps
| # | Thinking aloud | Action | What happened | Screenshot |
|---|---|---|---|---|
| 1 | Open the app, look for the tracker. | Navigate to URL | Today page: "10 jobs reviewed but not applied", best: Cobalt Freight 4.2, Driftwood 3.9, Ember 3.5 | step-01.png |
| 2 | That is my "evaluated, not applied" list. Open it to confirm ranking. | Click "Review them" | Applications list filtered to "Reviewed - not applied (10)", sorted by fit. Cobalt 4.2, Driftwood 3.9 on top | step-03.png |
| 3 | Fastest control: the status button on the Cobalt row. | Click status button | Dropdown of statuses opened | step-05.png |
| 4 | Pick Applied. | Click "Applied" | Dialog: "When did you apply to Cobalt Freight?" with Today / Yesterday / another day, optional note | step-07.png |
| 5 | I applied yesterday. | Click "Yesterday (Oct 5)", then "Save as Applied" | Row moved out of list; Undo bar: "set to Applied, applied Oct 5". Counts 10 to 9, Applied 6 to 7 | step-09.png |
| 6 | Same for Driftwood. | Click its status button, "Applied", "Yesterday (Oct 5)", "Save as Applied" | Saved, same flow | - |
| 7 | Check result. | Click "Applied" filter | Both Cobalt Freight (4.2) and Driftwood (3.9) show Applied; other rows unchanged | step-15.png |

## Wrong turns
None.

## Moments of confusion
- The "Applied" list view has no column showing the applied date, so I could not re-check that Oct 5 was stored; I relied on the Undo message.
- Today's "Review them" lands on the Applications page with the Add a job form above the list, pushing the list down.

## Problems I would report
### P1-T3-01: Applied date not visible afterwards
- **Severity (my guess):** 1
- **Where:** Applications list, "Applied" filter
- **What I expected vs what happened:** I expected to see the date I applied (Oct 5) in the row; only "Checked" date (Aug 25 / Aug 27) is shown, and the Undo bar disappears.
- **Evidence:** app/ux/m8/runs/P1-T3/step-15.png

### P1-T3-02: Dialog and dropdown close buttons labelled "Descartar" (Spanish) in an English app
- **Severity (my guess):** 1
- **Where:** status dropdown and date dialog (hidden dismiss buttons in the accessibility tree)
- **What I expected vs what happened:** English label; got "Descartar".
- **Evidence:** app/ux/m8/runs/P1-T3/step-05.png

## What I would tell a friend
Done. Cobalt Freight (Staff Software Engineer, 4.2) and Driftwood Analytics (Backend Engineer (Go), 3.9) are now Applied, dated yesterday (Oct 5). Nothing else changed: Reviewed-not-applied went 10 to 8, Applied 6 to 8.
