---
title: Write a task file
description: The GITASK task file format. Which folder is which status, the header fields such as Owner, Due and Depends on, and how sub-tasks and progress are read from the file.
slug: /task-format
---

After this page you can write or edit a task file by hand and know how GITASK reads it. Needs GITASK 0.5.0.

## Folders are statuses

A task is one Markdown file. The folder it sits in is its status. Any folder inside `Tasks/` named `<number>-<name>` is a column, and columns are ordered by the number. `gitask init` creates six:

```text
Tasks/
  1-backlog/ 2-todo/ 3-in-progress/ 4-testing/ 5-done/ 6-deploy/
```

Folders that start with `_`, and files such as `_TEMPLATE.md`, are not columns. To add a status, create a folder whose number puts it where you want it, for example `35-review` between `3-in-progress` and `4-testing`. Only `.md` files directly inside a column folder are tasks. The file name without `.md` is the task's id, for example `Web-login-page`; the part before the first `-` is its prefix.

## The file

The first `#` heading is the title (the file name is used when there is none). The `- **Key:** value` lines above the first `##` heading are the header fields. Everything after is free Markdown.

```markdown
# Web login page

- **ID:** T-0012
- **Owner:** Sam Lee
- **Tier:** T2 · new screen
- **Claimed by:** none
- **Started / updated:** 2026-10-01 / 2026-10-17
- **Due:** 2026-10-31
- **Depends on:** Web-signup

## Goal
Let a user sign in with email.

## Done when
- [ ] Login form works
- [ ] Error states shown

## Sub-tasks
- [x] Build login API @sam-lee #backend
- [ ] Login screen #frontend
```

## Header fields

All fields are optional. A missing or malformed value shows as empty, never as an error. Field names are not case sensitive.

| Field | What GITASK does with it |
|---|---|
| `ID` | A short id such as `T-0012`, shown on cards and rows. New tasks get the highest id plus one. Only `T-` followed by digits is shown; a value such as `JIRA-123` is left as you wrote it. |
| `Owner` | Who owns the task. Pick it on the board or run `gitask assign`, see [people and sub-tasks](./people-and-subtasks.md). |
| `Tier` | A risk tier, `T0` to `T3`. Shown as a badge. The text after it is yours. |
| `Claimed by` | Who is working on it now. Shown on the card unless the value is `none`. |
| `Started / updated` | Dates in `YYYY-MM-DD`. The move bumps the second one. The Overview uses it to find stale tasks. |
| `Due` | `YYYY-MM-DD`. Places the task on the Timeline calendar and bar, and drives the date filter and the `late` tag in [reports](./report.md). Other text means no due date. |
| `Depends on` | Names of other tasks, by file name without `.md`, separated by commas or spaces. Timeline draws an arrow from each one. Names that match no task are ignored. |

Any other `- **Key:** value` line is kept and shown in the task detail.

A task can instead start with a YAML block between two `---` lines holding the same keys. If both exist, the bullet lines win.

## Sub-tasks and progress

A **sub-task** is a checkbox line, `- [ ]` or `- [x]`. GITASK counts the checkboxes under `## Done when` and `## Sub-tasks` as the task's progress, shown as `done/total` on the card. Checkboxes in other sections, and in code blocks, are not counted.

Under `## Sub-tasks`, end a line with `@person` and `#lane` to say who does it and which part of the work it is. Only trailing tokens count; a lane must start with a letter. Ticking a box in the board writes that one line and commits that file.

Next: [see the views](./views.md).
