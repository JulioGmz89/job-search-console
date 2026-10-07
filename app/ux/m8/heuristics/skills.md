# Heuristic evaluation (M8): Skills (`#/skills/learn`, `/strengthen`, `/asked`)

Spec: `app/ux/design/ia.md` §2.6. POPULATED (`:4401`), EMPTY (`:4402`). 1280×800.
Evaluator: heuristic-evaluator, 2026-10-07.

**Dark scheme: not exercised** (no way to switch `prefers-color-scheme` with the available
tools). Bars are a single purple; no meaning is carried by colour alone.

## 1. Visibility of system status

### H8-skills-03: The page shows only its title while the list loads
- **Severity:** 1
- **Where:** Skills › page body
- **Tasks:** T6
- **Capabilities:** R-skills
- **Method:** heuristic (H1 Visibility of system status)
- **Evidence:** app/ux/m8/evidence/H8-skills-03.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4401`, open http://127.0.0.1:4401/#/skills/learn
  2. Observe: for about a second the page is "Skills · What employers in your job search keep asking for…" and nothing else: no views, no basis line, no "Loading…".
- **Notes:** short, but an empty page under a heading reads as "no data". Today shows
  "Loading…"; do the same here.

## 2. Match between system and the real world

### H8-skills-02: Skill categories are shown as internal slugs
- **Severity:** 1
- **Where:** Skills › each skill row › category line; **Category** filter
- **Tasks:** T6
- **Capabilities:** R-skills
- **Method:** heuristic (H2 Match between system and the real world)
- **Evidence:** app/ux/m8/evidence/H8-skills-02.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4401`, open http://127.0.0.1:4401/#/skills/learn
  2. Read the line under each skill name.
  3. Observe: "cloud-infra", "ai-ml", "framework", "data", "language".
- **Notes:** P3 "will notice small things". "Cloud and infrastructure", "AI and machine learning".

## 3. User control and freedom

No issues found. Changing **gRPC on your CV** from Missing to **Has it** removes the row and
shows "gRPC moved to Has it · Undo · Hide"; **Undo** puts it back (fixes H-skills-03). The
three views are links with the current one marked.

## 4. Consistency and standards

No issues found. Every row uses the same pattern: rank, name, bar, "Asked for in N postings
(R required, M nice to have)", **Show the evidence for <skill>**, and a select named
"<skill> on your CV".

## 5. Error prevention

### H8-skills-01: "Improve the analysis" starts four paid sessions in one click, and Activity miscounts them
- **Severity:** 2
- **Where:** Skills › basis line › **Improve the analysis**
- **Tasks:** T6
- **Capabilities:** R-skills-extract, R-runs-start
- **Method:** heuristic (H5 Error prevention)
- **Evidence:** app/ux/m8/evidence/H8-skills-01.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4401`, open http://127.0.0.1:4401/#/skills/strengthen
  2. Click **Improve the analysis** ("Reads 40 postings with Claude · about 4 sessions · uses your Claude plan").
  3. Observe: no confirmation; the basis box at once shows "Waiting · Improve the skills analysis · Waiting — 2 others are running" while the top bar says "Activity · 4 working". Opening **Activity** lists several identical "Improve the skills analysis" cards with no "1 of 4".
- **Notes:** the cost is stated beside the button (good), but ia.md §3 asks bulk paid actions
  (here four sessions) to confirm with the count, as To review's **Check fit for selected** does.
  "4 working" when two are waiting repeats M6 H-runs-01's contradiction in a new place.

## 6. Recognition rather than recall

No issues found. The basis line says what the numbers rest on ("Based on 73 postings from 12
companies, last read Oct 7 · 30 read by Claude, 40 by quick rules, 3 couldn't be loaded (the
job was taken down)"), and the sentence above the list states the ranking rule.

## 7. Flexibility and efficiency of use

No issues found. **Only jobs I'd apply to (fit 4 and up)** re-ranks and says what it did
("Counting only the 8 postings whose fit is 4 or more: every number, the evidence and the order
below use just those. 6 skills with no good-fit posting are hidden."); the filter persists
across the three views; **Find a skill** and **Category** narrow the list.

## 8. Aesthetic and minimalist design

No issues found. One bar per row with a sentence explaining the bar's length ("Each bar's
length is how many good-fit postings ask for the skill, against the most-asked one").

## 9. Help users recognize, diagnose, and recover from errors

No issues found. Postings that could not be loaded are counted and explained in the basis line.

## 10. Help and documentation

No issues found. In EMPTY: "Nothing to rank yet · Skills are counted from the job postings the
app has found. Follow a company and check for new openings first… · Companies you follow ·
Check for new openings".

## Strengths

- Every number is labelled in words; the "say who?" evidence is one disclosure away, with
  postings by company and fit, and fit reports named "#12, fit 4.1" so same-titled jobs can be
  told apart (fixes H-skills-01, and WP-T6-01 from M7).
- The fit filter is honest about what it hides.
- The empty state explains where the data will come from (fixes H-empty-state-05).

## M6 findings re-checked (H-skills-*, H-empty-state-05)

| M6 ID | M6 problem | Status in M8 | Note |
|---|---|---|---|
| H-skills-01 | Unlabelled codes "23 (12/11)", "Strong", bars without values | **Fixed** | "Asked for in 24 postings (12 required, 12 nice to have)". |
| H-skills-02 | Coverage header jargon, two unlabelled bars | **Fixed** | Basis line in sentences. |
| H-skills-03 | Status change makes a skill vanish with no undo | **Fixed** | Undo bar. |
| H-skills-04 | "Read 40 postings with Claude" starts paid work without saying the cost | **Partly fixed** | Cost stated beside the button; still no confirmation (H8-skills-01). |
| H-empty-state-05 | Disabled button reads like success: "Everything read by Claude" | **Fixed** | Empty state explains and links the next step. |
