# Scrum sprints plan: plan, run and close sprints from the `Tasks/` folder

Updated: 2026-11-12 · Source idea: `Tasks/1-backlog/Ext-scrum-sprints.md` (T-0048) · Requirements: none yet (wave 1 adds `Docs/requirements/sprints.md`); config rules go in `Docs/architecture/config.md`.

## Goal
Let a team run Scrum on top of GITASK without a server: plan a sprint from the backlog, see only that sprint on every view, track it while it runs, and close it. Closing sends each unfinished task either back to the backlog or into the next sprint, so the next sprint starts clean with the tasks the team picks. Everything stays in git as Markdown and JSON, and teams that don't use sprints see no change.

## Flow
| # | Step | State |
|---|---|---|
| 1 | Tasks live in numbered status folders; the header holds fields as `- **Key:** value` | exists |
| 2 | Turn sprints on with a `sprint` block in `Tasks/gitask.json` (length, estimate unit, done statuses, default for unfinished work). Without the block nothing sprint-related shows, the same rule as `fields` | new |
| 3 | One file per sprint in `Tasks/_sprints/S7.md` holds name, state, dates, goal, capacity, then Review / Retro notes and the closing summary. `_` folders are already skipped as columns (`COLUMN_DIR` in `board.ts`) | new |
| 4 | A task belongs to a sprint through its header `- **Sprint:** S7`; its size is `- **Estimate:** 3`. No header means backlog | new |
| 5 | **Plan:** in a new Sprint tab, the backlog (tasks with no sprint, not done) sits beside the sprint being planned. Add or remove tasks, set estimates, and watch the capacity bar. New tasks can be created straight into the sprint | new |
| 6 | **Start:** "Start sprint" sets `State: active`, Start/End (from today and the sprint length), and commits the sprint file. Only one sprint can be active | new |
| 7 | **Run:** a sprint switcher in the shell (Active sprint · a chosen sprint · Backlog · All) scopes Overview, Board, List and Timeline. A strip shows goal, days left, and done/total tasks and points | new |
| 8 | Moving tasks between statuses works as today (`moveTask`, git mv + commit) | exists |
| 9 | **Close:** "Complete sprint" opens a dialog. The host builds a plan: done tasks (in a done status) stay put and keep `Sprint: S7`; each unfinished task gets an action: **Backlog** (move file to `1-backlog/`, clear `Sprint`) or **Next sprint** (keep the status or reset it to todo, set `Sprint: S8`). The default comes from config; it can be changed per task or for all | new |
| 10 | The host checks the plan again, applies every move and header edit, writes `## Summary` into `S7.md` (committed, done, to backlog, to next, points) and sets `State: closed`. One commit by pathspec, rolled back if any step fails | new |
| 11 | The dialog ends with "Plan next sprint", which opens step 5 with the backlog now holding the returned tasks plus anything new | new |
| 12 | CLI: `gitask sprint list/new/start/add/remove/complete` with `--dry-run`; `board --sprint` | new |
| 13 | Burndown, velocity, sprint report, retro editor, standup digest, GitHub iteration sync | later wave (backlog) |

## Screens and states
No design frames exist. Use the existing theme variables and copy the patterns already in the UI: filter bar and people filter for the switcher, the Board columns and List rows for the planning panes, the export and GitHub dialogs (plan first, then confirm) for Complete sprint.

- **Sprint switcher** (shell, next to the filters). States: sprints off (hidden), no sprint yet ("Plan a sprint"), active sprint, a closed sprint picked (read-only label).
- **Sprint strip** (under the tabs while a sprint is in scope): name, goal, `Nov 16 – Nov 29 · 5 days left`, `8/12 tasks · 25/34 pts`. States: overdue (end passed, still active: warning colour, "Complete sprint" emphasised), no estimates (points hidden).
- **Sprint tab** (new view, id `sprint`). Left pane is the backlog (search, filter by field and person), right pane is the planned or active sprint (capacity bar). Empty states: "Backlog is empty" and "Add tasks from the backlog". Buttons: New sprint, Start sprint (planned only), Complete sprint (active only), Edit sprint (name, goal, dates, capacity).
- **Complete sprint dialog.** Summary tiles (done, unfinished, points); a table of unfinished tasks with an action select (Backlog / Next sprint) and "Apply to all"; a "Reset status to todo" checkbox for carried-over tasks; warnings (task is claimed or has a worktree; next sprint will be created). States: loading plan, plan stale (board changed: re-plan), applying, success (summary plus "Plan next sprint"), error (nothing changed).

## Data and API
No backend. Everything is files plus webview/serve messages validated in `protocol.ts`.

`Tasks/gitask.json`:
```json
{ "sprint": { "lengthDays": 14, "estimate": "points", "doneColumns": ["5-done", "6-deploy"],
              "unfinished": "backlog", "resetStatus": "2-todo" } }
```
| Key | Rule | Default |
|---|---|---|
| `lengthDays` | integer 1 to 60 | 14 |
| `estimate` | `points`, `hours`, `none` | `points` |
| `doneColumns` | existing column ids | `5-done`, `6-deploy` (same as the report) |
| `unfinished` | `backlog`, `next` | `backlog` |
| `resetStatus` | column id, or `null` to keep the status | `2-todo` |

`Tasks/_sprints/S7.md` (same header syntax as tasks, so `parse.ts` is reused):
```markdown
# Sprint 7
- **ID:** S7
- **State:** active
- **Start:** 2026-11-16
- **End:** 2026-11-29
- **Goal:** Ship sprint planning
- **Capacity:** 30

## Review
## Retro
## Summary
- Committed: 12 tasks · 34 pts · Done: 8 · 25 pts
- To backlog: T-0101, T-0104 · To S8: T-0102
```
Task header lines: `- **Sprint:** S7`, `- **Estimate:** 3` (`sprint` and `estimate` join `RESERVED_FIELD_KEYS`).

