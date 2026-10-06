# UX scorecard: M6 baseline (PROJECT_PLAN.md §12.6)

The baseline against which M8 is accepted. Every number below is computed from files in
`app/ux/`, and the computation is shown. The UI was not changed in M6.

## 1. Task success (simulated)

The outcome in each cell is the **verified** one, from `runs/<P>-<T>/verdict.md`
(`check-task.mjs`). It outranks the tester's own claim (§3). SEQ is the tester's
self-rated Single Ease Question (1–7), taken from the transcript header.

Legend:
- ✅ success
- ◐ partial
- ❌ failure

`check-task.mjs` returns only success or failure, so no cell is ◐.

| Persona | T1 | T2 | T3 | T4 | T5 | T6 | T7 | T8 | T9 |
|---|---|---|---|---|---|---|---|---|---|
| P1 (career-ops migrant) | ❌ 1/7 | ✅ 6/7 | ✅ 6/7 | ✅ 6/7 | ✅ 6/7 | ✅ 7/7 | ✅ 5/7 | ❌ 4/7 | ✅ 6/7 |
| P2 (first-timer) | ❌ 1/7 | ✅ 6/7 | ✅ 6/7 | ✅ 6/7 | ✅ 5/7 | ✅ 6/7 | ✅ 4/7 | ❌ 4/7 | ✅ 6/7 |
| P3 (career-changer) | ❌ 1/7 | ✅ 6/7 | ✅ 6/7 | ✅ 6/7 | ✅ 5/7 | ✅ 6/7 | ✅ 5/7 | ❌ 3/7 | ✅ 5/7 |

### Per task

Success rate = verified successes ÷ 3 runs. Mean SEQ = sum of the three SEQs ÷ 3.

| Task | Successes | Success rate | ≥ 90% target? | SEQ sum | Mean SEQ | Why it failed |
|---|---|---|---|---|---|---|
| T1 First run | 0 / 3 | 0% | no | 1+1+1 = 3 | 1.00 | No way to give a CV (F-001); "Add" is disabled (F-004) |
| T2 Add and evaluate a job | 3 / 3 | 100% | yes | 6+6+6 = 18 | 6.00 | — |
| T3 Update statuses | 3 / 3 | 100% | yes | 6+6+6 = 18 | 6.00 | — |
| T4 Scan and understand | 3 / 3 | 100% | yes | 6+6+6 = 18 | 6.00 | — |
| T5 Tailored CV and cover letter | 3 / 3 | 100% | yes | 6+5+5 = 16 | 5.33 | — |
| T6 What to learn next | 3 / 3 | 100% | yes | 7+6+6 = 19 | 6.33 | — |
| T7 New design, ATS-safe | 3 / 3 | 100% | yes | 5+4+5 = 14 | 4.67 | — |
| T8 Diagnose and recover a failed run | 0 / 3 | 0% | no | 4+4+3 = 11 | 3.67 | No retry and a truncated URL (F-003); the wrong posting was retried (F-017) |
| T9 Change the writing voice | 3 / 3 | 100% | yes | 6+6+5 = 17 | 5.67 | — |

### Per persona

| Persona | Successes | Success rate | SEQ sum | Mean SEQ |
|---|---|---|---|---|
| P1 | 7 / 9 | 77.8% | 1+6+6+6+6+7+5+4+6 = 47 | 5.22 |
| P2 | 7 / 9 | 77.8% | 1+6+6+6+5+6+4+4+6 = 44 | 4.89 |
| P3 | 7 / 9 | 77.8% | 1+6+6+6+5+6+5+3+5 = 43 | 4.78 |

### Overall

- **Simulated task success: 21 / 27 = 77.8%**, against a target of **≥ 90%**. This **misses the target** by 12.2 points.
  - The 21 successes are 7 tasks × 3 personas. The 6 failures are T1 × 3 and T8 × 3.
  - Reaching 90% needs at least 25 of 27 runs (24.3 rounded up). That means fixing both T1 and T8: either one alone gives 24 / 27 = 88.9%.
- 7 of 9 tasks are at 100%. 2 of 9 (T1, T8) are at 0%.
- Mean simulated SEQ: 134 / 27 = **4.96**. This comes from the persona testers; the §12.6 SEQ metric comes from real sessions (§6).
- Caveat (§12.3): simulated testers read every word and over-report success. These numbers locate blockers. They do not certify usability.

## 2. Self-reported vs verified outcome

