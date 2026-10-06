# Design directions (M7, steps 2–3)

Three directions, each with a different navigation model and a different look. Each is
drawn on the same three hard flows from M6:
- **T1**, first run from an empty workspace;
- **T8**, a failed check recovered;
- **T5**, a tailored CV and a cover letter, starting from the applications list.

They are judged against the needs in `brief.md`.

- **Canvas** (Claude Design, private to the maintainer):
  https://claude.ai/artifact/AFNHHydHnRhswdykZnP3Kt
- **Source of each artboard** (fictional data only): `directions/*.dc.html`. Open
  `directions/Main.dc.html` on the canvas for the overview. Each flow is clickable with
  Play.

The directions are sketches. They are detailed enough to judge the navigation model and
the feel, not finished screens. Only the chosen one is taken further, into `ia.md`,
`tokens.css` and the T1–T9 prototypes.

---

## A · Workbench: organised by object

**Model.** A side menu lists the things the user owns:
- **Applications**
- **To review**
- **Companies you follow**
- **Skills**
- **My CV**

Each entry carries a count. An **Activity** button is docked at the bottom of the menu on
every page and opens a tray with what is running, done and failed. Opening a job puts it
in a **side panel** next to the list, so the list stays in view. The page title, actions
and filters sit above the content.

**Look.** Navy menu, white work surface, one blue accent; red, green and amber are used
only for state. System sans at 14 px, compact rows and a 6 px radius. Built for density:
the 40-row list and the job side by side.

**How the flows go:**
- **T1.** The empty Applications page *is* the set-up checklist: Add your CV, Follow a
  company, AI assistant ready. Each step completes in place. The last panel offers
  "Check fit now" and "Save for later" with what each does.
- **T8.** The Activity button turns red ("Activity · 1 failed"). The tray shows the failed
  check, the job's name, "What happened" and "What to do" in plain words, **Try again**,
  and the technical details behind a disclosure. After the retry, the same card reads
  "Fit 3.7 / 5 · Consider · Added to your applications as #41 · Open the application",
  and the new row is highlighted in the list.
- **T5.** Rows are buttons. Granite Cloud opens in the side panel with the fit and
  recommendation, the Status field, and **Documents**: "Make tailored CV" and "Write
  cover letter". Each document has its own state (Not made yet → Working → Ready) and
  ends in **Open** and **Download**, with the date, the design and the screening verdict.

**Needs it answers most directly:**
- N-01–N-04 (set-up in place);
- N-06–N-11 (the activity tray and runs named by their job);
- N-14;
- N-22 and N-24 (side panel);
- N-25;
- N-30 and N-33 (documents with metadata);
- N-45 and N-48 (rows and runs as real buttons);
- N-59 (nothing important only in a toast).

**Trade-offs:**
- **Strengths.**
  - It maps one-to-one onto the data contract: each menu entry is a file family.
  - It scales to every inventory capability without inventing new concepts: the
    maintenance tools go under Applications and Companies, writing rules under My CV.
  - It is closest to the current app, so M8 rewrites the least.
  - P1 can find "each thing they used to do" (their stated test).
- **Risks.**
  - It does not tell a returning user *what to do next*. The side menu is a map, not a
    guide.
  - The side panel is tight below about 1,100 px and becomes a full page there.
  - A tray can be ignored: the menu button must change colour and announce itself.

**Component library it suggests:** headless and accessible (see below). Tables with
keyboard rows, a dialog and a tray, and selects that commit only on choose are the
library's core.

---

## B · Stages: organised by workflow

**Model.** The top bar is the job hunt itself:
- **1 · Find** (openings to look at);
- **2 · Decide** (checked jobs waiting for a decision);
- **3 · Apply** (getting the CV and letter ready);
- **4 · Track** (applications and where they stand).

The tools (My CV, Skills, Companies, Activity) sit at the top right. Each stage shows
only what is done there. A job moves through the stages with buttons such as "Move to
Apply" and "Not for me".

**Look.** Warm paper ground, serif headings (Charter or Georgia), a deep teal accent and
rust for attention. Body text at 16 px, roomy cards, a 10–14 px radius and 44 px
targets. Reads like a guided process.

