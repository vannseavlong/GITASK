# Views

Updated: 2026-10-17

Why: a Kanban board alone is not enough to run a project. People need to read a task without opening raw Markdown, scan everything in a table, see the state of the whole project, and see when things are due.

Source of data: only the `Tasks/` folder. No server, no account.

| View | Shows | Must have |
|---|---|---|
| Board | Columns from numbered folders (exists) | Card shows owner, tier, claimed-by and sub-task progress `done/total` |
| Task detail | One task, rendered (side panel, opens from a card, list row, calendar chip, timeline bar or overview item) | Title, header fields, each section rendered, sub-task checkboxes you can toggle, link "Open file" |
| List | All tasks as rows | Columns: title, status, tier, owner, claimed by, updated, due, progress; sort by any column; filter by status, tier, owner; text search |
| Overview | Project health | Counts per status, per tier and per owner; tasks not updated for N days (setting, default 14); tasks claimed; last 10 moves; overdue count |
| Timeline | Calendar and waterfall | Month calendar with due dates; waterfall bars Started to Due; arrows for `Depends on`; today line; open-ended bar when no due date |

## Task ID and delete
Every task has a short ID in its header, `- **ID:** T-0001`, shown on board cards, list rows and the detail panel, and matched by the text filter. New tasks get the highest ID on the board plus one; the first time a board opens, tasks without a valid ID are numbered once (existing IDs never change, later duplicates are renumbered) and the touched files are committed by pathspec when tracked and `autoCommit` is on. Delete a task from the card or detail panel: a confirm dialog, then `git rm` plus a commit of that path when tracked and `autoCommit` is on (recoverable from history), otherwise the file is removed. An empty status shows "Delete status"; a status that still holds a task is refused with a message, and an empty one is removed after a confirm.

## Sub-tasks
A sub-task is a Markdown checkbox line (`- [ ]` or `- [x]`) in the task file. Card progress counts the `## Done when` section only. Toggling writes the one line and commits that file, following the existing auto-commit setting.

Under `## Sub-tasks` a line may end with `@person` and `#lane` tokens (core: `addSubtask`, `setSubtaskAssignee`, `setSubtaskLane`). The UI shows them Jira-style:
- **List:** a chevron expands a task into its sub-task rows (tick, text, assignee avatar, lane badge); `Expand all` / `Collapse all`; the open set is remembered in view state.
- **Board:** a card with sub-tasks has a `Sub-tasks` toggle (keyboard reachable) that shows the same rows in place; stacked avatars show the owner plus assignees, and `done/total` counts `Done when` and `Sub-tasks` checkboxes.
- **Detail:** a Sub-tasks section to add, tick, assign, set lane, and a "Split into backend / UX/UI / frontend" button that adds one sub-task per missing lane.
- **Messages** (validated in `protocol.ts`, index and line must match the board like `toggleSubtask`): `addSubtask`, `setSubtaskAssignee`, `setSubtaskLane`.
- **Person filter:** a task matches a person when they own it or any of its sub-tasks (`taskInvolves` in `packages/vscode/src/subtask-logic.ts`).

## Fields
Existing: `Owner`, `Tier`, `Claimed by`, `Started / updated`, `Depends on`. New and optional: `Due` (`YYYY-MM-DD`). Missing or malformed values are shown as empty, never as an error.

## Status colour
Optional `Tasks/gitask.json`: `{ "columns": { "<folder>": { "color": "#rrggbb" } } }`. Set from the swatch on a board column header (presets, hex input, reset); the host validates and writes the file and commits it when tracked and `autoCommit` is on. The colour shows on the board column and card edge, the list status chip, timeline bars and chips, and overview status bars. A missing or malformed file or colour means no colour.

## Show or hide statuses
A bar under the tabs lists every status as a chip with its task count. Clicking a chip hides or shows that status in all four views at once (Board columns, List rows, Timeline bars, Overview counts and charts); "Show all" resets. The bar says how many statuses are shown and how many tasks are hidden, and an "all statuses hidden" message replaces the view when none is left. The hidden set is one list in webview state (per user, never committed); unknown or deleted statuses are ignored. Logic: `packages/vscode/src/status-visibility.ts`.

## Date range filter
One bar under the tabs filters Board, List, Timeline and Overview alike: `From`, `To` (both optional, inclusive, `YYYY-MM-DD`) and which date, `Due` or `Updated`. Counts, bars and totals use only the tasks in range. While a range is active, tasks without a usable date are hidden. "No tasks in range." shows when nothing matches. The range is remembered per view (webview state, not committed). It combines with the Board and List text filters.

## Rules
- Task text is untrusted: render it without raw HTML; links only http(s).
- Every view works with an empty board, one column, and 500 tasks.
- Respects VS Code light, dark and high-contrast themes; keyboard reachable.
