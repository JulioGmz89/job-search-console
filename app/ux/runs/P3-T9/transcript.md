# P3-T9: transcript

- **Persona:** Alex Rivera
- **Goal:** "You have been using this app for a few weeks. The CVs and letters it writes for you still sound machine-made. The words "seamless", "cutting-edge" and "robust" keep turning up, and they are not how you talk. Make sure it stops using them, without losing the writing rules you already set up. Then get a fresh tailored CV for the Cobalt Freight Staff Software Engineer job, written under the new rules."
- **Steps used:** about 24 of 40 (counting screenshots, snapshots and two failed clicks)
- **Outcome (my judgment):** succeeded, with doubt about whether the rules save is confirmed
- **Single Ease Question:** 5/7: I found the rules quickly in CV Studio, but nothing told me the save worked and I could not tell whether the new CV obeyed them.

## Steps
| # | Thinking aloud | Action | What happened | Screenshot |
|---|---|---|---|---|
| 1 | Open the app. | Navigate to URL | Pipeline table of 40 jobs. | step-01.png |
| 2 | Writing rules sound like they belong with the CV. | Click "CV Studio" | Page with look settings, themes, and a "Voice — writing rules" box far down. | none |
| 3 | The box lists banned words. I want to add mine and keep the old five. | Retyped the full text with seamless, cutting-edge, robust added under "Never write" | Text accepted. The old five rules, the Tone section and the Bullets section are all kept. | none |
| 4 | Save it. | Click "Save voice rules" | No visible message, toast or change. | step-02.png, step-03.png |
| 5 | Did it save? | Navigated to the same address again, then read the box | Box still shows the new words. This may not have been a real reload, so I am not fully certain. | none |
| 6 | Now the Cobalt Freight Staff Software Engineer job (#12). | Click Pipeline, then "PDF ↻" on that row | Toast: "PDF for Cobalt Freight started". | step-04.png |
| 7 | Wait and see. | Waited 20s | The toast vanished without saying whether it finished. | step-05.png |
| 8 | Check whether it finished. | Click Runs | Three finished runs: PDF for Cobalt Freight (report 012), render, mark PDF ready. | step-06.png |
| 9 | Did it use my rules? | Open the PDF run | The prompt line lists voice-dna.md. The run is for report 012 and finished in 8s. | step-07.png |

Result to tell a friend: I added "seamless", "cutting-edge" and "robust" to my banned list and kept my earlier rules. I then regenerated the Cobalt Freight Staff Software Engineer CV. The run log shows my writing-rules file was included, so it should follow them. I did not open the finished PDF to confirm the words are gone, and the app gave me no way to check that.

## Wrong turns
- Two clicks failed on stale element references. These were tool hiccups, not wrong places.
- No real wrong turns in the app.

## Moments of confusion
- After "Save voice rules" nothing visibly happened. I did not know if it saved.
- The rules box sits at the very bottom of CV Studio, below themes and previews.
- The Pipeline toast disappeared by itself, so I had to go to Runs to learn the outcome.
- The Cobalt Freight company has several rows (SRE, Senior Backend, Data Engineer, Staff). Only the role name separates them, and the toast said just "Cobalt Freight".
- Since I never opened the new PDF, I could not check for the banned words.

## Problems I would report
### P3-T9-01: No confirmation after saving voice rules
- **Severity (my guess):** 2
- **Where:** "Save voice rules" button under "Voice — writing rules"
- **What I expected vs what happened:** I expected a "Saved" message. Nothing appeared.
- **Evidence:** app/ux/runs/P3-T9/step-03.png

### P3-T9-02: Toast for the CV run is ambiguous and vanishes
- **Severity (my guess):** 2
- **Where:** toast "PDF for Cobalt Freight started" after clicking "PDF ↻"
- **What I expected vs what happened:** I expected the toast to name the role and tell me when it was done. It named only the company, and it disappeared without saying whether the run finished.
- **Evidence:** app/ux/runs/P3-T9/step-04.png, app/ux/runs/P3-T9/step-05.png

### P3-T9-03: No way to see that the new rules were applied to the output
- **Severity (my guess):** 2
- **Where:** run detail, and the "PDF ↻" button on the Pipeline row
- **What I expected vs what happened:** I expected a link to the new CV and some check that the banned words are absent. I only got a prompt line naming voice-dna.md.
- **Evidence:** app/ux/runs/P3-T9/step-07.png

### P3-T9-04: Editing the rules means retyping a free-text file
- **Severity (my guess):** 1
- **Where:** voice rules text box
- **What I expected vs what happened:** I expected to add a word to a list. I had to replace the whole text to keep my existing rules, which risks losing them.
- **Evidence:** app/ux/runs/P3-T9/step-02.png
