# M8 test plan: UX implementation and validation

How to verify M8 and how to re-run its measurements. M8 builds the approved
direction (`app/ux/design/`, M7) in `app/ui/`, adds the server support it needs in
`app/server/`, and re-runs the full M6 suite against the result. M8 outputs sit in
`app/ux/m8/`, beside the M6 baseline in `app/ux/`.

M8 is delivered in two stages:
- **Stage A** (this branch, `feat/m8-ux-build`): the build, and the simulated re-measure.
- **Stage B**: at least three real sessions (§12.5), and the fixes they lead to.

Steps assume:
- Node ≥ 22;
- the root package installed (`npm install` at the repository root, which also installs Playwright's Chromium);
- `npm install` in `app/` and `app/ui/`.

Acceptance criteria (PROJECT_PLAN.md §8, M8):
1. Every severity-3 and -4 finding is closed.
2. Every top task meets its §12.6 target.
3. axe reports zero serious or critical violations.
4. In a fresh sandbox, a simulated first-time persona gets from an empty workspace to a first evaluated job without leaving the app.
5. At least 3 real people complete the §12.5 moderated sessions. **Stage B.**

## 0. Automated checks (run first)

```sh
cd app
npm run lint        # expect: no output after "eslint ."
npm test            # expect: # fail 0
npm run ui:build    # expect: "✓ built"
```

| Suite | Covers |
|---|---|
| `server/m8-routes.test.js` | The M8 routes, end to end over a temp workspace: CV and profile, workspace and Today state, retry (and retry without the automatic CV), Remove and restore in To review, one-word rule edits, a re-checked job keeping its documents. |
| `server/services/{profile,portals,pipeline,ledgers}.test.js` | profile.yml edited in place (comments and unknown keys survive), handing the design to My CV with Undo, the first follow creating portals.yml, the tracker created for a first evaluation, the status ledger, the skip list and writing samples read as upstream writes them. |
| `server/queue/{runner,specs}.test.js` | Run history kept across restarts, `subject` and `retryOf`, what a scan added, and read-only checks' findings in words. |
| `ui/src/lib/*.test.js` | The UI's pure logic: routes and redirects, status labels, run names and plain failure causes, outcomes, Today's cards, the Skills ranking, link matching, and reports not in Applications. |
| `ux/ux.test.js` | The inventory (`app/ux/m8/inventory.md`) names every server route and run kind, and every cited UI file exists. Also covers the M6 artefacts. |
| `ux/sessions/sessions.test.js` | The real-session kit: task cards from `tasks.md`, and scoring. |

Upstream paths are untouched:

```sh
git diff --stat main -- providers modes templates scripts batch '*.mjs' ':!app'   # expect: no output
```

## 1. The new UI, by hand

Start the three sandboxes. Each is a throwaway copy of `app/ux/sandbox/seeds/<state>`; the fake agent finishes an AI session in about 8 s.

```sh
node app/ux/sandbox.mjs --state empty     --port 4402
node app/ux/sandbox.mjs --state populated --port 4401
node app/ux/sandbox.mjs --state broken    --port 4403
```

1. **First run (EMPTY).**
   - Today shows "Get set up": paste or choose a CV, follow a company, and the assistant check (`claude --version`, with Check again).
   - Follow Kestrel Media with `https://job-boards.greenhouse.io/kestrelmedia`. **Expect** "You're set up". With a careers page that isn't a job board (`https://kestrelmedia.example.com/careers`), **expect** a warning and a Needs-you card with "Fix Kestrel Media's link".
   - Paste `https://job-boards.greenhouse.io/kestrelmedia/jobs/4134913` under "Check your first job". **Expect** about 8 s of progress, then "Fit 4.1 / 5" and **Open the job**. The job is row 1 in Applications.
2. **Everyday Today (POPULATED).**
   - **Expect** "Needs you" to list Juniper Mobility's board not found.
   - Check for new openings shows its run and result in place.
   - Activity (top bar) lists every run by the job it is for.
3. **Applications and a job (POPULATED).**
   - Filter, sort, and change a status from the row; **expect** Undo.
   - Re-check from the row menu; **expect** "Checking fit" on the row.
   - Open #1: History lists its status changes from `data/status-log.tsv`. Documents show the tailored CV and letter.
4. **To review and Companies (POPULATED).**
   - Check fit or Remove per link, both with Undo.
   - Juniper Mobility › Fix › "Find the right job board…" **answers** for Juniper.
   - "Check the companies list for mistakes" says "No problems found."
   - "Companies to skip" lists Quarry Logistics and Tallow & Finch.
5. **Skills, My CV, Workspace, Help (POPULATED and BROKEN).**
   - Skills' "Only jobs I'd apply to" filter applies to the whole row. "Back to automatic" appears on Java (shown with "Show skills I ignored").
   - My CV: Content, Profile (the new §5 page 4), Design (screening verdict on every design; "Yours" on BROKEN's custom design) and Writing rules (words, all rules with Undo, samples with Open).
   - Workspace › Data health lists "Fit reports not in Applications (1)". Its Open shows report 41 with "Check fit again and add it to Applications".
6. **Failure recovery (BROKEN).**
   - Today shows the failed fit check in words, with Try again. Because BROKEN's design fails screening, the card says this try won't make a tailored CV.
   - **Expect** "Tried again: that worked" and Open the job (row 41 or above).

Check the keyboard alone, both colour schemes, 200% zoom (640×400) and 320 px wide.

Old hash routes (`#/pipeline`, `#/runs`, `#/sources`, `#/cv-studio`, …) redirect to the new pages.

## 2. Re-running the M6 suite against the build

As in TESTING-M6.md §2, with M8 outputs in `app/ux/m8/`:
- browser agents run one at a time (one shared Playwright MCP);
- give each a fresh sandbox.

| Method | How | Output |
|---|---|---|
| 1 Inventory | `ux-researcher`, measuring §12.6's "from the page where a user would look for it" (and "from Today" as a second figure) | `m8/inventory.md` |
| 3 Heuristic evaluation | `heuristic-evaluator` on the three states | `m8/heuristics/*.md` |
| 4 Cognitive walkthroughs | `heuristic-evaluator`, T1–T9 and first-job, following `tasks.md` expected paths | `m8/walkthroughs/*.md` |
| 5 Persona tests | Per pair: `node app/ux/m8/pair.mjs start --persona P2 --task T3`. Give `m8/runs/P2-T3/brief.md` verbatim to a fresh `persona-tester` (sonnet). Then run `node app/ux/m8/pair.mjs finish --persona P2 --task T3` (runs `check-task.mjs`, writes `verdict.md`, stops the sandbox). | `m8/runs/P*-T*/` |
| First-job acceptance | `pair.mjs start/finish --persona P2 --task first-job` (EMPTY sandbox) | `m8/runs/P2-first-job/` |
| 6 Accessibility | `node app/ux/a11y/audit.mjs --out app/ux/m8/a11y` (35 views, both schemes, 100% and 200%), plus the `a11y-auditor` manual passes | `m8/a11y/` |
| Gates (§12.3) | `ux-reviewer` after each page group and at the end | `m8/reviews/*.md` |
| 7 Synthesis | `ux-synthesizer`, given the fix commits | `m8/closure.md`, `m8/backlog.md`, `m8/scorecard.md` |

When an agent returns its report as text instead of writing it, save it verbatim to the path the table names, and say so at the top of the file.

## 3. Results recorded in stage A

From `app/ux/m8/scorecard.md`, `closure.md` and `backlog.md`:

| Metric (§12.6) | M6 baseline | M8 | Target | Met? |
|---|---|---|---|---|
| Task success, simulated (27 verified runs) | 21/27 = 77.8% | 27/27 = 100% | ≥ 90% | Yes |
| Simulated SEQ (indicative) | 4.96 | 6.48; every task ≥ 6.00 | real ≥ 5.5 per task | Indicative |
| Discoverability | 96/191 = 50.3% | 283/305 = 92.8% (96.3% without plumbing), about 95.1% after the last fixes | every capability | Not in full: see below |
| Open severity-3/4 findings | 22 | 0 (F-001–F-022 closed, and every severity-3/4 finding M8 raised) | 0 | Yes |
| axe serious/critical | light 3 + 18, dark 3 + 14 | 0 in both schemes (re-run on the final build) | 0 | Yes |
| First-job acceptance run | — | success, SEQ 7/7, no wrong turns | passes | Yes |
| Real task success, SEQ, SUS; ≥ 3 sessions | — | **pending (stage B)** | ≥ 80%, ≥ 5.5, ≥ 75 | Pending |

**What discoverability still lacks.** These are maintainer decisions, not build work (`scorecard.md` §4):
- **Three superseded API routes:** `/api/health`, `/api/runs/:id/events` and `/api/scan/summary`. Their facts reach the user through other routes. Either retire them, or record that in `sitemap.md`.
- **The top-bar label "Workspace".** It comes from the approved IA, and the inventory judges it not to be in the user's words.

## 4. Stage B: the real sessions (§12.5)

The kit is in `app/ux/sessions/`; `README.md` has the facilitator script, consent, the sandboxes per task and the order.

1. Run at least 3 sessions (5 is better), one notes file per participant (`S01.md`, …, from `notes-template.md`).
2. `node app/ux/sessions/sessions.mjs score` gives per-task success, mean SEQ, time and SUS from the notes.
3. Fix what the sessions find, update `m8/scorecard.md` with the real figures, and open the stage-B PR. M8 is done when real success is ≥ 80% per task, mean SEQ ≥ 5.5 per task and SUS ≥ 75.

## 5. Sandbox artefacts to discount

As in M6:
- a check finishes in about 8 s, not the 2–5 minutes the UI quotes;
- report text is generic;
- the fake job market is served locally.

A tester noticing these is not a UI defect (backlog: "Not a problem").
