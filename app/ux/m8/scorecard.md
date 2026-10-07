# UX scorecard: M6 baseline vs M8 (PROJECT_PLAN.md §12.6)

Every number below comes from a file, and the computation is shown.

## Sources

| Data | M6 files | M8 files |
|---|---|---|
| Baseline | `app/ux/scorecard.md` | — |
| Persona runs | `app/ux/runs/*/transcript.md` | `app/ux/m8/runs/*/transcript.md` and `verdict.md`. The verdicts come from `check-task.mjs` and outrank the tester's own claim. |
| Inventory | — | `app/ux/m8/inventory.md` |
| axe | — | `app/ux/m8/a11y/axe-summary.md` |
| Findings | — | `app/ux/m8/closure.md` and `app/ux/m8/backlog.md` |

M8 persona runs were made on 0a32cd5a (P1), 21e77352 (P2) and 5f430776 (P3). The first-job run was re-run on d5abd208. The state assessed is after 63dc6ac3.

## Against the §12.6 targets

| Metric | Target | M6 | M8 | Met? |
|---|---|---|---|---|
| Task success, simulated | ≥ 90% | 21/27 = 77.8% | 27/27 = 100% | Yes |
| Single Ease Question (simulated, indicative) | mean ≥ 5.5 per task (the target applies to real sessions) | 4.96 overall; T1 1.00, T8 3.67, T7 4.67 below 5.5 | 6.48 overall; every task ≥ 6.00 | Indicative only. The target needs real sessions. |
| Steps vs expected (not a §12.6 target) | — | 299 steps / 27 runs = 11.07 mean | 227 / 27 = 8.41 mean | — |
| Discoverability | every capability (100%) | 96/191 = 50.3% | 227/293 = 77.5% | No |
| axe serious/critical, light | 0 | 3 critical + 18 serious | 0 + 0 | Yes |
| axe serious/critical, dark | 0 | 3 critical + 14 serious | 0 + 0 | Yes |
| Open severity-3/4 findings | 0 | 22 | 0 | Yes |
| First-job acceptance run | passes | — (task added in M8) | success; 12/60 steps; SEQ 7/7 | Yes |
| Task success, real | ≥ 80% per task | measured in M8 (§12.5) | **pending (stage B)** | Pending |
| SEQ, real | mean ≥ 5.5 per task | measured in M8 | **pending (stage B)** | Pending |
| SUS, real | ≥ 75 | measured in M8 | **pending (stage B)** | Pending |
| Real sessions held | ≥ 3 | 0 | **0: pending (stage B)** | Pending |

## 1. Task success (simulated)

Each cell gives the verified outcome from `verdict.md` and the tester's SEQ (1–7) from the transcript header. `check-task.mjs` returns only success or failure. Every M8 verdict reads "Verified outcome: success".

| Persona | T1 | T2 | T3 | T4 | T5 | T6 | T7 | T8 | T9 |
|---|---|---|---|---|---|---|---|---|---|
| P1 | success 7/7 | success 6/7 | success 6/7 | success 6/7 | success 7/7 | success 7/7 | success 6/7 | success 7/7 | success 6/7 |
| P2 | success 7/7 | success 7/7 | success 6/7 | success 6/7 | success 7/7 | success 7/7 | success 6/7 | success 7/7 | success 6/7 |
| P3 | success 7/7 | success 6/7 | success 6/7 | success 7/7 | success 6/7 | success 6/7 | success 6/7 | success 7/7 | success 7/7 |

For comparison, the M6 matrix (`app/ux/scorecard.md` §1) had T1 failed ×3 (SEQ 1, 1, 1) and T8 failed ×3 (SEQ 4, 4, 3), with every other cell a success.

### Per task

Success rate is successes ÷ 3. Mean SEQ is the sum of the three SEQs ÷ 3.

