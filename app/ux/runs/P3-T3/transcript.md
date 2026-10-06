# P3-T3: transcript

- **Persona:** Alex Rivera
- **Goal:** "You have been using this app for a few weeks. Yesterday you sent applications for the two best-rated jobs on your list that you had not done anything about yet. Update your records so they show you have applied to those two. Nothing else should change."
- **Steps used:** 5 of 40 (navigate, screenshot, 2 status changes, reload; plus extra screenshots and snapshots that I did not count as actions)
- **Outcome (my judgment):** succeeded (fairly confident; the interpretation of "best-rated, nothing done yet" is mine)
- **Single Ease Question:** 6/7: The Pipeline page was already sorted by score and had a Status dropdown on each row. The only effort was working out which jobs were "untouched".

## Steps
| # | Thinking aloud | Action | What happened | Screenshot |
|---|---|---|---|---|
| 1 | I need my list of jobs with scores. | Navigate to the URL | The Pipeline tab opened with 40 rows sorted by score, highest first. Header counts: Evaluated 10, Applied 6. | step-01.png |
| 2 | "Nothing done yet" should mean status Evaluated. Going down the score order, everything above 4.2 is already Hired, Offer, Interview or Applied. The first two Evaluated rows are #12 Cobalt Freight, Staff Software Engineer (4.2) and #13 Driftwood Analytics, Backend Engineer (Go) (3.9). | Set the Status dropdown on #12 to Applied | The row changed to Applied and the page stayed as it was. There was no confirmation message that I noticed. | step-03.png |
| 3 | Same for the second job. | Set the Status dropdown on #13 to Applied | The row changed to Applied. | (none) |
| 4 | I want to be sure it was saved and that nothing else changed. | Reload the page | #12 and #13 show Applied. Counts are now Evaluated 8 and Applied 8, which is exactly two moved. All other rows are unchanged. | step-05.png |

Answer for a friend: "Yes, done. The two best-scoring jobs I hadn't touched were Cobalt Freight (Staff Software Engineer, 4.2) and Driftwood Analytics (Backend Engineer (Go), 3.9). Both now show Applied, and it was still there after I reloaded. The Applied count went from 6 to 8 and nothing else changed."

## Wrong turns
None.

## Moments of confusion
- "Best-rated that I had not done anything about" had no label on screen. I assumed it meant status Evaluated. Ties and rows scored 2.5 (Evaluated) did not matter here, but a different reading, such as the Decision column saying Apply, would have picked other jobs.
- The Status dropdown gave no visible sign that it had saved. I only trusted it after reloading.
- Row #12 sits fifth or sixth in the list, and the Offer, Interview and Hired rows share the same table. It was easy to misread which statuses meant "no action".

## Problems I would report
### P3-T3-01: No confirmation that a status change was saved
- **Severity (my guess):** 2
- **Where:** The Status dropdown on a Pipeline row
- **What I expected vs what happened:** I expected a brief "Saved" message or a clear change. The dropdown just changed, and only the header counts (after reload) confirmed it.
- **Evidence:** app/ux/runs/P3-T3/step-03.png

### P3-T3-02: Status and Decision columns are easy to confuse
- **Severity (my guess):** 1
- **Where:** Table columns "Status" and "Decision" (the Decision values are Apply, Consider, Skip, Not evaluated)
- **What I expected vs what happened:** Rows with Decision "Apply" are not the same as rows I have applied to. The two columns sit side by side with similar words, so I had to stop and think about which one tells me what I did.
- **Evidence:** app/ux/runs/P3-T3/step-01.png
