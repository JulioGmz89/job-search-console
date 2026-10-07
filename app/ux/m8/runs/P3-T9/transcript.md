# P3-T9: transcript

- **Persona:** Alex Rivera
- **Goal:** "You have been using this app for a few weeks. The CVs and letters it writes for you still sound machine-made. The words "seamless", "cutting-edge" and "robust" keep turning up, and they are not how you talk. Make sure it stops using them, without losing the writing rules you already set up. Then get a fresh tailored CV for the Cobalt Freight Staff Software Engineer job, written under the new rules."
- **Steps used:** 10 of 40
- **Outcome (my judgment):** succeeded
- **Single Ease Question:** 7/7: My CV had a "Writing rules" tab with an "Add a word" box and a "Make it again" button right beside the Cobalt Staff CV.

## Steps
| # | Thinking aloud | Action | What happened | Screenshot |
|---|---|---|---|---|
| 1 | Open the app. | Navigate | Today page, "Good morning, Alex". | - |
| 2 | Rules about how it writes are probably under My CV. | Click My CV | Tabs: Content, Profile, Design, Writing rules. | step-01.png |
| 3 | "Writing rules" is the obvious tab. | Click Writing rules | "Words to avoid" list (5 existing words), "Add a word", and a "When rules apply" section listing 6 older CVs, including Cobalt Staff. | step-02.png |
| 4-6 | Add each word, one at a time, so the existing rules stay. | Typed seamless, cutting-edge, robust, each followed by Enter | A status message said Added "robust"; the list showed all 8 words, with the old 5 intact. | step-03.png |
| 7 | The page says old CVs keep their wording, so I need "Make it again" on the Cobalt Staff row. | Click "Make it again for Cobalt Freight — Staff Software Engineer" | It started right away. It said "About 3 min" beforehand. | - |
| 8 | Wait for it. | Waited 20s | The Cobalt Staff row now read "Made Oct 7, 00:10, under your current rules" with a check mark. The other 5 stayed "before your rules changed". | step-04.png |
| 9 | Check that my old rules (tone, bullets) survived. | Opened "All rules" | voice-dna.md still has Tone, Bullets, the original 5 words, plus the 3 new ones. A .bak is kept. | step-05.png |

I did not open the new CV PDF to read its wording. I trust the label that it was made under the current rules.

Tell a friend: I added "seamless", "cutting-edge" and "robust" to my words-to-avoid. My tone and bullet rules were untouched. Then I remade the Cobalt Freight Staff Software Engineer CV, and the app says it was made under the new rules. The other 5 CVs still use the old wording until I remake them.

## Wrong turns
None.

## Moments of confusion
- Making the CV took a few seconds, not the "About 3 min" the page showed, and there was no visible progress message. I only noticed it had finished by re-reading the row.
- I could not tell whether the three words were checked against the writing samples or the letters.

## Problems I would report
### P3-T9-01: No clear progress or finish message for "Make it again"
- **Severity (my guess):** 1
- **Where:** "Your tailored CVs" list on Writing rules
- **What I expected vs what happened:** I expected a spinner or message saying it was done. The only sign was the row text changing to "✓ Made Oct 7, 00:10, under your current rules".
- **Evidence:** app/ux/m8/runs/P3-T9/step-04.png
