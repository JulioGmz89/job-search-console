# P1-T5: transcript

- **Persona:** Alex Rivera
- **Goal:** "You have been using this app for a few weeks. Your recruiter screen with Granite Cloud for the Software Engineer, Payments role is booked, and the recruiter asked for a CV tailored to that role and a cover letter. Get both ready; you will send them yourself."
- **Steps used:** 14 of 50
- **Outcome (my judgment):** succeeded (both documents show Ready with Open/Download links; I did not open the PDFs to read them)
- **Single Ease Question:** 7/7: Today listed Granite Cloud under "Waiting for you" with "no CV or letter", and each document had one obvious button.

## Steps
| # | Thinking aloud | Action | What happened | Screenshot |
|---|---|---|---|---|
| 1 | Open the app. | navigate | Today page, "Good evening, Alex", Waiting for you list | step-01.png |
| 2 | Granite Cloud is listed with "no CV or letter". Fastest route. | click that link | Job page opened at Documents | step-03.png |
| 3 | This is the pdf command. | click "Make tailored CV" | No visible change for a few seconds; still says "Not made yet" | step-05.png |
| 4 | Did it start? Check Activity. | wait 5s, click Activity | Panel: nothing running, CV done in 8 s. Page now shows CV "Ready" | step-07.png |
| 5 | Close the panel. | click Close | Closed | |
| 6 | Now the letter. | click "Write cover letter" | Form with 3 questions and Tone | step-10.png |
| 7 | Type my answers, tone Direct. | fill form | Fields filled | |
| 8 | Submit. | click "Write the letter" | Shows "Working", progress bar, "You can leave this page" | step-13.png |
| 9 | Wait. | wait 8s, wait 30s | Cover letter "Ready", cover-granitecloud-006.pdf with Open/Download | step-15.png |

Told a friend: both are done. The tailored CV is cv-alex-rivera-granitecloud-2026-10-07.pdf and the letter is cover-granitecloud-006.pdf, both under Documents on the Granite Cloud job page. I can open or download each there and send them myself.

## Wrong turns
None.

## Moments of confusion
- After clicking "Make tailored CV" nothing changed on screen. The button did not show busy, and the card still said "Not made yet". I only learned it had finished by opening Activity. (The CV took 8 s despite "About 3 min".)
- The CV says "Made Oct 6, 23:24" while its filename says 2026-10-07 and the letter says "Made Oct 7". The dates disagree.
- The letter has no on-page preview, so I could not check the tone came out Direct without opening the PDF.

## Problems I would report
### P1-T5-01: No feedback after clicking "Make tailored CV"
- **Severity (my guess):** 2
- **Where:** Documents card "Tailored CV", after "Make tailored CV"
- **What I expected vs what happened:** I expected a "Working" state like the letter shows. Nothing changed for several seconds, so I did not know if the click registered.
- **Evidence:** app/ux/m8/runs/P1-T5/step-05.png

### P1-T5-02: Inconsistent dates and a stray history entry
- **Severity (my guess):** 1
- **Where:** Documents card and History
- **What I expected vs what happened:** CV "Made Oct 6, 23:24" with a 10-07 filename, and a letter "Made Oct 7". History also gained an "Update design" entry I did not ask for.
- **Evidence:** app/ux/m8/runs/P1-T5/step-07.png