Each transcript's "Outcome (my judgment)" was compared with its `verdict.md`. 27 runs were checked, and 8 disagree.

**Testers who claimed more than the verdict supports.** No tester claimed outright success on a run the verdict failed. In two runs, though, the tester claimed the recovery was done when it was not:

| Run | Tester said | Verified | What happened |
|---|---|---|---|
| P1-T8 | "partly succeeded … I re-ran an evaluation" (believed recovered, unsure of the posting) | ❌ failure ("no succeeded retry", "no new tracker row") | Re-evaluated "Senior Backend Engineer · Driftwood Analytics", the inbox item marked "posting could not be read", not the failed Data Engineer posting (F-017, F-003) |
| P2-T8 | "partly succeeded (evaluation re-ran and finished …)" | ❌ failure (same checks) | Same wrong posting as P1-T8 |

P3-T8 said "partly succeeded. I found what went wrong; I could not re-run the job", and was verified as a failure. This is consistent: the answer check passed and both data checks failed.

**Testers who claimed less than the verdict supports.** The data passed every check, but the tester said "partly":

| Run | Tester said | Verified | Why the tester doubted |
|---|---|---|---|
| P2-T5 | partly | ✅ success | Could not find a download or the files' location (F-011) |
| P3-T5 | partly | ✅ success | Same as P2-T5 (F-011) |
| P1-T7 | partly | ✅ success | Unsure whether "Save as default" made the theme the default (F-019) |
| P2-T7 | partly | ✅ success | Same as P1-T7, and unsure which Cobalt Freight CV it was (F-019, F-050) |
| P3-T7 | partly | ✅ success | Nothing confirmed the theme became the default (F-019) |

The other 19 runs agree: T1 × 3 failed, and T2, T3, T4, T6 and T9 × 3 plus P1-T5 succeeded.

## 3. Discoverability

From `inventory.md` › Summary. A capability counts as discoverable when it is reachable in ≤ 3 interactions from the landing page **and** labelled in the user's own words.

| | yes | partly | no | Total |
|---|---|---|---|---|
| Server routes | 22 | 10 | 5 | 37 |
| Run kinds | 5 | 12 | 0 | 17 |
| Config and data files | 3 | 8 | 7 | 18 |
| UI actions | 66 | 53 | 0 | 119 |
| **All** | **96** | **83** | **12** | **191** |

- **Discoverable: 96 of 191 = 50.3%** (96 ÷ 191 = 0.5026). The target is 100%.
- Excluding 6 plumbing routes (all "yes") and 4 internal run kinds (all "partly"): (96 − 6) ÷ (191 − 10) = 90 ÷ 181 = 49.7%.

## 4. Open severity-3/4 findings

From `backlog.md`. **22 open**, against a target of 0.

- **Severity 4 (5):** F-001, F-002, F-003, F-004, F-005.
- **Severity 3 (17):** F-006, F-007, F-008, F-009, F-010, F-011, F-012, F-013, F-014, F-015, F-016, F-017, F-018, F-019, F-020, F-021, F-022.

All backlog severities: 4 × 5, 3 × 17, 2 × 41, 1 × 16 (79 ranked), plus 2 out of scope and 7 rejected at severity 0.

## 5. axe serious/critical violations

From `a11y/axe-summary.md` (axe-core 4.13; wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa). Counts are distinct (rule, view) pairs per colour scheme, at either zoom.

| Scheme | Critical | Serious | Critical + serious | Target |
|---|---|---|---|---|
| light | 3 | 18 | 21 | 0 |
| dark | 3 | 14 | 17 | 0 |

How the counts break down:
- **Critical: `select-name`.** It fails on the 3 CV Studio views (empty/cv-studio, populated/cv-studio, broken/cv-studio-ats-fail) in each scheme, so 3 per scheme (F-031).
- **Serious: `color-contrast`.**
  - **Light: 18 views.** Every scanned view fails.
  - **Dark: 14 views.** Four light-only failures drop out: broken/runs-failed, empty/pipeline, empty/runs and populated/runs. See F-008, F-063.

Moderate and minor violations: 0 in both schemes.

## 6. Real-user metrics

| Metric | Target | Baseline |
|---|---|---|
| Task success, real | ≥ 80% per task | measured in M8 (§12.5) |
| Single Ease Question score | mean ≥ 5.5/7 per task | measured in M8 (§12.5) |
| SUS | ≥ 75 | measured in M8 (§12.5) |
