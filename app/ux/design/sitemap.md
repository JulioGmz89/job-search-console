# Sitemap (M7, step 4)

Every capability in `app/ux/inventory.md` mapped to its place in the chosen IA (`ia.md`).
The 191 measured rows (R-, K-, C-, UI-) come first, in inventory order. The 35 upstream
rows (U-) follow for completeness; they are outside the §12.6 metric.

**How to read it:**
- **Place**: `Page › area`. Pages are Today, Applications, Job (`#/applications/:id`), To
  review, Companies, Skills, My CV (Content · Profile · Design · Writing rules), Activity
  (panel, page), Workspace, Help, plus the **Top bar** on every page.
- **Steps**: interactions from where a user would look for it (§12.6). That is the page
  named by the task, or Today for "where do I start". Every clicked control, every field
  typed into and every scroll needed to reach an off-screen control counts as one. The
  limit is ≤ 3.
- **Label**: the on-screen words.
- **Closes**: backlog findings (F-) the placement resolves.
- **No UI by design**: an internal mechanism that the user never asks for by name. It
  serves the feature named in the row.
- **Out of scope**: cites PROJECT_PLAN §9, §10 or a later milestone.

## 1. Server routes

| ID | Capability | Place | Steps | Label | Closes |
|---|---|---|---|---|---|
| R-health | Data folder, counts, parse issues | Workspace › Folder, Data health; Today › Needs you (issues) | 1 | **Workspace**, "1 application could not be read" | F-021 |
| R-pipeline | The tracker as a list | Applications › table | 1 | **Applications** | F-010, F-014 |
| R-reports-list | Reports with no tracker row | Workspace › Data health › **Fit reports not in Applications (2)**, each with **Open** | 2 | "Fit reports not in Applications" | — |
| R-report | One fit report | Job › Fit report | 2 (row link, then section link) | **Fit report** | F-010, F-048 |
| R-report-pdf | Tailored CV PDF | Job › Documents › Tailored CV › **Open** / **Download**; Activity › done item › **Open** | 2 | **Open**, **Download** | F-011 |
| R-report-cover | Cover letter PDF | Job › Documents › Cover letter › **Open** / **Download** | 2 | **Open**, **Download** | F-011 |
| R-cv-style-get | Saved design settings | My CV › Design › Fine-tune | 2 | **Fine-tune** | — |
| R-cv-style-put | Save the design | My CV › Design › **Make this my design for every CV** | 3 | as label | F-019 |
| R-cv-voice-get | Writing rules | My CV › Writing rules | 2 | **Writing rules** | F-073 |
| R-cv-voice-put | Save writing rules | My CV › Writing rules › **Add a word** / **Save** | 3 | as label | F-036, F-079 |
| R-cv-templates | Custom design files | My CV › Design › Designs gallery (cards marked **Yours**) | 2 | **Yours** | — |
| R-cv-writing-samples | Writing samples list | My CV › Writing rules › Writing samples | 2 | **Writing samples** | — |
| R-cv-documents | CVs to preview with | My CV › Design › **Preview with** select (named by job) | 3 | "Cobalt Freight — Staff Software Engineer, Oct 4" | F-050 |
| R-cv-preview | Live preview and screening check | My CV › Design › preview | 2 | **Screening check: readable** | F-037 |
| R-cv-preview-pdf | Preview PDF stream | My CV › Design › preview | — | — | *No UI by design*: transport for R-cv-preview |
| R-cv-themes | Every design rendered with a verdict | My CV › Design › Designs gallery | 2 | **Designs** | F-057 |
| R-cv-render-all | Re-lay out every CV in a design | My CV › Design › **Update existing CVs to this design (6)** → confirm | 3 | as label | F-019 |
| R-cv-thumbs | Design thumbnails | My CV › Design › gallery images | — | — | *No UI by design*: images for R-cv-themes |
| R-skills | Ranked skills with evidence | Skills | 1 | **Skills** | F-049, F-055 |
| R-skills-extract | Read postings with Claude | Skills › basis line › **Improve the analysis** | 2 | **Improve the analysis** (cost stated) | F-049 |
| R-skills-overrides | Set a skill's status | Skills › row › **Your CV** select · **Undo** | 2 | "Your CV: missing / partly / has it" | F-026, F-069 |
| R-status | Change status (+ date, note) | Applications › row › Status; Job › Summary › Status (**When?**, **Add a note**) | 1 | **Status** | F-022, F-047, F-075 |
| R-inbox | Links waiting to be checked | To review | 1 | **To review** | F-035, F-051 |
| R-inbox-add | Save a link / check it now | Applications › Add a job; Today › Check your first job | 2 (type, click) | **Check fit now**, **Save for later** | F-035 |
| R-agent-status | Is the assistant ready; is there a CV | Today › Get set up › AI assistant; Workspace › AI assistant | 1 | **AI assistant** | F-001, F-012 |
| R-portals | Companies, boards, health | Companies | 1 | **Companies** | F-052 |
| R-portals-create | Follow a company / add a board search | Companies › **Follow a company**; Today › Get set up | 2 | **Follow a company** | F-004, F-068 |
| R-portals-update | Edit, pause | Companies › row › **Edit** / On-Paused switch | 2 | **Edit**, "Check Kestrel Media for new openings" | — |
| R-portals-delete | Stop following | Companies › row › **Remove** · **Undo** | 2 | **Remove** | F-039 |
| R-runs | All activity | Top bar › **Activity** (panel); `#/activity` | 1 | **Activity · 1 failed** | F-016, F-028 |
| R-runs-start | Start any action | the action's own button (see K- rows) | — | — | *No UI by design*: transport for every action button |
| R-run | One activity | Activity › item; `#/activity/:id` | 2 | the item's name | F-009 |
| R-run-cancel | Cancel | Activity › working item › **Cancel**; the in-progress spot | 2 | **Cancel** | — |
| R-run-events | Live progress and log | Activity › item (progress); › **Technical details** (raw log) | 2–3 | **Technical details** (progress and outcome also announced in the shell's live region) | F-006, F-065 |
| R-events | File-change and run events | everywhere (lists refresh) | — | — | *No UI by design*: keeps pages current |
| R-scan-summary | Last check's counters | To review › header summary; Today › New since you last looked | 1 | "4 new · 1 board couldn't be reached" | F-046, F-051, F-074 |
| R-static | Serve the app | — | — | — | *No UI by design*: the app itself |

## 2. Run kinds

| ID | Capability | Place | Steps | Label | Closes |
|---|---|---|---|---|---|
| K-scan | Check for new openings | To review › **Check for new openings**; Companies › same; Today card | 2 | **Check for new openings** | F-043, F-046, F-072 |
| K-dedup | Find duplicate applications | Applications › **Tidy up** › **Find duplicate applications** (pairs, then confirm); Workspace › Tidy up | 3 | as label | F-062 |
| K-reconcile | Remove links already in Applications | To review › **Tidy up**; Workspace › Tidy up | 3 | **Remove links already in Applications** | — |
| K-verify-pipeline | Check my list for problems | Applications › **Tidy up**; Workspace › Tidy up | 3 | **Check my list for problems** | — |
| K-validate-portals | Check companies' job boards (config) | Companies › **Check companies' job boards**; Workspace › Tidy up | 2 | as label | — |
| K-verify-portals | Find the right job board for a company | Companies › row with a problem › **Fix**; Workspace › Tidy up | 2 | **Fix**, **Find the right job board for a company** | F-052 |
| K-skills-fetch | Fetch posting text for Skills | Skills › basis line › **Fetch posting text (12 missing)**, shown only when text is missing; retry inline | 2 | as label | — |
| K-cv-render | Re-lay out one CV (no AI) | Job › Documents › Tailored CV › **Update the layout** (shown when the design changed); My CV › Design | 3 | **Update the layout** | F-041 |
| K-evaluate | Check fit | Applications › **Check fit now**; row menu › **Check fit again**; To review › **Check fit**; Activity › **Try again** | 2 | **Check fit** | F-003, F-018, F-038 |
| K-pdf | Make tailored CV | Job › Documents › **Make tailored CV**; row menu | 2 | **Make tailored CV** | F-007, F-033 |
| K-cover | Write cover letter | Job › Documents › **Write cover letter** | 2 | **Write cover letter** | F-020, F-054 |
| K-skills-extract | Read postings with Claude | Skills › **Improve the analysis** | 2 | as label | F-049 |
| K-skills-cv | Read the CV's skills | Skills › basis line › **Read my CV's skills again** (when the CV changed) | 2 | as label | — |
| K-merge-tracker | Add a result to Applications | nested under its check in Activity: "then: added to Applications as #41" / "merged into #21" | — | — | *No UI by design*: automatic step; its outcome is shown (F-015) |
| K-reconcile-auto | Mark checked links done | nested under its check in Activity | — | — | *No UI by design*: automatic step |
| K-skills-fetch-auto | Fetch posting text after a scan | nested under the scan in Activity | — | — | *No UI by design*: automatic step |
| K-mark-pdf-ready | Mark the PDF ready in the tracker | nested under the tailored CV in Activity | — | — | *No UI by design*: automatic step |

## 3. Config and data files

| ID | Capability | Place | Steps | Label | Closes |
|---|---|---|---|---|---|
| C-cv-md | Your CV | Today › Get set up › **Add your CV**; My CV › Content (edit, **Import from a file**) | 1 | **Your CV** | F-001, F-042 |
| C-profile-yml | Profile and preferences | My CV › Profile | 2 | **Profile** | F-066 |
| C-portals-yml | Companies and filters | Companies (list, **What jobs to keep**) | 1 | **Companies**, **What jobs to keep** | F-004 |
| C-style-yml | Your CV design | My CV › Design | 2 | **Design** | F-019 |
| C-voice-dna-md | Writing rules | My CV › Writing rules | 2 | **Writing rules** | F-002, F-079 |
| C-writing-samples | Writing samples | My CV › Writing rules › Writing samples (**Open**; adding them is an M8 follow-up, the folder path is shown) | 2 | **Writing samples** | — |
| C-cv-templates | Custom designs | My CV › Design › gallery (**Yours**); Help › "Make your own design" | 2 | **Yours** | — |
| C-applications-md | The tracker | Applications | 1 | **Applications** | F-021 |
| C-pipeline-md | The to-review list | To review | 1 | **To review** | F-040 |
| C-reports | Fit reports | Job › Fit report | 2 | **Fit report** | — |
| C-output | Documents | Job › Documents; search ("Granite Cloud cover letter") | 2 | **Documents** | F-011 |
| C-data-skills | Skills cache and overrides | Skills (basis line) | 1 | "Based on 69 postings…" | — |
| C-modes-profile-md | Archetypes and targeting | My CV › Profile › **Advanced files** (purpose plus path, "edit in your editor") | 3 | **Advanced files** | — |
| C-article-digest-md | Proof points | My CV › Profile › **Advanced files** | 3 | **Advanced files** | — |
| C-blacklist-md | Companies to never apply to | Companies › **Companies to skip** (list; M8 decides read-only or editable, format unchanged) | 2 | **Companies to skip** | — |
| C-scan-data | Scan history and board health | Companies › **Last worked**; To review › last check summary | 1 | **Last worked** | F-052 |
| C-data-jsc | The console's own state (logs, prompts, covers index, ATS records, Today's last-seen) | Activity › **Technical details** (log path); Workspace › Folder | — | — | *No UI by design*: internal state, surfaced through what it records |
| C-status-log | Status history | Job › History | 2 | **History** | F-075 |

