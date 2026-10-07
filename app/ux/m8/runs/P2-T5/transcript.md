# P2-T5: transcript

- **Persona:** Alex Rivera
- **Goal:** "Your recruiter screen with Granite Cloud for the Software Engineer, Payments role is booked, and the recruiter asked for a CV tailored to that role and a cover letter. Get both ready; you will send them yourself."
- **Steps used:** 8 of 50 (navigate, 2 snapshots/screens not counted separately as actions beyond clicks; actions: navigate, click job, click Make CV, click Write cover letter, fill form, click Write the letter, 2 waits)
- **Outcome (my judgment):** succeeded (both files show Ready with Open/Download; I did not open the PDFs to read them, so the content quality is unchecked)
- **Single Ease Question:** 7/7 (1 = very difficult, 7 = very easy): Today page listed Granite Cloud as needing a CV and letter, and each button said how long it would take and showed progress.

## Steps
| # | Thinking aloud | Action | What happened | Screenshot |
|---|---|---|---|---|
| 1 | Open the app and look for Granite Cloud. | Navigate to URL | Today page; "Waiting for you" lists Granite Cloud, "They replied, no CV or letter". | step-01.png |
| 2 | That is my job; click it. | Click the Granite Cloud link | Job page with a Documents section: Tailored CV and Cover letter, both "Not made yet", with time estimates. | step-02.png |
| 3 | Make the CV first. | Click "Make tailored CV" | Status "Working", progress bar, "usually about 3 minutes, you can leave this page". Activity shows 1 working. | step-03.png |
| 4 | Start the letter while the CV runs. | Click "Write cover letter" | Three questions plus Tone appeared. CV already showed Ready (Open/Download, "readable by screening systems"). | step-04.png |
| 5 | Answer with my own words, tone Direct. | Fill the form | Fields filled, Tone = Direct. | - |
| 6 | Submit. | Click "Write the letter" | Cover letter "Working", progress bar, "about 2 minutes". | - |
| 7-8 | Wait. | Wait 10s, then 30s | Cover letter "Ready": cover-granitecloud-006.pdf with Open, Download, Write it again. | step-05.png |

Told a friend: Both documents are ready on the Granite Cloud job page: the tailored CV (cv-alex-rivera-granitecloud-2026-10-07.pdf) and a Direct-tone cover letter. I can open or download each and send them myself. I have not read them yet, so I would open both before sending.

## Wrong turns
None.

## Moments of confusion
- The CV finished in seconds although it said "about 3 min"; I briefly wondered if it was real. The "Ready" state with a file name settled it.
- The CV said "Made Oct 6, 23:53" and the letter said "Made Oct 7" with no time; the dates look inconsistent.

## Problems I would report
### P2-T5-01: Cover letter and CV timestamps are inconsistent
- **Severity (my guess):** 1
- **Where:** Documents section, "Made Oct 6, 23:53" vs "Made Oct 7"
- **What I expected vs what happened:** Same date format and day for two documents made a minute apart.
- **Evidence:** app/ux/m8/runs/P2-T5/step-05.png

### P2-T5-02: No preview of the letter text on the page
- **Severity (my guess):** 1
- **Where:** Cover letter card after Ready
- **What I expected vs what happened:** I expected to read the letter on the page; I only get Open/Download.
- **Evidence:** app/ux/m8/runs/P2-T5/step-05.png