| Task | M6 success | M8 success | ≥ 90%? | M6 SEQ sum, mean | M8 SEQ sum, mean |
|---|---|---|---|---|---|
| T1 First run | 0/3 = 0% | 3/3 = 100% | yes | 3, 1.00 | 7+7+7 = 21, 7.00 |
| T2 Add and evaluate a job | 3/3 = 100% | 3/3 = 100% | yes | 18, 6.00 | 6+7+6 = 19, 6.33 |
| T3 Update statuses | 3/3 = 100% | 3/3 = 100% | yes | 18, 6.00 | 6+6+6 = 18, 6.00 |
| T4 Scan and understand | 3/3 = 100% | 3/3 = 100% | yes | 18, 6.00 | 6+6+7 = 19, 6.33 |
| T5 Tailored CV and letter | 3/3 = 100% | 3/3 = 100% | yes | 16, 5.33 | 7+7+6 = 20, 6.67 |
| T6 What to learn next | 3/3 = 100% | 3/3 = 100% | yes | 19, 6.33 | 7+7+6 = 20, 6.67 |
| T7 New design, ATS-safe | 3/3 = 100% | 3/3 = 100% | yes | 14, 4.67 | 6+6+6 = 18, 6.00 |
| T8 Recover a failed run | 0/3 = 0% | 3/3 = 100% | yes | 11, 3.67 | 7+7+7 = 21, 7.00 |
| T9 Change the writing voice | 3/3 = 100% | 3/3 = 100% | yes | 17, 5.67 | 6+6+7 = 19, 6.33 |

### Per persona (M8)

| Persona | Successes | SEQ sum | Mean SEQ |
|---|---|---|---|
| P1 | 9/9 | 7+6+6+6+7+7+6+7+6 = 58 | 6.44 |
| P2 | 9/9 | 7+7+6+6+7+7+6+7+6 = 59 | 6.56 |
| P3 | 9/9 | 7+6+6+7+6+6+6+7+7 = 58 | 6.44 |

### Overall

- **Simulated task success: 27/27 = 100%** (M6: 21/27 = 77.8%). This meets the ≥ 90% target, and all 9 tasks are at 100%.
- **Mean simulated SEQ: 175/27 = 6.48** (M6: 134/27 = 4.96). The 175 is 58 + 59 + 58.
- Note on P3-T6: the verdict's detail reads "named Machine Learning", which the checker matched in the tester's caveat. The tester's main answer, gRPC, is also in the top three, so the run succeeds either way.
- Caveat (§12.3): simulated testers read every word and over-report success. These numbers locate blockers; they do not certify usability.

## 2. Self-reported vs verified outcome

- Every M8 transcript says "succeeded", and every `verdict.md` says success: 27 of 27 runs, plus first-job.
- **Disagreements: 0.** No tester claimed more than the verdict supports, and none claimed less. M6 had 8: 2 claimed more (P1-T8, P2-T8) and 5 claimed less (P2-T5, P3-T5, P1-T7, P2-T7, P3-T7), plus P3-T8, which `app/ux/scorecard.md` §2 calls consistent.

## 3. Steps vs expected

This is not a §12.6 target; it is recorded for comparison.
- **Steps** are each transcript's "Steps used" header. Values written as "about N" are taken as N.
- **Expected** is the action count in each M8 walkthrough header (`app/ux/m8/walkthroughs/T*.md`).
- Testers counted differently: some include screenshots, failed clicks or waits (e.g. P1-T3, P3-T8). Expected counts exclude navigation and waits. Compare the trend, not single values.