## 4. UI actions (current UI → new place)

### Global and navigation

| ID | Capability | Place | Steps | Label | Closes |
|---|---|---|---|---|---|
| UI-nav-pipeline | Go to the tracker | Top bar › **Applications** | 1 | **Applications** | F-024, F-025, F-064 |
| UI-nav-sources | Go to sources | Top bar › **Companies** | 1 | **Companies** | F-072 |
| UI-nav-skills | Go to skills | Top bar › **Skills** | 1 | **Skills** | — |
| UI-nav-runs | Go to runs | Top bar › **Activity** (panel); `#/activity` | 1 | **Activity** | F-016 |
| UI-nav-cv | Go to CV Studio | Top bar › **My CV** | 1 | **My CV** | F-073 |
| UI-global-toast-open-log | Open a run from a notice | the inline "Started" message › **Open**; Activity panel | 1 | **Open** | F-045 |
| UI-global-toast-dismiss | Dismiss a notice | inline messages › **Dismiss**; nothing important is toast-only | 1 | **Dismiss** | F-045 |

### Applications (was Pipeline)

| ID | Capability | Place | Steps | Label | Closes |
|---|---|---|---|---|---|
| UI-pipeline-url | Job link field | Applications › **Add a job**; Today › Check your first job | 1 | "Job posting link" | F-067 |
| UI-pipeline-evaluate-now | Check fit now | Applications › Add a job › **Check fit now** | 2 | **Check fit now** | F-018, F-012 |
| UI-pipeline-add-to-inbox | Save for later | Applications › Add a job › **Save for later** | 2 | **Save for later** | F-035 |
| UI-pipeline-autopdf | Auto tailored CV | Applications › Add a job › **Also make a tailored CV if the fit is 3.5 or more** | 2 | as label | F-066 |
| UI-pipeline-addjob-help | Explain Check fit | Applications › Add a job › one-line explanation plus **?** (Help › what a check costs) | 1 | **?** | F-029 |
| UI-pipeline-issues | Data issues | Today › Needs you; Workspace › Data health | 1 | "1 application could not be read: Quarry Systems, line 57" | F-021, F-012 |
| UI-pipeline-status-filter | Filter by status | Applications › status chips | 1 | **Reviewed — not applied 9** … | F-053, F-024 |
| UI-pipeline-score-filter | Filter by fit | Applications › **Fit** filter | 1 | **Fit** | — |
| UI-pipeline-search | Search the list | Applications › search; top bar search | 1 | "Company, role or note" | F-030 |
| UI-pipeline-sort | Sort | Applications › column headers (keyboard) | 1 | header names | F-014 |
| UI-pipeline-open-row | Open a job | Applications › row link → Job page | 1 | the job's name | F-010, F-014, F-076 |
| UI-pipeline-status-cell | Change status in the list | Applications › row › Status (commits on choose) | 1 | "Status for Granite Cloud — Software Engineer, Payments" | F-022, F-047 |
| UI-pipeline-row-evaluate | Check fit again | Applications › row › **Actions** › **Check fit again** (cost stated, confirm on closed jobs) | 2 | **Check fit again** | F-038 |
| UI-pipeline-row-pdf | Make tailored CV from the row | Applications › row › **Actions** › **Make tailored CV** | 2 | as label | F-033 |
| UI-pipeline-row-cover | Cover letter from the row | Applications › row › **Actions** › **Write cover letter** (opens the Job page at Documents) | 2 | as label | F-033 |
| UI-pipeline-detail-posting-link | Open the posting | Job › Summary › **Open the posting ↗** | 2 | as label | — |
| UI-pipeline-detail-tab-report | Read the report | Job › **Fit report** section | 2 | **Fit report** | F-044 |
| UI-pipeline-detail-tab-pdf | See the tailored CV | Job › Documents › Tailored CV › **Open** | 2 | **Open** | F-044, F-058 |
| UI-pipeline-detail-tab-cover | See the letter | Job › Documents › Cover letter › **Open** | 2 | **Open** | F-044 |
| UI-pipeline-detail-reevaluate | Check fit again | Job › Summary › **Check fit again** | 2 | as label | F-038 |
| UI-pipeline-detail-pdf | Make / make again | Job › Documents › **Make tailored CV** / **Make it again** | 2 | as label | F-033 |
| UI-pipeline-detail-cover | Write the letter | Job › Documents › **Write cover letter** | 2 | as label | F-033 |
| UI-pipeline-detail-run-badges | This job's activity | Job › History; the document cards' state | 2 | **History** | F-007, F-058 |
| UI-pipeline-cover-dialog | Cover letter form | Job › Documents › Cover letter (inline form, no modal) | 2 | **Write cover letter** | F-020, F-054 |
| UI-pipeline-cover-why | Question A | inline form › **Why this role? (required)** | 3 | as label | F-054 |
| UI-pipeline-cover-problem | Question B | inline form › **What problem would you solve? (required)** | 3 | as label | F-054 |
| UI-pipeline-cover-approach | Question C | inline form › **How would you start? (required)** | 3 | as label | F-054 |
| UI-pipeline-cover-tone | Tone | inline form › **Tone** | 3 | **Tone** | — |
| UI-pipeline-cover-submit | Write it | inline form › **Write the letter** (warns before replacing) | 3 | as label | F-034, F-054 |
| UI-pipeline-cover-cancel | Cancel | inline form › **Cancel** (focus returns) | 3 | **Cancel** | F-020 |
| UI-pipeline-maint-dedup | Duplicates | Applications › **Tidy up** › **Find duplicate applications**; Workspace | 2 | as label | F-062 |
| UI-pipeline-maint-reconcile | Reconcile | To review › **Tidy up** › **Remove links already in Applications**; Workspace | 2 | as label | — |
| UI-pipeline-maint-verify | Integrity | Applications › **Tidy up** › **Check my list for problems**; Workspace | 2 | as label | — |
| UI-pipeline-maint-validate | Validate sources | Companies › **Check companies' job boards**; Workspace | 2 | as label | F-052 |
| UI-pipeline-maint-probe | Probe sources | Companies › problem row › **Fix**; Workspace › **Find the right job board for a company** | 2 | **Fix** | F-052 |
| UI-pipeline-maint-help | Explain the tools | each tool's one-line description; Help | 1 | — | F-029 |
| UI-pipeline-maint-confirm | Confirm after preview | the tool's preview › **Merge these 2 pairs** / **Remove 3 links** | 3 | names the effect | F-062 |
| UI-pipeline-maint-discard | Discard a preview | the tool's preview › **Don't change anything** | 3 | as label | — |
| UI-shared-run-cancel | Cancel a running action | the in-progress spot › **Cancel**; Activity | 1 | **Cancel** | — |
| UI-shared-run-close | Close a finished result | the done spot › **Got it** / **Open**; Activity | 1 | **Open** | F-011, F-018 |

