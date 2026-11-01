---
title: Use GITASK from install to a finished task
description: A step-by-step guide to GITASK in VS Code. Set up a Tasks folder, create and move cards, assign people, add sub-tasks and export a report, plus how to use it with coding agents.
slug: /getting-started
---

import ThemedImage from '@theme/ThemedImage';
import useBaseUrl from '@docusaurus/useBaseUrl';

After this page you can run a project on a GITASK board, from an empty folder to an exported report. Needs GITASK 0.5.0. Install it first: [install](./install.md).

<!-- TODO(demo): link to the full demo video here once the owner has uploaded it (placeholder, no URL yet) -->

## 1. Set up the Tasks folder

Open your project folder in VS Code and run **GITASK: Initialize Tasks Folder** from the Command Palette. It creates `Tasks/1-backlog` to `Tasks/6-deploy` and a `_TEMPLATE.md`, then opens the board. It never overwrites files, so it is safe to run again.

From a terminal, `gitask init` does the same in the current folder.

```text
Tasks/
  1-backlog/ 2-todo/ 3-in-progress/ 4-testing/ 5-done/ 6-deploy/   <- columns
  _inbox/ _plans/ _TEMPLATE.md                                      <- ignored by the board
```

The folder a task file sits in is its status. Folders whose name starts with `_` are not columns.

## 2. Create a task

Run **GITASK: New Task**. GITASK copies `Tasks/_TEMPLATE.md` into the backlog. A task is a Markdown file: the `#` heading is the title, and the `- **Key:** value` lines above the first `##` are its fields.

```markdown
# Web-login-page

- **Owner:** Sam
- **Tier:** T2 · new screen
- **Started / updated:** 2026-10-01 / 2026-10-17
```

From a terminal: `gitask new Web-login-page` (add a column, such as `todo`, to start elsewhere).

## 3. Move a card

Run **GITASK: Open Board** and drag a card to another column. GITASK runs `git mv`, bumps the `Started / updated` date and commits that one file. It never pushes.

:::note
A move commits only that task's file. Other staged or changed files are left alone. Turn the commit off with `gitask.autoCommit`, see [settings](#settings).
:::

From a terminal: `gitask move Web-login-page 3-in-progress` (`in-progress` or `3-in-progress` both work).

## 4. Pick a view

Open a card to see the task detail. Use the view switcher for Board, List, Timeline and Overview. They all read the same files. The same views run in a browser with `gitask serve`, see [serve](./serve.md).

<ThemedImage alt="The GITASK board with assignees and sub-tasks" width="1280" height="800" loading="lazy" sources={{light: useBaseUrl('/img/views/board-light.webp'), dark: useBaseUrl('/img/views/board-dark.webp')}} />

<ThemedImage alt="The GITASK task detail panel" width="1280" height="800" loading="lazy" sources={{light: useBaseUrl('/img/views/detail-light.webp'), dark: useBaseUrl('/img/views/detail-dark.webp')}} />

## 5. Assign people and add sub-tasks

Click the owner on a card to pick a repo contributor. Under `## Sub-tasks`, write checkbox lines such as `- [ ] Build login API @sam-lee #backend`. The full steps, including the **People** filter and the CLI commands, are in [assign tasks and split them into sub-tasks](./people-and-subtasks.md).

## 6. Export what was done

Click **Export** on the board, choose HTML, Markdown or CSV, and check the live preview. From a terminal:

```bash
gitask report --format md --from 2026-10-01 --to 2026-10-31 --out october.md
```

See [reports](./report.md) for what the report contains and every flag.

## 7. Tell GitHub (optional)

If you want assignees notified, **GITASK: Sync to GitHub** creates issues from your tasks. It is off until you add a `github` entry to `Tasks/gitask.json`, and it shows a dry run first. See [GitHub sync](./github-sync.md).

## Settings

| Setting | Default | What it does |
|---|---|---|
| `gitask.tasksDir` | `Tasks` | Tasks folder, relative to the workspace root |
| `gitask.autoCommit` | `true` | Commit the task file when a card is moved |
| `gitask.commitMessage` | `task({id}): {from} → {to}` | Commit message; `{id}`, `{from}`, `{to}` are replaced |
| `gitask.staleDays` | `14` | Overview: a task not updated for this many days is listed as stale |

Every command is in the [CLI reference](./cli.md).

## Using GITASK with coding agents

Because tasks are plain files in git, a coding agent can read and move them with no extra tool. A setup that works well:

1. **One rules file.** Put the shared rules in `AGENTS.md` at the repo root (many agents read it) and point agent-specific files such as `CLAUDE.md` at it. Say where `Tasks/` is and what each folder means.
2. **Claim a task before editing.** Add a field such as `- **Claimed by:** <agent or person>` to the task and move it to `3-in-progress`. A second agent can see the claim on the board. GITASK shows this field; the convention itself is yours to set in `AGENTS.md`.
3. **One task, one branch, one worktree.** Use `git worktree add` so parallel agents never share a working folder, and have each agent stay inside its own task.
4. **Move by pathspec.** Agents should use `gitask move` (or the board), which commits only the task file. Tell them never to use `git add -A` in a shared folder.
5. **Notes between agents.** Leave a file in `Tasks/_inbox/<task>/` for another task to read. The board ignores `_` folders.

Next: the [CLI reference](./cli.md).
