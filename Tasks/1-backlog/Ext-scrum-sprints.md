# Ext-scrum-sprints

- **ID:** T-0048
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T2 · decided per item when promoted
- **Claimed by:** none
- **Worktree:** none yet
- **Started / updated:** none / 2026-10-30
- **Docs:** `Tasks/_plans/Ext-people-export-ui.md`
- **Depends on:** Ops-release-0-5
- **Touches:** none yet

## Goal
Sprints, Scrum ceremonies and the wider SDLC for the version after 0.5.0. Run `task-planner` on this file first; it needs its own plan (flow, screens, formats) before any task is cut.

## Ideas
- Sprint: name, start, end, goal in `Tasks/gitask.json` or `Tasks/_sprints/*.md`; a task header `- **Sprint:** 2026-S21`; sprint board, sprint list, move unfinished tasks to the next sprint
- Estimates (story points or hours) per task and sub-task; capacity per person; velocity
- Burndown, burnup, velocity and cycle-time charts from git move history; sprint report reusing the 0.5.0 report engine
- Scrum ceremonies: planning view, daily standup digest per person, review and retrospective notes saved as markdown
- Backlog grooming: ranking by drag, ready/not-ready flag, epics grouping several tasks
- SDLC stages as configurable columns (requirements, design, build, review, QA, release) and per-stage gates already in `PIPELINE.md`; bug/feature/chore types
- GitHub: sprint as a Project iteration field, milestones, two-way issue sync (builds on Ext-github-sync)

## Open questions for the plan
- Do sprints live in git files (recommended: yes, same rule as everything else) or only in GitHub Projects iterations?
- One workflow for everyone, or a configurable Scrum/Kanban mode per repo?

## Done when
- [ ] A plan exists in `Tasks/_plans/` and each idea is promoted to a task or dropped
