# M3 test plan — agent orchestration and CV Studio phase A

How to verify every M3 feature by hand, plus what the automated suite already covers.
Steps assume the branch `feat/m3-agent-orchestration`, Node ≥ 22, and Claude Code
installed (`claude --version` works in a terminal).

## 0. Automated checks (run first)

```sh
cd app
npm run lint        # expect: no output after "eslint ."
npm run build       # expect: "✓ built in …"
npm test            # expect: # pass 169, # fail 0
```

The suite never launches a real Claude session or touches the repository's data: agent
runs are driven by `server/services/__fixtures__/bin/fake-claude.js` inside a temp copy
of the fixture workspace, while `merge-tracker.mjs`, `reconcile-pipeline.mjs`,
`reserve-report-num.mjs` and `mark-pdf-ready.mjs` are the real upstream scripts.

## 1. Rehearsal with the fake CLI (no tokens spent)

Use this to see every screen and every chain without waiting on a model. It runs the
server against a throwaway workspace with the fake CLI standing in for `claude`.

```sh
# from the repository root, in Git Bash / PowerShell equivalents
W=/tmp/jsc-rehearsal && rm -rf $W && mkdir -p $W/config
cp -r app/server/services/__fixtures__/workspace/* $W/
printf '# Ada Lovelace\n\n## Experience\n- Built the engine\n' > $W/cv.md
printf 'candidate:\n  name: "Ada Lovelace"\nspend_tier: standard\ncv:\n  auto_pdf_score_threshold: 3.5\n' > $W/config/profile.yml

cd app && npm run build && \
CAREER_OPS_ROOT="$W" \
JSC_CLAUDE_BIN="$(pwd -W)/server/services/__fixtures__/bin/fake-claude.js" \
FAKE_CLAUDE_SCENARIO=evaluate-ok FAKE_CLAUDE_SCORE=4.2 \
node server/index.js
```

`JSC_CLAUDE_BIN` must be a path Node's native `fs` can resolve. In Git Bash on Windows,
`$PWD` is a POSIX-style path (`/c/Users/...`) that `node.exe` cannot look up — use
`$(pwd -W)` (Windows-style, `C:/Users/...`) instead. In PowerShell, `"$PWD\server\..."`
is already correct as-is.

Then open <http://127.0.0.1:4317>:

| # | Step | Expect |
|---|---|---|
| 1.1 | Pipeline page loads | A paste box at the top; every row has **Re-evaluate / PDF / Cover** buttons; rows without a report have them disabled with a tooltip. |
| 1.2 | Paste `https://jobs.example.com/demo/1`, click **Evaluate now** | A run panel appears under the box: "Reserved report number 009", `▶ Claude session started`, `🔧 WebFetch …`, `■ Claude finished`, "Score 4.2 ≥ 3.5: queuing the tailored PDF". Within a second a new row **Fake Co · Test Engineer · 4.2** appears in the table **without reloading**. |
| 1.3 | Open **Runs** | Finished: `Evaluate jobs.example.com`, `Merge tracker additions` (exclusive), `Reconcile inbox` (exclusive), `PDF for Fake Co` (**Failed** — the fake was pinned to the evaluate scenario; its error says no PDF was recorded). Click any row → its log replays. |
| 1.4 | Open **Sources** → "Show the inbox" | `https://jobs.example.com/demo/1` is **gone from Pending**; `$W/data/pipeline.md` shows it under Processed as `- [x] [9](../reports/009-…)`. Each pending URL has an **Evaluate** button. |
| 1.5 | `cat $W/data/applications.md` | A row `| 9 | … | Fake Co | … | 4.2/5 | Evaluated | ❌ | [009](../reports/009-fake-co-….md) |`. `ls $W/reports` has no `*-RESERVED.md`. |
| 1.6 | Restart the server with `FAKE_CLAUDE_SCENARIO=pdf-ok`, open row 9, click **PDF** | Toast "PDF for Fake Co started" with **Open log**; the run succeeds, chains **Mark PDF ready**, the row's PDF dot turns ●, the report's **PDF** tab opens the file. |
| 1.7 | Restart with `FAKE_CLAUDE_SCENARIO=cover-ok`, click **Cover** on row 9 | A dialog with questions A–D. Submit with the C field empty → the button stays disabled. Fill all three, pick a tone, submit → you land on Runs with the log; on success the report gains a **Cover letter** tab (`$W/output/cover-fake-co-009.pdf`, `$W/data/jsc/covers.json`). `data/pdf-index.tsv` is unchanged. |
| 1.8 | Restart with `FAKE_CLAUDE_SCENARIO=hang`, evaluate a new URL, click **Cancel** in the panel | Status **Cancelled**; `ls $W/reports` shows the sentinel released; no TSV left in `$W/batch/tracker-additions/`. Paste the same URL again while a run is live → **409 "already running"** shown in the panel. |
| 1.9 | Restart with `FAKE_CLAUDE_SCENARIO=evaluate-no-report`, evaluate | Status **Failed**, reason "the agent exited without writing reports/NNN-*.md"; nothing chained; number released. |
| 1.10 | Stop the server with a run in progress (Ctrl-C) | Exits within ~10 s; on the next start `reserve-report-num.mjs --gc` clears any sentinel left behind. |

Fake CLI scenarios: `evaluate-ok` (+`FAKE_CLAUDE_SCORE`), `evaluate-no-report`,
`evaluate-is-error`, `evaluate-wrong-number`, `hang`, `pdf-ok`, `cover-ok`.

