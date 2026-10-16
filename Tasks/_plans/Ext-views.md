# Views plan: sub-tasks, list, overview, timeline

Updated: 2026-10-17 · Requirements: `Docs/requirements/views.md`.

## Goal
The board is the only view today and the only way to read a task is to open its raw `.md`. Add a task detail view with sub-tasks, a list view, an overview dashboard, and a calendar/waterfall timeline, all inside the same webview and all built from the task files (no database).

## Flow
| Step | State |
|---|---|
| Parse tasks into board columns | exists (`parse.ts`, `board.ts`) |
| Parse sub-tasks (`- [ ]` / `- [x]` lines), optional `Due`, and `Depends on` into the task model | new (`Core-task-model`) |
| Toggle a sub-task: rewrite the one checkbox line, commit that file with the existing pathspec rule | new (`Core-task-model`) |
| One webview with a view switcher: Board · List · Timeline · Overview, last choice remembered | change (`Ext-view-shell`, today `html.ts` is one board) |
| Click a card/row: detail panel with rendered Markdown and sub-task checkboxes; card shows `3/7` progress | new (`Ext-task-detail`) |
| List: sortable, filterable, searchable table | new (`Ext-list-view`) |
| Overview: counts by column, tier and owner, stale tasks, claimed, recent moves | new (`Ext-overview`) |
| Timeline: calendar and waterfall bars from Started to Due, with `Depends on` arrows | new (`Ext-timeline`) |

## Decisions
- **Sub-tasks are the checkbox lines in the task file**, shown under their `##` heading. Gate rows (`G1 scope`) and "Done when" items both count, so every existing task already has sub-tasks and nothing needs migrating. Decision: progress counts only the `Done when` section on cards (the real acceptance list); the detail view shows all sections.
- **Dates:** `Started / updated` exists. A waterfall needs an end: add an optional `- **Due:** YYYY-MM-DD` field. Without it a bar runs from Started to the last-updated date (done tasks) or to today (open tasks), drawn as open-ended. Adding the field is optional, so workspaces from My-Agent-SetUp keep working.
- **Dependencies:** parsed from the free text of `Depends on` by matching known task ids; unknown text is ignored, not guessed.
- **Rendered Markdown:** use a small sanitizing Markdown renderer in the webview; task text is untrusted (it can come from a pull request), so no raw HTML and a strict Content-Security-Policy. This makes the detail view a G6 security item.
- **Toggling honours the existing auto-commit setting.** Never `git add -A`.
- **Views are separate modules** registered in one view registry, so after the shell lands, list, detail, overview and timeline can be built in parallel.
- **Chart library:** none; timeline and charts are plain HTML/SVG to keep the `.vsix` small.

## Gaps
- No design frames exist for these views. Decision: ship plain, readable layouts in VS Code theme variables, then iterate; a Figma pass is optional later.
- Hero screenshot/GIF for the website and Marketplace depends on these views being visible; capture once after the timeline lands.

## Open questions (recommendation)
1. Should list/overview also exist in the CLI (`gitask list`, `gitask stats`)? Recommend yes, but in the backlog after the extension views.
2. Frontmatter support (`1-backlog/Core-frontmatter-support`) before `Due`? Recommend no: `Due` as a bullet field fits the current format.

## Task breakdown
| Task | Depends on | Tier | Size |
|---|---|---|---|
| Core-task-model | none | T2 | 1d |
| Ext-view-shell | Core-task-model | T2 | 1d |
| Ext-task-detail | Ext-view-shell | T2 | 1.5d |
| Ext-list-view | Ext-view-shell | T2 | 1d |
| Ext-overview | Ext-view-shell | T2 | 1d |
| Ext-timeline | Ext-view-shell | T2 | 2d |
| Ext-more-ideas (backlog) | all above | n/a | n/a |

Sequence: Core-task-model, then Ext-view-shell, then the four views in parallel. Each view owns its own files under `packages/vscode/src/views/`; the shared registry line and `package.json` contributions are merged one at a time (inbox note before editing).

## Out of scope
Editing task text in the webview, multi-repo rollup, real-time collaboration, notifications, charts library.
