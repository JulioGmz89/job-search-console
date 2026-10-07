# UX backlog after M8

This file synthesises every M8 source:
- the inventory (`inventory.md`);
- 27 persona runs plus the first-job run (`runs/*/transcript.md`, judged by `verdict.md`);
- the heuristic evaluation (`heuristics/*.md`);
- the walkthroughs (`walkthroughs/*.md`);
- the accessibility passes (`a11y/manual.md`, `a11y/axe-summary.md`);
- the gate reviews, then `reviews/final.md`, then `reviews/final-recheck.md`, read in that order;
- the fix history in `git log main..63dc6ac3` (the commit bodies).

The state is after commit 63dc6ac3. R-final-02, R-recheck-01 (with the rest of R-final-06) and R-recheck-02 are closed by 63dc6ac3, verified by maintainer spot-check. The severity-1 observations in `final.md` and `final-recheck.md` are open.

This file adds no finding of its own. Every B8 item lists the source IDs it merges.

## Rules applied

- **Status.** A finding is closed when a later file shows it fixed. A finding with a fix commit but no later check is listed under "Fixed, not re-verified" and is not counted as open. A finding that a later file still observes is open, even if a commit claimed to fix it.
- **Merging.** Two findings are one when they describe the same problem in the same place. "Methods" counts the distinct methods that found it: inventory, heuristic, walkthrough, persona, a11y, review (gate or final).
- **Severity.** The same rules as the M6 backlog:
  - Start from the highest source severity.
  - A finding raised by one heuristic, walkthrough or review source that no persona hit comes down one step. The exceptions are data loss, spent money and a blocked task.
  - Later evidence outranks earlier evidence.
- **Ranking.** By severity, then by the number of affected tasks, then by the number of methods.

## Summary

| Severity | Open | IDs |
|---|---|---|
| 4 | 0 | — |
| 3 | 0 | — |
| 2 | 13 | B8-01 – B8-13 |
| 1 | 62 | B8-14 – B8-75 |
| **Total open** | **75** | |
| Fixed, not re-verified (severity 2 or lower) | 16 | V-01 – V-16 |
| Not a problem (0) | 10 | below |

**Open severity-3/4 findings: 0.** This matches the expected count, and is confirmed from the files:
- All 22 M6 findings are closed (`closure.md`).
- All 16 severity-3/4 IDs raised in M8 are closed (table below). The last ones were confirmed in `reviews/final-recheck.md` (verdict PASS, "Nothing open is severity 3 or 4") and by the 63dc6ac3 spot-check.
- No M8 source raised a severity-3/4 finding after `final-recheck.md`. `a11y/manual.md` has none at 3 or 4. The walkthroughs of T7 and T8 have none. The only walkthrough severity-3 findings, W8-T9-01 and W8-first-job-02, were re-checked and closed.

## M8-raised severity-3/4 findings, closed

| ID | Sev | Problem | Closed by | Verified in |
|---|---|---|---|---|
| R-shell-today-activity-01 | 4 | In a new workspace the first check never reached Applications, although the app said it had. | ac79824c fix(server): the first evaluation in a new workspace reaches Applications | `runs/P2-first-job/verdict.md` (tracker row 1 with a report); `walkthroughs/first-job.md`; `reviews/final.md` T1 regression |
| R-applications-jobs-01 (F-015) | 3 | A check on a tracked job overwrote the application and said "added". | 79635b29 feat(server): record what a check for new openings added, and merges; e90b31ba fix(ui): say which openings are new, and when a check updated an application | `heuristics/job.md` H8-job-01 step 4 ("Updated · Merged into your application #12 …"); `reviews/final.md` R-final-02 ("Updated") |
| R-applications-jobs-02 | 3 | After a check for new openings, no screen said which openings were new. | 79635b29; e90b31ba | `walkthroughs/T4.md` (New badges, Today names them); `a11y/manual.md` Pass 6, T4; persona T4 ×3 answer checks |
| R-skills-cv-workspace-02 | 3 | Unsaved edits to the CV, profile and rules were discarded silently. | 7e2ca07f fix(ui): warn before unsaved CV, profile and rules edits are lost | `heuristics/my-cv.md` §3 |
| H8-job-01 | 4 | "Check fit again" made the job's tailored CV disappear. | 27ce5863 fix(server): a job keeps its documents when its fit is checked again | `reviews/final.md`, Closed (`evidence/R-final-H8-job-01.png`) |
| H8-today-01 → R-final-04 | 3 | Following a careers page the app can't read declared set-up complete. | 2390d770 fix(ui): close the M8 heuristic evaluation's severity-3 findings (not closed per final.md); then 5c827a5a fix(ui): close the final review's findings | `reviews/final-recheck.md` R-final-04, Closed (`evidence/R-recheck-04-today.png`) |
| H8-today-02 → R-final-05 | 3 | "Every board answered" when no company was checked; no result on Today. | 27ce5863; 2390d770 (partly per final.md); then 5c827a5a | `reviews/final-recheck.md` R-final-05, Closed (`evidence/R-recheck-05-empty.png`, `R-recheck-05-populated.png`) |
| H8-applications-01 → R-final-02 | 3 | The row menu's "Check fit again" spent a paid check with no confirmation and no sign on the row. | 2390d770 (confirmation; partly per final.md); 5c827a5a (not closed per final-recheck.md); 63dc6ac3 fix(ui): close the re-check's severity-2 findings | Confirmation: `reviews/final.md` (`evidence/R-final-H8-applications-01.png`). Row state: maintainer spot-check of 63dc6ac3 ("Checking fit" on the row). |
| H8-job-02 → R-final-07 | 3 | Make tailored CV and Try again used a design that fails screening, with no warning. | 2390d770; 1a2f8594 fix(server): checks say what they found; Try again can skip the automatic CV; 5c827a5a | `reviews/final-recheck.md` R-final-07, Closed (`evidence/R-recheck-07-before.png`, `R-recheck-07-after.png`) |
| H8-companies-01 | 3 | After removing a company, its "board moved or closed" panel moved to the next company. | 2390d770 | `reviews/final.md`, Closed |
| H8-activity-01 → R-final-03 | 3 | Activity said "No problems found" for checks that found problems. | 2390d770; 1a2f8594; 5c827a5a | `reviews/final-recheck.md` R-final-03, Closed (`evidence/R-recheck-03.png`) |
| H8-workspace-help-02 | 3 | The duplicate merge was confirmed from a raw log. | 2390d770 | `reviews/final.md`, Closed (`evidence/R-final-H8-workspace-help-02.png`) |
| W8-T9-01 | 3 | A comma list in "Add a word" was saved as one phrase. | f72df307 fix(ui): close the M8 walkthroughs' findings so far | `walkthroughs/T9.md` re-check (`evidence/W8-T9-01-recheck.png`); `reviews/final.md` T9 |
| W8-first-job-02 | 3 | The first check's result vanished from Today. | f72df307 | `walkthroughs/first-job.md` re-check (`evidence/W8-first-job-02-recheck.png`) |

