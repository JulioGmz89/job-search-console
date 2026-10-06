# M7 step 3: paper cognitive walkthrough of directions A, B and C

Saved verbatim from the `heuristic-evaluator` reply, because subagents return reports as
text. Inputs:
- `brief.md`;
- the T1, T5 and T8 goals and success criteria in `../tasks.md`;
- `../personas.md`;
- `../backlog.md`;
- the ten artboards in `directions/`.

No browser was used. The evidence is the quoted markup and the state logic.

**Caveats that apply to every direction (they affect how much to trust the "success" calls):**
- **Placeholders hold the task's answers.** In all three T1 artboards, and in A-T5 and B-T5,
  the placeholder text is the task's own input: "# Alex Rivera…", "Kestrel Media", the
  Greenhouse URL, and "Settlements that arrive late or fail." On paper this makes success
  look likelier than it is. Shipped, it would lead users to think a field is already
  filled in.
- **Several states are drawn in no direction:**
  - a validation error (N-05);
  - a CV that fails the screening check (F-007);
  - a result merged into an existing application (F-015);
  - Claude Code not installed or not signed in;
  - the dark colour scheme.
- **Focus is lost in every direction.** The button the user presses is removed when its
  block switches state, and nothing says where focus goes next. Keyboard and
  screen-reader users land on `<body>` after Save my CV, Try again, Make tailored CV and
  Write the letter (N-55, severity 2).
- **Reflow at 320 px will break in every direction.** Fixed multi-column grids appear in
  A-T1, B-T1, B-T5, B-T8, C-T1 and C-T5 (N-51, severity 2).
- **Skip links are missing or invisible.** Only A-T1 has one, and it sits at
  `left:-9999px` with no focus style, so it never becomes visible. B and C have none
  (N-53, severity 2).

---

## 1. Summary table

S = success, SwD = success with difficulty, F = fail. "Highest" is the highest-severity
issue in that cell.

| Direction | Task | P1 migrant | P2 first-timer | P3 career-changer | Highest |
|---|---|---|---|---|---|
| **A Workbench** | T1 first run | S | S | S | 2: focus loss, placeholders that look filled in |
| | T8 recover | S | SwD | SwD | **3**: below about 1040 px the Activity tray drops below the table, out of sight |
| | T5 CV + letter | S | S | S | **3**: below about 1100 px the job panel drops below the 40-row list (F-010 again) |
| **B Stages** | T1 first run | S | S | S | 2: a set-up wizard you cannot leave, and no summary of the saved CV |
| | T8 recover | SwD | SwD | SwD (S if Decide is the landing stage) | 2: the failure signal outside Decide is small 13 px text |
| | T5 CV + letter | S | SwD | SwD | **3**: the Apply stage and "Recruiter screen booked" cannot be stored in the upstream tracker |
| **C Today** | T1 first run | S | S | S | 2: reopening a finished step shows an empty CV box, so a second save would overwrite the CV |
| | T8 recover | S | S | S | 2: away from Today, the failure is a plain text link; the "Coming up" card needs data the tracker does not hold |
| | T5 CV + letter | S | S | S | 2: Today's "Get them ready" opens the list, not the job; buttons are named "Make it" and "Start" |

No direction is predicted to fail any task. That is a large step up from M6, where T1 and
T8 were 0 of 3. The directions differ in *how hard* the tasks are and in *new structural
risks*.

---

## 2. Findings per direction

### Direction A: Workbench

**T1: first run (Applications page with a "Get set up" checklist).**

- **Step 1 (paste CV, Save my CV):** yes to all four questions. Both steps are open at once
  and need no click to start. After saving, the user sees "Saved: **Alex Rivera** ·
  Summary, Experience (2 roles), Education, Skills. Edit in My CV". The side menu changes
  from "My CV · missing" to "My CV · ✓", and the `role="status"` line reads "2 of 3 done".
  P1 is reassured by "Saved in your workspace folder as cv.md, so the command-line tools
  see it too."
- **Step 2 (Follow company):** yes to all four questions. The page confirms "Following
  Kestrel Media · Greenhouse job board found, 6 open roles".

