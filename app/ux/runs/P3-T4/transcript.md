# P3-T4: transcript

- **Persona:** Alex Rivera
- **Goal:** "You have been using this app for a few weeks. It is Monday morning. Check whether any new openings have appeared at the companies you follow since you last looked. Tell me how many new ones there are, which ones, and whether anything went wrong while checking."
- **Steps used:** 12 of 40
- **Outcome (my judgment):** succeeded (with caveats about how legible the result is)
- **Single Ease Question:** 6/7: "Sources" and "Scan now" were easy to find and the result was complete, but the finished scan report was only in a text log that I had to dig for.

## Steps
| # | Thinking aloud | Action | What happened | Screenshot |
|---|---|---|---|---|
| 1 | Open the app and see where "companies I follow" might live. | Navigate to URL | Pipeline table of 40 applications. No sign of new openings. | step-01.png |
| 2 | "Companies I follow" sounds like Sources. | Click Sources | Tracked companies (12), "Scan now" button, and "17 URL(s) waiting to be evaluated · last scan 2026-09-24: 83 found, 18 added". Juniper Mobility "board not found", Kestrel Media paused. | step-02.png |
| 3 | Check for new openings means a scan. Click Scan now with default options. | Click Scan now | A scan panel appeared and finished almost instantly. | step-04.png, step-05.png |
| 4 | Read the result. | Waited 5s, read panel | "Scanning 11 companies... Total jobs found: 80, Filtered by title: 6 removed, Duplicates: 70 skipped, New offers added: 4". Warning: "1 target(s) unreachable (slug?): Juniper Mobility - run: node verify-portals.mjs". New: Driftwood Analytics SRE (Remote Americas); Harbor Learning Full Stack Engineer (Remote Americas); Lumen Grid Platform Engineer (Remote US, EST overlap); Mosaic Retail Platform Engineer (Remote Americas). Summary line now "last scan 2026-10-05: 80 found, 4 added, 70 duplicate(s)", waiting count 13 -> 17. | step-05.png |

**What I would tell a friend:** I scanned my 11 active companies and found 4 new openings: Site Reliability Engineer at Driftwood Analytics, Full Stack Engineer at Harbor Learning, Platform Engineer at Lumen Grid, and Platform Engineer at Mosaic Retail. The Platform Engineer ones fit my move. One thing went wrong: Juniper Mobility could not be reached (its board was not found), so I know nothing about them. Kestrel Media is paused on purpose. The 4 new ones are waiting, not yet evaluated.

## Wrong turns
None. I did not open Skills, Runs or Pipeline after the scan.

## Moments of confusion
- The page was a bit wider than the task: I was not sure if clicking Scan now would change my data. It did (added 4 to the waiting list), without asking.
- Dates: the report says 2026-10-04 in its heading but the summary line says 2026-10-05.
- The message "run: node verify-portals.mjs" and "Run /career-ops pipeline" mean nothing to me; I cannot run those. The Discord link and a temp file path are noise.
- "0 local parser; 0 skipped - no provider matched via providers" is jargon.
- 12 companies tracked but "Scanning 11" is only explained if I notice Kestrel is unticked.
- The 4 new offers are not clickable/listed in the inbox summary from the screen I saw; I did not open "Show the inbox" to check they appear there.

## Problems I would report
### P3-T4-01: Scan result is raw terminal text with commands I cannot run
- **Severity (my guess):** 2
- **Where:** Scan portals panel after "Scan now"
- **What I expected vs what happened:** I expected a plain summary ("4 new, 1 problem") with the new roles as a list. I got a console log with a path to a temp file, "run: node verify-portals.mjs", "/career-ops pipeline" and a Discord link.
- **Evidence:** app/ux/runs/P3-T4/step-05.png

### P3-T4-02: The problem (Juniper Mobility unreachable) is buried as one log line
- **Severity (my guess):** 2
- **Where:** The warning line in the scan panel; the Tracked companies table says "board not found" under "Last seen"
- **What I expected vs what happened:** I wanted the failure clearly marked, with what to do. It is a small warning line with a "slug?" hint and no button to fix it. The "Last seen" column holds a status, not a date.
- **Evidence:** app/ux/runs/P3-T4/step-05.png, step-02.png

### P3-T4-03: Scan starts changing data with no confirmation; panel is easy to miss and finishes instantly
- **Severity (my guess):** 1
- **Where:** "Scan now" next to a "Preview only" checkbox
- **What I expected vs what happened:** Clicking Scan now added 4 items to the waiting list immediately. The panel appeared collapsed in my first look and time showed 0:00.
- **Evidence:** app/ux/runs/P3-T4/step-04.png

### P3-T4-04: Inconsistent dates and counts
- **Severity (my guess):** 1
- **Where:** Report heading "Portal Scan - 2026-10-04" vs "last scan 2026-10-05"; 12 companies vs "11 scanned"
- **What I expected vs what happened:** One date and a stated reason for the missing company.
- **Evidence:** app/ux/runs/P3-T4/step-05.png
