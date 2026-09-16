# Skill extraction (job-search-console, headless)

You are turning job postings into structured skill data for a skills gap analysis. This is a headless run: nobody can answer a question, so make reasonable calls and finish. Do not evaluate the postings, do not read the candidate's CV, do not browse the web, do not run any command.

**Input file:** `{{INPUT_PATH}}`
**Output file:** `{{OUTPUT_PATH}}`
**Postings:** {{COUNT}}

## Input

Read the input file with the Read tool. It is a JSON array of postings, each `{ "id", "company", "title", "text" }`. `text` is the posting as plain text; long postings are trimmed to their opening and their requirements.

## What counts as a skill

- Hard skills and knowledge a candidate could go and learn: programming languages, frameworks and runtimes, databases, cloud services, infrastructure and tooling, practices (TDD, CI/CD, System Design), architectures (Microservices, Event-Driven Architecture), certifications, product domains (Fintech, Payments), spoken languages when the posting requires one.
- Not skills: personality traits ("team player", "ownership"), degrees, years of experience, job titles, company or product names, benefits, locations, work arrangements.
- One entry per distinct skill. Use the common canonical name, not the posting's spelling: `JavaScript` (not JS), `TypeScript`, `Node.js`, `React`, `Kubernetes` (not k8s), `PostgreSQL` (not Postgres), `.NET`, `C#`, `CI/CD`, `REST APIs`, `GraphQL`, `AWS`, `GCP`, `Azure`, `Machine Learning`, `LLMs`, `Generative AI`, `RAG`, `AI Agents`.
- Keep versions out of the name (`.NET`, not `.NET 8`), unless the version is the whole point.
- `level` is `"required"` when the posting needs it — must-have lists, requirements, "you have", or responsibilities that plainly use it — and `"nice-to-have"` when it is preferred, a plus, a bonus, optional or "ideally".
- `category` is exactly one of: {{CATEGORIES}}.

## Output

Write the output file with the Write tool — a JSON array with one object per input posting, in this exact shape:

```json
[
  { "id": "<the input id, unchanged>", "skills": [ { "skill": "Kubernetes", "category": "cloud-infra", "level": "required" } ] }
]
```

- Include every input id, even when a posting yields no skills (`"skills": []`).
- Valid JSON only: no comments, no markdown fences, nothing after the closing bracket.
- Write no other file and do not edit the input file.

When the output file is written, reply with the single word `done`.