| Task | Expected actions (M8 walkthrough) | M8 steps P1 / P2 / P3 | M8 mean | M6 steps P1 / P2 / P3 | M6 mean |
|---|---|---|---|---|---|
| T1 | about 6 | 8 / 9 / 5 | 22/3 = 7.33 | 12 / 17 / 17 | 46/3 = 15.33 |
| T2 | about 4 | 9 / 6 / 8 | 23/3 = 7.67 | 6 / 6 / 8 | 20/3 = 6.67 |
| T3 | 1 + 2 × 4 = 9 | 15 / 17 / 13 | 45/3 = 15.00 | 8 / 7 / 5 | 20/3 = 6.67 |
| T4 | 2 | 6 / 5 / 4 | 15/3 = 5.00 | 5 / 5 / 12 | 22/3 = 7.33 |
| T5 | about 9 + typing | 14 / 8 / 11 | 33/3 = 11.00 | 10 / 17 / 32 | 59/3 = 19.67 |
| T6 | 2–3 | 4 / 4 / 4 | 12/3 = 4.00 | 3 / 4 / 4 | 11/3 = 3.67 |
| T7 | about 5 | 9 / 9 / 7 | 25/3 = 8.33 | 7 / 10 / 14 | 31/3 = 10.33 |
| T8 | 1 + one wait | 6 / 6 / 8 | 20/3 = 6.67 | 13 / 11 / 10 | 34/3 = 11.33 |
| T9 | about 8 | 12 / 10 / 10 | 32/3 = 10.67 | 20 / 12 / 24 | 56/3 = 18.67 |
| **All** | | **227 / 27** | **8.41** | **299 / 27** | **11.07** |
| first-job | about 10 (`walkthroughs/first-job.md` verdict) | P2: 12 of 60 | — | — | — |

- The two M6 failure tasks dropped from 15.33 to 7.33 (T1) and from 11.33 to 6.67 (T8), and T5 and T9 roughly halved.
- **T3 rose** from 6.67 to 15.00:
  - M8's "When did you apply…?" dialog adds two actions per row ("Yesterday" and "Save as Applied"), which the expected path counts (9).
  - P2-T3 reports "about 7 wasted" failed clicks.