| ID | Sev | Personas | Step | What goes wrong | Evidence |
|---|---|---|---|---|---|
| PW-A-T1-01 | 2 | all (keyboard / screen reader) | Save my CV, Follow company | The pressed button is removed when the step collapses (`<sc-if value="{{cvTodo}}">`). Focus is not moved anywhere, so it falls to the page body. Only the status line "2 of 3 done" is announced. | `cvTodo: !cv` |
| PW-A-T1-02 | 2 | P2, P3 | both steps | Placeholders are the user's own data, so a first-timer can read the grey text as already entered and press Save on an empty field. No empty or invalid state is drawn (N-05). | `#cvtext`, `#coname`, `#courl` |
| PW-A-T1-03 | 1 | keyboard | page entry | The skip link has no `:focus` rule, so it stays invisible when it receives focus (WCAG 2.4.7). | skip link |

**T8: recover a failed check (Activity tray).**

- **Q1 (will the user try to find out what happened):** yes.
- **Q2 (will they notice the control):** P1 yes. P2 and P3 only partly; see PW-A-T8-01.
- **Q3 (will they connect the control with "what happened"):** mostly yes. "Activity" is
  not the user's word for "what happened", but "1 failed" carries the meaning.
- **Q4 (will they see progress):** yes. The user sees:
  - "What happened … What to do: try again … uses your Claude plan again", with
    **Try again**;
  - then "Working · usually 2–5 min";
  - then "Fit 3.7 / 5 · Recommendation: Consider · Added to your applications as #41 ·
    Open the application";
  - and a "New" row appears in the table.

The cause is stated well enough to meet criterion 3.

| ID | Sev | Personas | Step | What goes wrong | Evidence |
|---|---|---|---|---|---|
| PW-A-T8-01 | 2 | P2, P3 | notice the failure | The only failure signal is the side-menu footer button "Activity · 1 failed". It is pushed to the bottom of the menu and is not sticky. The main area shows nothing failed, and on shorter windows the button can sit below the fold. | `trayLabel`, aside footer |
| PW-A-T8-02 | **3** | all, especially P1 (half-width window) | open the tray | The tray is a flex item after `<main>` in a `flex-wrap: wrap` row (220 + 480 + 340 ≈ 1040 px). Narrower than that, the tray wraps **below the applications table**, so clicking the button shows no visible change. This repeats F-010. | `<section id="tray" style="flex: 1 1 340px…">` |
| PW-A-T8-03 | 2 | P1 | where to retry | P1 thinks in "pending links" and may open To review (13). That count has no failure mark, and To review is not drawn. This is the F-017 risk. | To review count |
| PW-A-T8-04 | 2 | screen reader | waiting for the retry | The only live region is inside the tray, which is unmounted when closed, so "Done…" is never announced if the tray is closed. `aria-controls="tray"` points to an element that does not exist while the tray is closed. | `<sc-if value="{{trayOpen}}">` |
| PW-A-T8-05 | 1 | all | open the tray | The button is at the bottom left but the tray opens at the far right edge. | layout |

**T5: tailored CV and cover letter (Applications list, side panel, Documents).**

- **Q1:** yes.
- **Q2:** yes. The caption says "select a row to open it beside the list".
- **Q3:** yes. The Documents section has "Make tailored CV" (with design, cost and time)
  and "Write cover letter".
- **Q4:** yes. The user sees a progress bar, "Working", "Activity · 1 working" and "you
  can leave this page".
- **Ready state:** a file name, date, design, writing rules and screening verdict, with
  **Open** and **Download**. The table's Documents cell updates.
- **Letter form:** inline, with "(required)" markers and Cancel, so F-020 does not apply.

| ID | Sev | Personas | Step | What goes wrong | Evidence |
|---|---|---|---|---|---|
| PW-A-T5-01 | **3** | all below about 1100 px, P1 most | open the job | Side menu 200 + main 520 + panel 380 = 1100 px in a wrapping flex row. On a 1024 px laptop or a half-width window the panel lands **below the whole list**, which recreates F-010 exactly. | `<section aria-labelledby="jobh" style="flex: 1 1 380px…">` |
| PW-A-T5-02 | 2 | keyboard / screen reader | open the job | Opening a row does not move focus into the panel. The panel comes after `<main>` in the DOM, so the user tabs through every remaining row. No Escape-to-close is drawn. | `open` handler |
| PW-A-T5-03 | 2 | P1, P3 | find Granite | The status chips leave out Responded, yet rows read "Responded". The status select offers only three options. It is unclear how the chips map onto `states.yml`. | chips, `<select id="st">` |
| PW-A-T5-04 | 2 | P2 | letter form | The placeholders are the task's answers, so a blank form looks filled in. There is no validation state. | `#q1`–`#q3` |