## 2. The real thing (acceptance criterion)

> Paste a job URL in the UI → evaluation report + tailored PDF, no CLI commands typed.

Prerequisites: your real `cv.md` and `config/profile.yml` in the repository root,
`claude` on PATH (or `JSC_CLAUDE_BIN` set), Chromium installed by the root
`npm install`.

```sh
cd app && npm start          # http://127.0.0.1:4317
```

| # | Step | Expect |
|---|---|---|
| 2.1 | Pipeline → paste a real posting URL → **Evaluate now** | Log streams tool calls (`🔧 WebFetch`, `🔧 Read: cv.md`, `🔧 Write: reports/NNN-…`, `🔧 Bash: node jd-skill-gap.mjs …`). Takes 3–8 minutes. Ends `■ Claude finished in …s · N turns · $x.xx`. |
| 2.2 | Watch the table | The new row appears by itself with company, role, score and decision; the report opens on click with the A–G sections and the Machine Summary facts. Header has `**Verification:** unconfirmed (headless)`. |
| 2.3 | Score ≥ your `auto_pdf_score_threshold` | A **PDF for <company>** run starts by itself (Runs page); its log shows `build-cv-html.mjs`, `verify-cv-facts.mjs`, `app/cv/render-cv.js`, `🎨 Style applied: …`; on success the PDF tab lights up and the tracker's PDF column flips to ✅. |
| 2.4 | Score below threshold | Log says "no PDF queued"; click **PDF** on the row to generate one anyway. |
| 2.5 | `node verify-pipeline.mjs` in a terminal | Clean (or only the issues it reported before M3) — the data contract round-trips. |
| 2.6 | Open a `claude` session in the same directory, `/career-ops oferta <url>` | Works as before; the console's table picks the new report up by itself. |

## 3. Cover letter (real)

| # | Step | Expect |
|---|---|---|
| 3.1 | Row with a report → **Cover letter** | Dialog; "Draft and render the letter" is disabled until A, B and C are filled. |
| 3.2 | Submit | Runs page; log shows the letter text, then `🔧 Bash: node generate-cover-letter.mjs --payload data/jsc/tmp/cover-….json` (no `--report`). |
| 3.3 | Back on the report | **Cover letter** tab shows `output/cover-<slug>-<NNN>.pdf`. The **PDF** tab still shows the CV. |

## 4. CV Studio

| # | Step | Expect |
|---|---|---|
| 4.1 | CV Studio → set accent colour `#7c2d12`, body font `DM Sans, Arial, sans-serif`, density **Compact**, template **Modern**, section order `skills, experience` → **Save style** | "Style saved"; `config/cv/style.yml` holds exactly those keys; a `.bak` appears on the second save. |
| 4.2 | Enter font size `huge` → Save | 400 with the message under the Font size field; nothing written. |
| 4.3 | Generate (or regenerate) a PDF from a row | Run log: `Template: modern (upstream)` and `🎨 Style applied: --accent-color, --font-family, density:compact, sections:skills>experience`; the PDF uses the modern layout with the new colour, DM Sans embedded, Skills before Experience. |
| 4.4 | Add `style: { accent_color: "#000" }` to `config/profile.yml` | CV Studio shows the warning that profile.yml overrides the tokens; a new PDF is black (upstream's value wins). Remove it → warning gone. |
| 4.5 | Drop a copy of `templates/cv-template.html` at `config/cv/templates/mine.html` | It appears under "Yours" in the template picker; choosing it, a new PDF's log says `Template: mine (custom)`. |
| 4.6 | Voice: **Seed from template** → edit a rule → **Save voice rules** | `voice-dna.md` written at the root; the next cover-letter run's prompt (`data/jsc/prompts/<run>.md`) ends with a "Voice DNA (apply)" section containing your text. Evaluate prompts do not. |
| 4.7 | Put a `.md` in `writing-samples/` | Listed with size and date; `README.md` is not. |

## 5. Queue behaviour

| # | Step | Expect |
|---|---|---|
| 5.1 | Evaluate three URLs quickly | Two run at once, the third shows **Queued** ("Waiting for a free slot") and starts when one finishes. `JSC_MAX_AGENTS=1` serializes them. |
| 5.2 | While an evaluation runs, click **Dedup tracker** (preview) on the Pipeline page | It runs (script lane is free); the evaluation's merge step waits for it. |
| 5.3 | Cancel a **Queued** run | Cancelled immediately, no session was spawned. |
| 5.4 | Kill the `claude` process from Task Manager mid-run | The run fails with the exit code; number released; no chain. |
| 5.5 | Runs page while the server is down | Yellow "not connected" notice; disappears on reconnect, list refreshed from the `hello` frame. |

## 6. Things that must NOT happen

- No `merge-tracker` / `reconcile-auto` / `mark-pdf-ready` kind is startable from the
  browser: `curl -X POST localhost:4317/api/runs -H 'content-type: application/json' -d '{"kind":"merge-tracker"}'` → 400 `kind-unknown`.
- No `failed` rows in `batch/batch-state.tsv`, ever.
- `reports/*-RESERVED.md` never survives a finished run.
- `data/pdf-index.tsv` never loses the CV row when a cover letter is rendered.
- The server never binds to anything but 127.0.0.1.
- Nothing is ever submitted, sent or clicked on a job board.
