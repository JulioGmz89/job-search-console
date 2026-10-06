# Heuristic evaluation — Skills

Scope: the Skills page (`#/skills`): the coverage header ("73 postings · 70 with text … ·
41 evaluated", two bars, "CV: …"), "Fetch posting text", "Retry 3 failed", "Read 40
postings with Claude (4 sessions)", "How this page works", tabs "Learn next" / "Deepen" /
"Most demanded", "Jobs I'd apply to", category select, "Find a skill…", the table
(Weighted demand, Postings, Strong, Gaps, Trend, Status) and the expanded evidence rows.

Evaluated on 2026-10-04 against `populated` (port 4400); `empty` checked (see
`empty-state.md`); `broken` looks the same as `populated` here. I did not start a reading
run.

Summary: 0 × sev 4, 0 × sev 3, 4 × sev 2, 0 × sev 1.

---

## 1. Visibility of system status

### H-skills-03: Changing a skill's status makes it vanish after a delay, with no confirmation or undo
- **Severity:** 2
- **Where:** Skills › "Learn next" › row › Status select ("Missing" → "Have")
- **Tasks:** T6
- **Capabilities:** UI-skills-status, R-skills-overrides, UI-skills-reset
- **Method:** heuristic (H1 Visibility of system status; H3 User control and freedom)
- **Evidence:** app/ux/evidence/H-skills-03.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/#/skills
  2. On the first row (gRPC) set the Status select to "Have".
  3. Observe: for ~1–2 s the row still reads "Missing" (no saving indicator); then gRPC disappears, "Learn next 16" becomes "15", and Prometheus is now first. No message says where gRPC went or how to undo.
- **Notes:** This changes the answer to T6 ("which skill first?") silently. A user exploring the select to see the options can remove the top recommendation by accident. Undo exists only indirectly (find gRPC under another tab and set it back).

## 2. Match between system and the real world

### H-skills-01: The table's numbers are unlabelled codes: "23 (12/11)", "Strong", "Gaps", a bar with no value, a sparkline with no axis
- **Severity:** 2
- **Where:** Skills › table › "Weighted demand", "Postings", "Strong", "Gaps", "Trend"
- **Tasks:** T6
- **Capabilities:** UI-skills-tab-learn, UI-skills-expand, R-skills
- **Method:** heuristic (H2 Match; H6 Recognition rather than recall)
- **Evidence:** app/ux/evidence/H-skills-01.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/#/skills
  2. Read the gRPC row: Postings "23 (12/11)", Strong "3", Gaps "8", a full red bar, sparkline "▁▁▁██▂". Hover the headers: no tooltip.
  3. Click "▸ gRPC". Observe: "23 postings ask for gRPC · flagged as a gap in report 009, 011, …" and per-posting "required"/"nice to have" chips.
- **Notes:** The expanded evidence is excellent and answers T6, but the summary row does not explain itself: "(12/11)" is required/nice-to-have, "Strong" is "postings you scored ≥ 4.0", the bar is a weighted score (18.25 is only in the accessible name), and the trend has no period. Only "How this page works" explains some of these, and it does not mention "(12/11)" or the trend. P3 ("how many jobs is this based on?") will read 23 and 3 and not know which is the answer.

### H-skills-02: The coverage header is pipeline jargon: "read by Claude", "rules only", two unlabelled bars
- **Severity:** 2
- **Where:** Skills › header
- **Tasks:** T6
- **Capabilities:** R-skills, UI-skills-fetch, UI-skills-help
- **Method:** heuristic (H2 Match between system and the real world)
- **Evidence:** app/ux/evidence/H-skills-02.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/#/skills
  2. Observe: "73 postings · 70 with text (96%) · 30 read by Claude · 40 rules only · 3 could not be read · 41 evaluated", two thin bars (grey, orange) with no legend (their names are only in hover titles), "CV: 18 skills, read by Claude · gap notes mined from 34 reports".
- **Notes:** P3 wants to know "how up to date is this, and how many jobs is it based on?". The header answers "how much of the pipeline has processed the data", in internal stage names. A plain line ("Based on 73 job postings from your scans, last updated <date>; 40 were read with a quick keyword pass — reading them with Claude improves accuracy") would serve P3.

## 3. User control and freedom

Covered by H-skills-03. Also observed: after following a "report 012" link and pressing Back, the page reloads with every row collapsed and the scroll position lost (minor).

## 4. Consistency and standards

No issues found. Tabs use the same chip style and counts as the Pipeline status chips; the Status select mirrors Pipeline's in-row editing.

## 5. Error prevention

### H-skills-04: "Read 40 postings with Claude (4 sessions)" starts paid work in one click, without saying what it costs
- **Severity:** 2
- **Where:** Skills › header › "Read 40 postings with Claude (4 sessions)"
- **Tasks:** T6
- **Capabilities:** UI-skills-extract, R-skills-extract, R-runs-start
- **Method:** heuristic (H5 Error prevention)
- **Evidence:** app/ux/evidence/H-skills-04.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state populated --port 4400`, open http://127.0.0.1:4400/#/skills
  2. Observe: the button is a filled primary button beside "Fetch posting text" (also filled) and "Retry 3 failed" (outlined); its only cost signal is "(4 sessions)". Hovering shows no tooltip. (I did not click it, to keep the Skills cache intact.)
- **Notes:** The evaluation help elsewhere shows runs cost ~$0.05 each in the log; nowhere before launch does the app estimate cost or time. P2 does not know what a "session" is. Two adjacent filled buttons also give no single primary action.

## 6. Recognition rather than recall

Covered by H-skills-01.

## 7. Flexibility and efficiency of use

No issues found. Checked: tabs, "Jobs I'd apply to", category select, search, expandable evidence with links to the posting and to the report (`#/pipeline/<n>`, which opens and scrolls to the detail).

## 8. Aesthetic and minimalist design

No separate finding; the page is dense but organised. The demand bars are all the same dark red regardless of tab, which carries no meaning.

## 9. Help users recognize, diagnose, and recover from errors

No issues found on populated: "3 could not be read" is red and "Retry 3 failed" is next to it.

## 10. Help and documentation

No issues found. "How this page works" defines demand, weighting, Strong and Gaps and how Have/Partial/Missing are derived — but it is collapsed and sits above the table, so it is rarely opened at the moment of confusion (see H-skills-01).

---

## Strengths
- Evidence on demand: expanding a skill lists every posting with company, role, score, date, required vs nice-to-have, and links to the posting and the report — exactly P3's "says who?".
- The one-line description under the tabs ("Skills at least two postings ask for that your CV does not show … the answer to 'what should I learn next?'") states the page's purpose in the user's words.
- The empty state ("Nothing to analyse yet — scan your sources first, or paste a few job URLs on the Pipeline page") points to the feeding loop that P3 is at risk of missing.
- The user can override the CV-derived status, and the help says "your choice wins and is remembered".
