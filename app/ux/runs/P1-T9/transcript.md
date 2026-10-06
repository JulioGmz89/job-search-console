# P1-T9: transcript

- **Persona:** Alex Rivera
- **Goal:** "You have been using this app for a few weeks. The CVs and letters it writes for you still sound machine-made. The words "seamless", "cutting-edge" and "robust" keep turning up, and they are not how you talk. Make sure it stops using them, without losing the writing rules you already set up. Then get a fresh tailored CV for the Cobalt Freight Staff Software Engineer job, written under the new rules."
- **Steps used:** about 20 of 40 (counting screenshots and snapshots as actions)
- **Outcome (my judgment):** succeeded, with one doubt: I could not confirm from the screen that the PDF text itself avoids the three words.
- **Single Ease Question:** 6/7: The Voice box was easy to find in CV Studio and the PDF button was in the Pipeline row, but saving gave no feedback where I was looking.

## Steps
| # | Thinking aloud | Action | What happened | Screenshot |
|---|---|---|---|---|
| 1 | Open the app. | Navigate to URL | Pipeline table, 40 applications. | step-01.png |
| 2 | Writing rules sound like a CV thing. | Click "CV Studio" | Page has Look, Themes, preview, then "Voice — writing rules" with a voice-dna.md text box. | none |
| 3 | I'll add my three words to "Never write" and keep the other five. | Retype the whole box with seamless, cutting-edge, robust added | Box shows old rules plus the new ones. | none |
| 4 | Save it. | Click "Save voice rules" | No visible change near the button. | step-02.png, step-03.png |
| 5 | Did it save? | Navigate to #/cv again | A line "voice-dna.md saved. It applies to the next cover letter or PDF." appeared at the top of the page, far from the button. Box still holds my text. | none |
| 6 | Now the Cobalt Staff job. | Click "Pipeline" | Table. | none |
| 7 | Row 12 PDF button. | Clicked the row by mistake, then the "PDF ↻" button on row 12 | Row click opened a detail panel. Button gave a toast "PDF for Cobalt Freight started". | step-04.png, step-05.png |
| 8 | Wait for it. | Wait 30s | The panel's activity list shows "Mark PDF ready", "Render cv-candidate-cobaltfreight · standard" and "PDF for Cobalt Freight" all "Finished". | step-06.png |
| 9 | Check the result. | Click "PDF" tab | PDF preview, "ATS check passed, 85/100". I could not read the text or see a new file name or date. | step-07.png |

**What I would tell a friend:** I added seamless, cutting-edge and robust to the banned list in CV Studio, under Voice, and kept the five old rules. It said it saved and that it applies to the next PDF. I regenerated the Cobalt Staff PDF and it finished with ATS 85/100. I did not read the PDF to check the words are gone, so check that yourself.

## Wrong turns
- Clicked the whole row instead of the PDF button (row 12). It opened the detail panel, which turned out useful but cost a step.

## Moments of confusion
- After "Save voice rules" nothing visibly changed. I reloaded to check, and only then found the confirmation at the top of the page.
- No way to see the old voice file or confirm my other rules survived except by reading the box.
- I could not tell if the new PDF was actually regenerated, because the PDF tab shows no filename or timestamp.
- No hint on the PDF button that it uses the voice rules (the CV Studio text said it does, but I had to read that).

## Problems I would report
### P1-T9-01: No visible confirmation after "Save voice rules"
- **Severity (my guess):** 2
- **Where:** CV Studio, "Voice — writing rules", button "Save voice rules"
- **What I expected vs what happened:** I expected a message next to the button. The "saved" text appeared at the top of the page, off-screen.
- **Evidence:** app/ux/runs/P1-T9/step-02.png, step-03.png

### P1-T9-02: Cannot tell the PDF is new or follows the new rules
- **Severity (my guess):** 2
- **Where:** Pipeline detail panel, PDF tab
- **What I expected vs what happened:** I expected a file name or date and some sign the new rules were applied. The tab shows only a preview and an ATS score.
- **Evidence:** app/ux/runs/P1-T9/step-07.png

### P1-T9-03: Clicking a row and clicking a button in the row are easy to confuse
- **Severity (my guess):** 1
- **Where:** Pipeline table, row 12
- **What I expected vs what happened:** Small buttons in a clickable row; I hit the row first.
- **Evidence:** app/ux/runs/P1-T9/step-04.png
