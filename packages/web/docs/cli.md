---
title: CLI reference
description: Every gitask command and flag, with what it does. Move, create and assign tasks, add sub-tasks, plan and close sprints, export reports, sync to GitHub and serve the board.
slug: /cli
---

After this page you can find the command for any task from the terminal. Needs GITASK 0.5.0. Install it first: [install](./install.md).

All commands find the nearest `Tasks/` folder in the current or a parent folder. Two options work with every command:

| Option | Meaning |
|---|---|
| `--dir <path>` | Use this tasks folder instead of the nearest `Tasks/` |
| `--no-commit` | Move without committing |

## Set up and read

| Command | What it does |
|---|---|
| `gitask init` | Create a `Tasks/` folder with six status folders and a template in the current folder |
| `gitask board [--field key=id[,id]] [--sprint <id\|active\|backlog>]` | Print the board. `--field` keeps tasks with that [field](./custom-fields.md) value (repeat it for several fields). `--sprint` keeps one sprint's tasks, or the backlog (see [Sprints](#sprints)) |
| `gitask fields` | List the fields defined in `Tasks/gitask.json` and their values |
| `gitask people [--json]` | List contributors (id, name, GitHub login) |

## Change tasks

| Command | What it does |
|---|---|
| `gitask new <id> [column]` | Create a task from `_TEMPLATE.md`. Default column is backlog |
| `gitask move <task> <column>` | `git mv` the task and commit it. The column is `2-todo` or just `todo` |
| `gitask assign <task> <person\|none>` | Set or clear the owner. A person is an id, name or GitHub login |
| `gitask changelog <task>` | Add a `CHANGELOG.md` entry for a task. Safe to run twice |

```bash
gitask move Web-login-page 3-in-progress
gitask assign Web-login-page sam-lee
```

## Fields

| Command | What it does |
|---|---|
| `gitask fields` | List the fields and their allowed values |
| `gitask field set <task> <key> <id[,id]\|none>` | Set a field in the task header and commit that file |

An unknown field or value exits non-zero and prints the allowed ones. More in [Add your own fields](./custom-fields.md).

## Sub-tasks

| Command | What it does |
|---|---|
| `gitask subtask add <task> "<text>" [--assign <person>] [--lane <lane>] [--field key=id]` | Add a checkbox line |
| `gitask subtask list <task>` | List the checkboxes with their index (starting at 0) |
| `gitask subtask assign <task> <index> <person\|none>` | Set or clear who does it |
| `gitask subtask field <task> <index> <key> <id[,id]\|none>` | Set or clear a [field](./custom-fields.md) value on a sub-task |

More in [people and sub-tasks](./people-and-subtasks.md).

## Sprints

:::note Coming in the next release
Sprint commands are not in 0.6.1 yet.
:::

Sprints are off until `Tasks/gitask.json` has a `sprint` block, for example `{"sprint": {}}`. Each sprint is a file in `Tasks/_sprints/` (`S1.md`, `S2.md`). A task joins a sprint through its `- **Sprint:** S1` header line; a task with no sprint is in the backlog.

| Command | What it does |
|---|---|
| `gitask sprint list [--json]` | List sprints: `*` marks the active one, with tasks done and points done of the total |
| `gitask sprint new [--name <text>] [--goal <text>] [--start YYYY-MM-DD] [--end YYYY-MM-DD] [--capacity <n>]` | Create the next sprint as planned. With `--start` and no `--end`, the end comes from the sprint length in the config |
| `gitask sprint start <id>` | Start a planned sprint. Start is today when empty. Only one sprint can be active |
| `gitask sprint add <task> [sprint]` | Put a task in a sprint. Without a sprint: the active one, else the newest planned one |
| `gitask sprint remove <task>` | Take a task out of its sprint (back to the backlog) |
| `gitask estimate <task> <n\|none>` | Set or clear a task's estimate: a number from 0 to 10000 with at most 2 decimals. Works with sprints off too |
| `gitask sprint complete <id\|active> [options]` | Print the close plan; apply it only with `--yes` |

A task is its file name (`Core-login`) or its `ID` header (`T-0002`). A sprint is its id (`S1`, or `s1`). Each change commits only the files it touched; `--no-commit` writes without committing.

### Close a sprint

`gitask sprint complete` always prints the plan first: the done tasks (they stay where they are) and each unfinished task with its action and target status. Done tasks are the ones in a done status (`5-done` and `6-deploy` by default).

| Option | Meaning |
|---|---|
| `--unfinished backlog\|next` | Action for every unfinished task. `backlog` moves it to `1-backlog` and clears its sprint; `next` puts it in the next sprint (created when missing). Default comes from the config |
| `--next <task>`, `--backlog <task>` | Action for one task; repeat for several. Wins over `--unfinished` |
| `--keep-status` | Tasks going to the next sprint keep their status instead of moving to `2-todo` |
| `--dry-run` | Print the plan only, even with `--yes` |
| `--yes` | Apply the plan in one commit |

```bash
gitask sprint complete S1 --unfinished next --backlog Core-docs          # plan only
gitask sprint complete S1 --unfinished next --backlog Core-docs --yes    # apply
```

```text
Complete S1 · Sprint one (active)
Committed: 3 tasks · 8 pts   Done: 1 · 3 pts

Done (1): stay where they are
  T-0001  Core-login  [5-done]  3 pts

Unfinished (2):
  T-0002  Core-api  next (S2), stays in 2-todo  5 pts
  T-0003  Core-docs  backlog, 2-todo → 1-backlog
warning: Sprint S2 will be created

Completed S1: 1 done, 1 to backlog, 1 to S2 (created S2)
committed: sprint(S1): complete, 1 done, 1 to backlog, 1 to S2
```

Without `--yes` nothing changes and the exit code is 0. When the plan has blockers (lines starting with `blocked:`, for example the sprint is not active), nothing changes and the exit code is 1, even with `--yes`.

## Exit codes

Every command exits 0 on success and 1 on an error, with the message on stderr: an unknown task, person, column, field or sprint, a bad date or number, sprints off, or a blocked sprint close. Nothing is written when a command fails.

## Reports

```bash
gitask report --format md --from 2026-10-01 --to 2026-10-31 --out october.md
```

| Flag | Meaning |
|---|---|
| `--format html\|md\|csv` | Required |
| `--from`, `--to` | `YYYY-MM-DD` |
| `--people a,b` | Only these people |
| `--date done\|due\|updated` | Which date puts a task in the period |
| `--field key=id` | Only tasks with that [field](./custom-fields.md) value |
| `--no-subtasks` | Leave sub-tasks out |
| `--out file` | Write a file. Without it the report goes to stdout |

More in [reports](./report.md).

## Browser board

`gitask serve [--port 4173] [--host 127.0.0.1] [--no-open]` opens the board in your browser. It is local and token-protected. See [serve](./serve.md).

## GitHub sync

| Command | What it does |
|---|---|
| `gitask github plan [task...]` | Dry run: what would be created or updated, and who is notified |
| `gitask github sync --yes [--allow-repo owner/name] [task...]` | Apply it. Needs a `GITHUB_TOKEN` and a `github` entry in `Tasks/gitask.json`. `--allow-repo` is required when the repository is not your `origin` remote |

More in [GitHub sync](./github-sync.md).
