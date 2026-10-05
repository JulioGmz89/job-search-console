# P2-T5: transcript

- **Persona:** Alex Rivera
- **Goal:** "You have been using this app for a few weeks. Your recruiter screen with Granite Cloud for the Software Engineer, Payments role is booked, and the recruiter asked for a CV tailored to that role and a cover letter. Get both ready; you will send them yourself."
- **Steps used:** 17 of 50
- **Outcome (my judgment):** partly succeeded. Both documents were generated and shown as finished, but I never found a way to download them or see the file in a folder. I also could not read the PDF contents in the preview, so I cannot say what the letter says.
- **Single Ease Question:** 5/7: Finding the right row and buttons was easy, but I could not tell where my two files ended up or how to get them into an email.

## Steps
| # | Thinking aloud | Action | What happened | Screenshot |
|---|---|---|---|---|
| 1 | Open the app, look for Granite Cloud. | Navigate to URL | Pipeline table of 40 applications. Granite Cloud, Software Engineer, Payments is row 6, score 4.1, status Responded. | step-01.png |
| 2 | That row has "PDF" and "Cover" buttons, so I will start with the CV. | Click "PDF" on that row | Small toast "PDF for Granite Cloud started" with "Open log". No progress bar. | step-03.png |
| 3 | Wait and see whether it did anything. | Wait 20s | Header went from "6 PDFs" to "7 PDFs" and the row's dot went from empty to filled, with "PDF ↻". That is how I knew it worked. | step-05.png |
| 4 | Now the letter. | Click "Cover" on the same row | A form with four questions (A to D) opened on top of the table. | step-07.png |
| 5 | These are the answers I was told to give. | Fill A, B, C; choose "Direct" tone (counted as 4 actions) | Draft button became enabled. | step-09.png |
| 6 | Submit. | Click "Draft and render the letter" | Jumped to the Runs page, showing the log live. | step-11.png |
| 7 | Wait for it. | Wait 15s | "Finished" in 0:08. Log said "Cover letter rendered: output/cover-granitecloud-006.pdf". Cost line "$0.05". Finished list showed four runs, including the CV one. | step-11.png |
| 8 | Where is the file? Go back to the table. | Click Pipeline | Back to the table. | none |
| 9 | Click the row to look for the files. | Click the row | A side panel opened: Report, PDF, Cover letter tabs. | step-14.png, step-17.png |
| 10 | Check the CV. | Click "PDF" tab | "ATS check passed, score 85/100" and an embedded preview area. I could not read the preview. | step-19.png |
| 11 | Check the letter. | Click "Cover letter" tab | An embedded preview area, no text visible to me. No download or "open file" control that I could see. | step-21.png |

What I would tell a friend: "Both are made. The app says the CV passed its ATS check at 85 out of 100, and the cover letter finished in 8 seconds with a direct tone. They are previewed in the side panel, but I could not find a download button. The only sign of where they live is a path in the log, output/cover-granitecloud-006.pdf, so I would have to dig through folders to attach them. I would also like to read the letter before sending it, and I could not confirm it sounds right."

## Wrong turns
None significant. I went to the Runs page only because the app took me there.

## Moments of confusion
- After clicking PDF, the toast only said "started". There was no sign of progress or a finished message. I only knew it worked because the header count and the dot changed.
- The CV button said "PDF" and gave me no choice of what the CV should emphasise. I did not know if it was tailored to this role. The run name said "standard template".
- After the letter finished I had no obvious "download" or "open" button. The path in the log is a folder path on my computer.
- The log said "Claude finished in 1s" but the run time was 0:08. Minor, but confusing.
- I do not know what "ATS check", "report 006" or "lane" mean.

## Problems I would report
### P2-T5-01: No way to download or open the finished CV and letter
- **Severity (my guess):** 3
- **Where:** Side panel tabs "PDF" and "Cover letter", and the Runs log
- **What I expected vs what happened:** I expected a Download or Open button next to each document so I could attach them to an email. I only saw an embedded preview and a file path in the log.
- **Evidence:** app/ux/runs/P2-T5/step-21.png, step-11.png

### P2-T5-02: PDF start gives weak feedback
- **Severity (my guess):** 2
- **Where:** Toast "PDF for Granite Cloud started" after clicking "PDF"
- **What I expected vs what happened:** I expected to be told when it finished and where to find the result. The toast gave only "started". The only completion signals were the header count and a dot.
- **Evidence:** app/ux/runs/P2-T5/step-03.png, step-05.png

### P2-T5-03: Cannot tell that the CV is tailored to this role
- **Severity (my guess):** 2
- **Where:** "PDF" button and the Runs entry "Render cv-candidate-granitecloud · standard"
- **What I expected vs what happened:** The recruiter asked for a tailored CV. The app does not say what was changed for this role; the run name only says "standard template".
- **Evidence:** app/ux/runs/P2-T5/step-11.png

### P2-T5-04: The letter form is clear, but the tone default hides the right choice
- **Severity (my guess):** 1
- **Where:** Question D, Tone, defaulted to "Mirror the posting"
- **What I expected vs what happened:** Fine once I read the options. A first-time user may not notice the default.
- **Evidence:** app/ux/runs/P2-T5/step-09.png
