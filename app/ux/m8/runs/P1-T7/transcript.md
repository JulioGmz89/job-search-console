# P1-T7: transcript

- **Persona:** Alex Rivera
- **Goal:** "You have been using this app for a few weeks. You suspect your CV looks like everyone else's. Give it a different design that you like, make that the design for every CV the app produces from now on, and produce the version you would send to Cobalt Freight for the Staff Software Engineer job. Before you finish, make sure the automated screening systems companies use can still read it properly."
- **Steps used:** 9 of 40
- **Outcome (my judgment):** succeeded
- **Single Ease Question:** 6/7: A Today card sent me straight to Design, and the labels were clear. I could not look at the PDF itself in the browser.

## Steps
| # | Thinking aloud | Action | What happened | Screenshot |
|---|---|---|---|---|
| 1 | Where do I start? | Navigate to the URL | Today page. A card says "Your CV design fails the screening check" with a "Choose a design that passes" link. | step-01.png |
| 2 | That is my design problem, so take the link. | Click "Choose a design that passes" | Design page. My current design "broken" is flagged. Each design has a screening label. | step-02.png |
| 3 | I need to preview with Cobalt Staff. | Pick "Cobalt Freight — Staff Software Engineer" in "Preview with" | Preview switched. | - |
| 4 | Try Executive. It is different and says it is readable. | Click Executive | Preview shows 2 pages. "Readable by screening systems." A note says the change is unsaved. | step-03.png |
| 5 | Make it permanent. | Click "Make this my design for every CV" | "Executive is now your design for every new CV." | step-04.png |
| 6 | Now the Cobalt version. | Click "Lay out this CV again in Executive" | "Laid out again ... Readable by screening systems." A link to the job's documents appeared. | step-05.png |
| 7 | Check it is really there. | Click "Open the job's documents" | Cobalt job page. Tailored CV is Ready, "Executive design", "Screening check: readable by screening systems". Open and Download are available. | step-07.png |

I did not click "Update existing CVs to this design (6)", because I did not ask for that and it would change my other CVs.

## Wrong turns
None.

## Moments of confusion
- The old CV lacked an email. I did not know if Executive fixes that. The check says it passes, so I trusted it.
- "Lay out again" says no AI and wording unchanged. The documents page says "Make it again" uses AI. It took me a moment to see these are different buttons.
- Unsure if "every CV from now on" also covers old ones. The app says "every new CV", and the separate Update button covers the old ones.

## Problems I would report
### P1-T7-01: I never saw the finished PDF in the app
- **Severity (my guess):** 1
- **Where:** Cobalt job page, Documents, "Tailored CV"
- **What I expected vs what happened:** I expected to see the final PDF. I only got Open/Download links. I did not open it, so I trust the screening label without checking the file.
- **Evidence:** app/ux/m8/runs/P1-T7/step-07.png

### P1-T7-02: "Make this my design" and "Update existing CVs" are easy to confuse
- **Severity (my guess):** 1
- **Where:** Design page buttons under the preview
- **What I expected vs what happened:** After "Make this my design for every CV", I wasn't sure old CVs were covered. Only the small text "for every new CV" says they are not.
- **Evidence:** app/ux/m8/runs/P1-T7/step-04.png

## What I would tell a friend
Executive is now my design for all new CVs. The Cobalt Freight Staff Software Engineer CV was re-laid out in Executive and the screening check says it is readable. My old "broken" design failed the check because it had no email and used a table. The other 6 existing CVs still have their old design until I press "Update existing CVs".
