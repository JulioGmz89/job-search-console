# P2-T3: transcript

- **Persona:** Alex Rivera
- **Goal:** "You have been using this app for a few weeks. Yesterday you sent applications for the two best-rated jobs on your list that you had not done anything about yet. Update your records so they show you have applied to those two. Nothing else should change."
- **Steps used:** 7 of 40
- **Outcome (my judgment):** succeeded (with one interpretation assumption, see Confusion)
- **Single Ease Question:** 6/7: the status dropdown in each row was obvious and the change stuck after reload, but there was no confirmation and I had to decide myself what "not done anything about" means.

## Steps
| # | Thinking aloud | Action | What happened | Screenshot |
|---|---|---|---|---|
| 1 | Open the app, look for my list of jobs. | Navigate to URL | Pipeline table of 40 jobs sorted by score. Statuses are dropdowns. 4.6, 4.5, 4.4 are Hired/Offer/Interview; 4.3 and 4.0 already Applied; 4.2 (#12 Cobalt Freight, Staff SWE) and 3.9 (#13 Driftwood, Backend Go) are still "Evaluated". 4.2 #4 Ember and 3.9 #5 Fernhill are already Interview. | step-01.png |
| 2 | "Not done anything about" = still Evaluated. Best two are #12 (4.2) and #13 (3.9). Set #12 to Applied. | Select "Applied" in #12 Cobalt Freight's status dropdown | No message or toast that I could see. | step-03.png |
| 3 | Now #13 Driftwood (not the other Driftwood rows). | Select "Applied" in #13's dropdown | Same, silent. | (none) |
| 4 | Did it save? Reload. | Navigate to URL again | Page loaded. | step-05.png |
| 5 | Check with the Applied filter. | Click "Applied" filter | Applied count 6 -> 8, Evaluated 10 -> 8. #12 and #13 listed as Applied; no other row changed. | step-07.png |

Total actions counted: 7 (including a failed click attempt).

What I would tell a friend: "Yes, done. I changed the two top Evaluated jobs, Cobalt Freight Staff Software Engineer (4.2) and Driftwood Analytics Backend Engineer (Go) (3.9), to Applied. After reloading, the Applied tab shows 8 instead of 6 and nothing else changed. The app never actually said 'saved', though."

## Wrong turns
None really. One of my own clicks on the Applied filter failed because of how I targeted it, not the app.

## Moments of confusion
- After choosing Applied there was no visible confirmation; I only trusted it after reloading and filtering.
- "Not done anything about" is ambiguous: the list has higher-scored jobs that are Offer/Interview/Hired, and Evaluated 3.5 and 3.4 jobs. I took it to mean status Evaluated and picked the two highest. Company names repeat (Cobalt Freight x4, Driftwood x4), so I had to rely on the # column and role to pick the right rows.
- The dropdown sits inside a clickable row; I was unsure whether changing it would open a detail panel (it did not).

## Problems I would report
### P2-T3-01: No confirmation that a status change was saved
- **Severity (my guess):** 2
- **Where:** Status dropdown in each Pipeline row.
- **What I expected vs what happened:** Expected a "saved" message or something to show it worked; nothing visibly happened, so I reloaded to check.
- **Evidence:** app/ux/runs/P2-T3/step-03.png

### P2-T3-02: Rows hard to tell apart; no date applied
- **Severity (my guess):** 1
- **Where:** Pipeline table, repeated company names; changing status to Applied does not ask for or show an applied date.
- **What I expected vs what happened:** Expected an easy way to be sure I changed the right row and optionally record yesterday's date. Only # and date columns distinguish them.
- **Evidence:** app/ux/runs/P2-T3/step-01.png
