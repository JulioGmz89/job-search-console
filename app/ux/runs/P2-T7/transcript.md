# P2-T7: transcript

- **Persona:** Alex Rivera
- **Goal:** "You have been using this app for a few weeks. You suspect your CV looks like everyone else's. Give it a different design that you like, make that the design for every CV the app produces from now on, and produce the version you would send to Cobalt Freight for the Staff Software Engineer job. Before you finish, make sure the automated screening systems companies use can still read it properly."
- **Steps used:** 10 of 40
- **Outcome (my judgment):** partly succeeded
- **Single Ease Question:** 4/7: Picking a theme and seeing the ATS check was easy, but I could not tell whether it became the design for every future CV, and the Cobalt CV I rendered may not be the Staff Software Engineer one.

## Steps
| # | Thinking aloud | Action | What happened | Screenshot |
|---|---|---|---|---|
| 1 | Open the app. | Navigate to URL | Pipeline table. 40 applications. Cobalt Freight has several rows. Staff Software Engineer is #12. | step-01.png |
| 2 | CV design sounds like "CV Studio". | Click CV Studio | Page with "Look — style tokens" and a Themes list. My current theme is "broken (yours)", marked "ATS fail · 11 critical". The red box says the name, email and headings are missing from the PDF text. A CV selector defaults to Report 012 Cobalt Freight. | step-02.png |
| 3 | I want something different that is ATS-safe. Executive says "ATS pass". | Click Executive | Preview re-rendered in 421 ms with no agent call. "ATS check passed, score 90/100, 100% keywords, 2 pages". | step-03.png |
| 4 | There's one advisory note. What is it? | Open "1 advisory note" | Warning about non-standard fonts (DM Sans, Space Grotesk, and others). It is only advisory. I don't know whether I should change the fonts. | step-04.png |
| 5 | Hopefully this saves and renders. | Click "Save & render this CV" | The log showed Finished in 0:02: fact check passed, PDF generated, 2 pages, "ATS check: pass (score 90, keywords 100%, 2 page(s))". The button then went back to "Render this CV". The "Saved." text and the disabled "Save as default" button did not change. | step-05.png |
| 6 | Does this apply to every future CV? | Open the "what each changes" help | It explains content, look, voice and ATS. It does not say whether the chosen theme becomes the default. | (none) |
| 7 | Check that it stuck. | Navigate to the same #/cv URL | Executive still shows as selected. The hash-only change probably did not reload the page, so this proves nothing. | step-07.png |

I stopped here. What I would tell a friend: I switched my CV from my broken custom theme to the Executive theme, which passed the ATS check (90/100, all keywords readable, 2 pages). I rendered the Cobalt Freight CV in it, and that render passed the ATS check too. But I cannot promise that every future CV will use this design, because "Save as default" stayed greyed out and nothing told me the theme was saved. I also never confirmed that this Cobalt CV (report 012) is the Staff Software Engineer one, because the picker only shows report numbers and file names. It runs to two pages, and the fonts note is unresolved.

## Wrong turns
None. I did not look at the Pipeline "PDF ↻" buttons or at the Cobalt rows beyond identifying #12.

## Moments of confusion
- After clicking Executive, the "Save as default" button stayed greyed out and the status said "Saved." I did not know whether the theme itself was saved or only the style tokens.
- The button said "Save & render this CV" and then "Render this CV". I could not tell what "Save" covered.
- "Re-render all in this theme" looks like the way to apply the design to everything. I did not click it because it might overwrite every CV, and the page does not explain it.
- The CV picker shows "Report 012 · cv-alex-rivera-cobaltfreight-012". It does not name the job, so I could not confirm that is the Staff Software Engineer role. The pipeline lists two other Cobalt Freight roles that have reports (#2 and #22).
- The page leaks developer terms: "style tokens", "Tier 1", "voice-dna.md", and a temp-folder path.
- The font advisory is hard to read: a long list that includes `var(--font-family)`.
- The page is 2 pages and A4 for a US job. I did not know whether that matters.

## Problems I would report
### P2-T7-01: Unclear whether the chosen theme becomes the default for all future CVs
- **Severity (my guess):** 3
- **Where:** CV Studio, Themes list, "Save & render this CV", the disabled "Save as default" button, and the "Saved." text
- **What I expected vs what happened:** I expected a clear "Executive is now your default" message. The theme click seemed to be remembered, but the save button stayed disabled and no message confirmed it. The help does not say.
- **Evidence:** app/ux/runs/P2-T7/step-05.png, step-07.png

### P2-T7-02: The CV picker does not say which job each CV is for
- **Severity (my guess):** 2
- **Where:** CV dropdown, "Report 012 · cv-alex-rivera-cobaltfreight-012"
- **What I expected vs what happened:** I expected "Cobalt Freight, Staff Software Engineer". I got a report number and a file name, so I had to guess that #12 is the right job.
- **Evidence:** app/ux/runs/P2-T7/step-02.png

### P2-T7-03: Render button wording is confusing, and "Re-render all" is unexplained
- **Severity (my guess):** 2
- **Where:** "Save & render this CV" turned into "Render this CV"; "Re-render all in this theme"
- **What I expected vs what happened:** I expected the button to say what it saves and whether it affects only this CV. It does not. I also could not tell whether "Re-render all" would overwrite my past CVs.
- **Evidence:** app/ux/runs/P2-T7/step-05.png

### P2-T7-04: Developer jargon and a hard-to-read font advisory
- **Severity (my guess):** 1
- **Where:** "style tokens", the render log, and the advisory note with `var(--font-family)`
- **What I expected vs what happened:** I expected a plain "fonts: fine / change this". I got a raw list of font names and a long technical log.
- **Evidence:** app/ux/runs/P2-T7/step-04.png

### P2-T7-05: My existing custom theme "broken" failed the ATS check, and it was the one used for my CVs
- **Severity (my guess):** 2 (good that it was visible)
- **Where:** Themes list, "broken yours: ATS fail · 11 critical" and the red alert
- **What I expected vs what happened:** None of this was a surprise from the app side, but I had not noticed my CVs were failing. The page told me clearly in red, which was useful. Nothing on the Pipeline page warned me.
- **Evidence:** app/ux/runs/P2-T7/step-02.png
