# Views

Updated: 2026-10-17

Why: a Kanban board alone is not enough to run a project. People need to read a task without opening raw Markdown, scan everything in a table, see the state of the whole project, and see when things are due.

Source of data: only the `Tasks/` folder. No server, no account.

| View | Shows | Must have |
|---|---|---|
| Board | Columns from numbered folders (exists) | Card shows owner, tier, claimed-by and sub-task progress `done/total` |
| Task detail | One task, rendered | Title, header fields, each section rendered, sub-task checkboxes you can toggle, link "Open file" |
| List | All tasks as rows | Columns: title, status, tier, owner, claimed by, updated, due, progress; sort by any column; filter by status, tier, owner; text search |
| Overview | Project health | Counts per status, per tier and per owner; tasks not updated for N days (setting, default 14); tasks claimed; last 10 moves; overdue count |
| Timeline | Calendar and waterfall | Month calendar with due dates; waterfall bars Started to Due; arrows for `Depends on`; today line; open-ended bar when no due date |

## Sub-tasks
A sub-task is a Markdown checkbox line (`- [ ]` or `- [x]`) in the task file. Card progress counts the `## Done when` section only. Toggling writes the one line and commits that file, following the existing auto-commit setting.

## Fields
Existing: `Owner`, `Tier`, `Claimed by`, `Started / updated`, `Depends on`. New and optional: `Due` (`YYYY-MM-DD`). Missing or malformed values are shown as empty, never as an error.

## Rules
- Task text is untrusted: render it without raw HTML.
- Every view works with an empty board, one column, and 500 tasks.
- Respects VS Code light, dark and high-contrast themes; keyboard reachable.
