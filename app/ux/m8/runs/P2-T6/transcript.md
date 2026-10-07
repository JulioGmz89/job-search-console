# P2-T6: transcript

- **Persona:** Alex Rivera
- **Goal:** "You have been using this app for a few weeks. You have three months of evenings to study one thing that would make you a stronger candidate for the kind of jobs you are seeing. Use what the app knows about those jobs to decide which skill to study first. Tell me the skill, how many of the jobs ask for it, and at least one company that wants it."
- **Steps used:** 4 of 40
- **Outcome (my judgment):** succeeded
- **Single Ease Question:** 7/7: "Skills" in the top menu led straight to a ranked "Learn next" list, and the evidence panel named the companies.

## Steps
| # | Thinking aloud | Action | What happened | Screenshot |
|---|---|---|---|---|
| 1 | I want to know what skill to learn, and I'm looking for something about skills. | Navigate to the app. | The Today page loaded. The menu has "Skills". | step-01.png |
| 2 | "Skills" sounds right. I expect a list of what employers want. | Click "Skills". | The page says "What employers in your job search keep asking for, and what your CV is missing." The "Learn next" tab is open and ranked by how many postings ask for each skill. #1 is gRPC: "Asked for in 22 postings (12 required, 10 nice to have)", and my CV is marked "Missing". | step-02.png |
| 3 | I want a company, so I'll open the evidence for gRPC. | Click "Show the evidence for gRPC". | It lists the companies asking for gRPC: Brightwater Health (5), Lumen Grid (4), Granite Cloud (3), Driftwood Analytics (3), Ember Payments (2), Cobalt Freight (2), and others. | step-03.png |
| 4 | Done. I'll say what I found to a friend. | None. | None. | none |

What I'd tell a friend: Study gRPC first. 22 of the 66 postings the app has read ask for it, and 12 of those list it as required. It is the top skill my CV is missing. Brightwater Health wants it (5 postings), and so do Lumen Grid, Granite Cloud, Driftwood Analytics, Ember Payments and Cobalt Freight. Cobalt Freight's Staff Software Engineer role (fit 4.2) asks for it.

## Wrong turns
None.

## Moments of confusion
- The page header says "Based on 69 postings", but the status line says "Counting all 66 postings that have been read". I assumed 3 were unloadable, as the page says, and used 66 as the total. It took a moment to work out.
- "Fit" is not explained where I saw it.
- "Improve the analysis" says it uses my Claude plan and takes about 4 sessions. I didn't click it, and I don't know what a session costs.

## Problems I would report
### P2-T6-01: Posting totals differ (69 vs 66)
- **Severity (my guess):** 1
- **Where:** The line under the Skills heading ("Based on 69 postings") and the status line ("Counting all 66 postings that have been read").
- **What I expected vs what happened:** I expected one total. The two numbers differ, and the 3-posting gap is only explained by a clause in the first line.
- **Evidence:** app/ux/m8/runs/P2-T6/step-02.png

### P2-T6-02: "fit" has no explanation next to the numbers
- **Severity (my guess):** 1
- **Where:** The links in the evidence list, such as "Backend Engineer (Go) · fit 3.7".
- **What I expected vs what happened:** I expected a hint on what the number means (is 3.7 good?). There is none there.
- **Evidence:** app/ux/m8/runs/P2-T6/step-03.png
