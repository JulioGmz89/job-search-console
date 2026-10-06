# P1-T4: transcript

- **Persona:** Alex Rivera
- **Goal:** "You have been using this app for a few weeks. It is Monday morning. Check whether any new openings have appeared at the companies you follow since you last looked. Tell me how many new ones there are, which ones, and whether anything went wrong while checking."
- **Steps used:** 5 of 40 (navigate, Sources, Scan now, wait, snapshot; plus screenshots/snapshots)
- **Outcome (my judgment):** succeeded
- **Single Ease Question:** 6/7: "Sources" then "Scan now" was quick, and the result panel gave counts, names and the warning; the nav label "Sources" is not what I called it and the result panel is raw terminal text.

## Steps
| # | Thinking aloud | Action | What happened | Screenshot |
|---|---|---|---|---|
| 1 | Open the app, look for the scan command. | navigate to URL | Pipeline tab: my 40 applications. Nothing obviously says "scan". Tabs: Pipeline, Sources, Skills, Runs, CV Studio. | step-01.png |
| 2 | "Companies I follow" is probably Sources. | click Sources | Page with a "Scan now" button, options (Preview only, verify live, only this company, last N days), 12 tracked companies. Banner: 13 URLs waiting, last scan 2026-09-24: 83 found, 18 added. | step-02.png |
| 3 | That's the scan command. Fastest control first, no options. | click Scan now | Panel "Scan portals" appeared. Finished almost immediately (0:00). | step-03.png |
| 4 | Read the result. | wait 5s, look at panel | Companies scanned 11, found 80, 6 filtered by title, 70 duplicates, 4 new added. New: Driftwood Analytics, Site Reliability Engineer, Remote (Americas); Harbor Learning, Full Stack Engineer, Remote (Americas); Lumen Grid, Platform Engineer, Remote (US) EST overlap; Mosaic Retail, Platform Engineer, Remote (Americas). Warning: 1 target unreachable (slug?): Juniper Mobility. Inbox count went 13 to 17; "last scan 2026-10-05". | step-04.png |

Friend summary: "Scan found 4 new openings: Driftwood Analytics SRE, Harbor Learning Full Stack, Lumen Grid Platform Engineer (Remote US, EST overlap), Mosaic Retail Platform Engineer. One thing went wrong: Juniper Mobility's board was not found (it already showed 'board not found' in the list), so it was not checked. Kestrel Media is paused, so it was skipped on purpose. They went into the inbox (now 17 waiting), not evaluated yet."

## Wrong turns
None.

## Moments of confusion
- "Sources" was a guess for where scanning lives; no tab says "scan".
- Panel says "Scanning 11 companies; 0 local parser; 0 skipped — no provider matched via providers": jargon, and "0 skipped" sits oddly next to a paused company.
- The panel says to "run: node verify-portals.mjs" and "Run /career-ops pipeline", terminal advice that does not apply in this app. The Maintenance buttons "Validate sources" / "Probe sources" on Pipeline might be the equivalent, but I did not try.
- Last-scan line says 2026-10-05 while the panel header says 2026-10-04 (date mismatch, probably time zone).
- The results panel shows a temp-folder path for saved files, which is noise.

## Problems I would report
### P1-T4-01: Scan result is raw terminal output with CLI instructions
- **Severity (my guess):** 2
- **Where:** "Scan portals" panel after Scan now
- **What I expected vs what happened:** Expected a short summary (4 new, 1 problem). Got the full CLI text including "run: node verify-portals.mjs", "/career-ops pipeline", a Discord link and a file path.
- **Evidence:** app/ux/runs/P1-T4/step-04.png

### P1-T4-02: The failure (Juniper Mobility) is one warning line in the middle of a log
- **Severity (my guess):** 2
- **Where:** result panel, line starting with the warning sign
- **What I expected vs what happened:** Expected the problem to stand out and link to a fix. It is the same style as other lines and the suggested fix is a terminal command.
- **Evidence:** app/ux/runs/P1-T4/step-04.png

### P1-T4-03: New openings are not marked in the inbox or visibly linked from the result
- **Severity (my guess):** 1
- **Where:** below the panel, "17 URL(s) waiting to be evaluated"
- **What I expected vs what happened:** Wanted a way to go straight to the 4 new ones. Only a total (13 to 17) is shown. I did not open the inbox.
- **Evidence:** app/ux/runs/P1-T4/step-04.png

### P1-T4-04: Date mismatch between panel (2026-10-04) and last-scan line (2026-10-05)
- **Severity (my guess):** 1
- **Where:** panel header vs line under it
- **Evidence:** app/ux/runs/P1-T4/step-04.png

Note: I could not view the screenshot images directly; findings come from the page text.
