# P1-T2: transcript

- **Persona:** Alex Rivera
- **Goal:** "You have been using this app for a few weeks. Today you came across a job you like: https://job-boards.greenhouse.io/kestrelmedia/jobs/4134913 (Senior Backend Engineer at Kestrel Media). Find out how well it fits you and whether it is worth applying, and make sure it is kept with the rest of your job applications. Tell me what the app concluded."
- **Steps used:** 6 of 40
- **Outcome (my judgment):** succeeded (with caveat: the report body is a placeholder, so "how well it fits" rests on the score and verdict only)
- **Single Ease Question:** 6/7: paste box and Evaluate now were the first thing on the page and it worked in one go, but the result text was thin and I had to guess the new row was "kept".

## Steps
| # | Thinking aloud | Action | What happened | Screenshot |
|---|---|---|---|---|
| 1 | Where's the evaluate-a-link thing? | Navigate to URL | Pipeline page: paste box, "Evaluate now", tracker table of 40 | step-01.png |
| 2 | Paste the link, fastest control is Evaluate now | Typed URL, clicked Evaluate now | Progress panel appeared, "Evaluate job-boards.greenhouse.io" | step-02.png |
| 3 | Few minutes expected, wait | Waited 30s | Already done; header 41 applications · 7 PDFs; new row 41 Kestrel Media 4.1 Evaluated Apply | step-03.png |
| 4 | Open the row for the verdict | Clicked row 41 | Detail panel: Decision Apply, Legitimacy High Confidence, Risk Low, Confidence High, Next action Apply. Log: report 041 written, score 4.1/5, PDF queued | step-04.png |

(Steps counted: navigate, screenshot-free actions of type, click, wait, click = 5 actions plus snapshots/screenshots not counted as actions; roughly 6.)

Told a friend: "Kestrel Media Senior Backend Engineer scored 4.1 out of 5, the app says Apply. Legitimacy high, risk low, confidence high. It's in my tracker as #41 with status Evaluated, and a tailored PDF was queued automatically. Comp wasn't stated in the posting. The report text itself just said 'A fixture report written by fake-claude.js', so I got no real reasoning on why it fits."

## Wrong turns
None.

## Moments of confusion
- The progress panel finished in 8 seconds. I expected minutes; the log said "fake-claude", which made me doubt it was real.
- The report's A) Role Summary was one placeholder line and there was a "Cover Letter Draft" saying "I am the fixture". I could not tell how well I fit beyond the number.
- Nothing said explicitly "saved to tracker"; I inferred it from the row and the count 41.
- The panel appeared with the Kestrel row detail at the bottom of the page, below the table, so I had to find it.

## Problems I would report
### P1-T2-01: Report content is placeholder, no fit reasoning
- **Severity (my guess):** 3
- **Where:** Detail panel "Evaluation: Kestrel Media — Senior Backend Engineer", Report tab
- **What I expected vs what happened:** Expected A-G sections explaining fit. Got "A) Role Summary: A fixture report written by fake-claude.js" and a Cover Letter Draft nobody asked for.
- **Evidence:** app/ux/runs/P1-T2/step-04.png

### P1-T2-02: No clear "saved to tracker" confirmation
- **Severity (my guess):** 1
- **Where:** Progress panel after Evaluate now
- **What I expected vs what happened:** Expected a line like "added to tracker as #41". Log only said "Report written: reports/041-..." and "queuing the tailored PDF"; I had to spot the new row and the count change.
- **Evidence:** app/ux/runs/P1-T2/step-04.png

### P1-T2-03: Detail panel opens below a 41-row table
- **Severity (my guess):** 2
- **Where:** Clicking row 41
- **What I expected vs what happened:** Expected the detail beside or over the table; it rendered at the bottom of the page, off-screen from the click.
- **Evidence:** app/ux/runs/P1-T2/step-04.png
