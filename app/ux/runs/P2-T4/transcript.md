# P2-T4: transcript

- **Persona:** Alex Rivera
- **Goal:** "You have been using this app for a few weeks. It is Monday morning. Check whether any new openings have appeared at the companies you follow since you last looked. Tell me how many new ones there are, which ones, and whether anything went wrong while checking."
- **Steps used:** 5 of 40 (navigate, screenshot, click Sources, click Scan now, wait; plus screenshots/snapshots)
- **Outcome (my judgment):** succeeded
- **Single Ease Question:** 6/7: "Sources" and "Scan now" were easy to find and the result was clear, but the result panel is a raw text log with developer wording.

## Steps
| # | Thinking aloud | Action | What happened | Screenshot |
|---|---|---|---|---|
| 1 | Open the app and see what is here. | Navigate | Pipeline table with 40 applications. No obvious "new openings" button. | step-01.png |
| 2 | "Companies I follow" sounds like Sources. | Click Sources | Shows "Scan now", "13 URL(s) waiting to be evaluated", "last scan 2026-09-24", and 12 tracked companies. Juniper Mobility says "board not found", Kestrel Media is paused. | step-03.png |
| 3 | Last scan was about 10 days ago, so I'll scan now. | Click Scan now | A panel appeared and ran. | - |
| 4 | Wait a bit in case it is slow. | Wait 5s | Panel says "Finished 0:00". The summary line changed to "17 waiting, last scan 2026-10-05: 80 found, 4 added, 70 duplicates". | step-05.png, step-06.png |
| 5 | Read the result log. | Read panel | 11 companies scanned, 80 jobs found, 6 filtered by title, 70 duplicates, 4 new. A warning: 1 target unreachable (Juniper Mobility). | step-06.png |

Friend summary: "I hit Scan now on the Sources page. There are 4 new openings: Driftwood Analytics, Site Reliability Engineer (Remote Americas). Harbor Learning, Full Stack Engineer (Remote Americas). Lumen Grid, Platform Engineer (Remote US, EST overlap). Mosaic Retail, Platform Engineer (Remote Americas). One thing went wrong: Juniper Mobility could not be reached, and the scan skipped it. Kestrel Media is paused on purpose. I haven't evaluated the 4 yet; they went into a waiting list (now 17)."

## Wrong turns
None.

## Moments of confusion
- The scan says 11 companies scanned but I follow 12. Only by looking back at the list did I work out that one is paused (Kestrel) and Juniper was unreachable. The panel does not say this plainly.
- "Finished 0:00" and the instant run made me briefly doubt it really checked anything. The "last scan" line updating reassured me.
- The date in the log says 2026-10-04 while the summary says 2026-10-05.
- Unsure whether "added" meant they were saved somewhere. I assume the waiting list.

## Problems I would report
### P2-T4-01: Scan result is a raw log with developer text
- **Severity (my guess):** 2
- **Where:** Panel "Scan portals" after Scan now.
- **What I expected vs what happened:** I expected a plain "4 new jobs" list. I got lines like "0 local parser; 0 skipped — no provider matched via providers", a file path in a temp folder, "Run /career-ops pipeline", a Discord link, and decorative bars. The 4 new jobs are buried in the middle.
- **Evidence:** app/ux/runs/P2-T4/step-06.png

### P2-T4-02: Failure advice tells me to run a command-line script
- **Severity (my guess):** 2
- **Where:** Warning "1 target(s) unreachable (slug?): Juniper Mobility — run: node verify-portals.mjs"
- **What I expected vs what happened:** I expected to be told what to do in the app. I was told to run a command, and "slug" is jargon. The Sources table says "board not found" for it, but I'm not told if I should fix or remove it.
- **Evidence:** app/ux/runs/P2-T4/step-06.png

### P2-T4-03: Company count mismatch and no clear mention of the paused company
- **Severity (my guess):** 1
- **Where:** "Scanning 11 companies" vs "Tracked companies (12)".
- **What I expected vs what happened:** No explanation of why one was left out.
- **Evidence:** app/ux/runs/P2-T4/step-03.png

### P2-T4-04: Panel can be missed and the new jobs are not shown elsewhere
- **Severity (my guess):** 1
- **Where:** Sources page, "17 URL(s) waiting to be evaluated".
- **What I expected vs what happened:** The count jumped by 4 but I could not tell which of the 17 are the new ones without reading the log. The panel has a Close button and the info would be lost.
- **Evidence:** app/ux/runs/P2-T4/step-05.png