That is 16 IDs, which cover 14 distinct problems: R-final-04 and R-final-05 are the remainders of H8-today-01 and H8-today-02. M7 prototype findings at severity 3 closed during M8 are PW-A-T8-02 (`reviews/shell-today-activity.md`), WP-T6-01 and WP-T9-01 (`reviews/skills-cv-workspace.md`).

## Open findings

Columns: ID · problem · where · tasks · sources (number of methods) · severity and reason · recommendation · evidence. Screenshots are under `app/ux/m8/evidence/` unless the path says otherwise.

### Severity 2

| ID | Problem | Where | Tasks | Sources (methods) | Severity reason | Recommendation | Evidence |
|---|---|---|---|---|---|---|---|
| B8-01 | Engine bookkeeping is shown as the user's own note ("Your note: Re-eval … Superseded report [12]", "Fixture evaluation"). | Job page › Summary › "Your note" | T2, T8, first-job | H8-job-03; P2-T2-02, P3-T2-03, P2-first-job-01, plus P1-T2 confusion (2) | 2: the highest source; 3 persona runs reported a note they never wrote. The "Fixture" wording is sandbox data, but the re-check line is the real engine's. | Show only notes the user wrote. Put the engine's re-check line in History. | `H8-job-01.png`; `app/ux/m8/runs/P2-T2/step-04.png` |
| B8-02 | The screening failure is explained in checker words ("parseable", "<table> element(s)", "ATS extractors") and names the design by its id ("broken"). "No email address found" reads as an email missing from the CV. | Today › "Your CV design fails the screening check"; My CV › Design › "Screening problems" | T7 | H8-today-03, H8-my-cv-01, W8-T7-04, R-skills-cv-workspace-06 (diagnosis part); P2-T7 confusion ("broken" as a name) (4) | 2: the highest source, from four methods. | Say what the design loses, in plain words, e.g. "This design hides your email address from screening systems". Name designs as people read them. | `H8-my-cv-01.png`; `H8-today-03.png` |
| B8-03 | Adding a job by link is only on Applications. To review says links can be "saved by you" but has no field and no pointer, and Today in a populated workspace has no entry point. | To review page; Today; Applications › Add a job | T2 | W8-T2-02, WP-T2-06 (applications gate, not closed), P1-T2-01, P2-T2-01, P3-T2-02 (3) | 2: 3 of 3 T2 personas looked elsewhere first (P1-T2 wrong turn to To review; P2 and P3 on Today), at a cost of 1–2 clicks. | Let users add a link where they look for it, or point there in words from To review and Today. | `W8-T2-02.png`; `app/ux/m8/runs/P1-T2/step-01.png` |
| B8-04 | Past status changes, the applied date and status notes are never shown. Job › History does not read the status ledger. | Job page › History; Applications › Applied rows | T3 | R-applications-jobs-07 (History part); inventory C-status-log and "Capabilities with no UI surface" 2; P1-T3-01 (3) | 2: from the gate. A persona could not confirm the "yesterday" date it had just saved. | Show each status change with its date and note on the job page. | `app/ux/m8/runs/P1-T3/step-15.png` |
| B8-05 | Search lists identical results ("Job · Granite Cloud — Senior Backend Engineer" twice) with nothing to tell them apart. | Top bar › Find a job, company or document | T5 | H8-shell-02, A8-11 (search part), walkthrough T5 step 1 unranked note (3) | 2: the highest source; three methods agree. The T5 target itself is unique. | Add the application number, fit or date to each job result, as the Applications table does. | `H8-shell-02.png`; `app/ux/m8/a11y/evidence/A8-11.png` |
| B8-06 | Writing samples can only be added by dropping a file into a folder. They can't be opened from the app, and the page prints the full folder path. | My CV › Writing rules › Writing samples | T9 | H8-my-cv-03, R-skills-cv-workspace-12, R-skills-cv-workspace-06 (paths part), inventory C-writing-samples (3) | 2: the highest source, from three methods. | Let users add and open a sample in the app (paste or choose a file, as for the CV). | `H8-my-cv-03.png` |
| B8-07 | "Find the right job board for a company" is logged in Activity as "Check companies' job boards", a different tool's name. Its suggested board appears only in raw output. | Workspace › Tidy up; Activity row; announcement | T4 | H8-activity-02 (still seen in `final.md`), R-skills-cv-workspace-04 (finder part), R-skills-cv-workspace-13 (announcement), inventory K-verify-portals (3) | 2: the highest source; still observed in `final.md`. | Give each tool one name everywhere, and state the suggested board in words. | `H8-activity-01.png` |
| B8-08 | The cover-letter card gives no time or cost before opening, and its Ready state shows no time or tone. "Write it again" restarts the three answers from blank. Summary and Documents are stacked at 1280 px. | Job page › Documents › Cover letter | T5 | R-applications-jobs-08 (letter and layout parts), H8-job-04 (card part; `walkthroughs/T5.md` saw the cost inside the opened form), P1-T5 confusion (could not check the tone) (3) | 2: the gate's severity, with a persona confirming the tone gap. | State time and cost on the card, show the tone and time on the ready letter, and keep the earlier answers when writing again. | `R-applications-jobs-T5-docs.png` |
| B8-09 | Companies › "Check companies' job boards" ends with "Checked … The status beside each company above is up to date." It doesn't say which board failed. | Companies › bottom card | T4 | H8-companies-04; observed again in `final-recheck.md` R-recheck-01 (Companies) (2) | 2: the highest source. It is the Companies twin of R-final-03 (severity 2), which was fixed only in Activity. | Say what the check found ("11 boards work · Juniper Mobility: board not found · Fix"), as Activity now does. | `H8-companies-04.png` |
| B8-10 | "What jobs to keep" can only be changed by editing `portals.yml` by hand, and the text still names the file. | Companies › What jobs to keep | T1 | H8-companies-05, P1-T1 confusion; R-applications-jobs-09 (file-name part, still seen in `heuristics/companies.md`) (2) | 2: the highest source. Read-only in v1 by M7 decision D-3 (`inventory.md` C-portals-yml), so this is deferred, not a defect of the build. | Revisit after v1. Meanwhile, drop the file name from the sentence. | `H8-companies-04.png` |
| B8-11 | Design's main button is disabled with no reason while the other two stay live. "Update existing CVs (N)" keeps its count after CVs are updated or detached. | My CV › Design | T7 | H8-my-cv-02, W8-T7-02 (count part) (2) | 2: the highest source, from two methods. | Say why the main button is off ("Standard is already your design"), and keep the count current. | `H8-my-cv-02.png`; `W8-T7-02.png` |
| B8-12 | Writing rules are hard to find from the top bar. Two personas tried Skills, then Workspace, before My CV. | Top bar; My CV › Writing rules | T9 | P1-T9-01, P2-T9-02 (wrong turns in P1-T9 and P2-T9) (1) | 2: raised to the highest persona guess because 2 of 3 T9 personas took two wrong turns each. | Make "how the assistant writes" findable from where people look (search already finds "Writing rules"). | `app/ux/m8/runs/P1-T9/step-01.png`; `app/ux/m8/runs/P2-T9/step-01.png` |
| B8-13 | "Improve the analysis" starts about 4 paid sessions in one click with no confirmation. The top bar then says "4 working" while two are waiting. | Skills › basis line | T6 | H8-skills-01 (1) | 2: kept, not lowered, because it spends money (the exception to the one-source rule). | Confirm bulk paid work with its count and cost, as To review's bulk check does. | `H8-skills-01.png` |

