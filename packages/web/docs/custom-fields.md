---
title: Add your own fields, such as Platform, and filter by them
description: Define pick-lists like Platform (Admin Portal, App, Landing Page) in Tasks/gitask.json, set them on tasks and sub-tasks, and filter the Board, List, Timeline and Overview by them.
slug: /custom-fields
---

After this page you can add your own pick-list, for example **Platform: Admin Portal, App, Landing Page**, set it on tasks and on the sub-tasks of a task, and filter every view by it. Needs the GITASK release after 0.6.0.

A **field** is a named list of allowed values that you define once in `Tasks/gitask.json`. Task files only hold the value ids.

## Define a field

1. Open `Tasks/gitask.json` (create it if you have none).
2. Add a `fields` list:

```json
{
  "fields": [
    {
      "key": "platform",
      "label": "Platform",
      "multi": true,
      "values": [
        { "id": "admin-portal", "label": "Admin Portal", "color": "#3794ff" },
        { "id": "app", "label": "App" },
        { "id": "landing-page", "label": "Landing Page" }
      ]
    }
  ]
}
```

3. Save the file. Reload the board; a **Platform** button appears in the filter bar.

| Part | Rule |
|---|---|
| `key` | Lower-case letters, digits and dashes, starting with a letter, at most 24 characters. It must not be a header GITASK already uses (`owner`, `tier`, `due`, `status` and similar). |
| `label` | The name shown in the board, at most 40 characters. |
| `multi` | `true` lets one task hold several values. Default `false`. |
| `values[].id` | Lower-case letters, digits and dashes, at most 32 characters. This is what task files contain. |
| `values[].label` | The name shown in the board. Defaults to the id. |
| `values[].color` | Optional `#rrggbb` for the badge border. |

You can have up to 8 fields and 30 values per field. An entry that breaks a rule is skipped; the others still work.

## Set a field on a task

In the task detail panel, the **Platform** row has a picker. It writes one header line in the task file and commits that file:

```markdown
- **Platform:** app, admin-portal
```

A task with a single-value field (`multi` false) holds one id when you set it in the board. Use commas between ids. When you change a field in the board, ids that are not in `gitask.json` are dropped from that line.

## Set a field on a sub-task

Each sub-task in the detail panel has a **Platform** picker too. It adds a `#key:id` token at the end of the line, next to `@person` and `#lane`:

```markdown
## Sub-tasks
- [ ] Build login API @sam-lee #backend #platform:app
- [ ] Hero banner #platform:landing-page
```

Plain `#lane` words work as before. Only a trailing `#key:id` counts as a field token, so `#Platform:App` or `see #owner:me` stay text.

:::note
An older sub-task that already ends in `#word:word`, for example `Fix bug #area:core`, is now read as a value with key `area`. The line in the file does not change.
:::

## Filter by a field

1. In the filter bar, click **Platform**.
2. Tick one or more values. The button shows how many, for example **Platform (2)**.
3. The line **N of M match** shows how many tasks are left. **Clear fields** removes the filter.

- Several values of one field mean **or**: App or Landing Page.
- Several fields mean **and**: Platform App and Environment Prod.
- A task matches when its own value, or the value of any of its sub-tasks, is selected. On the Board and List, an expanded task shows only the sub-tasks that carry a selected value, unless the task's own value already matches.

The filter works in Overview, Board, List and Timeline together with the date, people and text filters. It is remembered for you only and is never committed.

## From the command line

```bash
gitask fields                                   # list fields and values
gitask field set Web-login platform app,admin-portal
gitask subtask field Web-login 0 platform app   # index from `gitask subtask list`
gitask board --field platform=app,landing-page  # tasks with App or Landing Page
gitask report --format md --field platform=app  # done tasks with App
```

`--field key=id[,id]` can be repeated; fields combine with **and**. An unknown field or value stops with the list of allowed ones. See the [CLI reference](./cli.md).

## If something looks wrong

- **The Platform button is missing:** the `fields` block is not valid JSON, or no entry passed the rules above. Check the file.
- **A badge looks faded:** the task uses an id that is not in `gitask.json` (for example you removed it). GITASK keeps it as written until you change that field in the board. A filter choice for a value you removed is ignored.
- **A header line will not change:** it holds text that is not an id, such as `App, Admin Portal`. Edit that line in the file to ids, for example `app, admin-portal`.

Next: [Read and filter your tasks in the five views](./views.md), or [the task file format](./task-format.md).
