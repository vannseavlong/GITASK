# Ext-scrum-sprints

- **ID:** T-0048
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T2 · decided per item when promoted
- **Claimed by:** none
- **Worktree:** none yet
- **Started / updated:** none / 2026-11-12
- **Docs:** `Tasks/_plans/Ext-scrum-sprints.md`
- **Depends on:** wave 1: Core-sprint-model, Core-sprint-ops, Ext-sprint-scope, CLI-sprint, Ext-sprint-planning, Ext-sprint-complete
- **Touches:** none yet

## Goal
Later waves of Scrum support, after wave 1 (plan, run, complete sprints) is in `2-todo/`. Promote items one at a time with `task-planner`.

## Ideas (ordered by value)
- Burndown and burnup per sprint, with scope-change markers (tasks added after start), from git history of `Sprint` headers and moves into done statuses
- Velocity across closed sprints (from each sprint's `## Summary`), and a forecast for the next sprint
- Sprint report: `gitask report --sprint S7` and an Export option, reusing the report engine (committed vs done, carried over, per person)
- Review and retro notes edited from the board (the `## Review` / `## Retro` sections of the sprint file), with simple templates (went well / to improve / actions)
- Daily standup digest per person: yesterday's moves and ticks, today's in-progress tasks, blockers (from git log)
- Backlog ranking by drag (`Rank` header) and a ready/not-ready flag
- Epics grouping several tasks (an `Epic` header or a configured field), with progress per epic
- WIP limits per status column, with a warning on the board
- Per-person capacity and days off for a sprint
- Sub-task estimates rolling up to the task
- Cycle time and cumulative flow charts
- Archive done tasks of closed sprints (`5-done/` stays small)
- Several active sprints for parallel teams
- GitHub: sprint as a Project iteration field, milestones (builds on Ext-github-sync)
- Work item types (bug / feature / chore) as a configured field preset

## Done when
- [ ] Each idea is promoted to a task or dropped