### Severity 1

| ID | Problem | Where | Tasks | Sources (methods) | Severity reason | Recommendation | Evidence |
|---|---|---|---|---|---|---|---|
| B8-14 | Today shows only "Loading…" for about 4 s on every full load. | Today | all | H8-today-06 (1) | 1: source. | Show the ready cards first and fill in the slower ones. | `H8-today-06.png` |
| B8-15 | Six runs saw no working state in the first seconds after Make tailored CV, Make it again, Check for new openings or choosing Applied. `walkthroughs/T5.md` and `T9.md` later saw the Working card in place. | Job page › Documents; Writing rules list; Today; Applications | T3, T4, T5, T9 | P1-T5-01, P3-T5-02, P2-T9-01, P3-T9-01, P3-T4-03, P3-T3-02 (1) | 1: the persona guesses were 1–2. Not reproduced by the later walkthroughs; the persona runs came before f72df307. | Confirm that the working state appears at once wherever a run is started. | `app/ux/m8/runs/P1-T5/step-05.png` |
| B8-16 | The fit scale ("4.1 / 5", "fit 3.0 or more") is unexplained where fit appears outside the job page. | Today set-up; Skills evidence; Today result | T1, T6, T8 | P2-T1-01, P2-T6-02, P2-T8 confusion (1) | 1: source. | Link "How the fit is worked out" wherever a fit number appears. | `app/ux/m8/runs/P2-T6/step-03.png` |
| B8-17 | To review shows a check that reached no company as a plain green summary ("0 companies checked") with no reason or fix. | To review › last-check summary | T1, T4, first-job | H8-to-review-01 (remainder) (1) | 1: lowered from 2 (one source, no persona). Today, Needs you and Companies now warn (`final-recheck.md` R-final-04/05). | Name the skipped company and link Fix, as Today does. | `H8-to-review-01.png` |
| B8-18 | The Skills ranking has no list or heading structure, and two My CV sub-pages skip a heading level. | Skills views; My CV › Writing rules, Design | T6, T7, T9 | A8-10 (1) | 1: source. | Use a list for the ranking and nest the sub-page headings. | `app/ux/m8/a11y/evidence/A8-10.png` |
| B8-19 | The "Following …" done line doesn't name the board found. | Today › Get set up › "You're set up" | T1, first-job | R-shell-today-activity-05 (remainder after 91932981), `walkthroughs/T1.md` step 5, P3-T1-01 (3) | 1: the walkthrough says "nobody needs it to finish"; persona guess 1. | Say "Greenhouse job board found" on the done line. | `app/ux/m8/runs/P3-T1/step-02.png` |
| B8-20 | Dates mix local time and UTC: "Made Oct 6, 23:24" next to a "…-2026-10-07.pdf" file name, and a letter "Made Oct 7". | Job page › Documents; History; Writing rules | T5, T9 | R-applications-jobs-09 (dates part), R-skills-cv-workspace-16, P1-T5-02, P2-T5-01 (2) | 1: sources. | Use one time zone for dates and file names. | `app/ux/m8/runs/P2-T5/step-05.png` |
| B8-21 | The result card gives "Fit 4.1 / 5" but not the recommendation. | Applications › Add a job card; Today › Check your first job card | T2, first-job | `reviews/applications-jobs.md` (F-018 "one detail missing"), `walkthroughs/first-job.md` re-check nit (2) | 1: both sources call it a detail. | Add "Recommendation: Apply", as the job page does. | `R-applications-jobs-F-018.png` |
| B8-22 | "Screening check: readable by screening systems" shows no evidence on the job page. | Job page › Tailored CV; Design verdict | T5, T7 | P2-T7-02, P3-T7-02, P3-T5-03; inventory UI-cv-ats-notes ("Job cards show the verdict line but no Details") (2) | 1: source. | Offer the verdict's Details on the job page too. | `app/ux/m8/runs/P3-T5/step-04.png` |
| B8-23 | Job History lists automatic follow-ons ("Update design", "Tailored CV") as separate entries the user did not ask for. Activity nests them. | Job page › History | T5, T8 | P1-T5-02 (stray entry), `walkthroughs/T8.md` W8-T8-03 step 4 (2) | 1: source. | Nest follow-ons under the run that started them, as Activity does. | `app/ux/m8/runs/P1-T5/step-07.png` |
| B8-24 | "Fix …" links land at the top of Companies, or on its h1, not on the company's Fix panel or Edit. | Today › Fix Juniper Mobility; Today › Fix Kestrel Media's link | T1, T4 | H8-companies-07, `final-recheck.md` smaller observation (2) | 1: sources. | Open the company's Fix panel and move focus to it. | `H8-companies-04.png` |
| B8-25 | Documents can't be read on the page; only Open (a new tab) and Download. | Job page › Documents | T5, T7 | P2-T5-02, P3-T5-01, P1-T7-01, P1-T5 confusion (1) | 1: lowered from P3's guess of 2. Open shows the PDF, and the testers' tools could not read PDFs (P3-T5 step 11), so this is partly a test-harness limit. | Consider an in-page preview of the letter's text. | `app/ux/m8/runs/P3-T5/step-09.png` |
| B8-26 | The Activity panel says "nothing needs you" while Today says "1 thing needs you". | Activity panel › Now | T4, T8 | H8-shell-01 (1) | 1: lowered from 2 (one source, no persona). | Say "Nothing running", or list the same needs. | `H8-shell-01.png` |
| B8-27 | Job names in the Applications table look like plain bold text, not links. | Applications › Company and role | T3, T5 | H8-applications-02 (1) | 1: lowered from 2 (one source, no persona). Rows now open on click (1b345100, V-15). | Style the names as links. | `H8-applications-02.png` |
| B8-28 | The only fix for an unreadable tracker row is to edit `applications.md` by hand. | Workspace › Data health | T3, T8 | H8-workspace-help-04 (1) | 1: lowered from 2 (one source, no persona). | Offer an in-app fix or removal of the row. | `H8-workspace-help-04.png` |
| B8-29 | Search offers only one of the app's "Check …" actions. | Top bar search | T2, T4 | H8-shell-05 (1) | 1: source. | Add the other actions to search. | `H8-shell-05.png` |
| B8-30 | After saving a design, nothing beside the preview says the Cobalt CV is still in its old layout. "Lay out this CV again" is the last control on the page. | My CV › Design | T7 | W8-T7-01 (remainder per `final.md`), P1-T7-02, P2-T7-01, P3-T7-01 (3) | 1: `final.md` rates the remainder 1 after 7cbc1d60; the persona runs came before that fix. | Show "The CV for … is still in <old design>" with its update action beside the preview. | `R-final-W8-T7-01.png` |
| B8-31 | The failed-check card on Today is built differently: label outside, Dismiss under the border. The header count lags ("3 things need you" while the resolved card is still shown). | Today › Needs you | T8 | H8-today-07, `final.md` smaller observations, `walkthroughs/T8.md` unranked notes (3) | 1: sources. | Build the card like the others and keep the header count in step. | `H8-today-03.png` |
| B8-32 | The validate-portals tool can't be started, and "Check companies' job boards" is missing from Workspace › Tidy up. | Workspace › Tidy up | T4 | H8-workspace-help-05, R-skills-cv-workspace-13, inventory K-validate-portals (3) | 1: source. | Offer every maintenance tool in Workspace. | `H8-workspace-help-03.png` |
| B8-33 | After a status is saved from the When? dialog, focus goes to the next job's Status, so one more Enter starts a change on another job. | Applications › Status › Save as Applied | T3 | R-applications-jobs-06 (focus part); still observed in `a11y/manual.md` Pass 1 T3 and `final.md` T3 (2) | 1: lowered from 2. Gate source only, no persona hit, and the a11y pass judged it no loss of focus. 1e9d4a59 claimed a fix, but later files still observe the old behaviour. | Return focus to the control that was changed. | `R-applications-jobs-T3-saved.png` |
| B8-34 | The company count differs between pages ("12 companies" vs "Checks the 11 companies you follow"). | Companies; Today; Workspace | T4 | H8-companies-06, P2-T4-02, P3-T4-02 (2) | 1: sources. | Say "12 companies · 11 checked (1 paused)". | `app/ux/m8/runs/P2-T4/step-03.png` |
| B8-35 | Skill categories are shown as slugs ("cloud-infra", "ai-ml"). | Skills › each row | T6 | H8-skills-02, R-skills-cv-workspace-07 (slug part) (2) | 1: sources. | Use readable names. | `H8-skills-02.png` |
| B8-36 | My CV › Content has no rendered preview, only a summary of what was read. | My CV › Content | T1 | H8-my-cv-04, R-skills-cv-workspace-08 (preview part) (2) | 1: lowered from the gate's 2 to the later heuristic's 1. | Add the preview `ia.md` §2.7 specifies. | `H8-my-cv-04.png` |
| B8-37 | Activity's Documents filter doesn't count a tailored CV made as a follow-on. | Activity › filters | T8 | H8-activity-03, `final.md` R-final-07 note (2) | 1: sources. | Count follow-on documents. | `H8-activity-03.png` |
| B8-38 | Same-titled postings can't be told apart in the Skills evidence, and Back from a report closes it. | Skills › evidence | T6 | WP-T6-04, R-skills-cv-workspace-11, `walkthroughs/T6.md` ("still open") (2) | 1: sources. | Add fit or date to each posting, and keep the evidence open on return. | `R-skills-cv-workspace-WP-T6-04.png` |
| B8-39 | After a re-check, History and the banner say "first added" today, and "Update the layout to …" disappears. | Job page (#12 after Check fit again) | T2 | `final.md` smaller observations, H8-job-01 notes (2) | 1: `final.md` rates it 1. | Keep the original added date and the layout action. | `R-final-H8-job-01.png` |
| B8-40 | Today offers two buttons for the same thing after a check ("Look at the 4 new openings", "See the 4 new openings"). | Today | T4 | `final-recheck.md` smaller observations, `heuristics/today.md` §8 note (2) | 1: sources. | Keep one. | `R-recheck-05-populated.png` |
| B8-41 | The fit report shows engine words ("JD Requirement", "TL;DR", "cv.md: Skills") and sections A–F only, where P1 expects A–G. | Job page › Fit report | T2 | R-applications-jobs-09 (report-table part), P1-T2-03 (2) | 1: sources. Whether the missing G comes from the sandbox's report or from the page is not stated in the sources. | Use plain headings, and check that every section is shown. | `app/ux/m8/runs/P1-T2/step-09.png` |
| B8-42 | "When did you apply…?" preselects Today, so a hasty save records the wrong day. | Applications › Status › Applied | T3 | P2-T3-02, `walkthroughs/T3.md` verdict (2) | 1: sources. | Ask without a preselected date, or make the default visible in the button. | `app/ux/m8/runs/P2-T3/step-09.png` |
| B8-43 | New openings sit at the bottom of To review, and the summary card has a red border although the check succeeded. The New badges themselves now show (`walkthroughs/T4.md`). | To review | T4 | H8-to-review-02 (remainder), `walkthroughs/T4.md` unranked observations (2) | 1: lowered from 2. The New mark is verified; only ordering and border colour remain. | List new items first, and reserve red for failure. | `H8-to-review-02.png` |
| B8-44 | Today's "Just finished" card for a re-check doesn't say what changed or that the application was updated. | Today › Just finished | T2 | H8-today-05 (1) | 1: lowered from 2 (one source, no persona). The job page and the row do say it (F-015). | Add the "Updated · fit 4.2 → 4.1" sentence. | `H8-today-05.png` |
| B8-45 | Undo scrolls the page to the top and says nothing about being undone on the page. | Undo bar (Applications, Companies) | T3 | H8-shell-03 (1) | 1: lowered from 2 (one source, no persona). | Keep the scroll position and confirm the undo. | `H8-shell-03.png` |
| B8-46 | To review › Tidy up jumps to Workspace and drops the user's selection. | To review › Tidy up | T4 | H8-to-review-03 (1) | 1: lowered from 2 (one source, no persona). | Run the preview in place, or label it "Open in Workspace". | `H8-to-review-03.png` |
| B8-47 | The "Remove links already in Applications" preview shows an engine message ("No batch-state.tsv found") and still offers "Remove these links". | Workspace › Tidy up | T4 | H8-workspace-help-01 (1) | 1: lowered from 2 (one source, no persona). | Say "nothing to remove" in words and offer only Close. | `H8-workspace-help-01.png` |
| B8-48 | Data health says "No problems found" while "Check my list for problems" lists some. The empty "Done:" part was closed by 63dc6ac3. | Workspace › Data health | T3 | H8-workspace-help-03 (remainder) (1) | 1: lowered from 2 (one source; the main part closed). | Make the two agree, or say what each one checks. | `H8-workspace-help-03.png` |
| B8-49 | "Lay out this CV again in <design>" has no warning when the design fails screening. | My CV › Design | T7 | H8-my-cv-06 (1) | 1: lowered from 2 (one source, no persona). No AI cost, and the job page names the failure afterwards. | Warn as "Update existing CVs" does. | `H8-my-cv-01.png` |
| B8-50 | Pasting a new posting link into search gives "Nothing matches" and no next step. The existing-link half is V-10. | Top bar search | T2 | W8-T2-01 (remainder) (1) | 1: lowered from 2. Walkthrough only, no persona; the other half has a fix commit. | Offer "Check the fit of this link". | `W8-T2-01.png` |
| B8-51 | Unchecked rows say "Not evaluated". | Applications › Recommendation | T3 | H8-applications-03 (1) | 1: source. | Say "Not checked yet". | `H8-applications-02.png` |
| B8-52 | The bulk confirmation states the time twice, differently. | To review › Check fit for selected | T2 | H8-to-review-04 (1) | 1: source. | Drop the per-item caption. | `H8-to-review-04.png` |
| B8-53 | Skills shows only its title while loading. | Skills | T6 | H8-skills-03 (1) | 1: source. | Show "Loading…". | `H8-skills-03.png` |
| B8-54 | Opening a skill's evidence moves its name and "on your CV" control out of view. | Skills › row | T6 | W8-T6-01 (1) | 1: source. | Align the side columns to the top. | `W8-T6-01.png` |
| B8-55 | The search combobox shows its active option only by a faint fill (1.16–1.19:1). | Top bar search results | T5 | A8-06 (1) | 1: source. | Add the inset outline used by the menus. | `app/ux/m8/a11y/evidence/A8-06.png` |
| B8-56 | Two links on Today are named only "Open the job". | Today › Needs you, Just finished | T8 | A8-11 (link part) (1) | 1: source. | Name the job in the link. | `app/ux/m8/a11y/evidence/A8-11.png` |
| B8-57 | Ticking a To review checkbox shows bulk buttons without announcing them. | To review › list header | T4 | A8-12 (1) | 1: source. | Announce the selection and the buttons. | `app/ux/m8/a11y/evidence/A8-12.png` |
| B8-58 | At 640 px Applications hides the Documents and Checked columns. | Applications table | T3 | A8-08 (remainder per `final.md`) (1) | 1: `final.md` rates the remainder 1. | Keep them as labelled lines. | `R-final-A8-08-640.png` |
| B8-59 | "Open the job's documents" after a re-layout lands on the job's h1, not on Documents. | My CV › Design result line | T7 | `final.md` smaller observations (1) | 1: source. | Land on Documents. | `R-final-A8-01-design.png` |
| B8-60 | "You're set up" keeps its tick next to the unreadable-link warning, and "Next" suggests a check the warning says will find nothing. | Today › You're set up (EMPTY) | T1 | `final-recheck.md` smaller observations (1) | 1: source. | Drop the tick and the scan suggestion while the link is unreadable. | `R-recheck-04-today.png` |
| B8-61 | In EMPTY, the scan run card is a green "Done" whose main button is "Open To review" (empty). "Fix in Companies" is only a sentence. | Today › scan run card (EMPTY) | T4 | `final-recheck.md` smaller observations (1) | 1: source. | Make the fix the card's main action. | `R-recheck-05-empty.png` |
| B8-62 | "Save for later" on a link already in Applications says it is "already in To review". | Applications › Add a job | T2 | WP-T2-03 (applications gate, not closed; `walkthroughs/T2.md` did not re-measure it) (1) | 1: source. | Say where the job really is and link it. | `R-applications-jobs-WP-T2-03.png` |
| B8-63 | During "Make it again" the previous file, Open and Download disappear until the run ends. | Job page › Tailored CV | T5 | WP-T5-03 (applications gate, partly closed) (1) | 1: source. | Keep the previous file available while it is remade. | `R-applications-jobs-T5-docs.png` |
| B8-64 | The Design gallery takes about 15–25 s on first open while saying "a few seconds". | My CV › Design | T7 | R-skills-cv-workspace-17 (1) | 1: source. | State the real wait or show the designs as they arrive. | `R-skills-cv-workspace-design-populated.png` |
| B8-65 | Hidden dismiss buttons in the status menu and the When? dialog are labelled "Descartar" (Spanish) in an English app. | Applications › Status menu and dialog | T3 | P1-T3-02, P3-T3-01 (1) | 1: source. | Set the component library's locale to the app's language. | `app/ux/m8/runs/P3-T3/step-02.png` |
| B8-66 | The scan's Technical details include CLI advice ("Run /career-ops pipeline") and a Discord link. | Activity › Technical details | T4 | P1-T4-02 (1) | 1: source. Engine output belongs under Technical details by design, but this advice doesn't apply in the app. | Filter CLI-only advice out of the shown log. | `app/ux/m8/runs/P1-T4/step-08.png` |
| B8-67 | "then: read the new postings for Skills" is unclear. | Activity › scan entry | T4 | P1-T4-03 (1) | 1: source. | Say what it does for the user. | `app/ux/m8/runs/P1-T4/step-06.png` |
| B8-68 | Two near-identical confidence labels in the fit report ("Is the posting real? High Confidence", "Confidence: High"). | Job page › Fit report | T2 | P2-T2-03 (1) | 1: source. | Name what each confidence is about. | `app/ux/m8/runs/P2-T2/step-04.png` |
| B8-69 | The failure cause is generic ("usually temporary — a slow page or a session that ended early"). | Today › failed card › What happened | T8 | P1-T8-01, P3-T8-01 (1) | 1: source. | Say which cause was seen when the log shows it. | `app/ux/m8/runs/P1-T8/step-01.png` |
| B8-70 | The To review header has no "Last checked …" date next to the button. | To review header | T4 | R-applications-jobs-09 (header part) (1) | 1: source. | Show the date next to the button. | `R-applications-jobs-to-review.png` |
| B8-71 | Workspace scrolls 86 px sideways at 320 px because of the assistant's install path. Writing rules scrolls 2 px. | Workspace › AI assistant | — | A8-09, R-skills-cv-workspace-05 (claimed fixed in 649e1e63 but still observed), `final.md` (3) | 1: the gate's 2 lowered to the later a11y rating of 1; no top task affected. | Wrap long paths. | `app/ux/m8/a11y/evidence/A8-09.png` |
| B8-72 | Undo brings a removed company back at the end of the list. | Companies | — | H8-companies-02, `final.md` H8-companies-01 row (2) | 1: source. | Restore it in its place. | `H8-companies-02.png` |
| B8-73 | Profile asks for a language code ("en"), and its hints repeat the sandbox user's own values. | My CV › Profile | — | H8-my-cv-05, R-skills-cv-workspace-14 (2) | 1: sources. | Offer language names, and use neutral examples. | `H8-my-cv-05.png` |
| B8-74 | Search keeps the last query on every page. | Top bar search | — | H8-shell-04 (1) | 1: source. | Clear it after Escape or navigation. | `H8-shell-04.png` |
| B8-75 | "Already checked" links to a report with no Applications row land on "Job not found". | To review › Already checked | — | inventory R-reports-list and "Capabilities with no UI surface" 3 (1) | 1: inventory only; no other method hit it. | Show such reports, as sitemap.md planned ("Fit reports not in Applications"). | No screenshot in the sources; see `app/ux/m8/inventory.md` R-reports-list |

## Fixed, not re-verified

A commit claims each fix, but no later file checks it. All are severity 2 or lower. They are not counted as open. Each should be checked in the next review or in the stage-B sessions.

| ID | Source | Fix claimed in | What is unverified |
|---|---|---|---|
| V-01 | R-shell-today-activity-02 (2), Dismiss part | 91932981 | Focus after Dismiss on Today. The other parts were closed through A8-01, R-final-06 and R-recheck-01. |
| V-02 | R-shell-today-activity-06 (1), W8-T4-01 (1) | 91932981; f72df307 | The top bar staying on one row at 1280 px with badges shown (`heuristics/shell.md` checked it without badges). |
| V-03 | R-shell-today-activity-07 (1) | 91932981 | The Activity panel's width at 320 px. |
| V-04 | R-shell-today-activity-10 (2) | e6e15a82 | Removing the only followed company (not reachable in POPULATED). |
| V-05 | R-applications-jobs-04 / WP-T2-04 (2), the F-013 remainder | 1e9d4a59 | A "Just checked" result in place after Check fit on To review. Not walked in `walkthroughs/T2.md` or `T8.md`. |
| V-06 | R-applications-jobs-05 / WP-T3-01 (2) | 1e9d4a59 | "I've sent my application" asking When?. |
| V-07 | R-applications-jobs-07 (2): result of Companies › Check for new openings; scroll restored on return; filters from a link kept; field errors cleared and announced on Add a job, the cover-letter form and the company form | 1e9d4a59 | Each listed behaviour. The set-up form errors are verified in `walkthroughs/T1.md`. |
| V-08 | R-applications-jobs-08/09 (2/1): Make it again states its cost; the threshold not flashed | 1e9d4a59 | Both behaviours. |
| V-09 | W8-T3-01 (1), R-applications-jobs-06 (bar part) | f72df307 | The Undo bar clear of the rows' names. |
| V-10 | W8-T2-01 (2), existing-job half | f72df307 | A posting link pasted into search finding its job. |
| V-11 | W8-T7-02 (1), design name part | 7cbc1d60 | The design's display name in Design's result line. |
| V-12 | R-skills-cv-workspace-01 (2) | 649e1e63 | Skills refreshing after Improve the analysis. |
| V-13 | R-skills-cv-workspace-09 (2): Improve the analysis (WP-T6-06), skill status change, Show a design that passes, Don't change anything | 649e1e63 | Focus after each action. |
| V-14 | R-skills-cv-workspace-10 (2): the Update N CVs confirm starting on Cancel; the leave dialog starting on Stay | 649e1e63; 7e2ca07f | The initial focus of both dialogs. |
| V-15 | P3-T2-01 (1), the row not clickable | 1b345100 | A click on an Applications row opening the job. |
| V-16 | P2-T6-01, P3-T6-02 (1), "69 vs 66" | 1b345100 | The new basis wording. |

## Lower M8 findings closed and verified

- **Shell gate:**
  - R-shell-today-activity-03 (91932981; `walkthroughs/T1.md` steps 2 and 3).
  - R-shell-today-activity-04 (91932981; `heuristics/activity.md` Strengths, `walkthroughs/T8.md`).
  - R-shell-today-activity-08 (e6e15a82; `a11y/manual.md` Pass 6, `walkthroughs/T2.md` step 2).
  - R-shell-today-activity-09, the confirm, "Choose a file…" and "took under a second" parts (91932981; `reviews/applications-jobs.md`, `walkthroughs/T1.md`, `walkthroughs/T8.md`).
- **Applications gate:**
  - R-applications-jobs-03 (1e9d4a59; `walkthroughs/T5.md` step 2, `a11y/manual.md` T5).
  - R-applications-jobs-06, dialog part (1e9d4a59; `walkthroughs/T3.md` step 2).
  - R-applications-jobs-10 (1e9d4a59; `a11y/manual.md` Pass 4).
  - WP-T4-02 and the board-date part of R-applications-jobs-09 (b1bd007c; `walkthroughs/T4.md` step 2).
- **Skills, CV and Workspace gate:**
  - R-skills-cv-workspace-03 (bb1fe052, 649e1e63; the tool now runs, per `heuristics/workspace-help.md`; its remainder is B8-47).
  - R-skills-cv-workspace-04, dedup part (2390d770; `final.md`).
  - R-skills-cv-workspace-06, the "Preview with" part (649e1e63; `walkthroughs/T7.md` step 4).
  - R-skills-cv-workspace-07, -08 (Save reason) and -18 (649e1e63; `heuristics/skills.md`, `heuristics/my-cv.md`).
  - R-skills-cv-workspace-15 (f72df307; `walkthroughs/T9.md` re-check).
- **Heuristic findings:**
  - H8-today-04, the same problem as W8-T8-01 (7cbc1d60; `final.md`).
  - H8-companies-03 (5c827a5a; `final-recheck.md` R-final-04).
- **Walkthrough findings:**
  - W8-T7-03, W8-T8-01, W8-T8-02 (7cbc1d60; `final.md`).
  - W8-T8-03 (7cbc1d60, 5c827a5a; `final-recheck.md` R-final-07).
  - W8-T9-02 (f72df307, 79345633, 5c827a5a; `final-recheck.md` R-final-06, Writing part).
  - W8-first-job-01 (f72df307; `walkthroughs/first-job.md` re-check).
- **Accessibility findings:**
  - A8-01 (79345633, 5c827a5a, 63dc6ac3; `final-recheck.md` and the maintainer spot-check).
  - A8-02, A8-04, A8-05, A8-07 (79345633; `final.md`).
  - A8-03 (79345633, 5c827a5a; `final-recheck.md` R-final-08).
- **Final review and re-check:**
  - R-final-01, -03, -07, -08 (1a2f8594, 5c827a5a; `final-recheck.md`).
  - R-final-02, R-final-06 (rest), R-recheck-01, R-recheck-02 (63dc6ac3; maintainer spot-check).
- **Persona problems:**
  - P1-T4-01, P2-T4-01, P3-T4-01 (1b345100; `walkthroughs/T4.md` step 2, `a11y/manual.md` Pass 6, `final-recheck.md` R-final-05).
  - P2-T8-01 (1b345100; `walkthroughs/T8.md` step 2: "the card stays in place … Tried again: still working").

## Out of scope (PROJECT_PLAN.md §9.1, §12.7)

No M8 source raised a finding that conflicts with human-in-the-loop. The inventory records the upstream `apply` and `email` modes as having no console equivalent by §9.1, and Help › "What the app never does" says so (`inventory.md` table 5, U-apply, U-email).

## Not a problem (severity 0)

| Source | Raised | Why rejected |
|---|---|---|
| P1-T2-02, P2-first-job-01, P3-T8-03; confusion notes in P2-T2, P1-T5, P2-T5, P1-T8, P3-T9 | "2–5 min" or "about 3 min" was quoted, but the run took about 8 s | The sandbox's fake assistant runs with `--delay 8000` (PROJECT_PLAN.md §12.1); real checks take minutes. |
| P2-first-job-01, P2-T2-02, P3-T2-03 (the wording) | "Fixture evaluation" | That text comes from the fake assistant's fixture. The real problem, engine notes shown as the user's, is B8-01. |
| P1-T4, P2-T4 | "Good evening" on a Monday morning | The task's day is fictional; the greeting follows the clock. |
| P1-T6-01 | The default ranking counts every posting | The page says so, the filter is one click away, and `check-task.mjs` accepts both rankings. |
| P3-T6-01 | Counts mix required and nice-to-have | The breakdown is shown, and the tester called it "fine". |
| P2-T3-01 | The status options weren't visible | A limit of the tester's tool. P1-T3 and P3-T3 saw the menu, and `a11y/manual.md` verified the listbox. |
| P3-T8-02 | Technical details gave no visible feedback | The tester did not check. It is a native disclosure (`a11y/manual.md` Pass 2). |
| P1-T9-02 | No sign the CV was made under the new rules | P2-T9, P3-T9 and `walkthroughs/T9.md` all saw "✓ Made … under your current rules". |
| P1-T1-01 | No next-step hint after set-up | P2-T1 and `walkthroughs/T1.md` step 5 saw "Next: check a job you already like…". |
| H8-job-04, form part | The cover-letter form gives no time or cost | `walkthroughs/T5.md` step 3 shows "About 2 min · uses your Claude plan" in the form. The card-level part is in B8-08. |

## Notes without a severity

- **Hard-coded colours.** 15 values in `app/ui/src/app.css` and one in `pages/mycv/Design.jsx` sit outside `tokens.css`. This is reported by every review through `final-recheck.md` ("These commits added none"). It is a tokens-compliance item for M9, not a usability finding.
- **axe re-run.** The audit was re-run on 63dc6ac3: 0 violations in both schemes, as in 776801e3.