### Companies and To review (was Sources)

| ID | Capability | Place | Steps | Label | Closes |
|---|---|---|---|---|---|
| UI-sources-scan | Check for new openings | To review › **Check for new openings**; Companies; Today | 1 | as label | F-043, F-046, F-072 |
| UI-sources-preview-only | Preview without saving | To review › **Options** › **Preview without saving** | 2 | as label | — |
| UI-sources-verify | Confirm postings are live | To review › **Options** › **Confirm each posting is still live** | 2 | as label | — |
| UI-sources-company | One company only | To review › **Options** › **Only this company** (labelled select) | 2 | as label | F-031 |
| UI-sources-since | Last N days | To review › **Options** › **Only openings from the last … days** | 2 | as label | F-031 |
| UI-sources-scan-help | Explain the options | To review › **Options** (each option has a hint) | 2 | — | F-029 |
| UI-sources-inbox-toggle | See the waiting links | Top bar › **To review** | 1 | **To review** | F-035, F-051 |
| UI-sources-inbox-link | Open a posting | To review › item › **Open the posting ↗** | 1 | as label | — |
| UI-sources-inbox-evaluate | Check one | To review › item › **Check fit**; failed items › **Try again** | 1 | **Check fit for Driftwood Analytics — Data Engineer** | F-013, F-017, F-040 |
| UI-sources-help | Explain companies | Companies › **?** › Help | 1 | **?** | F-029, F-052 |
| UI-sources-issues | Config problems | Companies › problem rows (in words with **Fix**); Today › Needs you | 1 | "Board not found since Oct 2 · Fix" | F-004, F-052 |
| UI-sources-add-company | Follow a company | Companies › **Follow a company** (works on first run); Today › Get set up | 1 | as label | F-004, F-068 |
| UI-sources-add-board | Add a job-board search | Companies › **Add a job-board search** | 1 | as label | F-004 |
| UI-sources-toggle | Pause or resume | Companies › row › switch | 1 | "Check Kestrel Media for new openings" | F-026 |
| UI-sources-edit | Edit | Companies › row › **Edit** (side sheet) | 1 | "Edit Kestrel Media" | F-026 |
| UI-sources-remove | Remove | Companies › row › **Remove** · **Undo** | 1 | "Remove Kestrel Media" | F-039 |
| UI-sources-filters | Filters | Companies › **What jobs to keep** | 1 | as label | — |
| UI-sources-form-name | Company name | Follow a company › **Company name** | 2 | as label | — |
| UI-sources-form-careers-url | Careers link | Follow a company › **Careers page link** | 2 | as label | — |
| UI-sources-form-provider | Board type | Follow a company › **More options** › **Board type** ("Recognised from the link") | 3 | as label | F-068 |
| UI-sources-form-api | API endpoint | **More options** › **API endpoint** | 3 | as label | F-068 |
| UI-sources-form-scan-method | How to check | **More options** › **How to check for openings** | 3 | as label | F-068 |
| UI-sources-form-query | Search query | Add a job-board search › **Search words** | 2 | as label | — |
| UI-sources-form-notes | Notes | **More options** › **Notes** | 3 | as label | — |
| UI-sources-form-enabled | Include in checks | **More options** › **Check this company for new openings** | 3 | as label | — |
| UI-sources-form-submit | Save | **Follow** / **Save** (errors next to fields) | 3 | as label | F-059 |
| UI-sources-form-cancel | Cancel | **Cancel** (clears errors, returns focus) | 3 | as label | F-059 |

