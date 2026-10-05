# P2-T1: transcript

- **Persona:** Alex Rivera
- **Goal:** "You have just installed this app and opened it for the first time. Get it ready for your job search. It needs your CV (below), and it needs to know which companies to keep an eye on for new openings. Start with one: Kestrel Media, whose careers page is https://job-boards.greenhouse.io/kestrelmedia"
- **Steps used:** 17 of 40 (including 3 failed clicks)
- **Outcome (my judgment):** failed (gave up). CV not added, Kestrel Media not added.
- **Single Ease Question:** 1/7: Every screen said something was missing, but no screen gave me a way to supply my CV or add a company.

## Steps
| # | Thinking aloud | Action | What happened | Screenshot |
|---|---|---|---|---|
| 1 | Open the app. | Navigate to URL | Pipeline page. Message "No cv.md in the data directory yet". Evaluate/Add buttons greyed out. | step-01.png |
| 2 | I need to put my CV somewhere. "CV Studio" sounds right. | Click CV Studio | Page is about fonts, colours and themes for a sample CV. No place to paste or upload my CV. | step-02.png |
| 3 | Now the company. Try Sources. | Click Sources | "Tracked companies (0)", "Add" button is greyed out. Banner says portals.yml issue. | step-04.png |
| 4 | Read the issue. | Open the issue group | "No portals.yml yet — add a company to create one." But Add is disabled. | - |
| 5 | Read the help. | Open "How sources work" | Long help about providers. Nothing about how to enable Add. | - |
| 6 | Try Add anyway. | Click Add | Failed: button is disabled, no explanation. | step-07.png |
| 7 | Maybe Skills has CV setup. | Click Skills | Stats page, "CV: no cv.md found", "Nothing to analyse yet". Dead end. | - |
| 8 | Back to Pipeline. | Click Pipeline | Same CV warning. | - |
| 9-10 | Try help links by guessed names. | Two clicks | Failed on my side (tool selector errors). Counted. | - |
| 11 | Open the issue and help on Pipeline. | Click both | Help describes files like data/pipeline.md, cv.md, "/career-ops oferta". Issue: "No applications tracker yet". Nothing says how to give it my CV. | step-11.png |
| 12 | Last place: Runs. | Click Runs | Empty lists. | step-14.png |
| 13 | I would stop. | - | - | - |

Told to a friend: "I couldn't get set up. The app keeps saying it has no CV and no company list, but there is no upload or paste box for the CV, and the Add company button is greyed out. The only hints mention files with names like cv.md and portals.yml, which I'd have to create by hand. I gave up."

## Wrong turns
- CV Studio: expected it to take my CV; it is only for styling.
- Skills: hoped for a CV or profile setup; it is only analysis.
- Runs: last-ditch look; empty.

## Moments of confusion
- "No cv.md in the data directory yet": I don't know what cv.md or a "data directory" is, or where to put it.
- Add buttons are disabled with no tooltip or reason, while the message says "add a company to create one".
- Help text is full of file names (portals.yml, data/pipeline.md), "A–G report", "headless Claude Code session", "/career-ops oferta". Jargon.
- "PDF if score ≥ 3": I don't know what the score means.

## Problems I would report
### P2-T1-01: No way to give the app my CV
- **Severity (my guess):** 4
- **Where:** Pipeline and Skills warnings "No cv.md in the data directory yet"; CV Studio page
- **What I expected vs what happened:** Expected an upload or paste box on first run. Found none. CV Studio only styles a sample CV. The only route implied is making a file by hand.
- **Evidence:** app/ux/runs/P2-T1/step-01.png, step-02.png

### P2-T1-02: "Add" company button disabled on first run, with no reason
- **Severity (my guess):** 4
- **Where:** Sources > Tracked companies "Add" (also Job boards "Add")
- **What I expected vs what happened:** The screen says "add a company to create one", but the button is greyed out and gives no explanation.
- **Evidence:** app/ux/runs/P2-T1/step-04.png, step-07.png

### P2-T1-03: No first-run guidance or setup checklist
- **Severity (my guess):** 3
- **Where:** Pipeline landing page
- **What I expected vs what happened:** Expected "Step 1: add your CV, Step 2: add companies". Got scattered warnings, a "data issue" note and disabled controls.
- **Evidence:** app/ux/runs/P2-T1/step-01.png, step-11.png

### P2-T1-04: Jargon and file names in help and messages
- **Severity (my guess):** 2
- **Where:** "What happens when I click Evaluate now?", "How sources work", issue lists
- **What I expected vs what happened:** Expected plain job-search language. Got file paths, "headless session", "A–G report", "ATS", "handoff".
- **Evidence:** app/ux/runs/P2-T1/step-11.png
