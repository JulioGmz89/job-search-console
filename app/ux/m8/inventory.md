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
| `GET /api/cv/design-check` | Renders the saved design with the newest CV once and reports its screening verdict | Today › Needs you; My CV › Design |

## UI components (M8)

Each file of the rebuilt UI that offers the user something to do, and where it
is in the IA. The re-measure maps every capability to these.

| File | What the user does there | Place (ia.md) |
|---|---|---|
| `app/ui/src/App.jsx` | Skip to content; open and close the Activity panel | Shell |
| `app/ui/src/shell/TopBar.jsx` | The six destinations, the Menu below 960 px, Activity, Workspace | Shell §1 |
| `app/ui/src/shell/Search.jsx` | Find a job, company, document, page or action | Shell §1 |
| `app/ui/src/shell/ActivityPanel.jsx` | See what is running and what needs you; Undo; See all activity | Activity panel §2.8 |
| `app/ui/src/shell/undo.jsx` | Undo the last removal, replacement or status change | §3 Destructive actions |
| `app/ui/src/components/ui.jsx` | Confirm dialogs, action menus, selects that commit on choose | §3 |
| `app/ui/src/components/RunItem.jsx` | Try again, Cancel, open the outcome, Technical details | Activity, Today, job page |
| `app/ui/src/components/AddJob.jsx` | Check fit now or Save for later by link; tailored-CV option | Today, Applications |
| `app/ui/src/components/StatusControl.jsx` | Change a status (When? for Applied), with Undo | Applications, job page |
| `app/ui/src/components/Documents.jsx` | Make, open, download and remake the tailored CV and cover letter | Job page › Documents |
| `app/ui/src/pages/Today.jsx` | Get set up (CV, company, assistant), first job, the day's cards | Today §2.1 |
| `app/ui/src/pages/Applications.jsx` | Filter, sort, open, change status, row actions, Tidy up | Applications §2.2 |
| `app/ui/src/pages/Job.jsx` | Check fit again, I've sent my application, read the report | One job §2.3 |
| `app/ui/src/pages/ToReview.jsx` | Check for new openings (options), check, open, remove, bulk | To review §2.4 |
| `app/ui/src/pages/Companies.jsx` | Follow, pause, fix, edit, remove companies and board searches | Companies §2.5 |
| `app/ui/src/pages/Skills.jsx` | Three views, fit filter, evidence, your CV's status, Improve | Skills §2.6 |
| `app/ui/src/pages/mycv/Content.jsx` | Edit and import cv.md | My CV › Content §2.7 |
| `app/ui/src/pages/mycv/Profile.jsx` | Edit the profile fields | My CV › Profile §2.7 |
| `app/ui/src/pages/mycv/Design.jsx` | Choose a design, fine-tune, make it the default, update CVs | My CV › Design §2.7 |
| `app/ui/src/pages/mycv/Writing.jsx` | Words to avoid, remake CVs, all rules, example rules | My CV › Writing rules §2.7 |
| `app/ui/src/pages/Activity.jsx` | Filter the history; open one activity | Activity §2.8 |
| `app/ui/src/pages/Workspace.jsx` | Data health, tidy-up tools (preview then confirm), Check again | Workspace §2.9 |