**How the flows go:**
- **T1.** A three-step set-up wizard comes before the stages open: CV, then a company,
  then the assistant. The stage bar is visible but says "The stages open after set-up".
  It ends with "Check my fit" or "Go to Find — 6 openings".
- **T8.** The failure appears at the top of **Decide** as an orange card ("Couldn't
  check"), with the cause, **Try again**, "Open the posting" and "Remove from Decide".
  The Decide tab reads "9 to decide · 1 failed". After the retry the card becomes a
  checked job with "Move to Apply" and "Not for me".
- **T5.** Track lists applications by where they stand. Granite Cloud's row has a primary
  action, "Get CV and letter ready", that opens **Apply** as a three-step checklist:
  Tailored CV, Cover letter, and "Send them yourself" with "I've sent them".

**Needs it answers most directly:**
- N-02 (an explicit order);
- N-08 and N-09 (the failure sits in the stage where the job is);
- N-13;
- N-26 (Find versus Decide);
- N-28 (stage names instead of status codes);
- N-30;
- human-in-the-loop made visible as a step.

**Trade-offs:**
- **Strengths.**
  - It explains the method of the job hunt to P2 and P3.
  - Every screen has an obvious next action.
  - "Send them yourself" turns §9.1 into guidance instead of a gap.
- **Risks.**
  - **Data contract.** Upstream's tracker has statuses (Evaluated, Applied, Responded,
    Interview, Offer…), not stages. "Apply" (preparing documents) has no stored state,
    so it must be derived from Evaluated plus "documents requested". "Not for me" must
    map to Discarded. A job can look as if it sits in two stages.
  - Tools at the top right are a second-class place for features that P3 came for
    (Skills, CV design).
  - The wizard blocks the app until it is finished, which P1, who already has a
    workspace, does not need (it must detect existing files and skip itself).
  - The dense list is split across stages, so "all 40 applications sorted by fit" needs
    a separate view.

**Component library it suggests:** either option works. The look leans on cards, so
plain CSS is enough for most of it.

---

## C · Today: organised around next actions

**Model.** The user lands on **Today**: a short, ranked list of what needs them. Examples:
- a failed check;
- new openings since the last visit;
- a recruiter screen without documents;
- jobs checked but not acted on.

