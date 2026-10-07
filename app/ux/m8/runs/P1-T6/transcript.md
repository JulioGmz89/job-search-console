# P1-T6: transcript

- **Persona:** Alex Rivera
- **Goal:** "You have been using this app for a few weeks. You have three months of evenings to study one thing that would make you a stronger candidate for the kind of jobs you are seeing. Use what the app knows about those jobs to decide which skill to study first. Tell me the skill, how many of the jobs ask for it, and at least one company that wants it."
- **Steps used:** 4 of 40
- **Outcome (my judgment):** succeeded
- **Single Ease Question:** 7/7 (1 = very difficult, 7 = very easy): "Skills" in the top bar led straight to a ranked "Learn next" list, and the evidence dropdown named the companies.

## Steps
| # | Thinking aloud | Action | What happened | Screenshot |
|---|---|---|---|---|
| 1 | Open the app. | Navigate to URL | Today page: "Good evening, Alex". Top bar has Skills. | none |
| 2 | "Skills" sounds like the place for what to study. | Click Skills | "Learn next" list, ranked by postings. #1 gRPC, asked for in 22 postings (12 required, 10 nice to have), Missing on my CV. | step-01.png |
| 3 | I need a company, so open the evidence. | Click "Show the evidence for gRPC" | Postings listed by company: Brightwater Health (5), Lumen Grid (4), Granite Cloud (3), Driftwood Analytics (3), Ember Payments (2), Cobalt Freight (2), Mosaic Retail (1), Fernhill Robotics (1), Harbor Learning (1). | step-02.png |

## Wrong turns
None.

## Moments of confusion
- The filter "Only jobs I'd apply to (fit 4 and up)" is unchecked, so the 22 counts all 66 read postings, including low-fit ones. A small point, but I'd want to know whether 22 is the right number for the jobs I care about.
- The banner says 69 postings, while the status line says 66 were read. I worked out that 3 were taken down.

## Problems I would report
### P1-T6-01: Count covers all postings, not just good-fit ones, by default
- **Severity (my guess):** 1
- **Where:** Skills > Learn next, filter "Only jobs I'd apply to (fit 4 and up)"
- **What I expected vs what happened:** I expected the ranking to reflect the jobs I'd actually apply to. It counts every posting, including fit 2.1 ones. The status line does say "Counting all 66 postings that have been read."
- **Evidence:** app/ux/m8/runs/P1-T6/step-01.png

## What I'd tell a friend
Study gRPC. 22 of the 66 postings the app has read ask for it (12 require it) and it's missing from my CV. Brightwater Health wants it most (5 postings), then Lumen Grid (4), then Granite Cloud and Driftwood Analytics (3 each).
