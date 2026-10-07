# P2-T9: transcript

- **Persona:** Alex Rivera
- **Goal:** "You have been using this app for a few weeks. The CVs and letters it writes for you still sound machine-made. The words "seamless", "cutting-edge" and "robust" keep turning up, and they are not how you talk. Make sure it stops using them, without losing the writing rules you already set up. Then get a fresh tailored CV for the Cobalt Freight Staff Software Engineer job, written under the new rules."
- **Steps used:** 10 of 40 (counting 2 screenshots-free snapshots as non-actions; 10 navigate/click/type/wait actions)
- **Outcome (my judgment):** succeeded
- **Single Ease Question:** 6/7: "Writing rules" under My CV was easy to find and the rest was one click each, but I first guessed Skills and Workspace, and the new CV finished in under 10 seconds with only a small tick as proof.

## Steps
| # | Thinking aloud | Action | What happened | Screenshot |
|---|---|---|---|---|
| 1 | Open the app. | Navigate to URL | Today page, "Good evening, Alex" | - |
| 2 | Rules about words sound like Skills. | Click Skills | Skills list (gRPC, etc.) about my CV gaps, not writing | step-01 |
| 3 | Maybe Workspace holds settings. | Click Workspace | Folder, health, tidy-up tools; mentions "writing rules" only as a status line | - |
| 4 | Try My CV, it says "how the assistant writes". | Click My CV | Content editor | - |
| 5 | Writing rules tab. | Click Writing rules | "Words to avoid" with my 5 words, Add a word box, list of 6 CVs | step-02 |
| 6 | Add the first word. | Type "seamless" + Enter | Appeared in list | - |
| 7 | Next. | Type "cutting-edge" + Enter | Appeared | - |
| 8 | Next. | Type "robust" + Enter | Appeared; the original 5 are still there | - |
| 9 | Now the Cobalt Staff CV is in the list below. | Click "Make it again" for Cobalt Freight - Staff Software Engineer | Button clicked, no obvious progress shown | step-03 |
| 10 | Wait and look. | Wait 8s, read list | Row says "Made Oct 6, 23:59, under your current rules" with a tick; header count went from 6 to 5 old | step-04 |

Told a friend: I added seamless, cutting-edge and robust to my "Words to avoid" in My CV > Writing rules; my five old words are still there. Then I used "Make it again" on the Cobalt Freight Staff Software Engineer CV, and it now says it was made under my current rules. I did not open the PDF to check the wording.

## Wrong turns
- Skills (thought writing preferences might live there); it is about missing skills on my CV.
- Workspace (looked for settings); it is folder and health tools.

## Moments of confusion
- After clicking "Make it again" I saw no spinner or message; I could not tell if anything was happening until the row changed.
- The note said rules "last changed (Oct 6)" and the old CVs were "made Oct 6, 00:23", so the date alone did not explain why they counted as old.
- I did not open the new PDF to confirm the banned words are gone.

## Problems I would report
### P2-T9-01: No visible progress after "Make it again"
- **Severity (my guess):** 2
- **Where:** Writing rules > "Your tailored CVs", Make it again button
- **What I expected vs what happened:** Expected a spinner or "working" text, given the "About 3 min" warning. Got no change on screen at the time of the screenshot; the result appeared within about 10 seconds.
- **Evidence:** app/ux/m8/runs/P2-T9/step-03.png

### P2-T9-02: Writing rules are hard to find from the obvious menus
- **Severity (my guess):** 1
- **Where:** Top navigation: Skills, Workspace, My CV
- **What I expected vs what happened:** Guessed Skills then Workspace first; the rules are under My CV > Writing rules.
- **Evidence:** app/ux/m8/runs/P2-T9/step-01.png
