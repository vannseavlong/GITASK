---
title: Export a report of what was done
description: Turn finished tasks into a manager-ready report by person, as HTML, Markdown or CSV, from the board or with gitask report.
slug: /report
---

After this page you can produce a report of the work finished in a period, grouped by person. Needs GITASK 0.5.0.

The report covers tasks in `5-done` and `6-deploy`. Each row shows when the task was done, whether it was on time (done on or before `Due`), and the days from start to done. Sub-tasks are credited to the person named by `@` on the line. People are shown by GitHub name, never by email.

The done date is the date of the git commit that moved the task into `5-done` or `6-deploy`. If git has no such move, GITASK falls back to the `Started / updated` date and says so in the report's data notes.

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
## Summary

- Tasks done: 1
- Sub-tasks done: 1
- On time: 0 / Late: 1 / No due date: 0

## By person

| Person | Tasks | Sub-tasks | On time | Late | No due | Avg days | Tier mix |
| Sam Lee | 1 | 1 | 0 | 1 | 0 | 29 | T2: 1 |
```

Next: [see the board in a browser](./serve.md).