Messages (all validated; ids checked against the board; writes refused unless the task or sprint exists):
- `createSprint {name?, goal?, start?, end?, capacity?}`, `updateSprint {id, patch}`, `startSprint {id}`
- `setTaskSprint {path, sprint: id | null}`, `setEstimate {path, value: number | null}`
- `sprintClosePlan {id}` → `sprintClosePlanResult {plan, planHash}`
- `completeSprint {id, actions: {path: "backlog" | "next"}, resetStatus, planHash, confirmed: true}` → `sprintCompleted {ok, summary?, error?}`. Refused without `confirmed` or when `planHash` no longer matches the board, the same rule as delete and GitHub sync.

Commits: one per action, by pathspec only, e.g. `sprint(S7): complete, 8 done, 3 to backlog, 1 to S8`.

## Gaps and decisions
1. **Where sprints live.** Decision: one Markdown file per sprint in `Tasks/_sprints/`, not in `gitask.json`. Review and retro notes are prose, a file per sprint never conflicts between people, and history is readable in git. `gitask.json` keeps only settings.
2. **Membership.** Decision: a `Sprint` header on the task, with one sprint at a time. Earlier sprints are recorded in each closed sprint's `## Summary` and in git history, not in a growing list on the task.
3. **"Back to backlog" means the folder.** Decision: an unfinished task sent to the backlog moves to `1-backlog/` (git mv, same as `moveTask`) and its `Sprint` line is removed. A carried-over task keeps its status or is reset to `resetStatus`. Done tasks never move.
4. **Done statuses are configurable.** The report hard-codes `5-done|6-deploy` (`report.ts` `DONE_COLUMN`), but teams can add statuses. Decision: `sprint.doneColumns` with the report's pair as default. Changing the report to use it is out of scope.
5. **All-or-nothing close.** Many files change in one action. Decision: `planSprintClose` (pure) builds the plan and its hash. `applySprintClose` checks everything first (files exist, no name clash in the target folder, the hash matches), then moves and edits. On failure it reverses the steps already done (the `setProject` restore pattern), and it makes one commit by pathspec. Never `git add -A`.
6. **Claimed tasks.** A task with `Claimed by` or a worktree can still be sent to the backlog, but the dialog warns. GITASK never removes a worktree (AGENTS.md rule).
7. **Where the sprint scope is stored.** It's a viewing preference, kept in `UiState` like the other filters and never committed. Default is the active sprint when one exists.
8. **New view id.** `sprint` must be added to the UI registry, `VIEW_IDS` and `BOARD_VIEWS` together (tests keep them equal), and is allowed as `defaultView`.
9. **Done tasks of closed sprints** stay in `5-done/` with their `Sprint` header. The switcher hides them from the active sprint. Archiving them is a later-wave item.
10. **Sprint ids** are `S<n>` (next = highest + 1), with "Sprint n" as the default name. They're short in headers and commit subjects and don't depend on the sprint length.

## Open questions (recommendation)
1. Default for unfinished tasks on close: back to backlog or into the next sprint? **Recommend backlog** (what you asked for: start fresh). It's a per-team setting (`unfinished`) and can be changed per task in the dialog.
2. Should carried-over tasks go back to todo? **Recommend yes** (`resetStatus: "2-todo"`), so the new sprint's board starts with nothing "in progress" by accident.
3. Estimate unit: **recommend story points** by default, with `hours` and `none` as options. No per-person capacity in wave 1 (backlog).
4. More than one active sprint (parallel teams)? **Recommend no** for wave 1.

## Task breakdown
| # | Task | Repo area | Depends on | Tier | Size |
|---|---|---|---|---|---|
| 1 | `Core-sprint-model` (T-0091) | core | none | T2 | 1.5d |
| 2 | `Core-sprint-ops` (T-0092) | core | 1 | T2 | 2d |
| 3 | `Ext-sprint-scope` (T-0093) | ui + vscode + serve | 1 | T2 | 1.5d |
| 4 | `CLI-sprint` (T-0094) | cli | 2 | T2 | 1d |
| 5 | `Ext-sprint-planning` (T-0095) | ui + protocol + hosts | 2, 3 | T2 | 2d |
| 6 | `Ext-sprint-complete` (T-0096) | ui + protocol + hosts + docs | 5 | T2 | 2d |
| - | Later waves: `Ext-scrum-sprints` (T-0048, backlog) | all | wave 1 | per item | - |

**Order and parallel groups**
- Step A: 1 alone (types, parser, board: shared core files).
- Step B: **2 and 3 in parallel** (2 in new core files `sprint-ops.ts`; 3 in the UI shell and views).
- Step C: **4 and 5 in parallel** (4 is CLI only; 5 is protocol, hosts and a new view).
- Step D: 6 after 5 (same `protocol.ts`, `extension.ts`, `handler.ts` and the Sprint view).
- Ship all six together in one release, using an integration branch as in #23 and #24.

## Out of scope (wave 1)
Burndown/burnup and velocity charts, sprint report, retro/review editor in the UI (edit the sprint file by hand), standup digest, backlog ranking, epics, WIP limits, per-person capacity, sub-task estimates, GitHub iteration sync, several active sprints, archiving done tasks. All are listed in `Tasks/1-backlog/Ext-scrum-sprints.md`.
