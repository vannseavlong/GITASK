# Ext-report-simple

- **ID:** T-0054
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T3 · changes an export of personal data (names, per-person figures) (auto picker, see `PIPELINE.md`)
- **Claimed by:** none
- **Worktree:** `GITASK/GITASK-report-simple/` · **Branch:** `feat/report-simple`
- **Started / updated:** 2026-10-30 / 2026-11-02
- **Due:** 2026-11-04
- **Docs:** `Tasks/_plans/Ext-polish-0-5-0.md`
- **Depends on:** none (0.5.0 is merged on main)
- **Touches:** packages/core/src/report-render.ts, report.ts (summary only), packages/ui export dialog preview text, tests, Docs/requirements/views.md

## Goal
Make the report simple: remove the noise (data source `git`/`updated`, tier mix, notes about where the date came from, average days, internal ids) and keep what a line manager needs.

## Gates (T3)
- [ ] G1 scope  - [ ] G2 static  - [ ] G3 tests (new + edge cases)  - [ ] G4 run it
- [ ] G5 code review (strict)  - [ ] G6 security  - [ ] G7 docs sync
- [ ] G8 PR message  - [ ] G9 human review  - [ ] G10 release plan  - [ ] G11 changelog

## Done when
- [ ] HTML/Markdown report: title and period, three tiles (tasks done, sub-tasks done, people), one table per person with their done tasks (title, done date) and sub-tasks they finished, an `Unassigned` section only when non-empty
- [ ] CSV: one row per done task: person, task, done date, sub-tasks done (no source, tier, timeliness columns)
- [ ] The core data model may keep its fields; only the renderers and the preview change; on-time/late is shown only when a task has a Due date and then as a small `late` tag
- [ ] Same safety as before: all text escaped, CSV formula injection neutralised, no emails, names by GitHub name, no scripts; existing report tests updated to the new contract (no weakened assertions)
- [ ] Rendered sample from this repo checked in Chrome and compared before/after; docs updated in place
- [ ] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge
