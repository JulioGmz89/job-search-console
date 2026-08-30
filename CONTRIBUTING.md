# Contributing to Job Search Console

This repository is a fork of [career-ops](https://github.com/santifer/career-ops).
Upstream supplies the engine — job-board scanners, evaluation modes, CV templates. This
project owns the interface: a local web console, plus the skills-gap and
CV-customization layers.

That split is the single most important thing to understand before you change anything
here, because it decides **which repository your change belongs in**.

Read [PROJECT_PLAN.md](PROJECT_PLAN.md) before any architectural work — it is the source
of truth for scope, milestones, and constraints.

## Who owns which paths

| Path | Owner | Rule |
|---|---|---|
| `providers/` `modes/` `templates/` `scripts/` `batch/`, the scanner and integrity `.mjs` files | upstream | **Never edit here.** Send fixes to [career-ops](https://github.com/santifer/career-ops) — they land back via merge |
| `app/` | this fork | All new code goes here |
| `dashboard/` (Go TUI), `web/` (upstream's alpha UI), per-CLI wrapper files | upstream, removable later | Leave alone for now; they'll be pruned once our UI covers them |
| `cv.md` `config/profile.yml` `portals.yml` `data/` `reports/` `output/` `writing-samples/` | you, locally | **Never commit.** This is personal job-search data |

Job board providers break constantly and upstream's community fixes them fast. Editing
those files here means re-resolving the same conflict every sync, and the fix helps
nobody else. Upstream is the right home for it.

**The seam:** `app/server/services/` is the only place that calls upstream code or parses
upstream's data files. All knowledge of upstream's formats is concentrated there — if
upstream changes a format, only that directory changes.

## Working on `app/`

`app/` is its own npm package with its own lockfile, mirroring the pattern upstream uses
for `web/`. This keeps the root `package.json` mergeable.

```sh
cd app
npm install
npm run lint     # eslint
npm test         # node --test
```

CI runs both on any PR that touches `app/**`. Source files use `.js` (not `.mjs`) on
purpose: upstream's root `npm run lint` syntax-checks every `.mjs` in the repository, and
our tree should stay out of its way.

## Syncing with upstream

The `upstream` remote is already configured:

```sh
git remote -v          # upstream -> https://github.com/santifer/career-ops.git
git fetch upstream
git merge upstream/main
```

Most of the tree merges cleanly because we don't touch it. The predictable conflicts are
the files upstream treats as system-owned (see `SYSTEM_PATHS` in `update-system.mjs`):
`README*.md`, `CONTRIBUTING.md`, `package.json`, and `.github/`.

**Resolution policy:**

- **Ours wins** for `README.md`, `CONTRIBUTING.md`, and the `name` / `description` /
  `repository` / `homepage` / `author` fields of `package.json`. These are fork identity;
  taking upstream's version re-brands us as career-ops.
- **Theirs wins** everywhere else, including every `script` and dependency in
  `package.json` and the translated `README.<lang>.md` files, which we leave untouched.

Two deliberate exceptions worth knowing about:

- Root `funding.json` is upstream's floss.fund manifest and stays as-is — `test-all.mjs`
  asserts it parses, and GitHub doesn't surface it. (`.github/FUNDING.yml`, which *is*
  surfaced as a Sponsor button, was removed.)
- Upstream's community-automation workflows (hired-wall, ledger-bot, welcome, stale, …)
  are disabled at the GitHub level rather than deleted, so no workflow file conflicts on
  merge.

## Known upstream test divergences

`node test-all.mjs --quick` is upstream's repo-integrity suite. It runs here, and most of
it is worth keeping — but a handful of its checks assert things that are true of
career-ops and deliberately not true of this fork. Don't "fix" these; they are the fork
working as intended.

| Check | Why it fails here |
|---|---|
| `README is missing required Codex usage guidance` | It requires README.md to document `codex exec` and CODEX.md. v1 supports Claude Code headless only ([PROJECT_PLAN.md §3](PROJECT_PLAN.md)); documenting Codex would advertise support we don't have. Multi-CLI is a post-v1 goal — revisit this check then |
| `SYSTEM_PATHS coverage gap` | Requires every tracked file to be registered in `update-system.mjs`, which is upstream's manifest for shipping *upstream's* files to users. `PROJECT_PLAN.md` and `app/**` are ours and must not be in it. Registering them would also make a high-churn merge hotspot worse |

Everything else in the suite should stay green. **Before you push, compare against a
baseline rather than reading the failure count cold** — several checks (the
`CLAUDE.md`/`AGENTS.md` wrapper assertions, the skill-router routing rule, and the `web/`
unit suites) were already red at the fork point and have nothing to do with your change:

```sh
git worktree add /tmp/baseline main
cd /tmp/baseline && node test-all.mjs --quick   # note the failure list
```

Your branch should add no failures to that list.

## Non-negotiable constraints

From [PROJECT_PLAN.md §9](PROJECT_PLAN.md). A PR that violates any of these will be
rejected regardless of how good the code is.

1. **Human-in-the-loop.** The system never submits an application, sends an email, or
   clicks anything on the user's behalf. It drafts and evaluates; the user acts.
   **Auto-apply of any kind is permanently out of scope.**
2. **Local-only.** The server binds `127.0.0.1`. No analytics, no telemetry, no external
   calls except the AI provider and the job boards being scanned.
3. **Respect third-party terms.** Keep upstream's rate-limiting and scanning behavior.
   Nothing that enables spamming job boards or ATS systems.
4. **Data contract compatibility.** Upstream CLI usage in the same directory must keep
   working. Anything we write must round-trip through upstream's own scripts.
5. **Secrets live in `.env`** (gitignored) — never in code or data files.
6. **Trademark.** Own name, credit upstream, never present this project as career-ops.

## Pull requests

- One milestone at a time; check the milestone's acceptance criteria in
  [PROJECT_PLAN.md §8](PROJECT_PLAN.md) before calling it done.
- Say what changed and why. If the change touches the upstream seam
  (`app/server/services/`), say which upstream format it depends on.
- Run `npm run lint` and `npm test` in `app/` before pushing.
- Double-check `git status` for user data. The `no-user-data` workflow blocks PRs that
  add or modify user-layer files, but catching it locally is faster.

## Contributing to the engine instead

Bugs in scanning, evaluation modes, or CV templates belong upstream — see
[career-ops' CONTRIBUTING](https://github.com/santifer/career-ops/blob/main/CONTRIBUTING.md).
A copy of it as of the fork point is preserved at
[docs/upstream/CONTRIBUTING.career-ops.md](docs/upstream/CONTRIBUTING.career-ops.md).
