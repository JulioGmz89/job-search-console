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
| `GET /api/workspace` | Which user files exist, the set-up steps, counts and data problems | Today › Get set up; Workspace |
| `GET /api/today` | When the user last looked at Today, and dismissed cards | Today |
| `PUT /api/today` | Records "last looked" and dismissing or restoring a card | Today › Dismiss / Undo |
| `DELETE /api/inbox/urls` | Removes one link from To review, returning the line for Undo | To review › Remove |
| `POST /api/inbox/urls/restore` | Puts a removed To review line back | To review › Undo |
| `POST /api/cv/voice/words` | Adds one word under `## Never write` | My CV › Writing rules › Words to avoid |
| `DELETE /api/cv/voice/words` | Removes one word from `## Never write` | My CV › Writing rules › Words to avoid |
| `POST /api/cv/voice/restore` | Swaps `voice-dna.md` with its `.bak` (Undo) | My CV › Writing rules › Undo |
