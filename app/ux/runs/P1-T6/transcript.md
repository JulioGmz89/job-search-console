# P1-T6: transcript

- **Persona:** Alex Rivera
- **Goal:** "You have been using this app for a few weeks. You have three months of evenings to study one thing that would make you a stronger candidate for the kind of jobs you are seeing. Use what the app knows about those jobs to decide which skill to study first. Tell me the skill, how many of the jobs ask for it, and at least one company that wants it."
- **Steps used:** 3 of 40 (plus snapshots/screenshots)
- **Outcome (my judgment):** succeeded
- **Single Ease Question:** 7/7: "Skills" tab was an obvious home, and its first row answers the question directly.

## Steps
| # | Thinking aloud | Action | What happened | Screenshot |
|---|---|---|---|---|
| 1 | Open the app. | navigate | Pipeline table, 40 applications. Nav has Skills. | none |
| 2 | "What to study" should be under Skills. | click Skills | Page says "Learn next" list, paragraph: "the answer to what should I learn next?". Top row gRPC, weighted demand 17.75, 22 postings (12/10), Missing on CV. | step-01.png |
| 3 | Want companies for gRPC. | click "gRPC" row | Expanded: "22 postings ask for gRPC", list with company, role, required/nice to have, score. e.g. Cobalt Freight Staff Software Engineer (required, 4.2), Lumen Grid Backend Engineer (Go) (required, 4.0), Driftwood Analytics (required). Also co-occurs with PostgreSQL, Go, Terraform, Kubernetes, Python. | step-02.png |

Told to a friend: study gRPC first. 22 of the 69 postings the app tracks ask for it (it's not on my CV; the top of the "Learn next" list). Cobalt Freight, Lumen Grid and Driftwood Analytics all list it as required, and Brightwater Health has it as nice to have. Next would be Prometheus and GCP at 13 each.

## Wrong turns
None.

## Moments of confusion
- "22 (12/10)" has no visible explanation of what 12/10 means (I guessed Claude-read vs rules-only). "Strong" and "Gaps" columns are also unlabeled in meaning.
- 22 includes postings I never evaluated or that scored 2.1; there's a "Jobs I'd apply to" checkbox, which I did not try, so I am unsure whether "how many jobs" should be 22 or a smaller number among good-fit jobs.
- "Weighted demand 17.75" unexplained.

## Problems I would report
### P1-T6-01: Count "22 (12/10)" is not explained at the point of use
- **Severity (my guess):** 1
- **Where:** Skills table, Postings column
- **What I expected vs what happened:** Expected a plain count; got a count with two sub-numbers and no label or tooltip I could see.
- **Evidence:** app/ux/runs/P1-T6/step-01.png

### P1-T6-02: Unclear whether the count includes low-scoring or unevaluated jobs
- **Severity (my guess):** 1
- **Where:** Skills page, "Jobs I'd apply to" checkbox vs default list
- **What I expected vs what happened:** The default answer counts every posting, including ones I scored 2.1; the filter that limits to 4.0+ is off by default and I would not know which number to quote.
- **Evidence:** app/ux/runs/P1-T6/step-02.png