Each card has its one action. Full workspaces (Applications, Openings, My CV, Skills,
Companies) are in the top bar and also reachable through a global search ("Find a job,
company or document"). A job opens as a full page.

**Look.** A graphite top bar, a white page, a violet accent and bold, high-contrast type at
17 px. Large cards with an 18 px radius and 48 px targets. One thing at a time.

**How the flows go:**
- **T1.** On day one, Today *is* set-up: three big tiles (Add your CV, Follow a company,
  AI assistant ✓). Each opens a sheet in place. When they are done, the first suggestion
  is "Next: 6 openings at Kestrel Media".
- **T8.** The first card on Today reads "Needs you · A check didn't finish", with the job,
  the plain cause, **Try again**, "Open the posting" and "Dismiss". After the retry it
  becomes "Done · Added to applications (#41) · Fit 3.7 / 5 · Open it".
- **T5.** A card on Today ("Granite Cloud recruiter screen — no tailored CV or letter
  yet") or the Applications workspace leads to the job page. Its **Tailored CV** and
  **Cover letter** sit side by side, each with Make or Start, Working, and then Open and
  Download.

**Needs it answers most directly:**
- N-02 and N-08 (the attention list is the home);
- N-10 and N-11;
- N-14;
- N-16;
- N-43 (new since you last looked);
- N-17 (scan results as a sentence: "4 new openings…, one board couldn't be reached").

**Trade-offs:**
- **Strengths.**
  - It is the best first and returning experience for P2 and P3.
  - T4 ("what's new since I last looked") and T8 become one glance.
  - It hides engine vocabulary completely.
- **Risks.**
  - **The ranking logic is new product behaviour.** It needs rules (what counts as
    "needs you", in what order, when a card goes away) and state the data contract does
    not hold, such as "last visited" and dismissed cards. That state must live under the
    fork's own `data/jsc/` files.
  - P1, who wants their tracker, is one click further from it.
  - Large type and cards cut density: the 40-row list becomes a long scroll.
  - Search is a second navigation system to build and keep accessible.

**Component library it suggests:** either option. The cards and sheets are simple; search
with suggestions (a combobox) is the one hard accessible component, and it argues for a
library.

---

## The component-library question (§11)

| | Option 1: plain CSS + own primitives | Option 2: React Aria Components + plain CSS tokens |
|---|---|---|
| What it is | Keep today's approach: CSS custom properties in one stylesheet, and hand-write the accessible patterns (dialog, tabs, disclosure, live announcer, menu, combobox). | Adobe's unstyled, accessible React components (`react-aria-components`), styled only with our `tokens.css` through class names and `data-*` state selectors. No Tailwind, no CSS-in-JS. |
| M6 findings it addresses by construction | None by itself. Each one needs careful code: F-005, F-014 and F-026 (keyboard rows), F-020 (dialog focus), F-022 (select commits on choose), F-044 (tabs), F-006 and F-059 (announcements). | Table and GridList with keyboard rows and row actions (F-005, F-014), Dialog and Modal with focus trap, Escape and return focus (F-020), Select that commits on choose (F-022), Tabs with panels and arrow keys (F-044), Toast and live announcer (F-006, F-059), ComboBox (search, in C). |
| Cost | No dependency. More code to write and test, and the a11y edge cases are ours to find. | One dependency (about 40–60 kB gzipped for the components used; tree-shaken and bundled locally, no CDN, so §9.2 holds). Supports React 19. Learning curve on its render-props API. |
| Fit with the codebase | Matches today's code exactly. | It wraps markup we already render (table, select, dialog) and fits the existing hash router. The styling stays plain CSS, so §11's "plain CSS custom properties" survives. |
| Alternative considered | — | Radix Primitives: similar idea and a smaller API, but no accessible table or grid, and the table is our densest surface. |

The recommendation, and the reasoning behind it, is recorded in `decisions.md` once the
direction is chosen.

---

## Paper walkthrough (step 3)

The `heuristic-evaluator` walked T1, T8 and T5 on each direction's artboards (markup and
state logic) as P1, P2 and P3. Its full report is `directions-walkthrough.md`. The summary
is below.

| | T1 first run | T8 failed check | T5 CV + letter | Highest new risk |
|---|---|---|---|---|
| **A Workbench** | S · S · S | S · SwD · SwD | S · S · S | **3, layout:** below about 1,100 px the side panel and the Activity tray wrap under the 40-row list (F-010 again). Fixable with an overlay panel. |
| **B Stages** | S · S · S | SwD · SwD · SwD | S · SwD · SwD | **3, data contract:** "Apply", "Move to Apply" and "Recruiter screen booked" have no state in upstream `states.yml` (§9.4). |
| **C Today** | S · S · S | S · S · S | S · S · S | 2: Today's cards must use only facts the tracker holds. The Activity signal is weak away from Today. |

Cells read P1 · P2 · P3. S = success, SwD = success with difficulty. No direction is
predicted to fail a task; in M6, T1 and T8 were 0 of 3.

**The evaluator's ranking, as evidence rather than a decision:**
1. **C, borrowing A's patterns.**
2. **A.**
3. **B.**

**Things to borrow whichever direction is chosen:**
- **From A:**
  - the document metadata line with the screening verdict;
  - the saved-CV summary;
  - a coloured "Activity · 1 failed" button on every page;
  - "Added to your applications as #41" with a "New" row badge.
- **From B:**
  - the "Send them yourself / I've sent them" step;
  - "Not for me" quick decisions;
  - an always-mounted live region that names the job.
- **From C:**
  - the failure as a landing card in words;
  - global search;
  - the problem-plus-fix pattern ("Fix Juniper Mobility").

**To fix in any direction:**
- move focus after each state change;
- a visible skip link;
- reflow at 320 px;
- neutral placeholders and drawn validation errors;
- draw the failing screening check (F-007), the merged result (F-015), the failure mark in
  To review (F-017), the assistant-missing state and the dark scheme;
- name buttons by what they make.
