# P1-T3: transcript

- **Persona:** Alex Rivera
- **Goal:** "You have been using this app for a few weeks. Yesterday you sent applications for the two best-rated jobs on your list that you had not done anything about yet. Update your records so they show you have applied to those two. Nothing else should change."
- **Steps used:** 8 of 40 (navigate, screenshot, select, screenshot, select, navigate/reload, screenshot, filter click; plus 2 snapshots/screenshots)
- **Outcome (my judgment):** succeeded (the two statuses persisted after reload; I did not check the tracker file on disk, and the Applied filter count was not read back)
- **Single Ease Question:** 6/7: the status dropdown was right in the row, but there was no confirmation and I had to work out "untouched" myself.

## Steps
| # | Thinking aloud | Action | What happened | Screenshot |
|---|---|---|---|---|
| 1 | Open the app, find the tracker. | Navigate | Pipeline tab opens with 40 rows sorted by score, a status dropdown on every row. | step-01.png |
| 2 | "Untouched" means still Evaluated. Best two Evaluated: #12 Cobalt Freight 4.2, #13 Driftwood 3.9. Set #12 to Applied. | Select Applied on #12 | Dropdown changed. No toast or "saved" message that I could see; row stayed in place. | step-02.png |
| 3 | Same for #13. | Select Applied on #13 | Changed, again no visible confirmation. | none |
| 4 | Reload to make sure it saved. | Navigate to URL | Page reloaded. | step-03.png |
| 5 | Check the Applied filter. | Click Applied | Filter applied. | step-04.png |
| 6 | Read back both rows. | Snapshots | #12 and #13 both show Applied after reload. | none |

Told a friend: I marked Cobalt Freight (Staff Software Engineer, 4.2) and Driftwood Analytics (Backend Engineer (Go), 3.9) as Applied. Those were the two highest-scored ones still on Evaluated. They were still Applied after a reload. I touched nothing else, though I can't see the file to be sure nothing else changed.

## Wrong turns
None.

## Moments of confusion
- No confirmation after changing a status, so I reloaded to check it had saved.
- Nothing says that changing the dropdown writes to my tracker file. I did not know whether it also changes anything else, such as dates or notes.
- Duplicate company names (Cobalt Freight has 4 rows, Driftwood 4 rows) made it easy to pick the wrong row; I went by the # column and the score.

## Problems I would report
### P1-T3-01: No feedback when a status is saved
- **Severity (my guess):** 2
- **Where:** Status dropdown in a Pipeline row
- **What I expected vs what happened:** I expected a "saved" message. The dropdown just changed silently.
- **Evidence:** app/ux/runs/P1-T3/step-02.png

### P1-T3-02: Unclear what a status change does to my tracker
- **Severity (my guess):** 1
- **Where:** Status dropdown
- **What I expected vs what happened:** I wanted to know it only updates that row's status. The screen says nothing, and I cannot see the tracker file here.
- **Evidence:** app/ux/runs/P1-T3/step-03.png

### P1-T3-03: Hard to find "untouched" jobs
- **Severity (my guess):** 1
- **Where:** Pipeline table, All filter
- **What I expected vs what happened:** Sorted by score, the rows mix every status. I had to scan for Evaluated. The Evaluated filter would have been faster, but I only noticed that after the fact.
- **Evidence:** app/ux/runs/P1-T3/step-01.png
