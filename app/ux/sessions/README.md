# Real-user sessions (M8, PROJECT_PLAN.md §12.5)

Simulated testers find blockers cheaply, but they never certify usability (§12.3). These
moderated think-aloud sessions do. M8 needs **at least 3** participants; 5 is better.
Each session takes about 60–75 minutes.

## Who to invite

People who look for jobs and have never used this app or career-ops. Try to cover the
three personas in `app/ux/personas.md`: someone who knows command-line tools (P1),
someone who doesn't (P2), and someone changing careers who mostly wants Skills and the
CV (P3). Each participant works in the fictional sandbox as Alex Rivera, so no real CV
or job search is ever shown.

## What you need

- This repository on a laptop, with `npm install` done in `app/` and `app/ui/`.
- The three sandboxes, started before the participant arrives, in separate terminals:

  ```
  node app/ux/sandbox.mjs --state empty     --port 4501
  node app/ux/sandbox.mjs --state populated --port 4502
  node app/ux/sandbox.mjs --state broken    --port 4503
  ```

  Each prints `SANDBOX_READY` with its URL. A sandbox is a throwaway copy: restart it
  (Ctrl+C, then the same command) between participants.
- `task-cards.md`, printed, one card per page (`node app/ux/sessions/sessions.mjs cards`
  regenerates it from `app/ux/tasks.md`).
- `forms.md`, printed: the Single Ease Question after each task and the SUS at the end.
- A copy of `notes-template.md` per participant, saved as `S01.md`, `S02.md`, …
- Optional: screen and audio recording, **only with consent**. Recordings stay on your
  machine and are never committed (`.gitignore` excludes them).

## Order of tasks

| Order | Task | Browser tab |
|---|---|---|
| 1 | T1 | empty, http://127.0.0.1:4501/ |
| 2 | T2 | populated, http://127.0.0.1:4502/ |
| 3 | T3 | populated |
| 4 | T4 | populated |
| 5 | T5 | populated |
| 6 | T6 | populated |
| 7 | T9 | populated |
| 8 | T8 | broken, http://127.0.0.1:4503/ |
| 9 | T7 | broken |

The sandboxes keep what the participant did, and the order above never needs a task's
starting data to be untouched by an earlier one. Open each task's tab yourself, on
**Today**, before handing over the card.

## Script

Read this aloud, in your own words.

> Thanks for helping. We are testing the app, not you: if something is hard, that is
> what we need to find. This is a job-search app; for today you are Alex Rivera, a
> fictional backend engineer, and everything in it is made up.
>
> I'll give you a few tasks on cards. Please think aloud as you go: what you look at,
> what you expect, what surprises you. I can't help while you work on a task, but you
> can stop any time, and saying "I'd give up here" is useful too.
>
> Is it OK if I take notes (and record the screen and your voice)? The notes keep no
> name; recordings stay on this laptop and are deleted after the study.

For each task:

1. Hand over the card and read it aloud. Start timing when they first touch the mouse
   or keyboard.
2. Don't help or hint. If they ask, say "What would you try?" Only step in if they are
   stuck for 3 minutes or ask to stop; that counts as **no**.
3. Stop timing when they say they're done or give up. Mark **yes** (the goal was
   reached), **partial** (part of it), or **no**.
4. Ask the Single Ease Question (`forms.md`) and note one sentence on why.
5. Note where they hesitated, what they misread, and the words they used for things.

At the end: the SUS questionnaire (`forms.md`), then "What one thing would you change?"

## After each session

1. Fill in `S0N.md` from your notes: the task table and the `SUS:` line. Keep it
   anonymous: a participant number and the persona they are closest to, no name.
2. Commit the notes (never the recordings).
3. Run `node app/ux/sessions/sessions.mjs score`. It writes `results.md` with per-task
   success, mean SEQ, median time and SUS, against the §12.6 targets: success ≥ 80% per
   task, SEQ ≥ 5.5 per task, SUS ≥ 75.
4. Problems you saw go to the M8 backlog (`app/ux/m8/backlog.md`) with severity 0–4,
   as `RU-S0N-NN`, and are fixed in M8 stage B.