### Direction B: Stages

**T1: first run (three-step wizard).** Every step gets a yes on all four questions. This is
the most guided T1 for P2. Step 4 confirms "Your CV is saved and you follow **Kestrel
Media** (6 open roles found)".

| ID | Sev | Personas | Step | What goes wrong | Evidence |
|---|---|---|---|---|---|
| PW-B-T1-01 | 2 | P3, P1 | whole set-up | The stage bar does nothing until set-up is finished, there is no Tools menu, and step 2 has no Skip. P3 cannot look around first, and a user with no target company cannot finish. It does not block T1. | `stagesNote`, step 2 buttons |
| PW-B-T1-02 | 2 | P2, P3 | after Save and continue | Q4 is weak. Only the dot and the heading change, and nothing says what was saved. | `s2` block |
| PW-B-T1-03 | 2 | all | Save, Follow | Focus is lost and placeholders look filled in, as in A. The progress dots are `aria-hidden`. | `.dot … aria-hidden` |
| PW-B-T1-04 | 1 | P2 | step 4 | "Check my fit" departs from the glossary's "Check fit now", and "Save for later" is missing. | step 4 |

**T8: recover a failed check (Decide stage).**

- **Q1:** yes.
- **Q2:** depends on where the user lands, which is not drawn.
- **Q2 to Q4, once on Decide:** yes. The card reads "Couldn't check … **Try again**", then
  "Checking", then "Checked · second attempt · Fit 3.7 / 5 · Consider".
- **Live region:** always mounted, and it names the job.

| ID | Sev | Personas | Step | What goes wrong | Evidence |
|---|---|---|---|---|---|
| PW-B-T8-01 | 2 | all | notice the failure | The artboard opens on Decide. From any other stage the signals are a 13 px subtitle "9 to decide · 1 failed" and the rust text link "Activity · 1 failed", with no fill or icon. The user must also work out that a fit check lives under **Decide**. | `decideSub`, `actLabel` |
| PW-B-T8-02 | 2 | P1 | confirm the result | The tracker is split into Decide, Apply and Track. The finished card does not say "added to your applications", and Track stays at 29. P1 has no single list. | stage counts |
| PW-B-T8-03 | 2 | keyboard / screen reader | Try again | The button is removed when the card changes, and focus is lost. | `retry` |

**T5: tailored CV and cover letter (Track, then the Apply checklist).**

- **From Track:** the Granite row has a primary "Get CV and letter ready" in its Next step
  column.
- **Apply page:** a three-step checklist, ending in "Send them yourself" with "I've sent
  them".
- **Letter form:** inline.

| ID | Sev | Personas | Step | What goes wrong | Evidence |
|---|---|---|---|---|---|
| PW-B-T5-01 | **3** | all (data contract, new) | stage model | Nothing in upstream `states.yml` sits between `Evaluated` and `Applied`, so "3 · Apply" and "Move to Apply" have nowhere to be stored. "Recruiter screen booked" and "Next step" are not `states.yml` values or fields either. Each needs a new state (forbidden by §9.4), a sidecar file, or guessing from free-text notes. | `Recruiter screen booked`, `Move to Apply` |
| PW-B-T5-02 | 2 | P2, P3 | where to start | The goal points at "3 · Apply", but Granite is already in Track and stages only move forward. The prototype's Apply button jumps straight to Granite, which hides what the Apply list would really contain. | stage buttons |
| PW-B-T5-03 | 2 | all, keyboard | open a job | Track rows cannot be opened: company names are `<b>`, so there is no route to a job's fit report from Track (N-22, N-48). | Track tbody |
| PW-B-T5-04 | 2 | P1 | documents ready | There is no file name (N-30), no required markers, and no warning before replacing a letter (N-32). The letter's progress state has no text. | `cvReady`, `clWorking` |
| PW-B-T5-05 | 2 | all | "I've sent them" | It is undefined which status this writes for a job already past Applied, so it could move the status backwards. | step 3 |

