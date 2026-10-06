# M7 test plan: information architecture and design direction

How to verify M7. M7 changes no app code. It adds design documents, tokens, clickable
prototypes and their evaluation, all in `app/ux/design/`.

Steps assume:
- the branch `feat/m7-ia-design` and Node ≥ 22;
- `npm install` in `app/`, which provides Playwright and `@axe-core/playwright` for the
  axe pass.

Acceptance criteria (PROJECT_PLAN.md §8, M7):
1. An **IA document**, and a **sitemap** that maps every inventory capability to a place in
   the UI.
2. **Design tokens** recorded as code-ready CSS variables.
3. **Clickable prototypes** of the chosen direction for every top task (T1–T9).
4. A **cognitive walkthrough re-run** on those prototypes finds **no severity-3 or -4
   issue** on any top task.
5. **The user approves one direction.**

Also: PROJECT_PLAN §11 (component library and styling) is closed, and nothing under
`app/ui/src/`, `app/server/` or the upstream paths changed.

## 0. Automated checks (run first)

```sh
cd app
npm run lint        # expect: no output after "eslint ."
npm test            # expect: # fail 0 (includes ux/design/design.test.js)
git diff --stat main -- ui/src server ../providers ../modes ../templates ../scripts ../batch   # expect: empty
```

`ux/design/design.test.js` checks the acceptance criteria from the files:

| Test | Criterion |
|---|---|
| The sitemap places every inventory capability exactly once | 1. Each of the 191 R-, K-, C- and UI- rows has a place reachable in ≤ 3 steps, or "no UI by design" with a reason. |
| The brief and the sitemap cover every open severity-3/4 finding | 1. All 22 of M6's F-001 – F-022 are answered by a need and a placement. |
| tokens.css defines the same colour variables in both schemes | 2. |
| Every listed colour pair meets WCAG contrast in both schemes | 2. Text 4.5:1, UI 3:1, computed from the hex values. |
| A clickable prototype exists for every top task and its local links resolve | 3. |
| The prototypes hold only fictional data | §12.4. |
| The walkthrough re-run finds no severity-3 or -4 issue on any top task | 4. |
| decisions.md records the maintainer approving one direction | 5. |

## 1. Read the design

| File | What it is |
|---|---|
| `ux/design/brief.md` | Needs N-01 – N-59 by theme (every M6 finding of severity 2 or more), object model, label glossary, constraints |
| `ux/design/directions.md` | The three directions (A Workbench, B Stages, C Today), the library options, and the paper walkthrough summary |
| `ux/design/directions-walkthrough.md` | The `heuristic-evaluator`'s paper walkthrough of A, B and C on T1, T5 and T8 |
| `ux/design/directions/*.dc.html` | Sources of the Claude Design canvas artboards (canvas: https://claude.ai/artifact/AFNHHydHnRhswdykZnP3Kt, private) |
| `ux/design/ia.md` | The chosen IA: navigation, pages, global patterns, status labels, first run, layout |
| `ux/design/sitemap.md` | Every capability's place |
| `ux/design/tokens.css` | The tokens M8 copies into `app/ui/src/` |
| `ux/design/decisions.md` | D-1 direction, D-2 library (closes §11), D-3 deliberate gaps, and the approval |

## 2. Walk the prototypes yourself

```sh
node app/ux/design/serve.mjs          # http://127.0.0.1:4420/ lists T1–T9
```

- **Start state.** Each `T<n>.html` opens on Today in the matching sandbox state:
  - empty for T1;
  - broken for T7 and T8;
  - populated for the others.
- **Waits.** "AI" runs finish in a few seconds.
- **Reset.** **Reset prototype** (in the grey banner) starts over.
- **Click paths.** `ux/design/prototypes/README.md` lists the shortest path per task.
- **What to check.** Try each task by mouse and by keyboard (Tab, Enter, Escape, the
  arrow keys in menus), at a narrow window, and in the dark scheme.

## 3. Re-run the evaluation

- **Walkthrough.** Use the `heuristic-evaluator` agent with the prompt pattern used in M7:
  - one task per agent;
  - "reload, then Reset prototype";
  - return the file text.
- **Saving the output.** Save each reply as `ux/design/walkthroughs/T<n>.md`. Screenshots
  go to `ux/design/evidence/WP-T<n>-NN.png`.
- **Shared browser.** The Playwright browser is shared. Do not click in its window while
  an agent walks.
- **axe pass:**

  ```sh
  cd app && node ux/design/axe-prototypes.mjs   # writes ux/design/axe-summary.md and axe-results.json
  ```

  It scans 24 views × 2 schemes × 2 zooms. The M7 result is 0 violations at every impact
  level.

## 4. Results recorded in M7

| Measure | M6 baseline (real UI) | M7 (prototypes) |
|---|---|---|
| Discoverability (inventory) | 96 of 191 (50.3%) | 180 placed in ≤ 3 steps plus 11 no UI by design (sitemap) |
| Walkthrough severity 3/4 on top tasks | 22 open in the backlog; T1 and T8 failed for 3 of 3 personas | 0 on T1–T9. One severity-3 issue (WP-T6-01) was found on the first T6 walk, fixed, and re-walked. |
| axe serious/critical (rule × view) | light 3 + 18, dark 3 + 14 | 0 and 0 in both schemes |
| Walkthrough findings of severity ≤ 2 | — | Recorded per task in `walkthroughs/`, as M8 implementation notes |

Not a usability certification. Simulated walkthroughs find blockers. Real people (§12.5)
certify, in M8.
