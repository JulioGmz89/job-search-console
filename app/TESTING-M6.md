# M6 test plan: UX evaluation baseline

How to verify M6 and how to re-run its measurements. M6 changes no UI. It adds:
- a sandbox;
- tooling;
- evidence in `app/ux/`.

Steps assume:
- the branch `feat/m6-ux-baseline` and Node ≥ 22;
- the root package installed (`npm install` at the repository root, which also installs Playwright's Chromium);
- `npm install` in `app/`.

Acceptance criteria (PROJECT_PLAN.md §8, M6):
1. `app/ux/` holds a **capability inventory** that covers every server route and UI action.
2. It holds a **baseline scorecard** for every top task and persona.
3. It holds **one deduplicated findings backlog** ranked by severity (0–4), with a screenshot and a reproduction for each finding.
4. **No file under `app/ui/src/` changed.**

## 0. Automated checks (run first)

```sh
cd app
npm run lint        # expect: no output after "eslint ."
npm test            # expect: # fail 0
```

| Suite | Covers |
|---|---|
| `ux/ux.test.js` | Acceptance 1–3, mechanically. Every `app.<method>('/api/…')` in `server/app.js` and every `RUN_KINDS` key appear in an inventory table cell. Every UI component with an `onClick`/`onChange`/`onSubmit` is cited in the inventory, and every cited `app/ui/src/…` path exists. P1–P3 and T1–T9 exist, each task with a success criterion. The scorecard has a filled cell for every persona × task. Every backlog finding has a severity 0–4 and an existing screenshot under `app/ux/`. Each reproduction starts from `sandbox.mjs --state …`. IDs are unique and the list is ranked by severity. |
| `queue/specs.test.js`, `queue/runner.test.js` | A confined scan runs in its data root (`cwdAtRoot`), and a script spec's `cwd` reaches `spawn`. |
| `cv/theme.test.js` | `render-cv.js --document` runs the fact gate with `--source`/`--config` under the data root. |
| `agent-runs.test.js`, `skills/extract.test.js` | The fake CLI's new options leave the existing scenarios unchanged. |

Acceptance 4:

```sh
git diff --stat main -- app/ui/src     # expect: no output
```

## 1. The sandbox (§12.1)

```sh
node app/ux/sandbox.mjs --state populated --port 4400
```

**Expect** `SANDBOX_READY {"url":"http://127.0.0.1:4400/","state":"populated",…,"root":"…\\jsc-ux-populated-XXXX"}`. Then:

1. **Pipeline.** It shows 40 applications and 6 PDFs, with every status and score band present. `GET /api/health` reports `issues: 0`.
2. **Evaluate a fresh posting.** Paste `https://job-boards.greenhouse.io/kestrelmedia/jobs/4134913` and click **Evaluate now**. **Expect** about 8 s of progress lines, then row 41 "Kestrel Media · Senior Backend Engineer · 4.1". Because "PDF if score ≥ 3.5" is ticked, a PDF run follows.
3. **Scan (no network).** Record a hash of the repository's own `data/scan-runs.tsv` first (`sha1sum data/scan-runs.tsv`). Then **Sources › Scan now**. **Expect** "New offers added: 4" and "Juniper Mobility" unreachable. The repository's file hash must not change.
4. **Cover letter.** **Cover** on row 6 → answer → **Draft and render the letter**. **Expect** a real PDF in the report's Cover letter tab.
5. **Stop.** Ctrl+C. The temp copy is removed. A copy left by a killed sandbox is removed by the next start.

Then check the other two states:
- **`broken`** (`--state broken --port 4401`). **Expect:**
  - `SANDBOX_READY` includes `failedRun` with status `failed`;
  - the Runs page shows it ("the agent exited without writing reports/041-*.md");
  - Pipeline reports one unparseable row (57, Quarry Systems);
  - CV Studio's selected theme `broken` fails the ATS check;
  - evaluating `https://job-boards.greenhouse.io/driftwoodanalytics/jobs/4109592` again adds row 41.
- **`empty`** (`--state empty --port 4402`). **Expect** every page to load, with no CV and no sources.

Options:
- `--delay <ms>` sets the fake session length (default 8000).
- `--scenario <name>` forces a fake behaviour (default `auto`).
- `--keep` leaves the temp copy behind.

Seeds are rebuilt with `node app/ux/sandbox/generate.mjs` (Chromium needed for the PDFs; `--no-pdf` skips them).

## 2. Re-running the M6 suite (M8 re-uses this unchanged)

The Playwright MCP server (`.mcp.json`) is one shared browser, so run browser agents one at a time. The agents are in `.claude/agents/`. A new Claude Code session is needed after adding or editing them.

| Method | How | Output |
|---|---|---|
| 1–2 Inventory, personas, tasks | `ux-researcher` agent | `inventory.md`, `personas.md`, `tasks.md` |
| 3 Heuristic evaluation | `heuristic-evaluator` against `populated`, `broken` and `empty` sandboxes | `heuristics/*.md`, `evidence/H-*.png` |
| 4 Cognitive walkthroughs | `heuristic-evaluator`, one task per file, following `tasks.md` expected paths | `walkthroughs/T*.md`, `evidence/W-*.png` |
| 5 Persona tests | Per pair, in this order (27 pairs): start a fresh sandbox in the task's state (`node app/ux/persona-prompt.mjs --task T3 --state`); give the brief from `node app/ux/persona-prompt.mjs --persona P2 --task T3 --url …` verbatim to a fresh `persona-tester`; when it finishes, run `node app/ux/check-task.mjs --task T3 --url … --info '<SANDBOX_READY json>' --answer-file app/ux/runs/P2-T3/transcript.md --out app/ux/runs/P2-T3/verdict.md`; then stop the sandbox. | `runs/P*-T*/` |
| 6 Accessibility | `node app/ux/a11y/audit.mjs` (axe, both schemes, two zooms; starts its own sandboxes on 4410–4412), plus the `a11y-auditor` manual passes | `a11y/axe-*.{json,md}`, `a11y/report.md`, `evidence/A-*.png` |
| 7 Synthesis | `ux-synthesizer` | `backlog.md`, `scorecard.md` |

The harness keeps subagents from writing some report files. When an agent returns its report as text, save it verbatim to the path the table names, and say so at the top of the file.

## 3. The M6 baseline (what M8 must beat)

From `app/ux/scorecard.md` and `app/ux/backlog.md`:

| Metric (§12.6) | Baseline | M8 target |
|---|---|---|
| Task success, simulated (27 persona × task runs, verified) | 21/27 = 77.8%. T1 0/3 (no way to add a CV or a first source), T8 0/3 (a failed run cannot be identified or retried). Every other task 3/3. | ≥ 90% |
| Simulated SEQ (mean) | 4.96 / 7 | real sessions ≥ 5.5 per task |
| Discoverability (inventory) | 96 of 191 capabilities = 50.3% | every capability in ≤ 3 interactions, user-language label |
| Open severity-3/4 findings | 22 (5 sev-4, 17 sev-3) of 79 ranked | 0 |
| axe serious/critical (rule × view) | light 3 critical + 18 serious; dark 3 critical + 14 serious | 0 in both schemes |
| Real-user task success, SEQ, SUS | measured in M8 (§12.5) | ≥ 80%, ≥ 5.5, ≥ 75 |

## 4. Sandbox artefacts to discount

The fake agent is fast and generic. These are not UI defects:
- Sessions finish in about 8 s, where real ones take minutes.
- The reports' A–F text is boilerplate. Before 9e3d896d it was a placeholder line naming fake-claude.
- Before 2550dde9 a cover letter was placeholder bytes, so the PDF viewer showed a broken file. This affected P1-T5.

The backlog lists each under "Not a problem (severity 0)".
