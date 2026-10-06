# Design brief (M7, step 1)

What the M7 design has to solve, taken only from the M6 evidence in `app/ux/`. It adds no
new research. Every requirement cites the backlog findings (`backlog.md`, F-IDs) it
closes. The directions (`directions.md`), the IA (`ia.md`) and the sitemap (`sitemap.md`)
are judged against this file.

## What M6 found, in one paragraph

The console does what it promises, but a user cannot tell where things live or what
happened. M6 measured the following.
- **Task success:** 77.8% simulated. T1 (first run) and T8 (recover a failed run) are at
  0/3.
- **Discoverability:** 50.3%.
- **Open severity-3/4 findings:** 22.
- **axe:** serious and critical failures in both colour schemes.

The causes are structural:
- the CV and the profile have no home;
- results arrive as developer logs;
- a run is disconnected from the job it was about;
- the report opens out of sight;
- actions on one object are spread across three pages, for example the inbox is filled
  on Pipeline and shown on Sources.

Restyling the five existing tabs would not fix this. The design has to change where
things are as well as how they look.

## Requirements by theme

Requirements are written as user needs (`N-`). Each lists the findings it closes. All 63
severity-2 to -4 findings (F-001 – F-063) appear exactly once below. The severity-3/4
ones are in **bold**. A few severity-1 findings share a row with the need that closes
them. All 16 severity-1 findings are listed at the end with the requirement that covers
them.

### 1. First run and getting started

| ID | The user needs | Closes |
|---|---|---|
| N-01 | To give the app their CV inside the app: paste text or pick a `.md`/`.txt` file. The result is shown back as "Your CV" and is editable later. | **F-001**, F-042 |
| N-02 | A first screen that says what to do first, in order (CV → companies or a job → first check), with each step done in place and ticked off. | **F-012** |
| N-03 | To add their first company from the page that tells them to. The first add creates the companies file silently. | **F-004** |
| N-04 | Every main action either works or says what is missing and links to it. No disabled button without a reason in view. | F-043, F-067 |
| N-05 | Form errors next to the field that caused them, gone once fixed or cancelled. | F-059 |

### 2. Activity: run feedback, failure and recovery

| ID | The user needs | Closes |
|---|---|---|
| N-06 | Every run named by what it is about: the company and role (or the CV, or "12 companies"), never a host name or a file glob. | **F-009** |
| N-07 | A failed run that says which job, why in plain words, whether trying again can help, and a **Try again** button right there. | **F-003** |
| N-08 | To learn that something they asked for failed, without knowing where to look: a persistent activity indicator, and a failure mark on the job itself. | **F-016** |
| N-09 | The job whose check failed marked as such wherever it can be retried (the to-review list, the job). Another item's unrelated error must not look like it. | **F-017** |
| N-10 | Feedback where they acted: "Started", then "Done", or "Failed, try again", in place. The item updates without leaving the page. | **F-013** |
| N-11 | A persistent sign of what is running, with a "done" that leads to the result, on every page. | F-028 |
| N-12 | To stay with the job they are working on after starting something. One consistent status everywhere. | F-034 |
| N-13 | To know, before starting, that an action uses the AI assistant (time and Claude usage), with protection against slips on paid actions. | F-038, F-066 |

### 3. Results in plain language

| ID | The user needs | Closes |
|---|---|---|
| N-14 | A finished check that states its outcome: company, role, fit score out of 5, the recommendation, "Added to your applications" (or "Updated the existing entry"), and an **Open** button. | **F-018** |
| N-15 | To know which application has a data problem, in words ("1 application could not be read: Quarry Systems, line 57"), and what to do. | **F-021** |
| N-16 | Help and messages in job-seeker terms that cover cost and failure. No file names, codes or CLI commands. | F-029 |
| N-17 | A plain summary of a check for new openings: how many are new, which ones, what went wrong, and what to do in the app. The raw log stays one click away. | F-046, F-074 |
| N-18 | The fit score in the job's detail, with its scale and how it was reached. | F-048 |
| N-19 | Skills numbers labelled where they are read: how many jobs, how fresh, required versus nice-to-have, and what improving the analysis costs. | F-049, F-055 |
| N-20 | To see what a filter changed, and whether counts include jobs they ruled out. | F-056 |
| N-21 | A duplicates preview that shows the actual pairs (dates, links) before anything merges. | F-062 |

### 4. Jobs: list and detail

