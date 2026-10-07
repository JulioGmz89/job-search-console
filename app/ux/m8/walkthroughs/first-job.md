# Cognitive walkthrough (M8 re-measure) — first-job: from an empty workspace to a first evaluated job

- **Start state:** `empty`, the same sandbox as T1 (http://127.0.0.1:4402/), continued right
  after T1's step 5. Default `--delay 8000`.
- **Personas:** P2 (acceptance persona), with P1 and P3 noted where they differ
- **Expected path:** `tasks.md` › Expected paths › first-job: T1, then Today › **Check your
  first job** → paste the posting link → **Check fit now** → "Fit 4.1 / 5" → **Open the
  job**: it is application #1 in **Applications**.
- **Walked** on 2026-10-07 by `heuristic-evaluator`, Chromium via Playwright, 1280 × 800,
  light scheme.

Steps 1–5 are T1 and are answered in `T1.md` (all yes, no findings). This file covers
steps 6–9.

Summary: 4 further steps, 2 with a "no" or "partly" (steps 7 and 8). 2 findings: one
severity 3, one severity 2. All four success criteria were met (CV present, Kestrel Media
followed, the check succeeded in 8 s, Applications has one row, Kestrel Media — Senior
Backend Engineer, with a fit report).

---

## Step 6 — Today › "Check your first job": paste the link into "Link to the job posting"

| Q | Answer | Reason |
|---|---|---|
| Q1 | **Yes** (all) | The goal gives a posting link and asks whether it fits; the set-up card's last line says "Next: check a job you already like (below)". |
| Q2 | **Yes** | The section is directly under "You’re set up" (and, after a reload, the first section on Today). |
| Q3 | **Yes** (all) | "Paste a job’s link and the assistant tells you how well it fits your CV" is the goal in other words. |
| Q4 | **Yes** | The link shows in the field. "Check fit now" with an empty field shows "Paste the link to the job posting, starting with https://" under it. |

The collapsed "▸ Also make a tailored CV if the fit is 3.0 or more" is unticked by default
and explains itself when opened ("about 3 more minutes … Change the number in Profile").
P2 does not know what 3.0 means yet, but leaving it alone does no harm.

## Step 7 — "Check fit now"

| Q | Answer | Reason |
|---|---|---|
| Q1 | **Yes** (all) | |
| Q2 | **Yes** | The primary button under the field. |
| Q3 | **Yes** (all) | The line under the field separates the two buttons: "Check fit now: the assistant writes a fit report, about 2–5 min, uses your Claude plan. Save for later: keeps the link in To review." (M6 W-T2-01's "Add to inbox" confusion is gone.) |
| Q4 | **Yes, with a doubt** (P2) | A "Working · 3 s so far" card with a progress bar, "Usually 2–5 min. You can leave this page; it carries on." and "Cancel" appears under the button, and the top bar's button becomes "Activity · 1 working". But the same card also appears at the top of the page under a new "Working now" heading, so two identical working cards, each with its own Cancel, are on screen at once (W8-first-job-01). P2's "did that actually do anything?" is answered; "did I start it twice?" is raised. |

### W8-first-job-01: A running fit check shows twice on Today, each copy with its own Cancel
- **Severity:** 2
- **Where:** Today › "Working now" card, and the card under "Check your first job" › "Check fit now"
- **Tasks:** first-job
- **Capabilities:** UI-pipeline-evaluate-now, UI-shared-run-cancel
- **Method:** walkthrough (first-job step 7, Q4)
- **Evidence:** app/ux/m8/evidence/W8-first-job-01.png
- **Reproduction:**
  1. `node app/ux/sandbox.mjs --state empty --port 4402`, open http://127.0.0.1:4402/
  2. Complete set-up: paste any CV into "Your CV" → "Save my CV"; "Company name" `Kestrel Media`, "Careers page link" `https://job-boards.greenhouse.io/kestrelmedia` → "Follow company".
  3. In "Check your first job", paste `https://job-boards.greenhouse.io/kestrelmedia/jobs/4134913` into "Link to the job posting" → "Check fit now".
  4. Observe within 3 s: a "Working now" section at the top with "Check fit · greenhouse.io/kestrelmedia, job 4134913 · Working · Cancel", and an identical card under the "Check fit now" button.
- **Notes:** The card under the button is the designed one (it is where the user's eyes are). The duplicate in "Working now" makes a first-timer suspect a double click and offers two Cancel buttons for one run. Both titles name the job board and job number rather than the job, since the posting has not been read yet; that is acceptable during the run.

## Step 8 — The check finishes: "Fit 4.1 / 5" → "Open the job"

| Q | Answer | Reason |
|---|---|---|
| Q1 | **Yes** | The user is waiting for the result. |
| Q2 | **No** (P2, P3) / Partly (P1) | After about 8 s, both working cards **and the whole "Check your first job" section disappear**. No result card, no "Fit 4.1 / 5. The fit report is ready.", no "Just finished" card and no "Open the job" button appear on Today; keyboard focus is on nothing. What appears instead, lower down, is a new "Waiting for you" section: "1 job reviewed but not applied · Best: Kestrel Media — Senior Backend Engineer (fit 4.1) · Review them". The header still says "Nothing needs you right now." The designed result exists only in the Activity panel ("Done … Fit 4.1 / 5. The fit report is ready. then: added to Applications · Open the job"), behind "Activity · 1 done". |
| Q3 | **Partly** (P2) | "Kestrel Media — Senior Backend Engineer (fit 4.1)" is a link to the job and does name the job P2 checked. But it sits under "reviewed but not applied", which P2 did not do ("reviewed by whom?"), and "fit 4.1" has no "/ 5" or recommendation. |
| Q4 | **Partly** | P1 reads "fit 4.1" and moves on. P2 saw the thing they were watching vanish; the page shifted and nothing says "done" where they were looking (W8-first-job-02). The M8 P2 persona run (`app/ux/m8/runs/P2-first-job/transcript.md`: "The form just disappeared, and only the Activity button changed") reports the same moment. |

### W8-first-job-02: When the first check finishes, its card and the whole "Check your first job" section vanish; the result and "Open the job" are not shown on Today
- **Severity:** 3
- **Where:** Today › "Check your first job" › the check's card, at the moment the run ends
- **Tasks:** first-job
- **Capabilities:** UI-pipeline-evaluate-now, UI-today-done-open, UI-today-reviewed, R-run-events
- **Method:** walkthrough (first-job step 8, Q2 and Q4)
- **Evidence:** app/ux/m8/evidence/W8-first-job-02.png
- **Reproduction:**
  1. Steps 1–3 of W8-first-job-01.
  2. Wait about 10 s without touching the page.
  3. Observe: "Working now" and "Check your first job" are both gone, with the card that was under the button. The page shows "Good morning, Alex · Nothing needs you right now", "New since you last looked", and a new "Waiting for you · 1 job reviewed but not applied · Best: Kestrel Media — Senior Backend Engineer (fit 4.1) · Review them". No "Fit 4.1 / 5", no recommendation, no "Just finished" card, no "Open the job"; focus is on nothing.
  4. Click "Activity · 1 done": the panel shows the result card the expected path describes ("Fit 4.1 / 5. The fit report is ready. … Open the job").
- **Notes:** This is the payoff moment of the M8 acceptance task, and P2's give-up condition is "not knowing whether something worked". From the screen, the section seems to go because Today shows "Check your first job" only while there are no applications, which stops being true the moment the check succeeds. The user can still finish (the "fit 4.1" link opens the job page, which shows "Fit 4.1 / 5 · Recommendation: Apply"), so this slows and confuses rather than blocks. Keeping the finished card in place until the user leaves Today, with focus on its "Open the job", would match `tasks.md`'s expected path and the behaviour of Applications › Add a job.

## Step 9 — The job page, and application #1 in Applications

| Q | Answer | Reason |
|---|---|---|
| Q1 | **Yes** | P2 wants the reasons; P3 asks "says who?". |
| Q2 | **Yes** | Reached from the "Kestrel Media — Senior Backend Engineer" link (or Activity › "Open the job"). |
| Q3 | **Yes** | |
| Q4 | **Yes** (all) | The job page leads with "Fit 4.1 / 5 · Recommendation: Apply · How the fit is worked out", "Status Reviewed — not applied", then Documents and the fit report. Applications lists one row, "Kestrel Media — Senior Backend Engineer". The page also shows "Your note: Fixture evaluation", an artefact of the sandbox's fake assistant, not of the UI. |

---

## Earlier findings on this task

first-job is new in M8, so it has no M6 or M7 walkthrough of its own. The M6 and M7
findings it inherits are those of T1 (see `T1.md`) and of T2's first half:

| ID | Status on this path | What was observed |
|---|---|---|
| W-T2-01 (2) "Add to inbox" reads as "save this job" | **Closed** | The line under the field says what each button does. |
| W-T2-02 (3) "Finished" does not say what the evaluation concluded | **Partly closed** | The conclusion is written ("Fit 4.1 / 5. The fit report is ready."), but on this path only in Activity; Today shows "fit 4.1" in a different section (W8-first-job-02). |
| WP-T2-05 (2) focus lost when the progress card turns into the result card | **Open on Today's first-job form** | Focus goes nowhere when the card disappears (W8-first-job-02). Closed on Applications (see `T2.md`). |

---

## Verdict

**A first-time user completes first-job unaided**, in about 10 actions, without leaving
the app. Every data criterion is met. The step most likely to stop a first-timer is
**step 8**: the card they were watching disappears with the result, and they must notice
"(fit 4.1)" in a new "Waiting for you" section, or the "Activity · 1 done" button, to find
it. A P2 who does not will believe the check failed or went nowhere.

---

## Re-check after the fix

**W8-first-job-02: closed.** Re-checked on 2026-10-07 by `heuristic-evaluator` in a fresh
EMPTY sandbox at http://127.0.0.1:4402/, Chromium via Playwright, 1280 × 800.

1. Set-up as in `tasks.md` T1: pasted Alex Rivera's CV into "Your CV" → **Save my CV**;
   "Company name" `Kestrel Media`, "Careers page link"
   `https://job-boards.greenhouse.io/kestrelmedia` → **Follow company**. "You’re set up" appeared
   with focus on it, and "Check your first job" below it.
2. Pasted `https://job-boards.greenhouse.io/kestrelmedia/jobs/4134913` into "Link to the job
   posting" → **Check fit now**.
3. While running (snapshots at about 1 s and 5 s): **one** card, under the button inside "Check
   your first job": "Working · Oct 7, 07:06 · 1 s so far · Check fit ·
   greenhouse.io/kestrelmedia, job 4134913", a progress bar, "Usually 2–5 min. You can leave
   this page; it carries on.", **Cancel**, with focus on its title. No "Working now" section
   appeared, so the running check is shown only once (W8-first-job-01 is also no longer seen).
4. When the check finished (8 s), the "Check your first job" section stayed on Today, and the
   same card turned into "Done · Oct 7, 07:06 · took 8 s · Check fit · Kestrel Media — Senior
   Backend Engineer · Fit 4.1 / 5. The fit report is ready. · then: added to Applications ·
   **Open the job**", with keyboard focus on **Open the job** (link to `#/applications/1`). It
   was still there 3 s later. "Waiting for you · 1 job reviewed but not applied · Best: Kestrel
   Media — Senior Backend Engineer (fit 4.1)" appeared below, as before.

Remaining nit, not filed: the result card gives "Fit 4.1 / 5" but not the recommendation
("Apply"), which the job page leads with; Applications' card behaves the same.

- **Evidence:** app/ux/m8/evidence/W8-first-job-02-recheck.png
