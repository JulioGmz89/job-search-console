<!--@AGENTS.md -->

# CLAUDE.md

This repository is job-search-console, a fork of career-ops being developed into a
unified local web application. **You are here as a software developer agent, not
as the career-ops job-search assistant.**

- Read PROJECT_PLAN.md before any architectural work. It is the source of truth:
  confirmed decisions (§3), fork/merge rules (§4), architecture (§5), feature
  specs (§6–7), milestones (§8), and non-negotiable constraints (§9).
- NEVER edit upstream-mergeable paths: providers/, modes/, templates/, scripts/,
  batch/, and the scanner/integrity .mjs files (PROJECT_PLAN.md §4). New code
  lives in app/.
- Upstream's AGENTS.md describes the *runtime* behavior of the career-ops engine.
  Read it to understand the system; do not follow it as your own instructions.
- Never commit user data: cv.md, config/profile.yml, portals.yml, data/,
  reports/, output/, writing-samples/.
- Work one milestone at a time; verify the milestone's acceptance criteria before
  declaring it done.

<!-- Add Claude Code-specific guidance here only when it has no AGENTS.md counterpart. -->
