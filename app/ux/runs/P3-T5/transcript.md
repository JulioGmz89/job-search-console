# P3-T5: transcript

- **Persona:** Alex Rivera
- **Goal:** "You have been using this app for a few weeks. Your recruiter screen with Granite Cloud for the Software Engineer, Payments role is booked, and the recruiter asked for a CV tailored to that role and a cover letter. Get both ready; you will send them yourself."
- **Steps used:** about 32 of 50 (counting snapshots, screenshots and two failed clicks)
- **Outcome (my judgment):** partly succeeded. Both files were made and the app reported success. I could only see that they exist; I could not read either one or find a download or file location, so I cannot say the letter sounds direct or that it uses my answers.
- **Single Ease Question:** 5/7: The Pipeline row had the right buttons and the letter form was clear, but I never found where the files are saved and I could not check what the letter says.

## Steps
| # | Thinking aloud | Action | What happened | Screenshot |
|---|---|---|---|---|
| 1 | Open the app and find the Granite Cloud Payments job. | Navigate to the URL | Pipeline table with 40 rows. Row 6, Granite Cloud, Software Engineer, Payments, 4.1, status "Responded", has an empty circle in the PDF column. Header says "6 PDFs". | step-01.png |
| 2 | An empty circle probably means no CV yet. The "PDF" button should make a tailored one. | Click "PDF" on row 6 | A toast says "PDF for Granite Cloud started". Nothing says what "PDF" means (tailored or generic). | step-03.png |
| 3 | Give it a few seconds. | Wait 8s | The circle became filled and the header went to "7 PDFs". The toast was gone and the button now reads "PDF ↻". | step-05.png |
| 4 | Next, the letter. I expect questions. | Click "Cover" on row 6 | A panel, "Cover letter for Granite Cloud", asks four questions: A why this role, B what problem, C how you'd approach it, D tone. Its text says the app "refuses to draft" until I answer. | step-08.png |
| 5 | My answers match A, B and C. I want a direct tone. | Fill A, B, C and pick "Direct" | Fields filled and "Draft and render the letter" became enabled. | none |
| 6 | Submit. | Click "Draft and render the letter" | It jumped to the Runs screen. The run showed "Finished" in 0:08 with "Cover letter rendered: output/cover-granitecloud-006.pdf". | step-12.png |
| 7 | I need to see the actual CV and letter. | Back to Pipeline, click the Granite Cloud row | A detail panel opened with Report, PDF and Cover letter tabs. | step-15.png |
| 8 | Check the CV for screening software. | Click "PDF" tab | A banner says "ATS check passed · score 85/100", with the PDF in a frame below. | step-17.png |
| 9 | Check the letter. | Click "Cover letter" tab | A frame appeared. I cannot confirm what it says. | step-19.png |

Closing line for a friend: "The app made me a tailored CV for the Granite Cloud payments role and a direct-tone cover letter from my three answers. It said the CV passed a screening-software check at 85/100. I haven't yet read the letter or found where the files are saved, so I'd open them before sending."

## Wrong turns
- Two of my own clicks failed because of how I targeted the buttons, not because of the app. No wrong turns in the app itself.

## Moments of confusion
- After clicking "PDF", the only feedback was a small toast that disappeared. I was not sure it had finished until I saw the circle fill and the count change.
- "PDF" does not say it is tailored to this job. I only found that out from the Runs list ("Granite Cloud · report 006 · standard template").
- The run said "output/cover-granitecloud-006.pdf", a folder path. I do not know where that is on my computer and I could not find a download or open-in-folder button.
- The run log lines ("Reading the instructions…", "Looking at the posting…") finished in 1 second, and the log shows a cost, "$0.05". I did not know what that cost meant for me.
- The CV is a "standard template". I wanted a CV that reads like me, and nothing here told me whether the CV had been rewritten for this role or only re-labelled.
- The report says CV gaps (Java, Datadog, Terraform, Python), and the CV does not mention those. I could not tell whether the CV is honest about them.
- The ATS result is a single number, 85/100, with no list of what lost points.

## Problems I would report
### P3-T5-01: No way to download or locate the finished CV and letter
- **Severity (my guess):** 3
- **Where:** Runs screen, "Cover letter rendered: output/cover-granitecloud-006.pdf", and the PDF and Cover letter tabs
- **What I expected vs what happened:** I expected a Download or Open button, since I will send these myself. I only saw a folder path and an embedded frame.
- **Evidence:** app/ux/runs/P3-T5/step-12.png, step-17.png

### P3-T5-02: Little feedback while the PDF is being made
- **Severity (my guess):** 2
- **Where:** Pipeline row 6 after clicking "PDF"
- **What I expected vs what happened:** Only a short toast, "PDF for Granite Cloud started". No sign of progress and no "done" message. I had to notice the circle fill.
- **Evidence:** app/ux/runs/P3-T5/step-03.png, step-05.png

### P3-T5-03: Button labels do not say what they make
- **Severity (my guess):** 2
- **Where:** "PDF" and "Cover" in the row, and "PDF ↻" afterwards
- **What I expected vs what happened:** "PDF" does not say it is a CV tailored to this job. "PDF ↻" is a symbol I had to guess means redo.
- **Evidence:** app/ux/runs/P3-T5/step-01.png

### P3-T5-04: ATS result has no detail, and I could not read the PDFs
- **Severity (my guess):** 2
- **Where:** PDF tab, banner "✓ ATS check passed · score 85/100"
- **What I expected vs what happened:** I wanted to know what lost the other 15 points. A pass with only a number is hard to trust. The PDFs are in a frame, and in my session I could not read them.
- **Evidence:** app/ux/runs/P3-T5/step-17.png, step-19.png

### P3-T5-05: Run log shows internal wording and a cost
- **Severity (my guess):** 1
- **Where:** Runs screen, log for "Cover letter for Granite Cloud"
- **What I expected vs what happened:** I saw "Prompt: language + modes/_profile.md…", "3 tools", "$0.05". I would not know what these mean.
- **Evidence:** app/ux/runs/P3-T5/step-12.png
