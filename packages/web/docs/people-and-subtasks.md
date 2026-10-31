---
title: Assign tasks and split them into sub-tasks
description: Pick a task owner from your repo contributors, and break a task into sub-tasks with an assignee and a lane such as backend, UX/UI or frontend.
slug: /people-and-subtasks
---

After this page you can give a task an owner, and split a task into sub-tasks that each have their own person and lane. Needs GITASK 0.5.0.

A **sub-task** is a checkbox line in a task file. GITASK adds no new files for it.

## Assign a task

1. Open the board in VS Code (**GITASK: Open Board**) or in a browser ([`gitask serve`](./serve.md)).
2. Click the owner on a card, or **+ Assign**. The same picker is in the task detail panel.
3. Search, pick a person or **Unassigned**.

GITASK writes the person's name into the `- **Owner:**` line and commits that one file. Contributors come from your git history (merged through `.mailmap`) and from the optional `people` list in `Tasks/gitask.json`. Emails are never saved or shown. Type a name that is not listed to add it with **Add &lt;name&gt;**.

The **People** filter in the filter bar keeps only tasks a person owns or has a sub-task in. It works in all four views.

From the command line:

```bash
gitask people
gitask assign Web-login sam-lee      # id, name or GitHub login; "none" clears it
```

## Add sub-tasks

Under a `## Sub-tasks` heading, add checkbox lines. End a line with `@person` and `#lane` to set who does it and which part of the work it is:

```markdown
## Sub-tasks
- [x] Build login API @sam-lee #backend
- [ ] Login screen #frontend
```

- `@person` is a person id from `gitask people`. `#lane` is any word, for example `backend`, `uiux` or `frontend`.
- In the task detail panel you can add, tick, assign and set the lane. **Split into backend / UX/UI / frontend** adds one sub-task for each lane that is missing.
- In **List**, the chevron expands a row into its sub-tasks. On the **Board**, the **Sub-tasks** toggle on a card does the same.
- Progress `done/total` on a card counts the `## Done when` and `## Sub-tasks` checkboxes.

From the command line:

```bash
gitask subtask add Web-login "Build login API" --assign sam-lee --lane backend
gitask subtask list Web-login
gitask subtask assign Web-login 1 sam-lee     # index from "subtask list"
```

A sub-task is done or not done. It has no status or due date of its own.

Next: [report what was done](./report.md).
