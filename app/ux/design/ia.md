# Information architecture (M7, step 4)

The chosen direction is **C + A patterns**: a **Today** home of next actions (direction C)
over object workspaces with A's density, a coloured Activity indicator and its document
cards. Chosen by the maintainer at checkpoint 1 (see `decisions.md`). Evidence for the
choice is in `directions.md` and `directions-walkthrough.md`. Every capability's place is
listed in `sitemap.md`. The look is in `tokens.css`.

This document is the spec M8 builds from. Labels in **bold** are the exact on-screen
words. They follow the glossary in `brief.md`, with the changes noted below.

## 1. Navigation model

```
┌ Top bar (every page) ───────────────────────────────────────────────────────────┐
│ Job Search Console   Today  Applications  To review  Companies  Skills  My CV   │
│                                       [Find a job, company or document…]  [Activity · 1 failed]  [Workspace] │
└─────────────────────────────────────────────────────────────────────────────────┘
```

- **Six destinations**, always visible on wide screens, in this order: **Today**,
  **Applications**, **To review**, **Companies**, **Skills**, **My CV**.
  - Each shows a count only when the count needs attention: To review (new items),
    Companies (boards that are not working).
  - `aria-current="page"` marks the current one.
- **Search** ("Find a job, company or document") is an accessible combobox. It matches:
  - jobs (company and role);
  - companies;
  - documents (tailored CVs and letters, by company);
  - destinations and actions ("Check for new openings", "Writing rules").

  Enter opens the result.
- **Activity** is a button with a state. Its colour and label change:

  | State | Label | Colour |
  |---|---|---|
  | quiet | **Activity** | neutral |
  | running | **Activity · 2 working** | accent outline |
  | failed | **Activity · 1 failed** | filled `--danger`, white text |
  | finished since last opened | **Activity · 1 done** | `--success` outline |

  It opens the **Activity panel**: a non-modal side sheet laid *over* the right edge of
  the page (position fixed). It never takes space in the layout, so it can never drop
  below the content (fixes PW-A-T8-02). Focus moves into the panel and Escape closes it,
  returning focus to the button. **See all activity** links to the Activity page.
- **Workspace** (a link at the far right) holds the folder, the health of the data, the
  tidy-up tools, the assistant's status, and help.
- **Reflow.** Below 960 px the six destinations collapse into a **Menu** disclosure
  button, and search becomes an icon button that opens the field. Activity and Workspace
  stay. At 320 px every page is one column with no sideways scroll. Wide tables become
  lists of rows with labelled values (§5, Applications).
- **Hash routes** are kept (the current router). Every page and every job has its own URL,
  so a refresh or a link from Today lands in the same place.

| Route | Page | Title (`<title>` = "<page> — Job Search Console") |
|---|---|---|
| `#/today` (default) | Today | Today |
| `#/applications` | Applications list | Applications |
| `#/applications/:id` | One job | "<Company> — <Role>" |
| `#/to-review` | To review | To review |
| `#/companies` | Companies you follow | Companies |
| `#/skills/learn` · `/strengthen` · `/asked` | Skills (three views) | Skills |
| `#/my-cv/content` · `/profile` · `/design` · `/writing` | My CV (four sections) | My CV |
| `#/activity` · `#/activity/:id` | Activity history, one activity | Activity |
| `#/workspace` | Workspace | Workspace |
| `#/help` (+ `#/help/<topic>`) | Help | Help |

Old routes (`#/pipeline`, `#/pipeline/:id`, `#/sources`, `#/runs`, `#/runs/:id`, `#/cv`)
redirect to their new homes, so links in old notes keep working.

## 2. Pages

### 2.1 Today (`#/today`)

The landing page. It answers "what needs me?" and holds only cards backed by real data.
Every card has a permanent home in a workspace, so dismissing a card never hides a
capability.

