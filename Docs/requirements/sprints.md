# Sprints

Why: a team running Scrum wants to see only the current sprint on every view, know how much time is left and how much is done, and still reach the backlog and older sprints. Everything stays in the `Tasks/` folder; teams that do not use sprints see no change.

Plan: `Tasks/_plans/Ext-scrum-sprints.md`. File format, config and the board payload: [architecture/sprints.md](../architecture/sprints.md). How the UI does it: [architecture/ui.md](../architecture/ui.md#sprint-scope).

Sprints are on only when `Tasks/gitask.json` has a `sprint` block. Without it the switcher, the strip and the sprint badges are not drawn.

## Switcher

A `Sprint:` select in the filter bar, next to People, scopes Overview, Board, List and Timeline at once.

| Option | Shows |
|---|---|
| Active: `S7 · Sprint 7` | Tasks whose `Sprint` is the active sprint, in any status (done ones included). Listed only when a sprint is active |
| Backlog | Tasks with no `Sprint` that are not in a done status (`sprint.doneColumns`) |
| All tasks | Everything, as without sprints |
| `S6 · Sprint 6 (closed)`, `S8 · Sprint 8 (planned)`, ... | Tasks of that sprint, newest first |

- Default is the active sprint, else All tasks. The choice is a viewing preference per user (remembered like the other filters, never committed). A saved sprint that no longer exists falls back to All tasks.
- The scope combines with the text, date, people, field and status filters (AND). While it narrows the board (a sprint or Backlog), the filter bar's `N of M match` counts it.
- Done tasks of closed sprints keep their `Sprint` header, so they show under that sprint, not under the active one or Backlog.
- With no sprint files yet, the list holds Backlog and All tasks plus a note "No sprints yet".
- Problems found while reading sprints (for example two sprints marked active: the lowest number is used) show as a small warning icon next to the switcher; its tooltip and label give the message.
- Keyboard: Tab to the select, Enter or Space opens it, arrows move, Enter picks.

## Strip

One line under the tabs while a sprint is in scope:

`S7 · Sprint 7` · goal · `Nov 16 – Nov 29 · 5 days left` · `8/12 tasks · 25/34 pts`

- Time: `N days left`, `last day` on the end date, `ended N days ago` after it, `starts in N days` for a planned sprint, `closed` for a closed one. An ended sprint that is not closed shows the dates and time in the warning colour.
- Counts cover every task of the sprint on the board; the filters do not change them. Done = in a done status. Points are the sum of `Estimate` (missing counts as 0), shown as `pts` or `h`, and hidden when `estimate` is `none`.
- Missing goal or dates are left out. The strip wraps at narrow widths.

## Badges

Board cards, List rows (after the title) and the task detail panel show a small sprint badge (`S7`) and the estimate (`3 pts`, `2 h`; hidden when `estimate` is `none`). Nothing is shown for a task without them.

## Planning

A **Sprint** tab (after Timeline, only while sprints are on; `GITASK: Show Sprint`, `Ctrl+Alt+G S` in VS Code) to plan and start a sprint. How it is built: [architecture/ui.md](../architecture/ui.md#sprint-planning).

- **Which sprint.** The tab plans the sprint in the switcher's scope; with no sprint in scope, the active sprint, else the newest planned one. A select at the top lists the planned and active sprints; picking one also sets the switcher, so the strip and the other views follow. A closed sprint picked in the switcher shows read-only.
- **Two panes.** Left, the backlog: tasks with no `Sprint` that are not done, after the filter bar's text, date, people, field and status filters, plus its own search box. Right, the sprint's tasks (all of them; filters do not hide committed work). The panes stack at narrow width.
- **Add and remove.** Each backlog row has **Add**, each sprint row **Remove**; or drag a row to the other pane. Both buttons are reachable with Tab and work with Enter or Space. A task belongs to one sprint at a time. Each change is one commit of that task file (`task(Core-x): sprint S7` / `sprint none`).
- **Estimates.** Each row has a small estimate field in the sprint's unit (`pts`, `h`). Enter or leaving the field saves, Escape restores, empty removes; 0-10000 with at most 2 decimals (anything else is marked and not sent). Hidden when `estimate` is `none`.
- **Capacity bar.** Sum of the sprint's estimates against its `Capacity`: `12 / 30 pts`. Over capacity turns the bar and the numbers red and says "Over capacity: remove tasks or raise the capacity." Without a capacity it shows `12 pts · no capacity set`. Hidden when `estimate` is `none`.
- **New sprint / Edit sprint.** A dialog with name (default `Sprint <n>`), goal, start, end and capacity. New sprints are `planned` with the next id. Errors (end before start, too long, bad number, or the host's reason) show in the dialog, which stays open. The state is never edited here.
- **Start sprint.** Only on a planned sprint, and only while no other sprint is active; otherwise the button is disabled and a line says why ("S6 is active. Complete it before starting S7."). Starting sets `State: active`, and Start (today) and End (Start + `lengthDays` - 1) when they are empty. The switcher's Active entry and the strip then show it.
- **New task in a sprint.** "+ New task in S7" on the tab, and a **Sprint** picker in every New task dialog (shown only with sprints on; closed sprints are not offered). It defaults to the sprint in scope (on the Sprint tab, the planned sprint), else No sprint (backlog).
- **Empty states.** No sprint yet: "No sprints yet. Plan the first one" with a New sprint button. Empty backlog: "Backlog is empty". Empty sprint: "Add tasks from the backlog: use Add or drag a task here."
- Sprint names, goals and task titles are shown as plain text.

## Complete sprint

Close the active sprint from the board: see what is done, choose per unfinished task Backlog or Next sprint, confirm, then plan the next sprint. How it is built: [architecture/ui.md](../architecture/ui.md#complete-sprint); what the close writes: [architecture/sprints.md](../architecture/sprints.md#closing-a-sprint). User guide: `packages/web/docs/sprints.md`.

- **Where.** A **Complete sprint** button on the Sprint tab and on the strip, only for the active sprint (emphasised once the end date has passed). Both open the same dialog.
- **Plan first.** The dialog opens on "Building the plan…", then shows the plan. Nothing is written until the user confirms.
- **Summary tiles.** Done (`1` of `3 tasks`), Unfinished (`2`, with how many go to the backlog and to the next sprint), Points (`3/10 pts done`; hidden when `estimate` is `none`).
- **Unfinished table.** One row per unfinished task: id and title, status, estimate, an action select (**Backlog** / **Next sprint (S2)**) and where it goes (`backlog`, `S2 · todo`). The default action is `sprint.unfinished`. "Apply to all" sets one action on every row. Done tasks are listed in a collapsed "Done (n): stay where they are".
- **Reset status.** A "Reset status to todo for tasks going to S2" checkbox, ticked when `sprint.resetStatus` is set (else the target is `2-todo` when it exists). Unticked, carried-over tasks keep their status. Hidden when there is no status to reset to.
- **Re-plan.** Changing an action, "Apply to all" or the checkbox asks for a new plan; Confirm is disabled ("Updating the plan…") until it arrives.
- **Warnings** (shown, not blocking): a claimed task or one with a worktree (GITASK never removes worktrees), "Sprint S2 will be created", a done status or reset status that does not exist.
- **Blockers** (Confirm disabled, the first one shown next to it): for example a file of the same name already in the backlog, no backlog status, the next sprint exists but is not planned.
- **Confirm.** "Complete S1" applies the plan: done tasks stay; Backlog tasks move to `1-backlog/` and lose their `Sprint` line; Next-sprint tasks get `Sprint: S2` (and the reset status); `S2` is created when needed; the sprint file gets `State: closed` and `## Summary`. One commit. While it runs the dialog cannot be closed.
- **Stale.** When the board changed after the plan was shown, nothing changes; the dialog says "The board changed since this plan was made, so nothing was changed. The plan below is new: check it and confirm again." and shows the new plan.
- **Error.** Any other failure keeps the dialog open with the reason and "Nothing was changed".
- **Success.** "S1 completed" with the summary (`Committed: 3 tasks · 10 pts · Done: 1 · 3 pts`, `To backlog: T-0002`, `To S2: T-0004`) and whether it was committed. **Plan next sprint** closes the dialog and opens the Sprint tab scoped to the next sprint (or, when none was created, the tab's default sprint), with the returned tasks in the backlog pane.
- Narrow widths: the tiles wrap, the table scrolls sideways, the dialog keeps a side gutter.
