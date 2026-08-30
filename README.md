# Job Search Console

**One local web app for the whole job search** — discover roles, evaluate them with AI,
generate tailored CVs, and see which skills you actually need to learn next. Everything
runs on your machine.

> **Status: in development.** M0 (fork hygiene) is the current milestone. There is
> nothing to install yet — see the [roadmap](#roadmap).

---

## Built on career-ops

Job Search Console is an independent fork of
**[career-ops](https://github.com/santifer/career-ops)** by Santiago Fernández de
Valderrama, used under the MIT license. career-ops supplies the engine: the job-board
scanners, the evaluation modes, and the CV templates. This project supplies a different
interface — a single web console — plus the skills-gap and CV-customization layers.

This project is **not affiliated with, endorsed by, or an official career-ops product**,
and does not use the career-ops name for itself. "career-ops" is upstream's name; see
their [TRADEMARK.md](https://github.com/santifer/career-ops/blob/main/TRADEMARK.md).
Upstream's original README is preserved here at
[docs/upstream/README.career-ops.md](docs/upstream/README.career-ops.md).

## What it does

1. **Profile** — upload and edit your resume (`cv.md`) and configure job board sources.
2. **Discovery** — run automated job discovery across multiple platforms.
3. **Evaluation** — trigger AI evaluations and tailored CV/PDF generation from the UI,
   with live progress; no terminal commands.
4. **Skills Gap Analysis** *(new in this fork)* — aggregate every posting you've scanned
   to report which skills are most in demand, which you fully have, which you partially
   have, and which you lack entirely — weighted toward the jobs you actually scored well
   against.
5. **CV Studio** *(new in this fork)* — control how your generated PDFs look (themes,
   fonts, layout) and how they read (voice and style rules), so your output isn't
   identifiable as a shared default template. Every theme is checked for ATS
   parseability.
6. **Tracking** — follow application statuses and review generated reports and PDFs.

## How it fits together

```
job-search-console/
├── app/                    # this project: web server, agent runner, skills layer, UI
├── providers/ modes/ …     # the career-ops engine, kept mergeable with upstream
└── cv.md  portals.yml  data/  reports/  output/    # your files, on your disk
```

Your data stays in plain markdown and YAML files on disk — the same format career-ops
uses. That means an existing career-ops user can point this console at their current
setup, and you can always drop back into a terminal in the same directory.

[PROJECT_PLAN.md](PROJECT_PLAN.md) is the source of truth for architecture and scope.

## Principles

- **Human-in-the-loop.** The system drafts and evaluates; *you* apply. It never submits
  an application, sends an email, or clicks anything on your behalf. Auto-apply is
  permanently out of scope.
- **Local-only.** The server binds `127.0.0.1`. No hosted service, no accounts.
- **No telemetry.** Nothing is collected. The only outbound traffic is to the AI provider
  you configure and the job boards being scanned.
- **Your data is yours.** Your CV and personal files never leave your machine except to
  the AI provider you chose.
- **Respects third-party terms.** Upstream's rate-limiting and scanning behavior is kept
  as-is.

## Roadmap

| Milestone | What ships |
|---|---|
| **M0** | Fork hygiene: own name and README, upstream credit, CI skeleton |
| **M1** | Read-only dashboard: browse your pipeline, reports, and PDFs in a browser |
| **M2** | Deterministic actions: portals CRUD, "Scan now", status changes written back |
| **M3** | Agent orchestration: evaluate / generate PDF / cover letter, with live logs |
| **M4** | Skills Gap: extraction, aggregation, and "what should I learn next?" |
| **M5** | CV Studio: structured CV data, themes, live preview, ATS guardrail |
| **M6** | Polish and release: onboarding, docs, v1.0 |

## Requirements

- Node.js 22 or newer
- [Claude Code](https://claude.com/claude-code) for the AI-powered steps (evaluation, CV
  tailoring). Support for other AI coding CLIs is a post-v1 goal.

## Getting started

Not yet installable — the web console arrives with M1. Until then, the career-ops engine
in this repository works exactly as upstream documents it.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). The short version: new code lives in `app/`, and
the upstream-owned paths (`providers/`, `modes/`, `templates/`, `scripts/`, `batch/`) are
never edited here — fixes for those belong
[upstream](https://github.com/santifer/career-ops).

## License

MIT. This fork retains upstream's copyright notice; see [LICENSE](LICENSE).
