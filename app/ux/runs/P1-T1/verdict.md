# Verdict: P1-T1

Checked by `app/ux/check-task.mjs --task T1` against http://127.0.0.1:4450/ (state empty) on 2026-10-05T04:01:16.058Z.

**Verified outcome:** failure

| Check | Kind | Result | Detail |
|---|---|---|---|
| cv.md holds the CV | data | FAIL | cvPresent=false |
| portals.yml has an enabled company | data | FAIL | exists=false, enabled=none |

