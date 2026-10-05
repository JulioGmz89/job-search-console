# P1-T1: transcript

- **Persona:** Alex Rivera
- **Goal:** "You have just installed this app and opened it for the first time. Get it ready for your job search. It needs your CV (below), and it needs to know which companies to keep an eye on for new openings. Start with one: Kestrel Media, whose careers page is https://job-boards.greenhouse.io/kestrelmedia"
- **Steps used:** 12 of 40 (one was a failed click on a disabled button)
- **Outcome (my judgment):** gave up (neither the CV nor the company could be added)
- **Single Ease Question:** 1/7: every screen told me something was missing, and none had a control to fix it.

## Steps
| # | Thinking aloud | Action | What happened | Screenshot |
|---|---|---|---|---|
| 1 | Open the app, see where setup is. | Navigate to URL | Pipeline page. "No cv.md in the data directory yet" in plain text, with no button next to it. Evaluate now and Add to inbox are greyed out. | step-01.png |
| 2 | CV Studio sounds like where my CV goes. | Click CV Studio | Only style tokens, themes and voice rules. The CV picker lists only "Sample CV (fictional)". No place to paste or upload my CV. | none |
| 3 | Try Skills. | Click Skills | "CV: no cv.md found", "Nothing to analyse yet". No input. | step-02.png |
| 4 | Companies should be under Sources. | Click Sources | "Tracked companies (0)", with an Add button that is greyed out. Message: "No portals.yml yet — add a company to create one." | none |
| 5 | Maybe the help explains it. | Open the "1 issue" note and "How sources work" | Long help text. It says edits go to portals.yml, but nothing explains why Add is disabled. | step-03.png |
| 6 | Try Add anyway. | Click Add | Timed out because the button is disabled. | none |
| 7 | Maybe Runs has a setup flow. | Click Runs | Empty Running, Waiting and Finished lists. | none |
| 8 | Back to Pipeline for its help text. | Click Pipeline, open the data-issue note and the "What happens when I click Evaluate now?" help | Help mentions cv.md and /career-ops oferta. Data issue: "No applications tracker yet — run an evaluation to create one." Evaluate stays disabled with no CV. | step-04.png |
| 9 | I found no way to do either thing. | Stop | Gave up. | none |

Friend summary: "Installed, opened it, and I couldn't get set up. There is no place to give it my CV and no way to add a company. Add on Sources is greyed out, even though the page says to add a company to get started. I'd have to create cv.md and portals.yml by hand, and the app never said that."

## Wrong turns
- CV Studio: expected to enter my CV there. It only styles a CV that already exists.
- Skills: expected a CV upload. It only shows stats.
- Runs: looked for a setup step. It was empty.

## Moments of confusion
- "No cv.md in the data directory yet": it doesn't say where that directory is or what I should do. I know cv.md, but the app doesn't tell me to create it.
- Sources says "add a company to create one" while the Add button is disabled. The two contradict each other.
- Tracked companies versus Job boards: I don't know which one a Greenhouse page belongs in.
- "Data directory" is an unfamiliar term.

## Problems I would report
### P1-T1-01: No way to provide my CV from the app
- **Severity (my guess):** 4
- **Where:** Pipeline ("No cv.md in the data directory yet"), Skills ("CV: no cv.md found"), CV Studio.
- **What I expected vs what happened:** I expected a paste or upload box, or at least instructions. There is only a status line, and Evaluate now stays disabled.
- **Evidence:** app/ux/runs/P1-T1/step-01.png

### P1-T1-02: Add company is disabled on a fresh install
- **Severity (my guess):** 4
- **Where:** Sources, "Tracked companies (0)" and "Job boards (0)", Add buttons.
- **What I expected vs what happened:** The page says "add a company to create one", but Add is greyed out with no explanation. I couldn't add Kestrel Media.
- **Evidence:** app/ux/runs/P1-T1/step-03.png

### P1-T1-03: Setup state is not guided
- **Severity (my guess):** 3
- **Where:** All pages. Each shows a different missing-file message ("tracker-missing", "portals-missing", "no cv.md"), and none of them links to the next step.
- **What I expected vs what happened:** I expected a first-run checklist. I got scattered notes that use file names and internal codes.
- **Evidence:** app/ux/runs/P1-T1/step-04.png
