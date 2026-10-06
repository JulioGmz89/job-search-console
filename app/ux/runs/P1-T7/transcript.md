# P1-T7: transcript

- **Persona:** Alex Rivera
- **Goal:** "You have been using this app for a few weeks. You suspect your CV looks like everyone else's. Give it a different design that you like, make that the design for every CV the app produces from now on, and produce the version you would send to Cobalt Freight for the Staff Software Engineer job. Before you finish, make sure the automated screening systems companies use can still read it properly."
- **Steps used:** 7 of 40 (navigate, CV Studio, Executive, Save as default, Render, advisory note, plus snapshots/screenshots not counted)
- **Outcome (my judgment):** partly succeeded. A PDF was made and the ATS check passed, but I never looked at the design myself and I am not sure "Save as default" covers the theme.
- **Single Ease Question:** 5/7: CV Studio and the ATS badges were obvious, but I could not tell what "default" saved, and I could not actually see the preview.

## Steps
| # | Thinking aloud | Action | What happened | Screenshot |
|---|---|---|---|---|
| 1 | Where do I start? | Open the URL | Pipeline table. Cobalt Freight Staff Software Engineer is row 12, score 4.2. | step-01 |
| 2 | CV design must be in "CV Studio". | Click CV Studio | Report 012 (Cobalt Freight) preselected. Themes list. My current theme "broken (yours)" shows ATS fail, 11 critical. Nothing was said about this on the Pipeline page. | step-02 |
| 3 | Pick one marked ATS pass; Executive sounds different. | Click Executive | Preview re-rendered, "ATS check passed, 90/100, 2 pages". Button became "Save & render this CV". "Unsaved changes". | step-03, step-04 |
| 4 | I want this for every CV, so "Save as default". | Click Save as default | Text said "Saved." Button went back to "Render this CV". I was not told the theme became the default for all future CVs. | (none) |
| 5 | Now make the Cobalt PDF. | Click Render this CV | Finished in 0:02. Log: theme executive, PDF generated, 2 pages, fact check passed, ATS pass 90. | step-05 |
| 6 | Check the ATS note. | Open "1 advisory note" | Only a font advisory (DM Sans, Space Grotesk not standard). | step-06 |
| 7 | Done. | n/a | | |

Tell a friend: I switched my CV from my own broken theme (it failed ATS) to Executive, saved it as default, and rendered the Cobalt Freight Staff SWE PDF. ATS check passed 90/100, 100% keywords readable, but it is 2 pages and there is a font advisory. I did not open the PDF to check it, and I'm not certain every future CV will use Executive.

## Wrong turns
None significant.

## Moments of confusion
- After "Save as default" I could not tell whether the theme or only the style tokens were saved. The panel is titled "Look — style tokens" and mentions config/cv/style.yml.
- The save button changed from "Save & render this CV" to "Render this CV" without explanation.
- Style tokens (accent, DM Sans, Space Grotesk) were pre-filled and still applied on top of Executive. I did not know whether they overrode the theme's own look.
- The log warned section order diverges from cv.md ("proceeding, --allow-reorder set"). I did not ask for a reorder.
- The preview was an iframe I could not read, so I could not judge whether I liked the design.
- The log is raw JSON and temp paths.

## Problems I would report
### P1-T7-01: Unclear whether "Save as default" makes the theme the default for all CVs
- **Severity (my guess):** 3
- **Where:** "Look — style tokens" panel, "Save as default" button; Themes list.
- **What I expected vs what happened:** Expected clear confirmation like "Executive is now the default for all CVs". Got "Saved." only.
- **Evidence:** app/ux/runs/P1-T7/step-03.png, step-05.png

### P1-T7-02: My current default theme fails ATS and nothing on the Pipeline warns me
- **Severity (my guess):** 2
- **Where:** Themes list: "broken (yours) ATS fail · 11 critical".
- **What I expected vs what happened:** Expected a warning that CVs I send are unreadable by ATS; only visible once I opened CV Studio.
- **Evidence:** app/ux/runs/P1-T7/step-02.png

### P1-T7-03: Pre-set style tokens and unrequested section reorder warning
- **Severity (my guess):** 2
- **Where:** Render log: "Style applied: --accent-color, --font-family..., sections:summary>experience>...", "CV section order diverges from cv.md".
- **What I expected vs what happened:** Expected the chosen theme's own look; a reorder I did not ask for was applied.
- **Evidence:** app/ux/runs/P1-T7/step-05.png

### P1-T7-04: Executive passes ATS but is 2 pages with a font advisory; no easy way to compare designs
- **Severity (my guess):** 1
- **Where:** ATS status line and advisory note.
- **What I expected vs what happened:** Wanted a one-page, standard-font option; the passing badge hides the warning behind a collapsed note.
- **Evidence:** app/ux/runs/P1-T7/step-06.png