### Direction C: Today

**T1: first run (Today shown as set-up tiles).**

- **Q2:** yes. The tiles are real buttons with `aria-expanded`. Nothing is open by default,
  so it costs one more click than A.
- **After saving:** the sheet moves straight to the next step. The final card reads "Next:
  6 openings at Kestrel Media".

| ID | Sev | Personas | Step | What goes wrong | Evidence |
|---|---|---|---|---|---|
| PW-C-T1-01 | 2 | P2, P3 | after Save my CV | Q4 is weak. Only the 14 px tag changes to "✓ DONE". There is no summary of what was saved and no "Edit in My CV". Reopening the finished tile shows an **empty** textarea, and saving again would overwrite the CV. | `openCv`, `saveCv` |
| PW-C-T1-02 | 2 | all | Save, Follow | Focus is lost and placeholders look filled in. The company sheet has no hint about which boards are recognised and no "board found" check. | `#n`, `#u` |
| PW-C-T1-03 | 1 | P2 | landing | "Welcome, Alex." appears before any CV exists. "Openings" departs from the glossary's "To review". | heading, top menu |

**T8: recover a failed check (the failure is the first card on Today).** All four questions
get a yes for all personas. The card reads:
1. "NEEDS YOU · A CHECK DIDN'T FINISH", with the plain cause and **Try again**;
2. then "WORKING ON IT · 2–5 MIN";
3. then "DONE · ADDED TO APPLICATIONS (#41) · Fit 3.7 / 5 · Open it".

This is the strongest T8 of the three directions.

| ID | Sev | Personas | Step | What goes wrong | Evidence |
|---|---|---|---|---|---|
| PW-C-T8-01 | 2 | all | notice the failure away from Today | Elsewhere the persistent signal is a header text link "Activity · 1 failed" in the same colour as the other links, with no badge (N-08 only partly met). | `.top a`, `actLabel` |
| PW-C-T8-02 | 2 | all (data contract, new) | the rest of Today | "COMING UP · Granite Cloud recruiter screen" needs an interview date or stage that `applications.md` does not store. "NEW SINCE FRIDAY" needs a last-seen record, which is fine as `data/jsc` state. | cards 3–4 |
| PW-C-T8-03 | 2 | P2 | Dismiss | "Dismiss" on the only record of a failed check has no stated effect and no undo. | failed card |

**T5: tailored CV and cover letter (Applications workspace, job page, documents).**

