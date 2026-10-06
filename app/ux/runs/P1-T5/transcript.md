# P1-T5: transcript

- **Persona:** Alex Rivera
- **Goal:** "Your recruiter screen with Granite Cloud for the Software Engineer, Payments role is booked, and the recruiter asked for a CV tailored to that role and a cover letter. Get both ready; you will send them yourself."
- **Steps used:** 10 of 50 (plus 3 extra snapshot/wait calls)
- **Outcome (my judgment):** succeeded (I saw the CV marked ready and the letter shown in a viewer. I could not read the letter text myself, only an embedded PDF frame, so the quality is unchecked.)
- **Single Ease Question:** 6/7: PDF and Cover buttons sat right on the Granite row, but the app never said where the files ended up for me to send.

## Steps
| # | Thinking aloud | Action | What happened | Screenshot |
|---|---|---|---|---|
| 1 | Open the app, look for my tracker. | Navigate | Pipeline table, 40 rows. Granite Cloud, Software Engineer, Payments (#6, 4.1, Responded) has "PDF" and "Cover" buttons. | step-01 |
| 2 | That's the pdf command. Fastest first. | Click PDF on row #6 | Toast "PDF for Granite Cloud started" with "Open log". No confirmation dialog. | step-02 |
| 3 | Wait for it. | Wait 8s | The PDF dot went from empty to filled, the button became "PDF ↻", and the header count went 6 to 7 PDFs. | step-03 |
| 4 | Now the cover letter. | Click Cover on row #6 | A form with four questions A to D (why, problem, approach, tone). It explains it refuses to draft until I answer. | step-04 |
| 5 | Answer with what I was given, tone Direct. | Fill the four fields | Draft button enabled. | (form) |
| 6 | Go. | Click "Draft and render the letter" | Jumped to the Runs screen. | step-05 |
| 7 | Wait. | Wait 15s | Run "Cover letter for Granite Cloud" Finished, 0:08, output/cover-granitecloud-006.pdf. | step-05 |
| 8 | Check where the files are. | Pipeline, click row #6 | A detail panel with Report, PDF and Cover letter tabs. | step-06 |
| 9 | Look at the letter. | Click the Cover letter tab | The letter appears in an embedded frame. | step-07 |

Tell a friend: both are done. The tailored CV PDF and the Direct-tone cover letter for Granite Cloud, Software Engineer Payments, were generated from the Pipeline row in under a minute. The letter is at output/cover-granitecloud-006.pdf. I still have to open them and read them before sending. I never found a download or "open in folder" button.

## Wrong turns
None substantive. I filtered by "Granite" only to read the table more easily.

## Moments of confusion
- After clicking PDF there was no progress in view, only a toast. I had to wait and notice the dot change.
- Cover took me to the Runs screen with no obvious "view letter" link. I only found the letter by going back to the row.
- The CV file name appeared only as "cv-candidate-granitecloud" in the Runs list. I did not see a path for the CV like I did for the letter.
- Row #6 is "Responded" but the app did not warn or care. Fine.

## Problems I would report
### P1-T5-01: No visible path or download for the finished CV and letter
- **Severity (my guess):** 2
- **Where:** Pipeline row #6 after PDF and Cover finished; Runs screen
- **What I expected vs what happened:** I expected a link to open or reveal the files so I can attach them. The letter path only appears in the run log text; the CV path is not shown at all.
- **Evidence:** app/ux/runs/P1-T5/step-05.png

### P1-T5-02: PDF button starts a run silently with only a short toast
- **Severity (my guess):** 1
- **Where:** PDF button on the row
- **What I expected vs what happened:** I expected to know it costs model usage and takes time. It started immediately and the toast was easy to miss.
- **Evidence:** app/ux/runs/P1-T5/step-02.png

### P1-T5-03: The Cover button sends you to Runs, away from the pipeline
- **Severity (my guess):** 1
- **Where:** After "Draft and render the letter"
- **What I expected vs what happened:** I expected to stay on the row or get the letter shown; the page switched to Runs and I had to go back.
- **Evidence:** app/ux/runs/P1-T5/step-05.png