### Skills

| ID | Capability | Place | Steps | Label | Closes |
|---|---|---|---|---|---|
| UI-skills-fetch | Fetch posting text | Skills › basis line › **Fetch posting text (12 missing)** | 2 | as label | F-071 |
| UI-skills-retry | Retry failed fetches | Skills › basis line › **Try the 3 failed postings again** | 2 | as label | — |
| UI-skills-extract | Read with Claude | Skills › **Improve the analysis** (cost and sessions stated) | 2 | as label | F-049 |
| UI-skills-run-log | Its log | Activity › the item | 2 | the item's name | — |
| UI-skills-help | Explain the page | Skills › **?** › Help, plus the basis line | 1 | **?** | F-049, F-055 |
| UI-skills-tab-learn | Learn next | Skills › **Learn next** (default) | 1 | **Learn next** | — |
| UI-skills-tab-deepen | Strengthen | Skills › **Strengthen** | 1 | **Strengthen** | — |
| UI-skills-tab-demanded | Most asked for | Skills › **Most asked for** | 1 | **Most asked for** | — |
| UI-skills-strong | Only good-fit jobs | Skills › **Only jobs I'd apply to (fit 4+)** with "showing 23 of 69" | 1 | as label | F-056 |
| UI-skills-show-ignored | Show ignored | Skills › **Show skills I ignored** | 1 | as label | — |
| UI-skills-category | Category filter | Skills › **Category** | 1 | as label | — |
| UI-skills-search | Find a skill | Skills › **Find a skill** (labelled) | 1 | as label | F-031 |
| UI-skills-expand | Evidence | Skills › row › **Show the evidence for Kubernetes** | 1 | as label | F-055, F-077 |
| UI-skills-status | Your CV status | Skills › row › **Your CV** select | 1 | "Your CV has Kubernetes: missing" | F-026, F-069 |
| UI-skills-reset | Reset status | Skills › row › **Undo** / **Back to automatic** | 2 | as label | F-069 |
| UI-skills-evidence-posting | Open a posting | Skills › evidence › company link ↗ | 2 | the company and role | — |
| UI-skills-evidence-report | Open a fit report | Skills › evidence › **Fit report: Cobalt Freight — Staff Software Engineer** | 2 | as label | — |
| UI-skills-cooccur | Related skills | Skills › evidence › **Often asked for together with** | 2 | as label | — |