| ID | The user needs | Closes |
|---|---|---|
| N-22 | Opening a job shows its details where they are looking: a side panel or its own page, never below 40 rows. | **F-010** |
| N-23 | To be told when a result was merged into an existing application, and what changed in it. | **F-015** |
| N-24 | The details they see always belong to a job they can see. A way back from an empty filter ("Clear filters"). | F-030 |
| N-25 | Each action named by what it produces ("Tailored CV", "Cover letter", "Check fit again"), with the same words in the row and the detail. | F-033, F-076 |
| N-26 | Two clearly different ways to add a job: "Check fit now" and "Save for later (to review)". Saved links are visible from the same place. | F-035 |
| N-27 | A status change that is visibly saved, can be undone, and does not make the row vanish without notice. Optionally, the date ("applied yesterday"). | F-047, F-075 |
| N-28 | Status names that say what they have done ("Reviewed — not applied", stored as upstream's `Evaluated`). | F-053 |

### 5. Documents and screening (ATS)

| ID | The user needs | Closes |
|---|---|---|
| N-29 | A CV that fails screening flagged wherever it is produced or listed, with a route to a passing design. A job whose tailored CV fails is never shown as plain "done". | **F-007** |
| N-30 | To open and download the documents they just made from where the app says they are done. Each document shows its job, date and file name. | **F-011** |
| N-31 | A plain screening verdict ("Screening systems can read this CV" / "… will lose part of it: the name and 3 headings"), with the details behind it. | F-037, F-057 |
| N-32 | A cover-letter form in plain words, with required fields marked, an honest question count and a warning before replacing a letter. | F-054 |
| N-33 | To know that a document is new and what it was made under: date, design and writing rules. | F-058 |

### 6. My CV: content, look and writing rules

| ID | The user needs | Closes |
|---|---|---|
| N-34 | Their existing writing rules protected. Loading the template is a separate, confirmed action with undo, never a one-click overwrite. | **F-002** |
| N-35 | One clear way to make a design the default for every CV, a confirmation in view, and a statement of what "update all CVs" will change. | **F-019** |
| N-36 | Confirmation of a save where they clicked, plus what happens next ("applies to the next tailored CV or letter"). | F-036 |
| N-37 | To know which action applies new writing rules: a new tailored CV, not a re-layout. | F-041 |
| N-38 | To pick a CV by company and role, not by file slug. | F-050 |
| N-39 | A warning before leaving with unsaved design changes. | F-060 |
| N-40 | To see which saved settings were applied and why. No unrequested reorder without saying so. | F-061 |

### 7. Companies you follow and the to-review list

| ID | The user needs | Closes |
|---|---|---|
| N-41 | A way back from removing a company (undo or confirm). | F-039 |
| N-42 | To triage saved and found postings: dismiss, check one, check several. | F-040 |
| N-43 | To see what is new since they last looked, with new postings marked. | F-051 |
| N-44 | To know when a company's job board last worked and how to fix a broken one, from where it is shown. | F-052 |

### 8. Accessibility and layout (WCAG 2.2 AA)

| ID | The user needs | Closes |
|---|---|---|
| N-45 | Every run, and especially a failed one, openable by keyboard, with its job and cause in the row. | **F-005** |
| N-46 | Run state changes and save results announced to assistive technology (a polite live region where the user works). | **F-006** |
| N-47 | Primary actions and failure badges readable in both colour schemes: 4.5:1 for text, 3:1 for UI. | **F-008**, F-063 |
| N-48 | To open any job's details and sort the list by keyboard. | **F-014** |
| N-49 | Dialogs that take focus, trap it, close on Escape and return focus. | **F-020** |
| N-50 | To choose a status before it is saved (no save on arrow keys). | **F-022** |
| N-51 | Every control reachable at any width down to 320 px (reflow), with no sideways page scroll. | F-023 |
| N-52 | A visible focus ring on every control in both schemes. | F-024 |
| N-53 | A main landmark, a skip link, ordered headings and a page title for each page. | F-025 |
| N-54 | Each repeated control names its item ("Cover letter for Granite Cloud — Software Engineer, Payments"). | F-026 |
| N-55 | Focus kept on, or moved to, a sensible place after every action. | F-027 |
| N-56 | Every field labelled with what it is. | F-031 |
| N-57 | Visible boundaries on inputs, selects and chips (3:1). | F-032 |
| N-58 | Tabs that behave as tabs (panels, arrow keys), or plain links instead. | F-044 |
| N-59 | Time to act on a message: nothing important lives only in a toast that disappears. | F-045 |

### Severity-1 findings (covered where they fall, not gating)

| Finding | Covered by |
|---|---|
| F-064 page keeps the old scroll position | N-53 (each page opens at its top) |
| F-065 logs show prompt internals | N-14, N-17 (outcome first, raw log behind "Details") |
| F-066 automatic follow-on runs | N-13 |
| F-067 malformed URL keeps buttons disabled silently | N-04 |
| F-068 the source form opens at the bottom with every advanced field | N-03 (name and careers link first, the rest under "More options") |
| F-069 skill status change vanishes with no undo | N-27 pattern (undo toast plus a link to where it went) |
| F-070 stale preview while switching CVs | N-33 (an "Updating…" state on the preview) |
| F-071 an empty Skills page reads as a success | N-02 (empty states say what to do first) |
| F-072 no route to "check for new openings" | N-43 (a top-level entry) |
| F-073 writing rules are hidden under looks | N-37 (writing rules get their own section) |
| F-074 scan summary dates disagree | N-17 |
| F-075 cannot record when you applied | N-27 |
| F-076 small buttons inside clickable rows | N-25 |
| F-077 a skill's evidence list is unexplained | N-19 |
| F-078 "Learn next" ignores the direction you want | N-19 (relevance to targets, from the profile, shown when known) |
| F-079 a banned word means editing the whole rules file | N-34 (an "Add a word to avoid" field that appends to `voice-dna.md`) |

## Object model

The IA is organised around these objects. "Stored in" names the data contract, which
stays unchanged (§9.4).

| Object (user's word) | What it is | Stored in | States the UI must draw | Actions |
|---|---|---|---|---|
| **Job** (an application) | One role at one company the user is considering or has applied to | `data/applications.md` row plus its report | not checked · checking (minutes) · checked (score, recommendation) · check failed · data problem | open, check fit again, set status (+ date), tailored CV, cover letter, open posting |
| **Fit report** | The A–G assessment of a job | `reports/NNN-*.md` | present · missing · (orphan: report without a job) | read, see score and how it was reached |
| **Document** | A tailored CV PDF or a cover letter for a job | `output/*.pdf`, `output/cv-*.json`, `data/pdf-index.tsv` | none · making · ready (date, design, rules) · screening fail · failed | open, download, make again |
| **Posting to review** | A link waiting to be checked: found by a scan or saved by the user | `data/pipeline.md` | new since last look · waiting · check failed · posting unreadable · done | check fit, check several, dismiss, open link |
| **Company you follow** | A source the scan watches (a company's board or a job board) | `portals.yml` | active · paused · board not found / last worked on <date> | add, edit, pause, remove (undo), check now |
| **Activity** (a run) | Anything the app is doing for the user: checks, documents, scans, analyses | in memory + `data/jsc/logs/` | queued · working (elapsed, can take minutes) · done (outcome) · failed (cause, can retry) · cancelled | open, see the outcome, try again, cancel, see the raw log |
| **Your CV** | The master CV every document is tailored from | `cv.md` | missing · present (last edited) | paste or import, edit, preview |
| **Profile** | Targets, location, compensation, language and the auto-PDF threshold | `config/profile.yml` | missing · partial · complete | edit fields |
| **Design** | The look of every CV: theme plus fine-tuning | `config/cv/style.yml`, `config/cv/templates/` | saved · unsaved changes · screening pass/warn/fail | preview, pick, fine-tune, make default, update all CVs |
| **Writing rules** | Words and habits the assistant must follow or avoid | `voice-dna.md`, `writing-samples/` | missing · present | add a word to avoid, edit, load the template (confirmed), view samples |
| **Skill** | A skill employers ask for, with the evidence behind it | `data/skills/` | have · partial · missing · ignored | see evidence, set status, reset |
| **Workspace** | The folder the console reads, and its health | data root, `/api/health` | healthy · issues (each in words) | see folder, see issues, tidy up (duplicates, checks) |

## Label glossary

Engine term → the word on screen. The right-hand column comes from the persona
transcripts (`runs/*/transcript.md`) and the task goals, which were written in the
user's words. Stored values never change; only the label does.

| Engine / current label | On screen | Evidence |
|---|---|---|
| Pipeline (page), tracker | **Applications** | Goals say "your job applications", "your records"; P1 says "tracker" (kept in help) |
| Evaluate, Evaluate now, oferta | **Check fit** / "Check fit now" | T2 goal: "find out how well it fits you"; P2 and P3 never used "evaluate" |
| Re-evaluate | **Check fit again** | |
| Report, A–G report | **Fit report** | P3: "file paths, 'A–G report'… expected plain job-search language" |
| Score 4.1/5 | **Fit 4.1 / 5** | P2: "I expected '4.1 / 5' or a short explanation" |
| Decision | **Recommendation** (Apply · Consider · Skip) | |
| Status `Evaluated` | **Reviewed — not applied** | F-053; T3 "had not done anything about yet" |
| Inbox, pipeline.md | **To review** | P1: "pending job links"; F-035 |
| Add to inbox | **Save for later** | |
| Sources, portals | **Companies you follow** | T1/T4 goals: "companies you follow", "keep an eye on" (10 uses of "follow") |
| Scan now | **Check for new openings** | T4 goal: "check whether any new openings have appeared" |
| Job boards (query sources) | **Job board searches** | |
| Runs | **Activity** | Testers looked for "what happened"; "Runs" was guessed, not recognised |
| PDF, PDF ↻, Regenerate PDF | **Tailored CV** / "Make tailored CV" / "Make it again" | F-033; P2 doubted "standard template" meant tailored |
| Cover | **Cover letter** | |
| Render, Render this CV | **Update the PDF** (layout only, no AI) | F-041 |
| Re-render all in this theme | **Apply this design to all my CVs** | F-019; P2 feared overwriting |
| CV Studio | **My CV** (sections: Content · Design · Writing rules) | Testers looked here first for "upload my CV" |
| Theme | **Design** | T7 goal: "give it a different design" |
| Style tokens, Look | **Fine-tune** (colour, fonts, spacing) | |
| Voice, voice-dna.md | **Writing rules** | T9 goal: "writing rules you already set up" |
| Seed from template | **Start from the example rules…** (confirmed) | F-002 |
| ATS check passed / failed | **Screening check: readable** / **Screening check: problems** (ATS named in help) | P3: "I wanted a plain yes or no" |
| Learn next / Deepen / Most demanded | kept: **Learn next**, **Strengthen**, **Most asked for** | All T6 personas understood "Learn next" |
| Read N postings with Claude | **Improve the analysis (uses Claude, ~N min)** | F-049 |
| Dedup | **Find duplicate applications** | |
| Reconcile, Verify pipeline, Validate, Probe | **Check my list for problems**, **Check companies' job boards** | Inventory: "engineering vocabulary" |
| row-unparseable, tracker-missing, portals-missing | A sentence naming the item and the next step | F-012, F-021 |
| cv.md, profile.yml, data directory | **Your CV**, **Your profile**, **Workspace folder** (file names in help only) | P2/P3 did not know "cv.md" |
| Agent, headless session, claude -p | **The AI assistant (Claude)**, with "uses your Claude plan" | P1 wanted to know cost before starting |
| Lane, exclusive, exit 1, report NNN | Hidden; shown only in "Technical details" | F-009 |

## Constraints

1. **Human-in-the-loop (§9.1).** The app never sends, applies or submits. Documents end
   in "Open" and "Download"; sending stays with the user.
2. **Local only (§9.2).** No external fonts, CDNs or analytics in the shipped UI.
   Prototypes follow the same rule.
3. **Data contract unchanged (§9.4, §12.7).** New screens read and write the same files.
   - "Paste your CV" writes `cv.md`.
   - "Add a word to avoid" appends to `voice-dna.md`.
   - Status labels map onto upstream's `templates/states.yml`.
   - The first company creates `portals.yml` in upstream's format.
4. **Desktop-first, reflowing to 320 px.** Mobile is out of scope (§10), but WCAG 1.4.10
   reflow is not.
5. **Both colour schemes.** Text reaches 4.5:1, UI boundaries and focus 3:1, checked as
   numbers in `tokens.css`.
6. **WCAG 2.2 AA.**
   - Keyboard for everything.
   - Visible focus that is never obscured (2.4.11).
   - Targets of at least 24×24 px (2.5.8).
   - No information in a toast alone.
7. **Discoverability (§12.6).** Every capability is reachable in ≤ 3 interactions from
   where a user would look, labelled in the user's words. Internal mechanisms are marked
   "no UI by design" in the sitemap, with a reason.
8. **Prototypes use only fictional data (§12.4):** Alex Rivera and the sandbox's
   fictional companies.
9. **No code in M7.** `app/ui/src/` and `app/server/` are untouched; M8 implements.
