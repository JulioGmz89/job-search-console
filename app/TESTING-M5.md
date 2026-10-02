# M5 test plan — CV Studio: structured CVs, live preview, themes, ATS guardrail

How to verify every M5 feature by hand, plus what the automated suite already covers.
Steps assume the branch `feat/m5-cv-studio`, Node ≥ 22, the root package installed
(`npm install` at the repository root, which also installs Playwright's Chromium) and —
for section 4 only — Claude Code installed. The M3 and M4 plans ([TESTING.md](TESTING.md),
[TESTING-M4.md](TESTING-M4.md)) still apply to everything they cover.

Acceptance criteria (PROJECT_PLAN.md §8):
1. change theme/tokens and see the PDF preview update **without an agent call**;
2. a **past CV can be re-rendered** in a new theme;
3. a **deliberately broken theme** triggers the ATS warning.

## 0. Automated checks (run first)

```sh
cd app
npm run lint        # expect: no output after "eslint ."
npm run build       # expect: "✓ built in …"
npm test            # expect: # pass 239, # fail 0
```

Tests that need Chromium (the real-renderer checks in `ats.test.js` and the render half of
the PDF chain in `agent-runs.test.js`) skip themselves when Playwright's Chromium is not
installed — which is the case in CI for `app/`, since it does not install the root package.
Run the suite locally before merging.

| Suite | Covers |
|---|---|
| `services/cvdocs.test.js` | payload shape (cover payloads excluded); output/ listing joined to pdf-index by HTML basename, `.themed.html` included; M3 run payloads imported once, never overwriting; ids only from the listing |
| `services/cvrender.test.js` | build cache keyed by payload + template (a failed build caches nothing); finalize applies ours, then upstream's steps in generate-pdf.mjs order, profile.yml after ours; style/template validation; browser pool: one launch, serialized pages, JS-off contexts |
| `services/ats.test.js` | text folding; keywords; lost name/email/heading/keywords and scrambled order are critical; an unrendered section is a warning; **real render: `standard` passes, `broken.html` fails with the table, the email and the headings named** |
| `cv/theme.test.js` | `render-cv.js --document`: build → fact gate → generate-pdf → ATS, exact argv; a failed fact gate renders nothing; sample, unknown ids, bad theme and bad date refused |
| `queue/cv-specs.test.js` | `cv-render` argv pinned; paths, the sample, unknown documents/themes refused; ATS verdict surfaced; `mark-pdf-ready` only with a report |
| `agents/assemble.test.js` | the `pdf-structured` prompt: `modes/pdf.md` + voice, payload path in output/, told not to render |
| `agent-runs.test.js` | a high score → structured pdf session (fake CLI) writes the payload → `cv-render` (real build, fact gate, render, ATS) → `mark-pdf-ready` → the report's PDF and verdict; then a re-render in `modern` with no session; classic `structured: false` still works; a session that writes nothing fails; a request cannot set `reportNum` |
| `app.test.js` | `/api/cv/documents`, preview and gallery refuse bad ids, styles and themes before rendering; unknown preview/thumbnail ids are 404s |

## 1. Live preview without an agent (acceptance 1)

```sh
cd app && npm start          # http://127.0.0.1:4317
```

1. Open **CV Studio**. The CV picker selects your newest CV with a payload (labelled
   `Report NNN · cv-…` when it belongs to a report). The right column shows its PDF and a
   green or amber ATS verdict. The first render launches Chromium (~2 s).
2. Change the accent colour, the font size, the density, and add a section to the order.
   **Expect** the PDF to re-render after each change, with the head reading
   `Rendered in … ms · no agent call` (typically 0.3–0.7 s), the form saying
   "Unsaved changes — the preview shows them already", and the **Runs** page listing nothing.
3. Click a different card in the **Themes** gallery. **Expect** the preview to switch theme
   (the head adds `· HTML rebuilt` the first time each theme is used).
4. **Revert**, and the preview goes back. **Save as default** writes `config/cv/style.yml`.
5. Pick **Sample CV (fictional)**. It previews too, but **Render this CV** is disabled: the
   sample is for previews only.

## 2. Re-render a past CV in a new theme (acceptance 2)

1. With a CV that belongs to a report selected, pick a theme you have not used for it
   (e.g. **Modern**) and click **Render this CV** (or **Save & render this CV** with
   unsaved tokens, which saves them first, because a final render reads the saved style).
2. **Expect** a run panel showing, in order: `📄 <id> → theme modern …`, the
   build-cv-html summary, `CV fact check passed`, generate-pdf's lines with
   `Manifest: data/pdf-index.tsv updated (report NNN)`, and `🛡️ ATS check: pass|warn …`.
   A `Mark PDF ready` run follows.
3. Open the report from the pipeline. Its **PDF** tab shows the new PDF in the new theme,
   with the ATS verdict above it. The old PDF is still in `output/`.
4. **Re-render all in this theme** queues one `Render CV` run per CV that belongs to a
   report. Follow them on the Runs page.

> **The fact gate is real.** A payload written months ago may claim something your current
> `cv.md` no longer evidences. That render stops with `❌ The fact gate (verify-cv-facts.mjs)
> failed — nothing was rendered` and lists the claim. This is correct: fix `cv.md` (or add a
> verified exception to `config/cv-facts.json`), or regenerate that CV with a PDF run.

## 3. A broken theme triggers the warning (acceptance 3)

```sh
cp app/server/services/__fixtures__/themes/broken.html config/cv/templates/broken.html
```

1. In CV Studio click **Refresh with these tokens**. The gallery gains a **broken** card
   (badge `yours`) marked **ATS fail · N critical** in red.
2. Click it. **Expect** a red, itemized banner above the preview: "ATS check failed — an
   applicant-tracking system will lose part of this CV", "This is a custom theme, and it is
   not ATS-safe", then the findings: no email address, a `<table>` layout, hidden text, the
   name and email missing from the PDF text, and each section heading "in the document but
   not in the PDF text".
3. (Optional) **Render this CV** with it. The run succeeds, but its log prints
   `🚨 ATS CHECK FAILED` with the same list, and the report's PDF tab shows the red verdict.
   Re-render in a good theme afterwards.
4. Clean up: `rm config/cv/templates/broken.html`.

## 4. Structured PDF run (real; spends one session)

1. From a report with no PDF, click **Generate PDF**. **Expect** the run log to read
   `Structured run: the session writes output/cv-<candidate>-<slug>.json; the console renders
   it in <theme>`, the session to end after the fact gate (no `generate-pdf.mjs` call in its
   tool log), then a chained **Render CV** run and **Mark PDF ready**.
2. The new CV now appears in CV Studio's picker, and can be previewed and re-themed like
   any other.

## 5. Things that must NOT happen

- A preview or gallery render must not create files in `output/` or touch
  `data/pdf-index.tsv` (they live in memory and `data/jsc/cache/cv/`).
- No request may name a path: documents are ids from the library, themes are names from
  the template list, and `reportNum` on `cv-render` is refused from the browser.
- Nothing under `templates/`, `modes/`, or the upstream `.mjs` files is modified.
- A CV that fails the fact gate is never rendered, by any path.
