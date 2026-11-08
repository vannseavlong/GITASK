---
title: CLI reference
description: Every gitask command and flag in 0.5.0, with what it does. Move, create and assign tasks, add sub-tasks, export reports, sync to GitHub and serve the board.
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
| `gitask board [--field key=id[,id]]` | Print the board. `--field` keeps tasks with that [field](./custom-fields.md) value (repeat it for several fields) |
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
