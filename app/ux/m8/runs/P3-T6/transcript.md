# P3-T6: transcript

- **Persona:** Alex Rivera
- **Goal:** "Use what the app knows about those jobs to decide which skill to study first. Tell me the skill, how many of the jobs ask for it, and at least one company that wants it."
- **Steps used:** 4 of 40
- **Outcome (my judgment):** succeeded
- **Single Ease Question:** 6/7: "Skills" in the top bar led straight to a ranked list with counts and a one-click evidence list naming companies; the only snag was that the counts mix required with nice-to-have and the study order isn't spelled out.

## Steps
| # | Thinking aloud | Action | What happened | Screenshot |
|---|---|---|---|---|
| 1 | Start at the app. | Navigate to URL | Today page, "Good morning, Alex" | step-01.png |
| 2 | My colleague showed me a skills gap view; "Skills" looks right. | Click Skills | "Learn next" list, "Based on 69 postings from 12 companies, last read Sep 25". #1 gRPC, asked for in 22 postings (12 required, 10 nice to have). | step-02.png |
| 3 | Says who? Which companies? | Click "Show the evidence for gRPC" | Expanded: 22 postings by company (Brightwater Health 5, Lumen Grid 4, Granite Cloud 3, Driftwood Analytics 3, and others) with links | step-04.png |

## Wrong turns
None.

## Moments of confusion
- gRPC is #1 by count, but ML (9 postings, 8 required) fits my platform/ML aim better; the app doesn't weigh my goal. I would still go with the app's top result, with that caveat.
- The page says 69 postings, but "counting all 66 that have been read" (3 were taken down). Small, but I noticed.
- Data is from Sep 25, and today is Oct 7. I can't tell how stale that is for hiring.
- The "Improve the analysis" button is unexplained to me (36 postings read only by quick rules).

## Problems I would report
### P3-T6-01: Counts mix "required" and "nice to have"
- **Severity (my guess):** 1
- **Where:** "Asked for in 22 postings (12 required, 10 nice to have)"
- **What I expected vs what happened:** I expected to know which number to quote. The breakdown is shown, so it is fine, but the headline is the larger one.
- **Evidence:** app/ux/m8/runs/P3-T6/step-02.png

### P3-T6-02: 69 vs 66 postings
- **Severity (my guess):** 1
- **Where:** the header line vs the status line "Counting all 66 postings"
- **What I expected vs what happened:** I wondered which one my "22 of N" is out of. The 3 taken-down postings are explained, but the denominator for the 22 is not stated.
- **Evidence:** app/ux/m8/runs/P3-T6/step-02.png

## What I would tell a friend
Study gRPC first. 22 of the 66 postings the app has read ask for it (12 list it as required, 10 as nice to have). Companies that want it: Brightwater Health (5 postings), Lumen Grid (4), Granite Cloud (3) and Driftwood Analytics (3). Prometheus and GCP (13 each) come next. Caveat: the data was last read Sep 25. Also, if I want ML infrastructure specifically, Machine Learning has 9 postings, 8 of them required.
