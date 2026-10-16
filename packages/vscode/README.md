# GITASK

A Kanban board for a `Tasks/` folder. One Markdown file per task, the folder is the status. Drag a card and the file is moved with `git mv`, its `Started / updated` date is bumped, and that one file is committed.

Works with workspaces set up by [My-Agent-SetUp](https://github.com/vannseavlong/Agent-SetUp).

- **GITASK: Open Board**: show the board.
- **GITASK: New Task**: create a task from `Tasks/_TEMPLATE.md`.
- Settings: `gitask.tasksDir`, `gitask.autoCommit`, `gitask.commitMessage`. GITASK never pushes.
