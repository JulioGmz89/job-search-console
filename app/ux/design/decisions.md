# M7 decisions

Decisions that close M7 (PROJECT_PLAN.md §8 M7, §11, §12.7). Agents proposed the options;
the maintainer decided.

## D-1 · Design direction: "C + A patterns" (checkpoint 1, 2026-10-06)

**Decision.** Take direction **C, Today** forward, with **A, Workbench**'s workspace
patterns. Taken by the maintainer at checkpoint 1, from the options in `directions.md`.

**What that means** (spelled out in `ia.md`):
- **Home.** **Today** is a home of next actions, limited to facts the data actually holds:
  - failures;
  - data problems;
  - new openings since the last visit;
  - jobs that replied or are interviewing without documents;
  - jobs reviewed but not applied.

  On day one it is the set-up checklist.
- **Workspaces.** Object workspaces in the top bar: Applications, To review, Companies,
  Skills, My CV.
  - Applications keeps A's dense, keyboard-operable table.
  - A job opens as its own page, never below the list.
- **Activity.** A's coloured Activity indicator on every page. It opens an overlay panel
  that never reflows the layout.
- **Documents.** A's document cards, with file name, date, design, writing rules and
  screening verdict.
- **From B:**
  - "I've sent my application", which sets Applied with the date;
  - the always-mounted live region that names the job.

**Why** (evidence: `directions-walkthrough.md`):
- C was the only direction with every task predicted to succeed for every persona.
- C closes F-003 and F-016 in their strongest form.
- C's workspaces are A's object model, so it scales to the whole inventory.
- A's severity-3 layout risk (the side panel and tray wrapping below the list) is avoided
  by full job pages and an overlay panel.
- B's severity-3 data-contract risk (stages with no `states.yml` value) is avoided
  entirely.

## D-2 · Component library and styling: React Aria Components + plain CSS tokens (closes §11)

**Decision.** M8 builds the UI with **React Aria Components** (`react-aria-components`) for
interactive primitives, styled only with **plain CSS** that uses the custom properties in
`tokens.css`. No Tailwind and no CSS-in-JS. The dependency is installed from npm and
bundled by Vite; nothing loads from a CDN (§9.2). Taken by the maintainer at
checkpoint 1.

**Why:**
- Most of the accessibility severity-3/4 findings are about behaviour that React Aria
  implements and tests:
  - keyboard table rows and sorting (F-005, F-014);
  - dialog focus trap, Escape and return focus (F-020);
  - a select that commits only on choose (F-022);
  - tabs with panels (F-044);
  - a live announcer (F-006).
- Hand-writing these again is where M1–M5 went wrong.
- It is unstyled, so the look stays ours, built on `tokens.css` alone.
- It supports React 19 and works with the existing hash router.

**Rejected alternatives:**
- **Plain CSS with our own primitives.** No dependency, but every accessible pattern is
  ours to get right.
- **Radix Primitives.** Smaller, but it has no accessible table or grid, and the
  Applications table is the densest surface.

**Consequences for M8:**
- Copy `tokens.css` to `app/ui/src/tokens.css` and import it first. Retire the old
  variables in `styles.css` as each page is rebuilt.
- Use React Aria for: Table, GridList, Dialog/Modal, Popover/Menu, Select, ComboBox
  (search), Switch, Checkbox, Disclosure, Toast or `announce()`.
- Plain elements stay plain: links, buttons, headings, forms.
- The `ux-reviewer` gate (§12.3) checks each PR against `ia.md`, `tokens.css` and the
  findings the PR claims to close.

## D-3 · Things M7 leaves to M8 on purpose

- **Editing title and location filters** (Companies › What jobs to keep). Editable only
  if upstream's `portals.yml` filters round-trip through the console's writer; otherwise
  read-only with help.
- **Companies to skip** (`data/blacklist.md`). Listed in v1. Editing it waits for a writer
  that round-trips the format.
- **Adding writing samples from the app.** The folder is shown; upload is a follow-up.
- **Today's `data/jsc/today.json`** (last seen, dismissed cards) is fork-owned state. It
  is not part of the data contract.

- **T6 success criterion in `app/ux/tasks.md`.** With the fit filter on, Skills now
  re-ranks the list by good-fit postings (WP-T6-01's fix), so the top three can differ
  from `lists.learn`. Before M8 re-runs T6, the criterion should also accept the
  filtered top three, with the evidence checked against the same filtered postings.

## Approval (checkpoint 2)

Approved by the maintainer on 2026-10-06, at checkpoint 2, after reviewing the T1–T9
prototypes and the walkthrough re-run.

- **Direction:** "C + A patterns", as specified in `ia.md`, `sitemap.md` and `tokens.css`,
  with React Aria Components plus plain CSS tokens (D-2).
- **Conditions:** none.
- **Basis:** the walkthrough re-run (`walkthroughs/T1.md`–`T9.md`) found no severity-3 or
  -4 issue on any top task. Two that came up during the re-run, WP-T6-01 and WP-T9-01,
  were fixed and re-walked. The axe pass over the prototypes found 0 violations in both
  schemes.
- **Carried into M8 as build notes:** the remaining walkthrough findings, all severity 2
  or lower, with the most common being focus after an action completes.