### Activity (was Runs)

| ID | Capability | Place | Steps | Label | Closes |
|---|---|---|---|---|---|
| UI-runs-open | Open an activity | Activity panel or page › item link (keyboard) | 2 | "Check fit · Driftwood Analytics — Data Engineer" | F-003, F-005, F-009 |
| UI-runs-cancel | Cancel | Activity › working item › **Cancel** | 2 | as label | — |
| UI-runs-help | Explain activity | Activity › **?** › Help (why a check can fail, costs) | 2 | **?** | F-029 |

### My CV (was CV Studio)

| ID | Capability | Place | Steps | Label | Closes |
|---|---|---|---|---|---|
| UI-cv-document | Preview with a CV | My CV › Design › **Preview with** | 2 | "Cobalt Freight — Staff Software Engineer, Oct 4" | F-050, F-070 |
| UI-cv-accent | Colour | My CV › Design › Fine-tune › **Accent colour** | 3 | as label | F-031 |
| UI-cv-body-font | Body font | Fine-tune › **Body font** | 3 | as label | — |
| UI-cv-heading-font | Heading font | Fine-tune › **Heading font** | 3 | as label | — |
| UI-cv-font-size | Size | Fine-tune › **Text size** | 3 | as label | — |
| UI-cv-margin | Margin | Fine-tune › **Page margin** | 3 | as label | — |
| UI-cv-density | Density | Fine-tune › **Spacing** | 3 | as label | — |
| UI-cv-section-add | Section order | Fine-tune › **Section order** › **Add a section** (labelled) | 3 | as label | F-031, F-061 |
| UI-cv-section-move | Move a section | Fine-tune › **Move Experience up** / down | 3 | as label | F-026 |
| UI-cv-section-remove | Remove a section from the order | Fine-tune › **Remove Projects from the order** | 3 | as label | F-026 |
| UI-cv-save | Make default | My CV › Design › **Make this my design for every CV** | 2 | as label | F-019, F-060 |
| UI-cv-revert | Revert | My CV › Design › **Discard changes** | 2 | as label | F-060 |
| UI-cv-themes-refresh | Refresh the gallery | automatic after fine-tuning (with an "Updating…" state) | — | — | *No UI by design*: the gallery refreshes itself (F-070) |
| UI-cv-theme-pick | Pick a design | My CV › Design › Designs gallery card | 2 | "Executive · Readable by screening systems" | F-008, F-019 |
| UI-cv-render | Update the layout of one CV | Job › Documents › **Update the layout**; My CV › Design › **Update this CV's layout** | 3 | as label (says "no AI, wording unchanged") | F-041 |
| UI-cv-render-all | Update all CVs | My CV › Design › **Update existing CVs to this design (6)** | 2 | as label | F-019 |
| UI-cv-render-all-confirm | Confirm | an accessible confirm dialog that lists the effect | 3 | **Update 6 CVs** | F-019 |
| UI-cv-ats-notes | Screening details | My CV › Design › verdict › **Details**; Job › Documents › verdict › **Details** | 3 | **Details** | F-037, F-057 |
| UI-cv-voice-text | Edit all rules | My CV › Writing rules › **All rules** (labelled editor) | 2 | **All rules** | F-031, F-042 |
| UI-cv-voice-save | Save rules | **Add a word** (instant) / **Save** with an inline confirmation | 2 | as label | F-036 |
| UI-cv-voice-seed | Example rules | My CV › Writing rules › **Start from the example rules…** → confirm with backup and **Undo** | 3 | as label | F-002 |
| UI-cv-samples | Writing samples | My CV › Writing rules › **Writing samples** | 2 | as label | — |
| UI-cv-help | Explain My CV | My CV › **?** › Help (content, design, writing rules, screening) | 2 | **?** | F-029 |
| UI-cv-profile-warning | Profile overrides design | My CV › Design › notice "Your Profile sets the page size and photo. **Change in Profile**" | 2 | as label | — |

