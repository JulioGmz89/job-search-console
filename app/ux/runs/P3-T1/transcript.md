# P3-T1: transcript

- **Persona:** Alex Rivera
- **Goal:** "You have just installed this app and opened it for the first time. Get it ready for your job search. It needs your CV (below), and it needs to know which companies to keep an eye on for new openings. Start with one: Kestrel Media, whose careers page is https://job-boards.greenhouse.io/kestrelmedia"
- **Steps used:** 17 of 40 (actions counted, including two failed clicks)
- **Outcome (my judgment):** failed (gave up: neither the CV nor the company could be added)
- **Single Ease Question:** 1/7: Every screen told me my CV and portals file were missing, but none had a field, button or instruction to supply them. The only "Add" button was greyed out.

## Steps
| # | Thinking aloud | Action | What happened | Screenshot |
|---|---|---|---|---|
| 1 | Open the app for the first time. | Navigate to URL | Pipeline page. Notice "No cv.md in the data directory yet" and "0 applications · 0 PDFs". No welcome or setup guide. | step-01.png |
| 2 | My CV is the first thing needed. "CV Studio" sounds like where it goes. | Click CV Studio | Page about a "Sample CV (fictional)", colours, fonts, themes with ATS badges. No place to paste or upload my own CV. | step-03.png |
| 3 | Back to where the "no cv.md" message was; hope for help. | Click Pipeline | Pipeline again. | - |
| 4 | Try the help "What happens when I click Evaluate now?" (first click failed because the element reference was stale). | Click help, retry by text | Explains cv.md and data/pipeline.md exist, but not how to create cv.md. | step-06.png |
| 5 | Maybe the "1 data issue found" says what to do. | Click it | "tracker-missing: run an evaluation to create one." Nothing about my CV. | step-08.png |
| 6 | Now the company. Sources should be it. | Click Sources | "Tracked companies (0)", "Job boards (0)". Both Add buttons are greyed out. | step-10.png |
| 7 | Open the issue note and "How sources work". | Click both | "portals-missing: No portals.yml yet — add a company to create one." Long help on providers and statuses. Greenhouse is mentioned as supported, which is good. | step-12.png |
| 8 | Try Add anyway. | Click Add | Failed, the button is disabled. Nothing says why. | - |
| 9 | Maybe Runs or Skills has a setup step. | Click Runs, then Skills | Runs: nothing useful. Skills: "0 postings", "CV: no cv.md found", "Nothing to analyse yet". | step-15.png, step-16.png |
| 10 | Read Skills help. | Click "How this page works" | Explains Have/Partial/Missing from "your CV", but nothing on how to provide it. | - |
| 11 | I would give up here. | Stop | | - |

What I would tell a friend: I could not get it set up. I did not manage to add my CV or Kestrel Media. The app keeps saying cv.md and portals.yml are missing, but it never gives me a box to paste my CV or a working button to add a company. The "Add" buttons are greyed out and the CV page only offers styling. If there is a trick, such as creating files by hand in some folder, the app does not say so. I would not trust it yet.

## Wrong turns
- CV Studio (step 2): expected a place to paste my CV. It only styles a sample CV.
- Pipeline help and data-issue note (steps 4-5): hoped for setup instructions. They only describe later steps.
- Add button on Sources (step 8): expected it to work. It was disabled.

## Moments of confusion
- "cv.md in the data directory" and "portals.yml": file names and folders I would not know about. I do not know where the data directory is.
- The Sources note says "add a company to create one" while the Add button is disabled. Contradictory.
- No first-run guidance. I could not tell if I was missing a step or the app was broken.
- Skills page wants a CV and postings. It has no link to where to get either.

## Problems I would report
### P3-T1-01: No way to give the app my CV
- **Severity (my guess):** 4
- **Where:** Pipeline ("No cv.md in the data directory yet"), CV Studio, Skills ("CV: no cv.md found")
- **What I expected vs what happened:** Expected a paste or upload box for my CV. Three screens say it is missing; none offers a way to add it. CV Studio only shows a fictional sample.
- **Evidence:** app/ux/runs/P3-T1/step-01.png, step-03.png, step-16.png

### P3-T1-02: "Add" for companies is disabled with no explanation, contradicting the message beside it
- **Severity (my guess):** 4
- **Where:** Sources, "Tracked companies (0)" and "Job boards (0)" Add buttons; note "portals-missing: ... add a company to create one"
- **What I expected vs what happened:** Expected to add Kestrel Media by its Greenhouse URL. The button is greyed out, and the note tells me to use it. No tooltip or reason.
- **Evidence:** app/ux/runs/P3-T1/step-10.png, step-12.png

### P3-T1-03: No first-run onboarding
- **Severity (my guess):** 3
- **Where:** Pipeline page on first open
- **What I expected vs what happened:** Expected a "get started" checklist (add CV, add a company, scan). Got a dense page of controls, plus the "0 applications" counter.
- **Evidence:** app/ux/runs/P3-T1/step-01.png

### P3-T1-04: Developer vocabulary in user-facing messages
- **Severity (my guess):** 2
- **Where:** "data directory", "cv.md", "portals.yml", "tracker-missing", "portals-missing"
- **What I expected vs what happened:** Expected plain words such as "Your CV" and "Companies to watch". Got file names and codes.
- **Evidence:** app/ux/runs/P3-T1/step-08.png, step-12.png