- **M8 wrong turns** (from each transcript's "Wrong turns"; M6 had no such figure):
  - P1-T2: 1 (To review).
  - P3-T2: 2 (Today, row click).
  - P1-T9: 2 (Skills, Workspace).
  - P2-T9: 2 (Skills, Workspace).
  - P3-T8: 2, both the tester's own errors by their account.
  - That is 9 wrong turns in 5 of 27 runs. The T2 and T9 ones are B8-03 and B8-12.

## 4. Discoverability

From `app/ux/m8/inventory.md` › Summary. A capability is discoverable when it is reachable in ≤ 3 interactions from Today **and** labelled in the user's own words.

| | Rows | yes | partly | no | no UI by design |
|---|---|---|---|---|---|
| Server routes | 51 | 37 | 5 | 4 | 5 |
| Run kinds | 17 | 10 | 2 | 1 | 4 |
| Config and data files | 18 | 11 | 4 | 2 | 1 |
| UI actions | 207 | 169 | 35 | 2 | 1 |
| **All** | **293** | **227** | **46** | **9** | **11** |

The inventory's totals check: 227 + 46 + 9 + 11 = 293.

| Figure | M6 | M8 |
|---|---|---|
| All rows | 96/191 = 50.3% | **227/293 = 77.5%** |
| The 191 rows both inventories share | 96/191 = 50.3% | 134/191 = 70.2% |
| Excluding plumbing | (96 − 6)/(191 − 10) = 49.7% | 227/(293 − 11) = 227/282 = 80.5% |

- **Target (every capability): not met.**
- The inventory gives these reasons ("Why it is not 100%"):
  - My CV › Design depth: 15 "partly" rows.
  - The job page is one click deeper than before (the cover-letter form is 4 interactions from Today).
  - Fold placement: Profile's Save, and "I've sent my application".
  - "More options" in the Follow form (by design).
  - Two dropped M6 controls: validate-portals, and retrying failed fetches.
  - The "Not built, against sitemap.md" list.
- Inventory gaps that are also findings: B8-04 (status history), B8-06 (writing samples), B8-10 (title filter), B8-32 (validate-portals) and B8-75 (reports with no row).

## 5. axe serious/critical violations

From `app/ux/m8/a11y/axe-summary.md`:
- Generated 2026-10-07 with the rule set wcag2a, wcag2aa, wcag21a, wcag21aa and wcag22aa.
- Counts are distinct (rule, view) pairs per scheme.
- It covers 35 views at 100% and 200% zoom, with nothing skipped (first in commit 776801e3; `a11y/manual.md`).

| Scheme | M6 critical | M6 serious | M8 critical | M8 serious | M8 moderate / minor | Target |
|---|---|---|---|---|---|---|
| light | 3 | 18 | 0 | 0 | 0 / 0 | 0, met |
| dark | 3 | 14 | 0 | 0 | 0 / 0 | 0, met |

- **Re-run on the final build (63dc6ac3):** `node app/ux/a11y/audit.mjs --out app/ux/m8/a11y` again reported 0 violations at every level in both schemes, all 35 views, 100% and 200% zoom. `a11y/axe-summary.md` is unchanged by it.
- `reviews/final-recheck.md` checked the new Today cards visually in dark at 320 px with no problem found. A re-run on 63dc6ac3 would make this figure current.

## 6. Open severity-3/4 findings

| | M6 | M8 |
|---|---|---|
| Open severity 4 | 5 (F-001 – F-005) | 0 |
| Open severity 3 | 17 (F-006 – F-022) | 0 |
| **Total** | **22** | **0** (target 0: met) |

- All 22 M6 findings are Closed (`closure.md`: 22 Closed, 0 Partly closed, 0 Open).
- All 16 severity-3/4 IDs raised during M8 are closed, each with its commit (`backlog.md`).
- **Open after M8:** 13 at severity 2, 62 at severity 1, and 16 fixed but not re-verified (severity ≤ 2).

## 7. First-job acceptance run (PROJECT_PLAN.md §8 M8)

> "In a fresh sandbox, a simulated first-time persona gets from an empty workspace to a first evaluated job without leaving the app."

| | Result | Source |
|---|---|---|
| Persona and state | P2 (first-timer), fresh `empty` sandbox, re-run on d5abd208 | `runs/P2-first-job/transcript.md`; commit d5abd208 |
| Verified outcome | **success.** 4 of 4 checks pass: `cvPresent=true`; `portals.yml` exists with an enabled company; an evaluation succeeded; the tracker has a row with a report (1, Kestrel Media) | `runs/P2-first-job/verdict.md` |
| Steps | 12 of a 60-step budget (expected about 10) | transcript; `walkthroughs/first-job.md` |
| SEQ | 7/7 | transcript |
| Wrong turns | none | transcript |
| Later regression | The T1 + first-job continuation passed by keyboard in `reviews/final.md` (d5abd208) and `reviews/final-recheck.md` (5c827a5a): Fit 4.1 / 5, row 1, focus on Open the job | both reviews |

**Met.**

## 8. Real-user criteria: pending (stage B)

No real session has run. The kit is in `app/ux/sessions/`:
- `README.md`
- `task-cards.md`
- `forms.md`
- `notes-template.md`
- `sessions.mjs` and `sessions.test.js`

No participant notes and no `results.md` exist yet. `sessions.mjs score` writes `results.md` from the notes.

| Criterion (§12.5, §12.6) | Target | Status |
|---|---|---|
| Real people through moderated sessions | ≥ 3 | **pending (stage B)**: 0 held |
| Task success, real | ≥ 80% per task | **pending (stage B)** |
| Single Ease Question, real | mean ≥ 5.5/7 per task | **pending (stage B)** |
| SUS | ≥ 75 | **pending (stage B)** |

### Per task (real users)

| Task | Real success | Real mean SEQ |
|---|---|---|
| T1 | pending (stage B) | pending (stage B) |
| T2 | pending (stage B) | pending (stage B) |
| T3 | pending (stage B) | pending (stage B) |
| T4 | pending (stage B) | pending (stage B) |
| T5 | pending (stage B) | pending (stage B) |
| T6 | pending (stage B) | pending (stage B) |
| T7 | pending (stage B) | pending (stage B) |
| T8 | pending (stage B) | pending (stage B) |
| T9 | pending (stage B) | pending (stage B) |

## M8 acceptance (§8) at a glance

| Criterion | Status |
|---|---|
| Every severity-3/4 finding closed | Met (0 open) |
| Every top task meets its §12.6 target | Simulated success met (100% on every task). Real-user targets pending (stage B). |
| axe zero serious or critical | Met in both schemes, re-checked on the final build (63dc6ac3). |
| First-job acceptance run | Met |
| ≥ 3 real people complete the sessions | Pending (stage B) |
| Discoverability (§12.6) | Not met: 77.5% against 100% |
