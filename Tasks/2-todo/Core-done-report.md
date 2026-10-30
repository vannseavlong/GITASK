# Core-done-report

- **ID:** T-0038
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T3 · export of personal data (names, per-person KPIs), new core feature (auto picker, see `PIPELINE.md`)
- **Claimed by:** none
- **Worktree:** `GITASK/GITASK-done-report/` · **Branch:** `feat/done-report`
- **Started / updated:** none / 2026-10-30
- **Docs:** `Tasks/_plans/Ext-people-export-ui.md`
- **Depends on:** Core-people, Core-subtask-assignee
- **Touches:** packages/core/src/report.ts, report-render.ts (new), git.ts (read-only log helper), index.ts, tests

## Goal
Build the KPI report: tasks and sub-tasks completed in a period, by person, rendered as a self-contained HTML page (print to PDF), Markdown and CSV. Pure data function plus renderers; no UI.

## Gates (T3)
- [ ] G1 scope  - [ ] G2 static  - [ ] G3 tests (new + edge cases)  - [ ] G4 run it
- [ ] G5 code review (strict)  - [ ] G6 security  - [ ] G7 docs sync
- [ ] G8 PR message  - [ ] G9 human review  - [ ] G10 release plan  - [ ] G11 changelog

## Done when
- [ ] `buildReport(board, {from, to, people?, dateField, includeSubtasks})` returns summary, per-person rows and task rows; same filter rules as the UI
- [ ] Done date = date of the commit that moved the file into `5-done/` or `6-deploy/` (`git log --follow`), fallback to the `Started / updated` date, and the row says which was used
- [ ] Per person: tasks completed, sub-tasks completed, on-time vs late against `Due`, average days from start to done, tier mix; a task with no Owner goes under "Unassigned"
- [ ] Template: header (title, period, filters, repo, generated date), KPI tiles, per-person table, tasks grouped by person with sub-task credit, notes (data source, how done date was found); print CSS makes A4 clean
- [ ] Output is one HTML file with inline CSS, no network or script; all text escaped (task titles are untrusted); emails never included; people shown by GitHub name (`github`, else `name`)
- [ ] Tests: empty period, one person, many people, task done twice (moved out and back), file with no git history, title with `<script>`, CSV injection (`=`, `+`, `@` prefixes quoted)
- [ ] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge
