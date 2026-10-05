# P3-T7: transcript

- **Persona:** Alex Rivera
- **Goal:** "You have been using this app for a few weeks. You suspect your CV looks like everyone else's. Give it a different design that you like, make that the design for every CV the app produces from now on, and produce the version you would send to Cobalt Freight for the Staff Software Engineer job. Before you finish, make sure the automated screening systems companies use can still read it properly."
- **Steps used:** 14 of 40 (counting navigations, clicks, waits, screenshots-with-actions; snapshots and screenshots not counted)
- **Outcome (my judgment):** partly succeeded. A new design (Executive) is chosen, the Cobalt Freight Staff CV (report 012) is rendered as a PDF, and the ATS check says pass 90/100. I am not fully sure that "every CV from now on" is set, and I could not actually look at the picture of the CV myself.
- **Single Ease Question:** 5/7: CV Studio was easy to find and the ATS badges on each theme were great, but I could not tell what "Save & render this CV" would save, and nothing ever told me it had become the default.

## Steps
| # | Thinking aloud | Action | What happened | Screenshot |
|---|---|---|---|---|
| 1 | Start at the given address. | Navigate | Pipeline table with 40 applications. Cobalt Freight Staff Software Engineer is row 12, score 4.2, status Evaluated. | step-01.png |
| 2 | CV design sounds like "CV Studio". | Click CV Studio | Page shows style tokens, a Themes strip, a preview, voice rules. CV 012 (Cobalt Freight) is already selected. My current theme is "broken", tagged "yours", "ATS fail, 11 critical", and a red alert says the screening software would lose part of the CV (no name, no email, no headings). | step-02.png |
| 3 | The one I use now is bad. Executive sounds distinctive and says ATS pass. | Click Executive theme | Preview re-rendered in 407 ms. "ATS check passed, score 90/100, 100% of keywords readable, 2 pages". One advisory note about non-standard fonts (DM Sans, Space Grotesk). | step-04.png, step-05.png |
| 4 | Open the advisory to see if it matters. | Click "1 advisory note" | It says prefer Arial/Calibri/Georgia etc. for reliable text extraction, but that the actual PDF text check measures it directly. Mildly worrying, unclear. | - |
| 5 | The button now says "Save & render this CV". I hope it keeps the theme and makes the PDF. | Click Save & render this CV | A render log opened, Finished in 0:02: "theme executive", fact check passed, PDF generated, 2 pages, "ATS check: pass (score 90, keywords 100%, 2 page(s))". Button changed back to "Render this CV". | step-08.png |
| 6 | Did that make Executive the default for all future CVs? Look at the help line at the bottom. | Wait 3s, reload address, open "what each changes" | Help explains content/look/voice/ATS check but does not say where the theme choice is saved or that it is the default. | step-11.png |
| 7 | Check if the choice survives leaving. | Go to Pipeline, reload, back to CV Studio | Executive is still pressed and the current PDF is now cv-alex-rivera-cobaltfreight-012-2026-10-05.pdf. So it seems remembered. | step-14.png |

**What I would tell a friend:** I swapped my CV from a theme called "broken" (which the app itself said would lose my name, email and headings in screening software) to "Executive", and rendered the Cobalt Freight Staff Software Engineer CV. The app says it passes the screening-software check at 90/100 with 100% of keywords readable, though it runs to 2 pages and warns that the fonts are not standard. The theme still shows as selected after I left and came back, so it looks like the default, but the app never said so outright and I did not see the "Re-render all" results or the cover letter. I could not view the PDF itself, so I would open it myself before sending.

## Wrong turns
None significant. I considered the "Save as default" button, which was greyed out; it appears to relate only to the style tokens (colour, fonts, margins), not the theme.

## Moments of confusion
- Step 5: the button label changed from "Render this CV" to "Save & render this CV" after I picked a theme. It does not say what is being saved or for which CVs ("this CV" vs. "every CV").
- "Save as default" (disabled) and "Save & render" are two different kinds of saving. I could not tell which one makes my design apply to every future CV.
- "Re-render all in this theme" sits right next to it; unclear whether that is the way to change future CVs or only past ones.
- The font advisory lists fonts like "dm sans, space grotesk" that came from the style tokens, not from the theme, yet it is a pass. Contradictory-sounding: "prefer Arial" yet "pass".
- The render log is full of file paths and JSON, hard for a non-developer. It also warns that the section order differs from cv.md ("proceeding, --allow-reorder set") with no explanation of whether that matters.
- The result is 2 pages; I did not know if that is fine for screening.

## Problems I would report
### P3-T7-01: Nothing confirms the theme became the default for every future CV
- **Severity (my guess):** 3
- **Where:** CV Studio, Themes strip and the "Save & render this CV" button
- **What I expected vs what happened:** I expected a clear message like "Executive is now your default for all new CVs". Instead the button only said "Save & render this CV" and the log only talks about report 012. I had to leave and return to guess it was stored.
- **Evidence:** app/ux/runs/P3-T7/step-08.png, step-14.png

### P3-T7-02: "Save as default" is disabled and appears unrelated to the theme
- **Severity (my guess):** 2
- **Where:** "Look - style tokens" panel, bottom: "Save as default", "Revert", "Saved."
- **What I expected vs what happened:** The words "default" and "Saved." made me think my design was already the default; it is greyed out and only covers tokens.
- **Evidence:** app/ux/runs/P3-T7/step-02.png

### P3-T7-03: ATS "pass" coexists with a font advisory and no plain-language verdict
- **Severity (my guess):** 2
- **Where:** ATS check passed line and the "1 advisory note" dropdown
- **What I expected vs what happened:** I wanted a plain yes or no that a recruiter system will read it. I got "passed 90/100" plus a note listing about twelve fonts and advising Arial/Georgia, and "2 pages". I do not know whether to act.
- **Evidence:** app/ux/runs/P3-T7/step-05.png

### P3-T7-04: Render log is raw developer output
- **Severity (my guess):** 1
- **Where:** Render panel "Render cv-alex-rivera-cobaltfreight-012 - executive"
- **What I expected vs what happened:** A short "Done: here is your PDF, open it". I got JSON, temp folder paths and a section-order warning, and no obvious link or button to open the PDF.
- **Evidence:** app/ux/runs/P3-T7/step-08.png

### P3-T7-05: Starting theme was ATS-failing without any prompt on the Pipeline page
- **Severity (my guess):** 2
- **Where:** Pipeline "PDF" dots show 6 PDFs made; only CV Studio reveals the current theme is "broken" with 11 critical issues.
- **What I expected vs what happened:** I would have liked a warning earlier that my existing PDFs would be unreadable by screening systems.
- **Evidence:** app/ux/runs/P3-T7/step-02.png

### P3-T7-06: Cover letter and "Re-render all" not verified
- **Severity (my guess):** 1
- **Where:** Not exercised; I only produced the CV, the goal asked for the CV.
- **What I expected vs what happened:** n/a, noted so the reader knows what I did not check.
- **Evidence:** app/ux/runs/P3-T7/step-14.png
