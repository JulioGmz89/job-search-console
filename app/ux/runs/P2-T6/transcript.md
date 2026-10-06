# P2-T6: transcript

- **Persona:** Alex Rivera
- **Goal:** "You have been using this app for a few weeks. You have three months of evenings to study one thing that would make you a stronger candidate for the kind of jobs you are seeing. Use what the app knows about those jobs to decide which skill to study first. Tell me the skill, how many of the jobs ask for it, and at least one company that wants it."
- **Steps used:** 4 of 40 (navigate, click Skills, click gRPC row, full-page screenshot; plus screenshots/snapshots not counted as actions)
- **Outcome (my judgment):** succeeded (with caveats about trusting the numbers)
- **Single Ease Question:** 6/7: the "Skills" tab opened straight onto a ranked "Learn next" list, but I had to work out myself what "weighted demand" and "22 (12/10)" mean.

## Steps
| # | Thinking aloud | Action | What happened | Screenshot |
|---|---|---|---|---|
| 1 | Opening the app to find where it tells me what to learn. | Navigate to URL | Pipeline table of 40 applications. Tabs: Pipeline, Sources, Skills, Runs, CV Studio. | step-01.png |
| 2 | "Skills" sounds like what I want. | Click Skills | Page with "Learn next" selected, text "Skills at least two postings ask for that your CV does not show, ranked by weighted demand — the answer to 'what should I learn next?'". gRPC is on top (weighted demand 17.75, postings 22 (12/10)). | step-02.png |
| 3 | I want companies for the top one. | Click "gRPC" row | Expanded: "22 postings ask for gRPC", list of jobs with required / nice to have, company, score, and links. Companies include Cobalt Freight (Staff Software Engineer, required), Lumen Grid (Backend Engineer (Go), required), Driftwood Analytics, Brightwater Health, Harbor Learning, Fernhill Robotics. Often paired with PostgreSQL, Go, Terraform, Kubernetes, Python. | step-03.png |
| 4 | Checking the full list is really 22. | Full-page screenshot | List shows 22 entries. | step-04.png |

Answer to tell a friend: "Study gRPC first. The app says 22 of my 69 tracked job postings ask for it, and it is not on my CV. About half are listed as required (for example Cobalt Freight's Staff Software Engineer and Lumen Grid's Backend Engineer (Go)), and it is the top-ranked item on the Skills page's Learn next list. Prometheus and GCP are next at 13 each. I'm not fully sure what '12/10' means, and 8 of the 22 have only been checked by simple rules, not read by Claude."

## Wrong turns
None.

## Moments of confusion
- "22 (12/10)": no label says what the two numbers are. I guessed Claude-read versus rules-only, but could not confirm.
- "Weighted demand 17.75": I do not know how it is calculated. The bar has no explanation on the row.
- "Strong" and "Gaps" columns: unclear without opening the "How this page works" help (which I did not open).
- Page header says 69 postings but only 40 are in my pipeline, and 36 are "rules only". It was unclear whether the 22 count is reliable.
- Some of the listed jobs were already rejected/discarded/skipped in my pipeline, and the list does not show that.

## Problems I would report
### P2-T6-01: "22 (12/10)" has no explanation
- **Severity (my guess):** 2
- **Where:** Skills page, "Postings" column
- **What I expected vs what happened:** I expected a plain count or a labelled split. The two numbers in brackets are unlabelled.
- **Evidence:** app/ux/runs/P2-T6/step-02.png

### P2-T6-02: "Weighted demand" is unexplained and drives the ranking
- **Severity (my guess):** 2
- **Where:** Skills page, "Weighted demand" column and bars
- **What I expected vs what happened:** I wanted to know why gRPC beats Prometheus. The page ranks by a number I cannot interpret without opening help.
- **Evidence:** app/ux/runs/P2-T6/step-02.png

### P2-T6-03: Count mixes jobs read by Claude and rules-only, and includes jobs I already dismissed
- **Severity (my guess):** 2
- **Where:** Expanded gRPC list (Claude vs rules labels, no pipeline status shown)
- **What I expected vs what happened:** I expected the count to reflect jobs I still care about. The "Jobs I'd apply to" checkbox exists but I did not notice what it changes until later, and the expanded list does not show my status for each job.
- **Evidence:** app/ux/runs/P2-T6/step-03.png, app/ux/runs/P2-T6/step-04.png
