# P3-T3: transcript

- **Persona:** Alex Rivera
- **Goal:** "You have been using this app for a few weeks. Yesterday you sent applications for the two best-rated jobs on your list that you had not done anything about yet. Update your records so they show you have applied to those two. Nothing else should change."
- **Steps used:** 13 of 40
- **Outcome (my judgment):** succeeded
- **Single Ease Question:** 6/7: The not-yet-applied list was sorted by fit, so my two jobs were on top, and the status menu plus a "when did you apply" question made it quick.

## Steps
| # | Thinking aloud | Action | What happened | Screenshot |
|---|---|---|---|---|
| 1 | Start at the given address. | Navigate to the URL | Today page. "10 jobs reviewed but not applied" lists Cobalt Freight (fit 4.2), Driftwood (3.9), Ember (3.5) as best. | none |
| 2 | I want to see the full list to confirm the two best. | Navigate to Applications filtered to reviewed | List sorted by fit: #12 Cobalt Freight 4.2, #13 Driftwood 3.9 on top. | step-01.png |
| 3 | Change status of Cobalt Freight. | Click its status button | Menu of statuses opened. | step-02.png |
| 4 | Pick Applied. | Click "Applied" | A dialog asked "When did you apply to Cobalt Freight?" with Today, Yesterday, Another day. | step-03.png, step-04.png |
| 5 | I applied yesterday. | Click "Yesterday (Oct 6)" | Selected. | none |
| 6 | Save. | Click "Save as Applied" | Row showed "Moved to Applied"; undo bar said "set to Applied, applied Oct 6"; counts went to 9 / 7. | none |
| 7 | Same for Driftwood. | Click its status button | Menu opened. | none |
| 8 | Pick Applied. | Click "Applied" | Date dialog appeared. | none |
| 9 | Yesterday. | Click "Yesterday (Oct 6)" | Selected. | step-05.png |
| 10 | Save. | Click "Save as Applied" | Saved. | none |
| 11 | Check my work. | Click "Applied" filter | Applied (8) now lists Cobalt Freight #12 and Driftwood #13, both marked "Moved to Applied". Reviewed count is 8. Nothing else changed. | step-06.png |

## Wrong turns
None.

## Moments of confusion
- After choosing "Applied" nothing visibly changed at first; the date dialog appeared a moment later, and the row still said "Reviewed — not applied" behind it. I briefly wondered whether it had saved.
- The dialog's backdrop buttons are labelled "Descartar" (Spanish) in an otherwise English app.
- Today's "Best" list showed three jobs, so I confirmed in the full list which two were highest.

## Problems I would report
### P3-T3-01: Untranslated "Descartar" label in the status menu and dialog
- **Severity (my guess):** 1
- **Where:** the status menu and the "When did you apply" dialog
- **What I expected vs what happened:** English labels; got "Descartar" on the backdrop buttons.
- **Evidence:** app/ux/m8/runs/P3-T3/step-02.png

### P3-T3-02: No immediate feedback after choosing Applied
- **Severity (my guess):** 1
- **Where:** applications list, after picking "Applied"
- **What I expected vs what happened:** I expected either a visible change or an obvious prompt; the dialog came with a delay and the row looked unchanged.
- **Evidence:** app/ux/m8/runs/P3-T3/step-03.png

## What I would tell a friend
Done. I marked Cobalt Freight, Staff Software Engineer (fit 4.2) and Driftwood Analytics, Backend Engineer (Go) (fit 3.9) as Applied, dated Oct 6 (yesterday). The Applied filter now shows both, and I changed nothing else. I did not check the app's activity log.
