# P3-T7: transcript

- **Persona:** Alex Rivera
- **Goal:** "You have been using this app for a few weeks. You suspect your CV looks like everyone else's. Give it a different design that you like, make that the design for every CV the app produces from now on, and produce the version you would send to Cobalt Freight for the Staff Software Engineer job. Before you finish, make sure the automated screening systems companies use can still read it properly."
- **Steps used:** 7 of 40
- **Outcome (my judgment):** succeeded
- **Single Ease Question:** 6/7: The home page pointed straight at the design problem and the design list showed a pass/fail label on each design. I lost a point because I never looked at the Executive CV itself in the preview and because "Make this my design" and "Lay out again" are two separate steps.

## Steps
| # | Thinking aloud | Action | What happened | Screenshot |
|---|---|---|---|---|
| 1 | Let me see what the app shows first. | Navigate to the URL | Today page. A card says "Your CV design fails the screening check" (missing email, table layout), with a link "Choose a design that passes". | step-01.png |
| 2 | That is exactly my worry: will a recruiter's system read this? I'll follow the link. | Click "Choose a design that passes" | Opened My CV > Design. My current design, "broken", is flagged "Screening problems". Every other design carries a plain label such as "Readable by screening systems". | step-02.png |
| 3 | I want to see it on the Cobalt Freight job, not on some other one. | Select "Cobalt Freight — Staff Software Engineer" in "Preview with" | The preview switched to the Cobalt CV. | (none) |
| 4 | Executive sounds different from the usual template and is labelled readable. Trying it. | Click "Executive" | Preview updated: "Readable by screening systems. Your name, headings and keywords come out in order." The page says "Unsaved changes: the preview shows them; your CVs don't use them until you make this your design." | step-03.png |
| 5 | Make it the default for everything from now on. | Click "Make this my design for every CV" | Message: "Executive is now your design for every new CV." The button greyed out. | step-05.png |
| 6 | The Cobalt CV itself still needs to be made in this design. | Click "Lay out this CV again in Executive" | "Laid out again Oct 7 in executive: Readable by screening systems." plus a link "Open the job's documents". | step-06.png |
| 7 | Let me check the job really has the new CV. | Click "Open the job's documents" | Cobalt Freight page. Tailored CV "Ready", "Executive design", "Screening check: readable by screening systems", with Open and Download links. | step-08.png |

I did not use "Update existing CVs to this design (6)", because it would change the other five jobs too, which I did not ask for.

Tell a friend: Yes, it worked. The app told me my old design would lose my email when screening software read it. I switched to the Executive design, made it my default, and re-laid out the Cobalt Freight Staff Software Engineer CV. It now says "readable by screening systems" and I can download the PDF. The wording is unchanged and no AI was used. I did not look closely at how the Executive design looks on the page, so I would open the PDF once before sending it.

## Wrong turns
None.

## Moments of confusion
- "Make this my design for every CV" only applies to new CVs. Existing ones need a different button, "Update existing CVs to this design (6)". Without the success message I would not have known that.
- The preview "Up to date · 2 pages" for Executive is a little longer than the 1 page of the old design. I did not know whether that matters.
- A note on the Cobalt page's Documents card says "Make it again" rewrites the CV with AI (3 min). I was unsure how that differs from "Lay out again", and I avoided it.

## Problems I would report
### P3-T7-01: Setting the design and re-making the Cobalt CV are separate steps
- **Severity (my guess):** 1
- **Where:** My CV > Design, buttons "Make this my design for every CV", "Update existing CVs to this design (6)" and "Lay out this CV again in Executive"
- **What I expected vs what happened:** I expected choosing a design as my default to also produce the Cobalt CV in it. I had to find the "Lay out again" link at the bottom, and the previous button text does not tell you the existing CVs stay as they are.
- **Evidence:** app/ux/m8/runs/P3-T7/step-05.png

### P3-T7-02: The screening check says "readable" but shows little evidence
- **Severity (my guess):** 1
- **Where:** The "Readable by screening systems" message and its collapsed "Details"
- **What I expected vs what happened:** I wanted to see what was checked ("says who?"). I only saw a one-line verdict and did not open Details.
- **Evidence:** app/ux/m8/runs/P3-T7/step-03.png
