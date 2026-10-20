# Board management plan: task ID, delete, date filter, status colour, show/hide status

Updated: 2026-10-20 · Requirements: `Docs/requirements/views.md` (no entry yet for these; G7 adds it).

## Goal
Make the board manageable without leaving the extension: every task has a short visible ID, tasks and empty statuses (columns) can be deleted, all four views filter by date range, and each status has a colour.

## Flow
| Step | State |
|---|---|
| Task identity is the file name (`Task.id`) | exists |
| Short stable ID `- **ID:** T-0001` in the header, assigned on create, backfilled for old tasks, shown on cards/rows, searchable | new |
| Delete a task: confirm in the host, `git rm` + commit by pathspec (or unlink when untracked) | new |
| Delete a status: only when its folder holds no tasks; confirm; remove the folder | new |
| Filter text exists on Board and List only | exists / change |
| One shared date-range filter (from, to, field: updated or due) in all four views, remembered per view | new |
| Status colour: `Tasks/gitask.json` `{ "columns": { "2-todo": { "color": "#3b82f6" } } }`, read by `loadBoard`, written by a host message | new |
| Show/hide any status in all four views from one shared toggle, kept in webview state (per user, not committed) | new |
| Colour shown on board column header and card edge, list status chip, timeline bar, overview bars | change |

## Screens and states
Board, List, Timeline, Overview already exist. New states: delete confirm (host modal), empty-column delete button, date inputs with a clear button, "no tasks in range" empty state, colour picker per column header (preset swatches plus hex). No design frames exist; plain VS Code theme variables (same decision as `Ext-views`).

## Data and API
No backend. Core gains `deleteTask`, `deleteColumn`, `assignIds`, `readConfig`/`writeConfig`. Webview protocol gains `deleteTask`, `deleteColumn`, `setColumnColor`; each validated in `protocol.ts` (path inside Tasks, column exists, colour matches `^#[0-9a-fA-F]{6}$`).

## Gaps and decisions
- "Task ID" is ambiguous (file name is already the id). Decision: add a short sequential display ID, because the file name is long and not stable on rename. Stored in the file header so it survives git and needs no database.
- Colour lives in `Tasks/gitask.json`, not the folder name or task file: statuses are folders, so there is nowhere else per-status. Missing file or colour = current theme look (nothing breaks).
- Deleting a status with tasks is refused, not cascaded (data loss). Deleting a task is committed so it is recoverable from git.
- Date filter uses `Due` when present, else the `Started / updated` date; the user picks which field. Tasks with no usable date are hidden while a range is active.
- Hidden statuses are a viewing preference, not project data: webview state, not `gitask.json`, so it does not collide with Ext-status-color's config and never shows up in git.
- Colours are untrusted input from the file: validated hex only, applied through `style` custom properties set with `setProperty` (CSP has no inline style except nonce'd sheet).

## Open questions (recommendation)
1. ID format: `T-0001` vs numeric `1`? Recommend `T-0001`.
2. Should deleting a task also be a CLI command (`gitask rm`)? Recommend yes, later, in the backlog.

## Task breakdown
| Task | Repo | Depends on | Tier | Size |
|---|---|---|---|---|
| Ext-task-id-delete | core + vscode | none | T3 | 1.5d |
| Ext-date-filter | vscode | none | T2 | 1.5d |
| Ext-status-color | core + vscode | none | T2 | 1d |
| Ext-status-show-hide | vscode | none | T2 | 1d |

**Parallel:** all four can start now, each in its own worktree. They overlap in a few shared files (below), so edits there must be small and additive, and each task rebases onto `main` after another merges.

| Shared file | Task edits |
|---|---|
| `packages/vscode/src/protocol.ts`, `extension.ts` | id-delete adds `deleteTask`/`deleteColumn`; status-color adds `setColumnColor`. Separate `case` blocks, no reordering. |
| `packages/vscode/src/views/board.ts` | id-delete: ID label + delete buttons; date-filter: call the shared filter; status-color: colour styles. Different functions/CSS lines. |
| `packages/core/src/types.ts`, `board.ts` | id-delete: `Task.displayId`; status-color: `Column.color`. One field each. |
| `packages/vscode/src/html.ts` | date-filter: filter bar; status-show-hide: status chips. Separate blocks. |
| `packages/vscode/src/views/list.ts` | id-delete (ID column), date-filter (filter), status-color (chip). |

Merge order if conflicts bite: Ext-status-color, Ext-status-show-hide, Ext-task-id-delete, Ext-date-filter. Whoever merges second or third leaves an inbox note to the others.

## Out of scope
CLI commands, renaming/reordering statuses, per-task colour, bulk delete, undo UI (git history is the undo).
