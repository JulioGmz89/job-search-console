# P2-T9: transcript

- **Persona:** Alex Rivera
- **Goal:** "You have been using this app for a few weeks. The CVs and letters it writes for you still sound machine-made. The words "seamless", "cutting-edge" and "robust" keep turning up, and they are not how you talk. Make sure it stops using them, without losing the writing rules you already set up. Then get a fresh tailored CV for the Cobalt Freight Staff Software Engineer job, written under the new rules."
- **Steps used:** 12 of 40 (counting each tool action, screenshots included)
- **Outcome (my judgment):** succeeded (the new rules are saved and the new CV run finished; I did not open the PDF text to check the banned words are really absent)
- **Single Ease Question:** 6/7: The Voice box was easy to find and edit, but I had to guess that PDF ↻ on the pipeline was the way to get a fresh CV, and I could not read the result.

## Steps
| # | Thinking aloud | Action | What happened | Screenshot |
|---|---|---|---|---|
| 1 | Open the app and look for where writing rules live. | navigate to URL | Pipeline table with 40 jobs. Nothing mentions writing rules. | (none) |
| 2 | "CV Studio" sounds like where CV wording lives. | click CV Studio | Page with Look settings, Themes, preview, and a "Voice — writing rules" box at the bottom with my Never-write list. | step-01.png |
| 3 | Add seamless, cutting-edge, robust to my list and keep the others. I will not press "Seed from template", it might wipe my rules. | retype whole text in the box with 3 new bullets | Box shows old list plus the new words. | (none) |
| 4 | Save. | click Save voice rules | Message at top: "voice-dna.md saved. It applies to the next cover letter or PDF." I only saw it in the page text; the screenshot at the bottom of the page did not show it. | step-02.png |
| 5 | Now a fresh CV for Cobalt Freight Staff Software Engineer. Pipeline row has "PDF ↻". | click Pipeline | Pipeline table. | (none) |
| 6 | Click PDF ↻ on the Staff Software Engineer row (#12, 4.2). | click PDF ↻ | Toast "PDF for Cobalt Freight started" with Open log. No confirmation about which rules or what it costs. | step-03.png |
| 7 | Wait and see. | wait 30s | Nothing visible changed on the page. | (none) |
| 8 | Check whether it finished. | click Runs | Finished list shows 3 rows: PDF for Cobalt Freight (Claude, 0:08), Render (script, 0:02), Mark PDF ready. | step-04.png |
| 9 | Open the run to see what it did. | click the PDF run row | Log: prompt includes voice-dna.md, session finished, "$0.05", payload written, render queued. | step-05.png |

Friend summary: "I added the three words to the banned list in CV Studio, under Voice, and kept my old rules. Then I regenerated the Cobalt Freight Staff Engineer CV; the log shows it read my voice rules and finished in a few seconds. I did not read the finished CV to check, so look at it before sending."

## Wrong turns
None really. I did not try Seed from template because I feared it would replace my rules.

## Moments of confusion
- After Save, I could not see the "saved" message on screen at first because it appeared at the top of a long page while the button was at the bottom.
- PDF ↻ is a symbol-label; I was not sure it would make a new CV rather than just reopen the old one.
- The run log says "0:08" and "1s" and the CV was ready quickly, so I could not tell whether it really did new work.
- I never saw the new CV or its text; I could not confirm the banned words are gone.

## Problems I would report
### P2-T9-01: Save confirmation appears far from the Save button
- **Severity (my guess):** 2
- **Where:** CV Studio, "Save voice rules" at the bottom; message at the top of the page
- **What I expected vs what happened:** Expected a note next to the button. The message "voice-dna.md saved…" appeared at the top, out of view.
- **Evidence:** app/ux/runs/P2-T9/step-02.png

### P2-T9-02: Nothing shows the new CV was made under the new rules, or how to read it
- **Severity (my guess):** 2
- **Where:** Pipeline after PDF ↻, and Runs log
- **What I expected vs what happened:** Expected a link to the new CV or a note that the new rules were used. Only a small toast, and I had to dig into Runs to see "voice-dna.md" in the prompt line, which is jargon. No way to open the new PDF from there.
- **Evidence:** app/ux/runs/P2-T9/step-03.png, app/ux/runs/P2-T9/step-05.png

### P2-T9-03: Editing the rules is a bare text box with no hint that existing rules are kept
- **Severity (my guess):** 1
- **Where:** Voice — writing rules
- **What I expected vs what happened:** I had to retype the whole file to add three words; no "add a banned word" control, and the Seed button looked risky.
- **Evidence:** app/ux/runs/P2-T9/step-01.png