**Day one (set-up).** Today shows **Get set up** as long as any of these is missing. Each
step completes in place. Its saved state is summarised and links to its home.
1. **Add your CV**: paste text or **Choose a file…** (.md or .txt). Writes `cv.md`. Done
   shows "Saved: Alex Rivera · Summary, Experience (2 roles), Education, Skills · **Edit
   in My CV**". Reopening a finished step shows the saved CV, never an empty box.
2. **Follow a company**: **Company name** and **Careers page link**. The first follow
   creates `portals.yml` in upstream's format. Done shows "Following Kestrel Media ·
   Greenhouse job board found · 6 open roles" or, on failure, the problem and the fix.
3. **AI assistant**: checked automatically through `/api/agent/status`.
   - **Ready:** "Claude Code is installed and signed in. Each check takes 2–5 minutes
     and uses your Claude plan."
   - **Missing:** "Claude Code was not found", with **How to install it** (help) and
     **Check again**.

   Set-up never blocks the rest of the app. The other pages work and show their own empty
   states.

After set-up, the first card is **Check your first job**: a link field with **Check fit
now** and **Save for later**. It stays until a job exists.

**Every day.** Cards in this fixed order. Empty groups are not shown.

| Group | Card | Data it relies on | Action(s) | Home |
|---|---|---|---|---|
| **Needs you** | A check, document or scan **didn't finish**: the job's name, the plain cause, whether retrying helps | failed runs (in memory plus `data/jsc/logs/`) | **Try again** · **Open the posting** · **Technical details** · **Dismiss** (with Undo) | Activity |
| | **1 application could not be read**: "Quarry Systems, line 57: the score column is empty" | `/api/health` parse issues | **Show me** (Workspace › Data health) | Workspace |
| | **Your CV design fails the screening check**, so PDFs made with it lose the name and headings | `style.yml` theme plus the ATS record | **Choose a design that passes** | My CV › Design |
| | **A company's job board isn't working**: "Juniper Mobility: board not found since Oct 2" | `portal-health.tsv` | **Fix Juniper Mobility** | Companies |
| **New since you last looked** | **4 new openings** at the companies you follow, naming them | inbox entries newer than `data/jsc/today.json` `lastSeen` | **Look at the 4 openings** | To review |
| **Waiting for you** | **2 jobs replied or are interviewing without a tailored CV or letter** | status Responded or Interview, plus `pdf-index.tsv` and the covers index | **Get documents ready** (opens that job's Documents) | Applications › job |
| | **9 jobs reviewed but not applied**, best first (top 3 named with fit) | status Evaluated | **Review them** (Applications filtered) | Applications |
| **Working now** | Anything running, with elapsed time | runs | **Open** | Activity |

- **"Last looked".** `lastSeen` is written to `data/jsc/today.json`, the fork's own state
  (not the data contract), when the user leaves Today. Dismissed cards are recorded there
  too, by run id.
- **No invented facts.** Interview dates or recruiter screens are never shown unless the
  user typed them. Notes are shown as notes, never parsed.

### 2.2 Applications (`#/applications`)

The tracker: dense, sortable and filterable. It is P1's home.

- **Header.**
  - **Add a job**: a link field with **Check fit now** (primary) and **Save for later**.
  - Under the field, one line says what each does: "Check fit now: the assistant writes a
    fit report, 2–5 min, uses your Claude plan. Save for later: keeps the link in To
    review."
  - A disclosure, **Also make a tailored CV if the fit is 3.5 or more**, replaces the
    pre-ticked "PDF if score ≥ 3.5". It shows the profile's threshold and is linked to
    Profile.
  - An invalid link gets an inline error naming the problem.
- **Filters.**
  - Status chips, one per status in use, with counts; nothing is hidden.
  - **Fit** (Any · 4 and up · 3.5 and up · under 3).
  - Search ("Company, role or note").
  - **Clear filters** appears whenever a filter is on, and also inside the "no results"
    state.
- **Table** (React Aria `Table`, keyboard rows). Columns:
  - **#**;
  - **Company and role**, as a link to the job page;
  - **Fit** (e.g. "4.1");
  - **Recommendation**;
  - **Status**, as a select that commits only on choose;
  - **Documents** ("CV, letter", or "CV · fails screening" in `--danger`);
  - **Checked** (date);
  - **Actions**, a row menu: **Make tailored CV**, **Write cover letter**, **Check fit
    again**, **Open the posting**.

  The row's accessible names include the job ("Status for Granite Cloud — Software
  Engineer, Payments"). Sort is on the column headers.
- **Opening a job** goes to its own page (`#/applications/:id`), never below the list.
  The browser's Back and **← Applications** restore the list's filters and scroll
  position.
- **Status change.** Saved at once with an inline confirmation ("Saved: Applied ·
  **Undo**"). The confirmation is announced. A row that leaves the current filter stays
  greyed in place with "Moved to Applied" until the next filter change, so it never
  vanishes silently.
  - Choosing **Applied** offers **When?** (Today / Yesterday / pick a date), which is
    sent as `on`.
  - **Add a note** sends `note`.
- **New or merged rows.** A result merged into an existing row shows the badge
  **Updated** and "Merged into #21: score 3.3 → 4.1, posting link changed" (F-015).
- **Tidy up** (a menu in the header): **Find duplicate applications** (preview of the
  pairs, then confirm) and **Check my list for problems**. Both also live in Workspace.
- **Narrow screens.** Each row becomes a list item ("Granite Cloud — Software Engineer,
  Payments · Fit 4.1 · Responded"), with Status and the actions menu below it.

### 2.3 One job (`#/applications/:id`)

A full page. Sections in this order, each a heading with its own anchor:

1. **Summary.** The header holds:
   - company and role;
   - **Fit 4.1 / 5** · **Recommendation: Apply**, with "How the fit is worked out" (help)
     beside it;
   - **Status**, with Undo;
   - **Open the posting ↗**;
   - **Check fit again** (states the cost).

   If the last check failed, a **Needs you** box sits here with **Try again**.
2. **Documents.** Two cards (from direction A):
   - **Tailored CV.** Not made yet: **Make tailored CV** ("your CV rewritten for this
     role in your default design, Executive · about 3 min · uses your Claude plan").
     Working: progress, "you can leave this page". Ready:
     "cv-alex-rivera-granitecloud-006.pdf · made Oct 6, 10:42 · Executive design · your
     writing rules of Oct 6", then **Screening check: readable** (or the failure in
     words, with **Choose a design that passes**), then **Open**, **Download** and **Make
     it again**.
   - **Cover letter.** Not made yet: **Write cover letter** opens the form inline:
     - **Why this role? (required)**;
     - **What problem would you solve? (required)**;
     - **How would you start? (required)**;
     - **Tone**;
     - **Write the letter** · **Cancel**.

     Replacing an existing letter asks "Replace the letter of Oct 1?". Ready: file name,
     date and tone, then **Open** and **Download**.
   - Under both cards: "You send these yourself; the app never applies or emails for
     you." When the status is Reviewed — not applied, add **I've sent my application**,
     which sets Applied with the date (from direction B).
3. **Fit report.** Sections A–G rendered, with the score explained at the top.
4. **History.** Status changes (`status-log.tsv`) and this job's activity (checks,
   documents) with outcomes.

### 2.4 To review (`#/to-review`)

Links waiting to be checked: found by scans or saved by the user (`data/pipeline.md`).

- **Header.**
  - **Check for new openings** (primary), with "Last checked Oct 6, 08:10 · 12 companies"
    and an **Options** disclosure: only one company · only the last N days · preview
    without saving · confirm each posting is still live.
  - A summary of the last check in words: "4 new · 1 board couldn't be reached (Juniper
    Mobility, **Fix**) · **Technical details**".
- **List.** Each item shows:
  - company, role and location;
  - **New** since last looked;
  - **Last check failed**, with the cause and **Try again** (F-017);
  - **Posting couldn't be read**, with "Try again or remove it".

  Each item has a checkbox. Per item: **Check fit**, **Open the posting ↗** and **Remove**
  (with Undo). Bulk: **Check fit for selected (N)**, which states the total time and cost,
  and **Remove selected**.
- A disclosure, **Already checked**, holds the processed entries.
- **Tidy up**: **Remove links that are already in Applications** (the reconcile preview,
  then confirm).

### 2.5 Companies (`#/companies`)

Companies you follow and job-board searches (`portals.yml`).

- **Header:** **Follow a company** (primary), **Add a job-board search**, and **Check for
  new openings** (the same action as To review).
- **List.** Each company shows:
  - name and board type;
  - **On / Paused** (a switch, named "Check Kestrel Media for new openings");
  - **Last worked** (date) or the problem in words ("Board not found since Oct 2"), with
    **Fix** (the probe suggestion);
  - **Edit** and **Remove** (with Undo; `portals.yml.bak` remains as well).
- **Follow a company form** (a side sheet):
  - **Company name** and **Careers page link** first;
  - **More options** (board type, API endpoint, how to check, search query, notes);
  - errors shown next to the field.
- **What jobs to keep** (title, location and salary filters): shown in words, and
  editable in M8 if upstream's format round-trips; otherwise read-only with "Edit
  portals.yml" help.
- **Check companies' job boards** (validate and verify): a button with the result in
  words.

### 2.6 Skills (`#/skills/…`)

The three views as links with `aria-current` (not tabs):
- **Learn next**;
- **Strengthen** (was "Deepen");
- **Most asked for** (was "Most demanded").

- **Basis line.** "Based on 69 postings from 12 companies, read Oct 6 · 52 read by Claude,
  17 by quick rules · **Improve the analysis** (reads 17 postings with Claude, about 4
  sessions, uses your Claude plan)".
- **Filters:**
  - **Only jobs I'd apply to (fit 4+)**, which shows what it changed ("Counting only the
    14 postings whose fit is 4 or more"). The filter applies to **everything** in a row:
    - the count and its required / nice-to-have split;
    - the evidence (postings and fit reports);
    - the ranking.

    Skills with no matching posting are hidden, and the page says how many (closes
    WP-T6-01 from the M7 walkthrough);
  - **Show skills I ignored**;
  - **Category**;
  - **Find a skill**.
- **Each skill row:**
  - name;
  - **Asked for in 22 postings (12 required, 10 nice to have)**;
  - a bar with an axis label;
  - **Your CV: missing / partly / has it**, as a select named after the skill;
  - expand: postings by company, each a link with its fit when known; reports that flag
    it as a gap, named with their number and fit so two jobs with the same title can be
    told apart; and "often asked together with…".
- **Ranking.** Always by the count shown (more "required" first on a tie). The sentence
  above the list says so in those words.
- **Basis line.** Shows the date the postings were last read, which updates after
  **Improve the analysis**, and accounts for every posting ("… 3 couldn't be loaded").

  A status change confirms with "Moved to Have · **Undo**".

### 2.7 My CV (`#/my-cv/…`)

Four sections as sub-navigation links:

- **Content** (`cv.md`). A Markdown editor with a preview, **Save**, and **Import from a
  file**. Shows the last edited date. This is the home of N-01.
- **Profile** (`config/profile.yml`). Fields grouped as:
  - About you (name, location);
  - What you're looking for (target roles, remote, compensation);
  - How the app works for you (**Make a tailored CV automatically when the fit is at
    least** [3.5], output language, Claude usage tier).

  Saves round-trip through YAML, and unknown keys are kept. Advanced files
  (`modes/_profile.md`, `article-digest.md`) are listed with their purpose and "edit in
  your editor" (no UI by design in v1; see the sitemap).
- **Design** (`config/cv/style.yml`; the old CV Studio "look"):
  - **Preview with**: a select naming CVs by job ("Cobalt Freight — Staff Software
    Engineer, Oct 4").
  - The preview shows "Updating…" while it renders.
  - The **Designs** gallery: each card shows **Readable by screening systems** /
    **Readable, 2 small issues** / **Screening problems**.
  - **Fine-tune** (colour, fonts, size, margin, density, section order; every field
    labelled).
  - **Make this my design for every CV** (primary). It confirms "Executive is now your
    design for every new CV". **Update existing CVs to this design (6)** follows with a
    confirm dialog that lists what changes ("re-lays out 6 PDFs; wording does not
    change").
  - **Unsaved changes** warns before leaving.
  - A screening failure shows a 3-line diagnosis ("the name and 3 headings are lost")
    with **Show designs that pass**. The full notes sit behind **Details**.
- **Writing rules** (`voice-dna.md`, `writing-samples/`):
  - **Words to avoid**: chips with **Add a word** (appended under `## Never write`) and ×
    to remove, so the file is never rewritten wholesale.
  - **All rules**: a full editor, **Save**.
  - **Writing samples**: a list with **Open**.
  - **Start from the example rules…**: a confirm dialog ("Replaces your 14 rules. Your
    current rules are kept as voice-dna.md.bak"), with **Undo**.
  - **"These rules apply to the next tailored CV or letter. Already-made documents keep
    their wording."** It links to **Make tailored CVs again** for selected jobs.

### 2.8 Activity (panel, `#/activity`, `#/activity/:id`)

Every run, named by what it is about:
- "Check fit · Driftwood Analytics — Data Engineer";
- "Tailored CV · Granite Cloud — Software Engineer, Payments";
- "Check for new openings · 12 companies";
- "Update design · 6 CVs".

| State | Shows |
|---|---|
| Waiting | "Waiting — 2 others are running" |
| Working | elapsed time, "usually 2–5 min", **Cancel** |
| Done | the outcome in words plus **Open** (the job, the document, the 4 new openings) |
| Failed | **What happened**, **What to do**, **Try again** (re-queues with the same options), **Open the posting**, **Technical details** (lane, exit code, log path, raw log) |

- Automatic follow-ons (merge, tailored CV at fit ≥ 3.5, reconcile) are nested under the
  activity that started them: "then: added to Applications, made tailored CV".
- The panel shows **Now** and **Earlier today**.
- The page `#/activity` shows the full history with filters (Failed, Documents, Checks,
  Openings) and a note that the history since the app started is kept for this session,
  with older logs in the workspace folder.
- Rows are links (keyboard and screen reader).

### 2.9 Workspace (`#/workspace`)

- **Folder**: the path in use (`/api/health`), with counts (40 applications, 41 fit
  reports, 6 tailored CVs).
- **Data health**: each issue in words, with the line and what to do.
- **Tidy up**:
  - **Find duplicate applications**;
  - **Remove links already in Applications**;
  - **Check my list for problems**;
  - **Check companies' job boards**;
  - **Find the right job board for a company**.

  Each has a preview first where upstream supports it, then a confirm.
- **AI assistant**: found or not, the path, the number of checks at once (read-only until
  M9).
- **Help**: links to the help topics.

### 2.10 Help (`#/help`)

Short topics in job-seeker words, linked from **?** buttons in context:
- how the fit is worked out;
- what a check costs and why it takes minutes;
- why a check can fail and what to do;
- the screening (ATS) check;
- writing rules;
- what the app never does (apply or email);
- files in your workspace folder (for P1).

## 3. Global patterns

| Pattern | Rule | Closes |
|---|---|---|
| **Run feedback** | Starting an action shows "Started" inline where the user clicked, the button becomes the in-progress state, and the Activity button counts it. Done or failed updates the same spot, the Activity panel and the global live region. Nothing important lives only in a toast. | F-006, F-013, F-028, F-045, N-10–N-12 |
| **Announcements** | One polite live region in the app shell, always mounted. Messages name the item ("Tailored CV for Granite Cloud is ready"). Failures use the assertive region. | F-006, PW-A-T8-04 |
| **Focus** | After an action that replaces its own button, focus moves to the new state's heading or primary action (e.g. after **Save my CV**, the "Saved" line's **Edit in My CV**). Dialogs and sheets trap focus, close on Escape and return focus. Page changes move focus to the page `<h1>`. | F-020, F-027, PW-*-01 |
| **Costs and slips** | Every action that calls the assistant states the time and that it uses the Claude plan, beside the button. Bulk or repeat paid actions (more than one job, Check fit again on a closed job) confirm with the count. | F-038, F-066, N-13 |
| **Destructive actions** | Remove, Replace and Start from the example rules confirm (dialog) or offer **Undo** for 10 s, and the undo stays in the Activity panel until the next action. Upstream's `.bak` files are kept. | F-002, F-039, F-069 |
| **Empty states** | Say what this page is for, what to do first, and link to it. Never present a disabled main action without the reason in view. | F-012, F-043, F-071, N-04 |
| **Errors** | Next to the field or the card that caused them, in words, gone once fixed. Codes and paths only under **Technical details**. | F-021, F-029, F-059 |
| **Documents** | Always show the job, file name, date, design, writing-rules date and screening verdict, with **Open** (new tab) and **Download**. | F-011, F-033, F-058 |
| **Merged results** | Badge **Updated** and a sentence on what changed. | F-015 |
| **Labels** | The brief's glossary, plus the status labels below. Repeated controls carry the item's name. | F-026, F-053 |
| **Placeholders** | Neutral examples ("https://…/jobs/123"), never the user's own data. | PW-A-T1-02 |
| **Skip link** | First focusable element, visible on focus: **Skip to content**. | F-025, PW-A-T1-03 |

**Status labels** (stored values unchanged; `templates/states.yml` stays the source):

| Stored | Shown |
|---|---|
| Evaluated | **Reviewed — not applied** |
| Applied | **Applied** |
| Responded | **They replied** |
| Interview | **Interviewing** |
| Offer | **Offer** |
| Rejected | **Rejected** |
| Discarded | **Not for me** |
| SKIP | **Skipped — don't apply** |
| Hired | **Hired** |

**Glossary changes from `brief.md`.** "Recommendation" is used everywhere (not
"suggestion"). The inbox is **To review** (not "Openings"). The search is **Find a job,
company or document**.

## 4. First run without changing file formats

| Step | Writes | Format check |
|---|---|---|
| Add your CV | `cv.md` (text as given; a `.md`/`.txt` file is read in the browser and sent as text) | upstream reads it as-is |
| Follow a company | creates `portals.yml` with `tracked_companies: [ {name, careers_url, enabled: true} ]` and upstream's default `title_filter` block from `templates/portals.example.yml` | `validate-portals.mjs` passes |
| AI assistant | nothing (reads `/api/agent/status`) | — |
| First check | `data/pipeline.md` (upstream creates `applications.md` on merge) | unchanged |

## 5. Layout

- **Shell.** The top bar is 56 px. Content sits in a `max-width: 1200px` container with
  `--space-6` gutters (`--space-4` below 600 px).
- **Applications.**
  - At 1024 px and above: full table.
  - Between 600 and 1023 px: Documents and Checked are hidden; the Actions menu stays.
  - Below 600 px: list items.
- **Job page.**
  - At 1024 px and above: Summary and Documents side by side, the report below.
  - Narrower: one column.
- **Activity panel.**
  - At 600 px and above: a 400 px fixed overlay sheet from the right.
  - Below 600 px: full-screen.
- **Targets.** At least 24 × 24 px everywhere (WCAG 2.5.8). Primary buttons are 40 px
  tall.
