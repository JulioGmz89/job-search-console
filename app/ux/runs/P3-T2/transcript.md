# P3-T2: transcript

- **Persona:** Alex Rivera
- **Goal:** "You have been using this app for a few weeks. Today you came across a job you like: https://job-boards.greenhouse.io/kestrelmedia/jobs/4134913 (Senior Backend Engineer at Kestrel Media). Find out how well it fits you and whether it is worth applying, and make sure it is kept with the rest of your job applications. Tell me what the app concluded."
- **Steps used:** 8 of 40
- **Outcome (my judgment):** succeeded
- **Single Ease Question:** 6/7: the paste box and "Evaluate now" were right at the top and it finished in seconds, but I had to guess that clicking the new row opens the reasoning.

## Steps
| # | Thinking aloud | Action | What happened | Screenshot |
|---|---|---|---|---|
| 1 | Open the app and look for where to put a job link. | Navigate to URL | Pipeline page: "Paste a job posting URL..." box, a 40-row table, 40 applications. | step-01.png |
| 2 | Paste the link. | Typed the Kestrel link into the box | Evaluate now and Add to inbox became active. | - |
| 3 | "Evaluate now" sounds like it scores it. | Clicked Evaluate now | A progress panel appeared. | step-04.png |
| 4 | Wait and see. | Waited 15s | Panel said Finished 0:08, "report 041", "score 4.1/5", and "queuing the tailored PDF". Count went to 41 applications, 7 PDFs. | step-05.png |
| 5 | Is it kept with my applications? | Read table | New row 41, Kestrel Media, Senior Backend Engineer, 4.1, Evaluated, Apply, comp "not stated". It is in the tracker. | - |
| 6 | I want the "why". | Clicked the row | A detail panel opened below the table, off screen (I had to look further down). | step-07.png |
| 7 | Read the report. | Read the panel | Decision Apply; Legitimacy High; Risk Low; Confidence High. 3 matched requirements with CV sources, 1 gap (gRPC, Medium), level matches, advertised comp not stated vs my target $165K-190K. | step-08.png |
| 8 | Finish. | - | - | - |

**What I would tell a friend:** I pasted the Kestrel Media Senior Backend Engineer posting and the app scored it 4.1 out of 5 with the decision "Apply" (high confidence, low risk, legitimate posting). It matched my settlement pipeline, on-call and PostgreSQL experience from my CV, and found one medium gap, gRPC. Pay is not stated in the posting. It is saved in my list as row 41, status Evaluated, and it started making a tailored PDF. I would apply, but I would want to see how the 4.1 is calculated.

## Wrong turns
None significant.

## Moments of confusion
- After the run finished, nothing told me where the result went or that I should click the row. The panel opened below the table, out of view.
- The score 4.1 has no breakdown, so "says who?" is unanswered. The report did not say how many postings or what it compared.
- The progress log showed "claude-sonnet-5", "WebFetch", "Write: reports/..." and costs, which is jargon to me. It says it read the posting in 1s, which felt too quick to trust.
- Status "Evaluated" with Decision "Apply" are different things and not explained. "Applied" is not set, correctly, since I haven't applied.
- Report text about the posting is a single sentence, thin as evidence.
- A PDF was queued automatically that I did not ask for (a checkbox "PDF if score >= 3.5" was ticked by default).

## Problems I would report
### P3-T2-01: Result of evaluation is not pointed out; details open off-screen
- **Severity (my guess):** 2
- **Where:** Pipeline page after "Evaluate now" finished; the table row for Kestrel Media; detail panel below the table.
- **What I expected vs what happened:** I expected the verdict to be shown or linked. Instead I had to find the new row among 41 and click it, and the panel appeared far down.
- **Evidence:** app/ux/runs/P3-T2/step-05.png, step-07.png

### P3-T2-02: Score has no visible basis
- **Severity (my guess):** 2
- **Where:** Score 4.1 in the row and in the report.
- **What I expected vs what happened:** I expected to see how the score is built (weights, how many requirements). There is only a CV match table and a number.
- **Evidence:** app/ux/runs/P3-T2/step-08.png

### P3-T2-03: Technical log wording in the progress panel
- **Severity (my guess):** 1
- **Where:** Progress panel: "Prompt: ... modes/_shared.md", "WebFetch", "$0.05".
- **What I expected vs what happened:** Expected plain "Reading the posting, scoring it". Got internal file names and tool names.
- **Evidence:** app/ux/runs/P3-T2/step-05.png

### P3-T2-04: PDF generated automatically without being asked
- **Severity (my guess):** 1
- **Where:** Checkbox "PDF if score >= 3.5" beside the paste box.
- **What I expected vs what happened:** I did not choose to make a PDF; it is pre-ticked, and the count rose to 7 PDFs.
- **Evidence:** app/ux/runs/P3-T2/step-01.png
