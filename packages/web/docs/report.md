---
title: Export a report of what was done
description: Turn finished tasks into a manager-ready report by person, as HTML, Markdown or CSV, from the board or with gitask report.
slug: /report
---

After this page you can produce a report of the work finished in a period, grouped by person. Needs GITASK 0.5.0.

The report covers tasks in `5-done` and `6-deploy`. It shows a title, the period and the generated date, three numbers (tasks done, sub-tasks done, people) and one section per person: the tasks they finished with the date, and below them the sub-tasks they finished with the task each belongs to. A small `late` tag appears next to a task only when it has a `Due` date and was done after it. People without an owner appear under `Unassigned`, only when there are such tasks. People are shown by GitHub name, never by email.

The done date is the date of the git commit that moved the task into `5-done` or `6-deploy`. If git has no such move, GITASK falls back to the `Started / updated` date. Sub-tasks are credited to the person named by `@` on the line and count in their task's period.

## From the board

1. Click **Export** in the filter bar.
2. Set the period, the date to use (Done, Due or Updated), the people, whether to include sub-tasks, and the format.
3. Check the live preview, then **Export**. VS Code asks where to save the file. In a browser the file downloads.

For a PDF, export HTML, open it and use Print, then Save as PDF.

## From the command line

```bash
gitask report --format md --from 2026-10-01 --to 2026-10-31
gitask report --format csv --people sam-lee --out october.csv
```

Flags: `--format html|md|csv` (required), `--from`, `--to` (`YYYY-MM-DD`), `--people a,b`, `--date done|due|updated`, `--no-subtasks`, `--out file`. Without `--out` the report goes to stdout. Example output (Markdown, shortened):

```text
# demo: work completed

2026-10-01 to 2026-10-31 · Generated 2026-10-30

**5** tasks done · **2** sub-tasks done · **2** people

## samlee

2 tasks, 0 sub-tasks

- Login screen redesign: 2026-10-03
- Fix export crash on empty period: 2026-10-09 (late)
```

CSV has one row per done task and, with sub-tasks, one row per finished sub-task. Columns: `person`, `task`, `sub_task`, `done_date`, `sub_tasks_done`.

Next: [see the board in a browser](./serve.md).
