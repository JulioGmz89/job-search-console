# P3-T6: transcript

- **Persona:** Alex Rivera
- **Goal:** "You have been using this app for a few weeks. You have three months of evenings to study one thing that would make you a stronger candidate for the kind of jobs you are seeing. Use what the app knows about those jobs to decide which skill to study first. Tell me the skill, how many of the jobs ask for it, and at least one company that wants it."
- **Steps used:** 4 of 40 (navigate, click Skills, click gRPC, plus snapshots/screenshots not counted as decisions)
- **Outcome (my judgment):** succeeded (with caveats about how much I trust the numbers)
- **Single Ease Question:** 6/7: The Skills tab answered "what should I learn next" directly and expanding a row showed companies, but I had to guess what "(12/10)", "Strong", "Gaps" and "rules" mean.

## Steps
| # | Thinking aloud | Action | What happened | Screenshot |
|---|---|---|---|---|
| 1 | My colleague showed me a skills-gap view; I'll look at the top nav. | Navigate to URL | Pipeline table of 40 applications. Nav has Pipeline, Sources, Skills, Runs, CV Studio. | step-01.png |
| 2 | "Skills" is the one that sounds like the gap view. | Click Skills | Page with header counts (69 postings, 66 with text, 30 read by Claude, 36 rules only, 3 could not be read), a "Learn next" tab selected, and a ranked table. Explanatory line: skills at least two postings ask for that your CV does not show, ranked by weighted demand, "the answer to what should I learn next?". Top: gRPC, 22 postings. | step-03.png |
| 3 | I want "which companies want this?", so I'll open the top row. | Click gRPC row | Expanded: "22 postings ask for gRPC", a list of companies, role, score, date, source (Claude / rules), required / nice to have, link to posting and report. Also "often asked together with": PostgreSQL 15, Go 12, Terraform 12, Kubernetes 11, Python 10. | step-04.png, step-05.png |
| 4 | Let me read the list to name companies and check required vs nice to have. | Read expanded list | Required at e.g. Cobalt Freight (Staff Software Engineer), Lumen Grid (Backend Engineer (Go)), Driftwood Analytics (Backend Engineer (Go)), Brightwater Health (Backend Engineer (Go)), Harbor Learning, Fernhill Robotics, Ember Payments, Granite Cloud. | step-05.png |

What I would tell a friend: Study gRPC first. The app says 22 of the 69 postings it knows about ask for it, and it is the top-ranked skill my CV does not show (next are Prometheus and GCP at 13 each, Rust 12, Machine Learning 9). Companies that want it: Cobalt Freight (Staff Software Engineer, listed as required), Lumen Grid (Backend Engineer (Go), required), Driftwood Analytics, Brightwater Health. Caveat: of those 22, only 12 were read by Claude and 10 by simple rules, and 3 postings could not be read at all, so I would treat "22" as roughly right, not exact. Honestly, gRPC is also more "backend" than the ML-infra move I want; Machine Learning (9 postings) is ranked 4th and would fit my goal better. The app did not tell me that tension, I worked it out myself.

## Wrong turns
None. I went straight to Skills and then to the top row.

## Moments of confusion
- "22 (12/10)": I guessed the two numbers are Claude-read vs rules-only, but nothing on the row says so. I only found the meaning by matching it to the "Claude" / "rules" tags in the expanded list.
- Columns "Strong" and "Gaps" (3 and 8 for gRPC): no explanation visible; I did not know whether "Gaps" means I have a gap, or postings flag it as a gap.
- "Weighted demand 17.75": weighted by what? Says who? There is a "How this page works" fold at the top that I did not open, which I would normally check; the number itself has no hint on the row beyond a tooltip.
- Expanded text "flagged as a gap in report 009, 011..." lists only 8 reports, while the heading says 22 postings, so it is unclear how the two relate.
- "rules" as a source label: as a user I do not know what "rules" means, but it reads as less trustworthy than "Claude", and 36 of 66 postings are that kind.
- The expanded list shows the jobs ordered with the scored ones first; the rules-read ones have a date but no score, which looks like missing data.

## Problems I would report
### P3-T6-01: Counts like "22 (12/10)", "Strong", "Gaps" are unexplained at the point of use
- **Severity (my guess):** 2
- **Where:** Skills table, Postings / Strong / Gaps columns
- **What I expected vs what happened:** I expected a hint of what the two numbers in brackets mean and where the evidence comes from; I had to infer it.
- **Evidence:** app/ux/runs/P3-T6/step-03.png

### P3-T6-02: Evidence quality is mixed and the headline number does not say so
- **Severity (my guess):** 2
- **Where:** Header "30 read by Claude · 36 rules only · 3 could not be read" vs the 22 in the gRPC row
- **What I expected vs what happened:** I wanted "how many jobs is this based on?" to be clear on the ranking itself. The ranking shows 22 with no note that almost half those are lower-confidence rule matches, and 3 postings are unread so the count may be an undercount.
- **Evidence:** app/ux/runs/P3-T6/step-03.png, step-04.png

### P3-T6-03: Expanded list gives no ordering or score for rules-read postings, and the "flagged as a gap in report ..." line lists fewer reports than postings
- **Severity (my guess):** 1
- **Where:** gRPC expanded panel
- **What I expected vs what happened:** Expected one consistent list; got a mix of scored (Claude) and unscored (rules) rows plus a separate list of 8 report links.
- **Evidence:** app/ux/runs/P3-T6/step-05.png

### P3-T6-04: The ranking does not connect to my stated direction (platform / ML infrastructure)
- **Severity (my guess):** 1
- **Where:** "Learn next" tab
- **What I expected vs what happened:** I was told it answers "what should I learn next?", and it does, but only by raw demand. Nothing shows how a skill fits the kind of role I want, so I had to judge gRPC vs Machine Learning myself.
- **Evidence:** app/ux/runs/P3-T6/step-03.png
