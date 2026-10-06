# Capability inventory (M8)

The M8 re-measure of PROJECT_PLAN.md §12.2 method 1. The M6 baseline stays in
`app/ux/inventory.md`, unchanged.

This file starts as the list of capabilities M8 adds while building the approved
direction. The `ux-researcher` agent rewrites it in full during the re-measure
(Phase 5), with the reach and label of every capability in the new UI.

## Server routes added in M8

| Route | What it does | Where in the UI (ia.md) |
|---|---|---|
| `GET /api/cv/content` | Reads `cv.md`, with a summary (name, sections, roles) | Today › Get set up › Add your CV; My CV › Content |
| `PUT /api/cv/content` | Saves `cv.md` as given, keeping `cv.md.bak` | Today › Get set up › Add your CV; My CV › Content |
| `GET /api/profile` | Reads the Profile form's fields from `config/profile.yml` | My CV › Profile |
| `PUT /api/profile` | Saves the Profile fields in place, keeping comments and unknown keys | My CV › Profile |
| `POST /api/runs/:id/retry` | Queues a failed or cancelled run again with the same request, linked by `retryOf` | Activity panel › Try again; Today › Needs you; One job › Needs you |
