---
title: Plan, run and complete sprints
description: Run Scrum sprints on your Tasks folder. Turn sprints on in Tasks/gitask.json, plan a sprint from the backlog, follow it on every view, and complete it by sending unfinished tasks back to the backlog or into the next sprint.
slug: /sprints
---

After this page you can plan a sprint from the backlog, follow it while it runs, and complete it: done tasks stay done, and each unfinished task goes back to the backlog or into the next sprint.

:::note Coming in the next release
Sprints are not in 0.6.1 yet.
:::

A **sprint** is a file in `Tasks/_sprints/` (`S1.md`, `S2.md`). A task joins a sprint through a `- **Sprint:** S1` line in its header; a task without one is in the **backlog**. Everything stays in git as Markdown and JSON.

## Turn sprints on

1. Open `Tasks/gitask.json` (create it if you have none).
2. Add a `sprint` block. `{}` uses every default:

```json
{
  "sprint": {
    "lengthDays": 14,
    "estimate": "points",
    "doneColumns": ["5-done", "6-deploy"],
    "unfinished": "backlog",
    "resetStatus": "2-todo"
  }
}
```

| Key | Meaning | Default |
|---|---|---|
| `lengthDays` | Days from start to end when a sprint starts, 1 to 60 | `14` |
| `estimate` | Unit of task estimates: `points`, `hours` or `none` (hides estimates and capacity) | `points` |
| `doneColumns` | Statuses that count as done | `5-done`, `6-deploy` |
| `unfinished` | What happens to an unfinished task when a sprint is completed: `backlog` or `next` | `backlog` |
| `resetStatus` | Status a task moves to when it goes to the next sprint; `null` keeps its status | `2-todo` |

The board now shows a **Sprint** tab and a **Sprint** switcher in the filter bar. Without the block, nothing sprint-related is shown.

## Plan a sprint

1. Open the **Sprint** tab and press **+ New sprint**. Give it a name, a goal, dates and a capacity if you like, then press **Create sprint**. The new sprint is `planned`.
2. In the left pane (the backlog), press **Add** on each task you want, or drag it to the right pane. **Remove** sends a task back.
3. Type an estimate in each row. The capacity bar shows the total against the sprint's capacity and turns red when you are over.
4. Press **Start sprint**. The sprint becomes `active`, starts today and ends after `lengthDays`. Only one sprint can be active.

Each change is one small commit of the file it touched.

## Run the sprint

The switcher defaults to the active sprint, so Overview, Board, List and Timeline show only its tasks. Pick **Backlog** or **All tasks** to see the rest. A strip under the tabs shows the goal, the days left and `done/total tasks · points`. Move tasks between statuses as usual.

## Complete the sprint

1. Press **Complete sprint** on the Sprint tab or on the strip (only the active sprint has it).
2. The dialog shows a plan first. Nothing changes yet:
   - tiles with the done tasks, the unfinished tasks and the points done;
   - a table of unfinished tasks, each with an action: **Backlog** or **Next sprint**. The default comes from `unfinished`. **Apply to all** sets one action for every row;
   - **Reset status to todo** for tasks going to the next sprint (ticked when `resetStatus` is set). Untick it to keep their status;
   - warnings, for example a task that is claimed or has a worktree (GITASK never removes a worktree), or "Sprint S2 will be created";
   - blockers, for example a file of the same name already in the backlog. While there is one, the confirm button is disabled and says why.
3. Change any option and the plan is made again.
4. Press **Complete S1**. Then:
   - done tasks stay where they are and keep `Sprint: S1`;
   - **Backlog** tasks move to `1-backlog/` and lose their `Sprint` line;
   - **Next sprint** tasks get `Sprint: S2` (and move to the reset status when it is ticked). `S2` is created as a planned sprint when it does not exist;
   - `S1.md` gets `State: closed` and a `## Summary`;
   - all of it is one commit, for example `sprint(S1): complete, 1 done, 1 to backlog, 1 to S2`.
5. The dialog shows the summary. Press **Plan next sprint** to open the Sprint tab on `S2`, with the returned tasks back in the backlog.

If anything fails, nothing is changed and the dialog stays open with the reason. If the board changed after the plan was shown (someone moved a task), the dialog says so, shows the new plan and asks you to confirm again.

## From the terminal

| In the board | CLI |
|---|---|
| New sprint | `gitask sprint new --name "Sprint 1" --goal "Ship login"` |
| Add / remove a task | `gitask sprint add Core-login S1` / `gitask sprint remove Core-login` |
| Set an estimate | `gitask estimate Core-login 3` |
| Start sprint | `gitask sprint start S1` |
| Complete sprint (plan only) | `gitask sprint complete S1 --unfinished next --backlog Core-docs` |
| Complete sprint (apply) | add `--yes`; `--keep-status` is the unticked reset box |

Every flag: [CLI reference](./cli.md#sprints).

## Where the data lives

| What | Where |
|---|---|
| Settings | `Tasks/gitask.json`, `sprint` block |
| Sprints | `Tasks/_sprints/S<n>.md`: name, state, dates, goal, capacity, then free text (`## Review`, `## Retro`) and the `## Summary` written on completion |
| Membership and size | `- **Sprint:** S1` and `- **Estimate:** 3` in each task's header |
| The switcher's choice | Your browser or VS Code, never committed |

Edit the review and retro notes in the sprint file by hand.
