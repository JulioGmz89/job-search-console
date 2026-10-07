# P2-T7: transcript

- **Persona:** Alex Rivera
- **Goal:** "You have been using this app for a few weeks. You suspect your CV looks like everyone else's. Give it a different design that you like, make that the design for every CV the app produces from now on, and produce the version you would send to Cobalt Freight for the Staff Software Engineer job. Before you finish, make sure the automated screening systems companies use can still read it properly."
- **Steps used:** 9 of 40
- **Outcome (my judgment):** succeeded
- **Single Ease Question:** 6/7: the Today page led me straight to the design page, and each result was confirmed in words. I was unsure whether re-laying-out the CV was what produced the version to send.

## Steps
| # | Thinking aloud | Action | What happened | Screenshot |
|---|---|---|---|---|
| 1 | Let me see what the app shows. | Navigate to URL | Today page. A "Needs you" card says my CV design fails the screening check (no email found, uses a table). | step-01.png |
| 2 | That is exactly my goal's last part, so I'll follow it. | Click "Choose a design that passes" | Design page with a list of designs, each labelled with a screening result. Mine ("broken") shows "Screening problems". | step-02.png |
| 3 | I want to preview with the Cobalt job. | Select "Cobalt Freight — Staff Software Engineer" in "Preview with" | Preview switched. | |
| 4 | Jake looks different from the usual and says it passes. | Click "Jake" | Preview shows "Readable by screening systems", with a note that the change is unsaved. | step-03.png |
| 5 | Make it permanent. | Click "Make this my design for every CV" | Message "Jake is now your design for every new CV." | step-05.png |
| 6 | Now produce the Cobalt version. | Click "Lay out this CV again in Jake" | "Laid out again Oct 6 in jake: Readable by screening systems", with a link to the job's documents. | step-06.png |
| 7 | Check it is really there. | Click "Open the job's documents" | Cobalt page: Tailored CV "Ready", Jake design, "Screening check: readable by screening systems", Open and Download links. | step-07.png |

(Some steps were two actions each, 9 in total.)

Tell a friend: I picked the Jake design, made it my default for every new CV, and re-did the Cobalt Staff Software Engineer CV in it. The app says it passes the screening check, and the CV is ready to open or download. I did not open the PDF itself, so I trust the app's word on the screening result.

## Wrong turns
None.

## Moments of confusion
- "Make this my design" only affects new CVs, and a separate button updates existing ones (6). I was unsure which one produced my Cobalt CV. "Lay out this CV again" turned out to do it, with no AI.
- The word "broken" as a design name was odd.

## Problems I would report
### P2-T7-01: Unclear which button gives me the CV to send
- **Severity (my guess):** 1
- **Where:** Design page, buttons "Make this my design for every CV", "Update existing CVs (6)" and "Lay out this CV again in Jake"
- **What I expected vs what happened:** I expected one clear "make my Cobalt CV" step. I had to guess, and the result only showed up on another page.
- **Evidence:** app/ux/m8/runs/P2-T7/step-06.png

### P2-T7-02: Screening result is given only as text, and I could not see what was checked
- **Severity (my guess):** 1
- **Where:** Cobalt documents, "Screening check: readable by screening systems"
- **What I expected vs what happened:** I wanted a way to see what was checked, such as the text as a screening system would read it. I only saw a statement.
- **Evidence:** app/ux/m8/runs/P2-T7/step-07.png
