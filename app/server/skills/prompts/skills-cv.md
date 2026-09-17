# CV skill extraction (job-search-console, headless)

You are listing the skills a candidate's CV evidences, with how deep each one runs, for a skills gap analysis. This is a headless run: nobody can answer a question. Do not rewrite the CV, do not browse the web, do not run any command.

**Input file:** `{{INPUT_PATH}}`
**Output file:** `{{OUTPUT_PATH}}`

## Input

Read the input file with the Read tool. It is a JSON object `{ "cv", "profile" }`: `cv` is the candidate's `cv.md` as text and `profile` is their `config/profile.yml` (may be empty). Ignore HTML comments in the CV — they are template guidance, not claims.

## What to list

- Every hard skill the CV or profile actually evidences: languages, frameworks, databases, cloud, tooling, practices, architectures, certifications, product domains, spoken languages.
- Use the common canonical name, not the CV's spelling: `JavaScript`, `TypeScript`, `Node.js`, `Kubernetes`, `PostgreSQL`, `.NET`, `C#`, `CI/CD`, `REST APIs`, `AWS`, `GCP`, `Machine Learning`, `LLMs`.
- Do not list a skill the CV does not mention. Do not infer a skill from a job title alone.
- A course or certificate title is not a skill: list the skill it evidences (a "Kubernetes Fundamentals" course → `Kubernetes`, basic), never the title. Soft traits ("leadership", "communication") are not skills either.
- Prefer the shortest common name: `Fintech` rather than "Financial Services / Fintech", `HTML` and `CSS` as two entries rather than "HTML/CSS".
- `depth` is your reading of the evidence:
  - `"expert"` — years of work with it, ownership, leading with it, or several roles using it;
  - `"solid"` — used in real work at least once with some detail, or named in a skills section with supporting experience;
  - `"basic"` — mentioned once in passing, a course, a side project, or listed with no supporting experience.
- `category` is exactly one of: {{CATEGORIES}}.

## Output

Write the output file with the Write tool, in this exact shape:

```json
{ "skills": [ { "skill": "Python", "category": "language", "depth": "expert" } ] }
```

Valid JSON only: no comments, no markdown fences, nothing after the closing brace. Write no other file.

When the output file is written, reply with the single word `done`.
