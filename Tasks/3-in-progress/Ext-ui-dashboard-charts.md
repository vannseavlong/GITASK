# Ext-ui-dashboard-charts

- **ID:** T-0053
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T2 · new UI feature, one new dependency, one core read function (auto picker, see `PIPELINE.md`)
- **Claimed by:** claude session (agent), 2026-10-30
- **Worktree:** `GITASK/GITASK-ui-dashboard-charts/` · **Branch:** `feat/ui-dashboard-charts`
- **Started / updated:** 2026-10-30 / 2026-10-30
- **Docs:** `Tasks/_plans/Ext-polish-0-5-0.md`
- **Depends on:** none (0.5.0 is merged on main)
- **Touches:** packages/ui/src/views/overview.tsx (+ new chart components), packages/core/src/activity.ts (new), board payload, MockHost

## Goal
Improve the Overview tab (the dashboard) with real charts: donut/pie, bar charts and a GitHub-style activity heatmap.

## Gates (T2)
- [ ] G1 scope  - [ ] G2 static  - [ ] G3 tests (new)  - [ ] G4 run it
- [ ] G5 code review  - [ ] G6 security (only if input or auth handling changes)  - [ ] G7 docs sync
- [ ] G8 PR message  - [ ] G9 human review (optional)  - [ ] G11 changelog

## Done when
- [ ] Donut/pie: tasks by status and by tier; bar charts: tasks per person (owner + sub-task assignees) and tasks completed per week (last 12 weeks)
- [ ] GitHub-style heatmap of activity per day for the last 12 months (task changes and moves from git history, via a core `taskActivity(dir)` that reads `git log --name-only` on Tasks/ once, counts per day, caps work on huge histories); legend, tooltips, month and weekday labels, a colour scale that works in light and dark
- [ ] Charts use the `dataviz` skill rules (accessible palette, not colour-only, tooltips, empty states) and the existing filters (date, people, text) apply to the status/tier/person charts
- [ ] One chart library at most (shadcn `chart` = recharts, exact pin, >= 2 weeks old) or hand-made SVG; heatmap is plain SVG; bundle size delta reported
- [ ] Works in VS Code and in the browser (activity data comes through the board payload or a message; handler parity); tests for `taskActivity` on a temp git repo (several days, renames, empty repo) and for the aggregation helpers
- [ ] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge
