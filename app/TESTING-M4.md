# M4 test plan — the Skills Gap analysis

How to verify every M4 feature by hand, plus what the automated suite already covers.
Steps assume the branch `feat/m4-skills-gap`, Node ≥ 22, and — for section 3 only —
Claude Code installed (`claude --version` works in a terminal). The M3 plan
([TESTING.md](TESTING.md)) still applies to everything it covers.

Acceptance criterion (PROJECT_PLAN.md §8): *after a scan of ≥50 postings, the page answers
"what should I learn next?" with evidence links.*

## 0. Automated checks (run first)

```sh
cd app
npm run lint        # expect: no output after "eslint ."
npm run build       # expect: "✓ built in …"
npm test            # expect: # pass 215, # fail 0
```

The skills suites (`server/skills/*.test.js`) never touch the network or a real Claude:
the ATS payloads are inline fixtures, the browser rung is a fake child process, and the
extraction sessions run `server/services/__fixtures__/bin/fake-claude.js` inside a temp
copy of the fixture workspace.

| Suite | Covers |
|---|---|
| `store.test.js` | posting ids fold tracking params/scheme; text hash ignores whitespace; a failed refetch keeps old text; corrupt cache files read as absent; overrides validate |
| `corpus.test.js` | scan-history.tsv by header name (ragged rows); the inbox, tracker and reports join on the normalized URL; `skipped_*` rows are excluded; report id and score come along |
| `fetch.test.js` | Greenhouse/Lever/Ashby/Workday/LinkedIn payload → text; Ashby board memoized per org and "not on the board" = gone; `gh_jid` pages resolved through portals.yml; browser-extract output and error line; jds/ capture wins; the ladder's error precedence; retry policy; the worker end to end |
| `rules.test.js` | fork aliases over upstream's; `Express`/`Unity`/`Go` only as written; required vs nice-to-have from headings and inline hints; the CV's skills section vs prose |
| `aggregate.test.js` | one vote per posting; score-band weights; nice-to-have half; trend axis; co-occurrence; override > CV > missing; the three lists; ignore |
| `service.test.js` | `GET /api/skills` against a seeded cache; LLM vs rules per posting; stale CV extraction detected; gap mentions from fixture report 001; `PUT /api/skills/overrides` |
| `extract.test.js` | `POST /api/skills/extract` batches; the fake session's output is validated, canonicalized, deduped and cached by text hash; partial output leaves ids pending; no output fails; an extracted posting is never resent; bad options are 400s |
| `queue/specs.test.js` | argv of `skills-fetch` pinned; a real scan chains `skills-fetch-auto`, a dry run does not |

## 1. Rehearsal with the fake CLI (no tokens, no network)

Same throwaway workspace as the M3 rehearsal, plus a few cached postings so the page has
something to show. From the repository root in Git Bash:

```sh
W=/tmp/jsc-m4 && rm -rf $W && mkdir -p $W/config
cp -r app/server/services/__fixtures__/workspace/* $W/
printf '# Ada Lovelace\n\n## Experience\n- Built the engine in Python; touched Terraform once\n\n## Skills\n- Python, PostgreSQL\n' > $W/cv.md
printf 'candidate:\n  name: "Ada Lovelace"\nspend_tier: standard\n' > $W/config/profile.yml

# Seed the text of five postings (the fixture corpus has no reachable URLs).
node --input-type=module -e "
import { writePosting } from './app/server/skills/store.js';
const root = process.argv[1];
const jd = (l) => l.join('\n') + '\n' + 'Filler sentence about the role. '.repeat(10);
writePosting({ root, url: 'https://example.com/jobs/2', source: 'greenhouse-api', title: 'Backend Engineer', text: jd(['Requirements:', '- Python and Kubernetes', '- PostgreSQL', 'Nice to have:', '- Terraform']) });
writePosting({ root, url: 'https://example.com/jobs/3', source: 'lever-api', title: 'Staff Engineer', text: jd(['Requirements:', '- Kubernetes and Go', '- Kafka']) });
writePosting({ root, url: 'https://example.com/jobs/4', source: 'ashby-api', title: 'Data Engineer', text: jd(['Must have:', '- Kubernetes', '- dbt and Snowflake']) });
writePosting({ root, url: 'https://example.com/jobs/5', source: 'browser', title: 'Full Stack', text: jd(['You have:', '- Node.js and React', '- Kubernetes (preferred)']) });
writePosting({ root, url: 'https://example.invalid/jobs/acme-backend', source: 'jds', title: 'Backend Engineer', text: jd(['Must have:', '- Kubernetes', '- Python']) });
writePosting({ root, url: 'https://example.com/jobs/6', error: { code: 'browser-empty_text', message: 'login wall' } });
" "$(cygpath -w "$W")"

cd app && npm run build && \
CAREER_OPS_ROOT="$(cygpath -w "$W")" \
JSC_CLAUDE_BIN="$(pwd -W)/server/services/__fixtures__/bin/fake-claude.js" \
FAKE_CLAUDE_SCENARIO=skills-ok \
node server/index.js
```