- **List:** the Granite row is highlighted ("Recruiter screen booked · documents not
  ready").
- **Job page:** the row opens a full job page with "← All applications" and two document
  cards.
- **Q2 to Q4:** yes. Progress bars show, the header reads "Activity · 1 working", and the
  ready state offers Open and Download.

| ID | Sev | Personas | Step | What goes wrong | Evidence |
|---|---|---|---|---|---|
| PW-C-T5-01 | 2 | all | start from Today | Today's "Get them ready" opens the list, not the Granite job, so the user has to find it again. This may only be a prototype shortcut. | `href="C-T5-documents.dc.html"` |
| PW-C-T5-02 | 2 | screen reader | find Granite | The column headers are `aria-hidden`. Each row is one button whose name runs everything together, and the fit number has no label. | `.row` |
| PW-C-T5-03 | 2 | P2, screen reader | make documents | "Make it", "Start" and "Write it" do not say what they produce out of context (N-25, N-54). | `cvNone`, `clNone` |
| PW-C-T5-04 | 2 | P1 | documents ready | There is no file name, no required markers and no warning before replacing a letter. The letter's progress state has no text. "suggestion" departs from the glossary's "Recommendation". | `cvReady`, `clWorking` |

---

## 3. M6 severity-3/4 coverage, new risks and scaling

### A: Workbench

- **Closed:**
  - F-001, F-004 and F-012;
  - F-003 and F-009;
  - F-005;
  - F-011;
  - F-014;
  - F-018;
  - F-020 (no dialog);
  - F-016 (persistent indicator);
  - F-006, partly (see PW-A-T8-04).
- **Partly closed:** F-010, only at window widths of about 1100 px and up.
- **Open or not shown:**
  - F-007;
  - F-017;
  - F-015.
- **New risks:**
  - The side-panel and tray layout drops content below the list at common widths.
  - The chips' mapping onto `states.yml` is unclear.
  - The tray's live region exists only while the tray is open.
- **Scaling.** The object-based side menu has a slot for every item in the inventory, and
  the side-panel pattern can be reused for a company, a skill's evidence or a saved link.
  The Activity tray covers every kind of run. The maintenance tools need a home: a
  Workspace page, grown from the "Workspace folder" block, would do. A has no "what needs
  me" surface after set-up.

### B: Stages

- **Closed:**
  - F-001, F-004 and F-012;
  - F-003 and F-016, on Decide;
  - F-017, on Decide;
  - F-009 and F-011;
  - F-020;
  - F-005, on the failure card.
- **Partly closed:** F-018.
- **Open:** F-014, partly (Track rows cannot be opened).
- **Not shown:** F-007 and F-015.
- **New risks:**
  - **severity-3 data contract.** The Apply stage and its statuses have no upstream
    storage (PW-B-T5-01).
  - **One tracker becomes three stage lists.**
  - **The set-up wizard locks the app.**
  - **The stage model contradicts real use.** Jobs move backwards.
- **Scaling.** Everything outside the scan-check-apply loop is pushed into a small Tools
  menu, and those tools (Skills, My CV) are P3's reasons for coming. Companies belongs in
  both places. The maintenance tools fit no stage.

### C: Today

- **Closed:**
  - F-001, F-004 and F-012;
  - F-003, and F-016 most strongly of the three;
  - F-009, F-011 and F-020;
  - F-010 (a full job page);
  - F-014 (but see PW-C-T5-02);
  - F-018;
  - F-005, on the failure card.
- **Not shown:** F-017, F-007 and F-015.
- **New risks:**
  - Today's cards rely on facts the tracker does not store.
  - The Activity signal is weak away from Today.
  - Button labels are generic.
  - Reopening a finished set-up tile can overwrite the CV.
- **Scaling.** C's workspaces are the same object model as A, so everything that scales in
  A scales here. Global search gives P1 a command-style shortcut. Today is a natural place
  to surface maintenance results in words. The risks are noise and trust: Today must show
  only what the data supports, and dismissing a card must never hide a capability. The
  top bar will wrap before 1024 px.

---

## 4. Ranked recommendation (evidence, not a decision)

1. **C Today, borrowing A's workspace patterns. A is a close second.**
   - It has the best predicted T8, the strongest closure of F-016, and the only "what
     needs me" answer for a returning user.
   - Its workspaces are object-based, so it scales like A.
   - Its highest predicted issue is severity 2.
   - Its data risk is contained by limiting Today to what the data supports: failures, new
     openings, data problems, and jobs not yet applied to.
2. **A Workbench.**
   - It has the best T1 and T5 detail, the best Activity indicator, and is the safest
     choice for P1.
   - It is weaker on T8 discoverability for P2 and P3.
   - It has the only severity-3 *layout* risk (panel and tray below the list under about
     1100 px), which an overlay or sticky panel would fix.
3. **B Stages.**
   - It is the most guided on day one.
   - It carries the only severity-3 *data-contract* risk.
   - It splits P1's tracker, locks the app during set-up, and pushes P3's tools into a
     secondary menu.

**Worth borrowing:**
- **From A:**
  - the document metadata line with the screening verdict;
  - "(required)" markers and Cancel on the letter form;
  - the saved-CV summary;
  - the coloured "Activity · 1 failed" button on every page;
  - "Added to your applications as #41" with a "New" row badge;
  - the Documents column.
- **From B:**
  - the "Send them yourself / I've sent them" step (it needs a status mapping);
  - "Not for me" and "Move to …" quick decisions;
  - the always-mounted, job-named live region.
- **From C:**
  - the failure as a landing-page card in words;
  - global search;
  - the problem-plus-fix pattern ("Fix Juniper Mobility").

**Fix in every direction before M8:**
- move focus after each state change;
- a visible skip link;
- grids that reflow at 320 px;
- generic placeholders and drawn validation states;
- draw a failing screening check (F-007), a merged result (F-015), a failure mark in To
  review (F-017), the not-installed / signed-out assistant state, and the dark colour
  scheme;
- name buttons by what they make.
