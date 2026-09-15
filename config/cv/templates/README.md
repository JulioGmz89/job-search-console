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

Files in this directory are yours and are not committed.