Then open <http://127.0.0.1:4317/#/skills>:

| # | Step | Expect |
|---|---|---|
| 1.1 | Page loads | Coverage strip: **14 postings · 5 with text · 0 read by Claude · 5 rules only · 1 could not be read · 8 evaluated**; "CV: 4 skills by rules — Claude has not read it yet · gap notes mined from 1 report". Buttons **Fetch posting text**, **Retry 1 failed**, **Read 5 postings with Claude (1 session)**. |
| 1.2 | **Learn next** tab (default) | **Kubernetes** first (5 postings, 4 required / 1 nice, gaps 1 — fixture report 001's soft gap), then Go/Kafka/Node.js/React are absent (demand 1 is below the floor of 2). Bar is red (missing). |
| 1.3 | **Deepen** tab | **Terraform** (partial — mentioned in the CV's prose only). |
| 1.4 | **Most demanded** tab | Every skill; Python and PostgreSQL green (have — named in the CV's Skills section), Terraform amber, the rest red. Category filter and the search box narrow the list. |
| 1.5 | Click **▸ Kubernetes** | The row expands: "5 postings ask for Kubernetes · flagged as a gap in report 001"; each posting shows its level badge, score when evaluated (Acme 4.2), first-seen date, `rules`, a **posting ↗** link and, for Acme, **report 001**. "Often asked for together with" chips: Python, Go, … |
| 1.6 | Click **report 001** | Lands on `#/pipeline/1`: the Acme row is selected and its report opens below the table. Browser back returns to the Skills page. |
| 1.7 | Click a co-occurrence chip (e.g. **Python**) | Switches to Most demanded and scrolls to Python's row, expanded. |
| 1.8 | Change Kubernetes' status to **Partial** | The bar turns amber; the row moves to **Deepen**; a **reset** button appears. `cat $W/data/skills/overrides.json` → `{"kubernetes":"partial"}`. Click **reset** → back to Missing, file empty. Set to **Ignore** → gone from every list; **Show ignored** on Most demanded brings it back. |
| 1.9 | Click **Read 5 postings with Claude (1 session)** | Notice "Queued 2 Claude sessions" (the batch + the CV); the button reads "Claude is reading… (2 sessions)". On **Runs**: `Extract skills from 5 postings` → Finished, log ends "Extracted 5 postings · N skill mentions"; `Extract skills from the CV` → Finished, "CV: 3 skills recorded". Back on Skills (auto-refreshed): **5 read by Claude**, "CV: 3 skills, read by Claude". Kubernetes now required in all 5 (the fake says so); Python is **Have** (expert), Terraform **Partial** (basic), PostgreSQL **Have**. The button now reads **Everything read by Claude** and is disabled. |
| 1.10 | `ls $W/data/skills/extractions` | Five `<hash>.json`, each `"engine": "llm"`. `cat $W/data/skills/cv.json` has the CV's hash. Click the button again (after editing nothing) → nothing is queued. |
| 1.11 | Edit `$W/cv.md` (add a line), reload the page | "CV: … by rules — cv.md changed since Claude last read it"; the button offers **Read the CV with Claude** again. |
| 1.12 | Restart with `FAKE_CLAUDE_SCENARIO=skills-partial`, delete one extraction file, click the button | The run finishes **succeeded** with "1 posting not in the output — still pending" in red; the coverage still shows 1 pending. |
| 1.13 | Restart with `FAKE_CLAUDE_SCENARIO=skills-no-output`, delete one extraction file, click the button | The run **fails**: "the session exited without writing …-output.json". Nothing cached. |
| 1.14 | Click **Fetch posting text** | A `Fetch posting text` run: "Corpus: 14 postings … 8 to fetch", then one `fetch N/8 failed …` line per unreachable fixture URL (no network reaches example.com), "Done: 0 fetched, 8 failed". The coverage strip updates to **9 could not be read**. Click **Retry 9 failed** → the same, retried now rather than in a week. |
| 1.15 | Sources → **Scan now** with **Preview only** | The scan runs; **no** `Fetch posting text` follows it. Uncheck Preview only, scan → `Fetch posting text` is queued right after (Runs page). |

Fake CLI scenarios for M4: `skills-ok` (serves both the batch and the CV session),
`skills-partial`, `skills-no-output`, `skills-cv-ok`.

## 2. The real thing (acceptance criterion)

Prerequisites: the repository's own data (`portals.yml`, `data/scan-history.tsv` with
≥50 `added` rows, `cv.md`, some reports), Chromium installed by the root `npm install`.
No Claude needed for this section.

```sh
cd app && npm start          # http://127.0.0.1:4317
```

| # | Step | Expect |
|---|---|---|
| 2.1 | Open **Skills** | Coverage strip counts the corpus ("163 postings … 0 with text"); the empty state says to click **Fetch posting text**. |
| 2.2 | Click **Fetch posting text** | A run with a determinate progress bar (`fetch N/163`). Greenhouse/Lever/Ashby postings answer in under a second each via their APIs; the rest go through `browser-extract.mjs` (a few seconds each). Postings that have been taken down come back `failed gone`; that is the board's answer, not a bug. On this repository's data: **90 of 163 fetched, 69 gone, 4 unreadable**, ~6 minutes. The Skills page refreshes itself as the cache fills (file watcher). |
| 2.3 | **Learn next** | A ranked list with real numbers — here AWS (25 postings, flagged as a gap in 16 reports), TypeScript, Distributed Systems, Kubernetes, PostgreSQL… — every one **red** because none is on the CV. That list is the answer to "what should I learn next?". |
| 2.4 | Expand the first row | Every posting that asks for it, sorted by score: company, title, level, score, date, `rules`, **posting ↗** (opens the board), **report NNN** for evaluated ones. Report links open the row on the Pipeline page. |
| 2.5 | **Most demanded** | Skills on the CV are green (e.g. C#, .NET, Unity for this CV), partial ones amber. Toggle **Jobs I'd apply to** → only skills asked for by postings scored ≥ 4.0, sorted by that count (empty when no strong-scored posting has text — the count is honest). |
| 2.6 | `ls data/skills/postings | wc -l` | One file per corpus posting (163), failures included; `git status` shows nothing — `data/` is ignored. |
| 2.7 | Sources → **Scan now** (real) | After the scan, `Fetch posting text` runs on its own and fetches only the new postings ("… 90 with text cached · N to fetch"). |

## 3. Claude extraction (real; spends sessions)

Prerequisites: `claude` on PATH (or `JSC_CLAUDE_BIN`). Each session reads up to ten
postings; `JSC_MAX_AGENTS` (default 2) run at once.

| # | Step | Expect |
|---|---|---|
| 3.1 | Click **Read N postings with Claude (K sessions)** | Notice "Queued K+1 Claude sessions" (the CV too, the first time). Runs page: each `Extract skills from 10 postings` streams `🔧 Read: …input.json`, `🔧 Write: …output.json`, ends "Extracted 10 postings · ~60 skill mentions" in about a minute; `Extract skills from the CV` ends "CV: N skills recorded". On this repository's data (spend tier standard → Sonnet 5) the first batch took **68 s, 3 turns, $0.50** and recorded 68 skill mentions; the CV **46 s, $0.35**, 49 skills. |
| 3.2 | Skills page after they finish | "**10** read by Claude"; expanded rows show `Claude` instead of `rules` for those postings; required vs nice-to-have and categories improve (e.g. skills the vocabulary did not know appear: *Infrastructure as Code*, *SOLID*, *Clean Architecture*). "CV: N skills, read by Claude" with Have/Partial now from the depth Claude assigned. |
| 3.3 | Click the button again | Only the postings still pending are sent; the ten already read are never resent (`data/skills/extractions/<hash>.json` timestamps unchanged). When nothing is pending: "Nothing left for Claude to read". |
| 3.4 | Cancel a running session from Runs | Status **Cancelled**; nothing cached for that batch; the postings stay pending. |
| 3.5 | `ls data/jsc/tmp/skills-*` | The exact batch each session was given and the JSON it wrote back, for inspection. |

## 4. Things that must NOT happen

- No file outside `data/skills/` and `data/jsc/` is written by any skills run — never
  `applications.md`, `pipeline.md`, `portals.yml`, `cv.md`, `reports/`.
- Nothing is sent to Claude but the posting text (and, for `skills-cv`, `cv.md` and
  `profile.yml`); the sessions have no `WebFetch` target and are told not to browse.
- The fetch worker never GETs an arbitrary page and strips it: only fixed-host ATS APIs
  (upstream's `resolveAtsApi`, SSRF-guarded) or `browser-extract.mjs` (its own guard).
- A posting whose text has not changed is never extracted twice (keyed by text hash).
- A failed or partial session never deletes an existing extraction.
- No auto-apply, no submissions, no external calls beyond the job boards and Claude.
