# Custom CV templates

Drop an HTML template here as `<name>.html` and set `template: <name>` in
`config/cv/style.yml` (or pick it in CV Studio). A file here shadows an upstream
template of the same name in `templates/`.

A template is a copy of `templates/cv-template.html` (or any of upstream's
`cv-template.*.html`) with the same `{{PLACEHOLDERS}}`, `<!-- SECTION -->`
markers and `.section` / `.section-title` classes — `build-cv-html.mjs` fills
the placeholders, the style tokens land on the `--accent-color`,
`--font-family`, `--font-size` and `--page-margin` custom properties, and
section ordering keys on the markers. Keep real, selectable text and standard
headings so the PDF stays parseable by ATS software (PROJECT_PLAN.md §7d).

CV Studio renders your template with your real CVs, shows it in the theme gallery and
checks every render against the ATS guardrail. A theme **fails** when the PDF it
produces loses any of these:

- real, selectable text (not an image of the CV, not zero-size or white-on-white text)
- your name and email as text in the body (not inside an image, `<header>` or `<footer>`)
- every non-empty section's standard heading (Work Experience, Education, Skills, …),
  printed as text — a heading drawn with an image or hidden with `font-size: 0` is lost
- the document's reading order — no `<table>` layouts, multi-column CSS or absolute
  positioning that make an extractor read Skills before Experience
- most of your keywords (competencies and skills) as extractable text

`app/server/services/__fixtures__/themes/broken.html` breaks all of them on purpose:
copy it here to see what a failure looks like.

Files in this directory are yours and are not committed.
