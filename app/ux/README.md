# UX evaluation (M6–M8)

This directory is the evidence base for the console's UX work (PROJECT_PLAN.md §12).
M6 measures the UI as it is, M7 designs from those findings, and M8 builds and then
re-measures. Nothing here changes the UI. Everything here runs against fictional
data in the sandbox, never against a real `cv.md` or tracker.

| Path | What it is | Written by |
|---|---|---|
| `sandbox.mjs`, `sandbox/` | The sandbox: seed workspaces, offline job boards, launcher | code |
| `inventory.md` | Every server route, run kind, config file and UI action, and where the UI exposes each one | `ux-researcher` |
| `personas.md`, `tasks.md` | Who the users are, and what they come to do | `ux-researcher` |
| `heuristics/<page>.md` | Nielsen's 10 heuristics, page by page | `heuristic-evaluator` |
| `walkthroughs/T<n>.md` | Cognitive walkthrough of each top task | `heuristic-evaluator` |
| `runs/P<n>-T<n>/` | One simulated persona test: transcript, screenshots, verdict | `persona-tester`, plus the orchestrator's `verdict.md` |
| `a11y/` | axe results (`audit.mjs`), and the keyboard, focus, contrast and zoom report | script, `a11y-auditor` |
| `evidence/` | Screenshots cited by findings | every evaluating agent |
| `backlog.md` | One deduplicated, severity-ranked list of findings | `ux-synthesizer` |
| `scorecard.md` | The baseline metrics (§12.6) | `ux-synthesizer` |

## Running the sandbox

```sh
node app/ux/sandbox.mjs --state populated --port 4400   # or empty | broken
```

- **States.**
  - `empty` is a first run: no CV, no sources.
  - `populated` is one fictional candidate a few weeks into a search: 40 tracked jobs, reports, CVs, cover letters, scan history and a Skills cache.
  - `broken` is `populated` plus a malformed tracker row, an ATS-failing theme selected in CV Studio, and one failed evaluation on the Runs page.
- **Isolation.** Each start copies the seed into a fresh temp directory. Ctrl+C removes the copy. A copy left by a killed sandbox is removed by the next start.
- **Agent runs.** Evaluate, PDF, cover letter and skills reading go to a fake Claude CLI at zero cost. `--delay <ms>` sets how long each session takes (default 8000). `--scenario <name>` forces a behaviour (default `auto`: succeed). The scenarios are listed in `app/server/services/__fixtures__/bin/fake-claude.js`.
- **Scans.** Scans and posting fetches read fictional Greenhouse boards from `sandbox/net/`. There is no network traffic. Juniper Mobility's board is deliberately gone, so a scan shows one error.
- **Ready signal.** The launcher prints `SANDBOX_READY {json}` once it is listening.
- **Rebuilding the seeds.** `node app/ux/sandbox/generate.mjs`. This needs Playwright's Chromium for the PDFs.

## Playwright MCP setup

Browser agents drive the sandbox through the Playwright MCP server in `.mcp.json`. That file is gitignored, and its default setup is fine:
`{"mcpServers": {"playwright": {"command": "npx", "args": ["-y", "@playwright/mcp@latest"]}}}`.
- **Shared browser.** There is one browser, so browser agents run **one at a time**.
- **Clean state per run.** The UI keeps no browser storage, so a fresh sandbox per run is a clean start.
- **Screenshots.** Pass a `filename` relative to the repo root. That writes the file straight into this directory, e.g. `app/ux/evidence/H-pipeline-03.png`.

## Conventions every agent follows

### Severity (Nielsen, 0–4)

| | Meaning |
|---|---|
| 0 | Not a usability problem |
| 1 | Cosmetic: fix if there is time |
| 2 | Minor: low priority |
| 3 | Major: important to fix; users are slowed down or misled |
| 4 | Catastrophe: users cannot complete the task, or lose data or trust |

### Finding format
Every evaluating agent writes findings in this shape, so the synthesizer can merge them:

```markdown
### <ID>: <one-line statement of the problem>
- **Severity:** 0–4
- **Where:** page › area › control (label as shown on screen)
- **Tasks:** T2, T5   (or "—")
- **Capabilities:** inventory row ids, e.g. R-runs-post, UI-pipeline-evaluate-now
- **Method:** heuristic (H4 Consistency) | walkthrough (T2 step 3, Q2) | persona (P2-T1) | a11y (WCAG 2.4.7)
- **Evidence:** app/ux/evidence/<ID>.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/
  2. …
  3. Observe: …
- **Notes:** why it matters; what the user expected
```

ID prefixes: `H-<page>-NN` (heuristics), `W-T<n>-NN` (walkthroughs), `P<n>-T<n>-NN` (persona runs), `A-NN` (accessibility). The backlog renumbers merged findings as `F-NNN` and keeps the source IDs.

Out of scope by rule (PROJECT_PLAN.md §9.1, §12.7): the console never applies, emails or clicks anything for the user. A finding that amounts to "make applying automatic" is recorded under *Out of scope*, not ranked.