## 5. Upstream capabilities (outside the §12.6 metric)

| ID | Place in the IA | Status |
|---|---|---|
| U-oferta | Check fit (K-evaluate) | placed |
| U-pdf | Make tailored CV (K-pdf) | placed |
| U-cover | Write cover letter (K-cover) | placed |
| U-scan | Check for new openings (K-scan) | placed |
| U-tracker | Applications | placed |
| U-pipeline | To review › **Check fit for selected (N)** | placed (closes F-040) |
| U-batch | To review › Check fit for selected (queued within the concurrency limit) | placed, partial: no separate batch mode |
| U-upskill | Skills | placed |
| U-ats | Screening check on every document and design | placed, partial: no "check any PDF" upload. Post-v1 |
| U-integrity | Workspace › Tidy up | placed |
| U-set-status | Status with **When?** and **Add a note** | placed (closes F-075) |
| U-interview | Today › Get set up | placed (the M8 onboarding) |
| U-intake | — | out of scope v1: building a profile from documents is an agent mode; post-M9 |
| U-add | — | out of scope v1: adding a tracker row by hand is post-M9 (format risk §9.4) |
| U-expand | — | out of scope v1 |
| U-ofertas | — | out of scope v1: comparing offers, post-M9 |
| U-triage | — | out of scope v1 |
| U-deep | — | out of scope v1 |
| U-contacto | — | out of scope v1 |
| U-email | — | out of scope: §9.1 (the console never emails); drafting can come later as a document only |
| U-apply | — | out of scope: §9.1 and §10 (no auto-apply) |
| U-interview-prep | — | out of scope v1 |
| U-offer-prep | — | out of scope v1 |
| U-followup | — | out of scope v1 |
| U-reply-watch | — | out of scope v1 |
| U-outcome | — | out of scope v1 |
| U-stats | Applications › status chip counts; Today's counts | partial; full statistics post-v1 |
| U-titles | — | out of scope v1 |
| U-training | — | out of scope v1 |
| U-latex | — | out of scope v1 |
| U-discover | Companies › problem row › **Fix**; Workspace › **Find the right job board for a company** | placed |
| U-websearch | Companies › row "Checked by web search — not supported in the app yet" | shown, not run (as today) |
| U-agent-inbox | — | out of scope v1 |
| U-update | — | out of scope v1: M9 |
| U-language | My CV › Profile › **Output language** | placed |

## Totals

- **191 measured capabilities (R-, K-, C-, UI-):**
  - **180** have a place;
  - **11** are *no UI by design*, each with a reason: R-cv-preview-pdf, R-cv-thumbs,
    R-runs-start, R-events, R-static, K-merge-tracker, K-reconcile-auto,
    K-skills-fetch-auto, K-mark-pdf-ready, C-data-jsc and UI-cv-themes-refresh.

  Every placed capability is reachable in ≤ 3 steps from where a user would look, and is
  labelled in the glossary's words. The M6 baseline was 96 of 191 (50.3%).
- **35 upstream rows:**
  - 16 placed, partial or shown;
  - 19 out of scope, with the reason given.

`design.test.js` checks that every inventory id appears here once, and that each row has
a place or a reason.
