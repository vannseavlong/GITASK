# GITASK

A Kanban board for a plain-Markdown `Tasks/` folder, inside VS Code. One Markdown file per task; **the folder is the status**. Drag a card and GITASK moves the file with `git mv`, bumps its `Started / updated` date and commits that one file. No accounts, no server: git is the identity and the history.

Built for workspaces where humans and coding agents share one board ([My-Agent-SetUp](https://github.com/vannseavlong/Agent-SetUp)).

## Use it

Open a workspace that has `Tasks/1-backlog/` (or any numbered folders under `Tasks/`). The extension activates by itself.

- **GITASK: Open Board** shows the board. Drag a card to another column to move it.
- **GITASK: New Task** creates a task from `Tasks/_TEMPLATE.md`.
- **GITASK: Initialize Tasks Folder** sets up a new project: it creates `Tasks/1-backlog` to `6-deploy` and a `_TEMPLATE.md`, then opens the board. Safe to run again; it never overwrites.

```
Tasks/
  1-backlog/ 2-todo/ 3-in-progress/ 4-testing/ 5-done/ 6-deploy/   ← columns
  _inbox/ _plans/ _TEMPLATE.md                                      ← ignored by the board
```

A task is a Markdown file. The `#` heading is the title and the `- **Key:** value` lines above the first `##` are its fields:

```markdown
# Web-login-page

- **Owner:** Sam
- **Tier:** T2 · new screen
- **Started / updated:** 2026-10-01 / 2026-10-17
```

## People, sub-tasks and reports

- **Assign:** click the owner on a card (or **+ Assign**) to pick a repo contributor. The **People** filter shows one person's tasks.
- **Sub-tasks:** under `## Sub-tasks`, write `- [ ] Build login API @sam-lee #backend`. Expand them in List, or with the **Sub-tasks** toggle on a card; add and assign in the task detail.
- **Export:** the **Export** button builds a "what was done" report by person (HTML, Markdown or CSV) with a live preview. See the [report guide](https://github.com/vannseavlong/GITASK/blob/main/packages/web/docs/report.md).
- **GITASK: Sync to GitHub** (opt-in, shows a dry run first) creates issues for your tasks so assignees are notified. It does nothing until `Tasks/gitask.json` has a `github` entry; see [Docs/architecture/github.md](https://github.com/vannseavlong/GITASK/blob/main/Docs/architecture/github.md).

<!-- TODO(screenshot): Board with avatars and sub-tasks; Export dialog -->

## Settings

| Setting | Default | What it does |
|---|---|---|
| `gitask.tasksDir` | `Tasks` | Tasks folder, relative to the workspace root |
| `gitask.autoCommit` | `true` | Commit the task file when a card is moved |
| `gitask.commitMessage` | `task({id}): {from} → {to}` | Commit message; `{id}`, `{from}`, `{to}` are replaced |

## Good to know

- A move commits only that task's file; other staged or dirty files are not touched.
- GITASK **never pushes**.
- Same engine as the command line: `npx gitask-cli board`. `npx gitask-cli serve` opens the same UI in a browser (local, token-protected).

[Source and issues](https://github.com/vannseavlong/GITASK) · MIT
