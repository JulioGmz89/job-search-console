# M7 prototypes

Clickable prototypes of the chosen direction, "C + A patterns" (`../ia.md`), for every top
task in `../../tasks.md`. They are static HTML, CSS and vanilla JS on `../tokens.css`.
They contain only fictional data, generated from the UX sandbox seed by `make-data.mjs`.

```bash
node app/ux/design/serve.mjs            # http://127.0.0.1:4420/ lists them
node app/ux/design/prototypes/make-data.mjs   # regenerate data.js after a seed change
```

## How they behave

- **Every page starts on Today** (`#/today`), as the app will. `T<n>.html` sets the start
  state to match the sandbox state of task T<n>:
  - **empty** for T1;
  - **broken** for T7 and T8, where the CV design fails the screening check, one fit
    check has failed, and one application line cannot be read;
  - **populated** otherwise.
- **The AI assistant is a timer.** A check, tailored CV or letter says "usually 2–5 min"
  and finishes after about 3.5 seconds. Checks for new openings and layouts take about
  2 seconds.
- **State is kept per page** in `sessionStorage`. **Reset prototype** (in the banner)
  starts over.
- **Off-prototype links.** "Open the posting ↗" links point at fictional Greenhouse
  addresses and are not part of any task.

## Start pages and expected click paths

These are for the walkthrough re-run. The paths are not shown to anyone who walks the
prototypes blind. Steps count clicks and fields typed into, from Today.

| Task | Start | Shortest path |
|---|---|---|
| T1 | `T1.html` (empty) | Today › Get set up: paste the CV into **Your CV** › **Save my CV** › **Company name** and **Careers page link** › **Follow company** (5 steps). The steps tick off, and Today then offers "Check your first job". |
| T2 | `T2.html` | **Applications** › **Job posting link** (paste) › **Check fit now**. A result card appears in place: "Done · added to your applications as #41 · Fit 4.1 / 5 · Recommendation: Apply · Open Kestrel Media" (3 steps, plus the wait). |
| T3 | `T3.html` | Today › **Review them** (or Applications › chip **Reviewed — not applied 9**). The list is sorted by fit. Row Cobalt Freight — Staff Software Engineer › status menu › **Applied — yesterday**, then the same for Driftwood Analytics — Backend Engineer (Go) (5 steps). |
| T4 | `T4.html` | Today › **Check for new openings** › **See the results in To review**, or go straight to **To review** › **Check for new openings**. The summary reads "4 new openings…; Juniper Mobility couldn't be reached" (2–3 steps). |
| T5 | `T5.html` | Today › Waiting for you › **Granite Cloud — Software Engineer, Payments** (or Applications › row link) › Documents › **Make tailored CV** › **Write cover letter** › three answers › **Tone** › **Write the letter** › **Open** / **Download** for each (about 9 steps, plus the waits). |
| T6 | `T6.html` | **Skills** (opens on **Learn next**) › 1. gRPC: "Asked for in 22 postings (12 required, 10 nice to have)" › **Show the evidence for gRPC** (companies) (2 steps). |
| T7 | `T7.html` (broken) | Today › Needs you › **Choose a design that passes** (or My CV › Design) › a card marked "Readable by screening systems" › **Make … my design for every CV** › **Update this CV's layout to …** for Cobalt Freight — Staff Software Engineer (the preview's CV) (4 steps). |
| T8 | `T8.html` (broken) | Today › Needs you: "a fit check didn't finish · Driftwood Analytics — Data Engineer", with the cause in words › **Try again**. The Activity button and the Today card update, then: "Done · added to your applications as #41" (1–2 steps). Also reachable from **Activity · 1 failed** and from **To review** ("Last check failed"). |
| T9 | `T9.html` | **My CV** › **Writing rules** › **Add a word or phrase** "seamless" › **Add** (×3 words) › under "When do new rules apply?", Cobalt Freight — Staff Software Engineer › **Make it again** (about 9 steps). The ready card says "your writing rules of today". |

## Files

| File | What it is |
|---|---|
| `T1.html` … `T9.html` | Task entry pages: the same app with a different start state |
| `index.html` | The list of tasks |
| `app.js` | The prototype: state, routes, pages, simulated runs |
| `proto.css` | Components built on `../tokens.css` |
| `data.js` | Fictional data generated from `app/ux/sandbox/seeds/populated` |
| `make-data.mjs` | The generator for `data.js` |
