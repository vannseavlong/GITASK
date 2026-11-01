# Core-done-report

- **ID:** T-0038
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T3 · export of personal data (names, per-person KPIs), new core feature (auto picker, see `PIPELINE.md`)
- **Claimed by:** none
- **Worktree:** `GITASK/GITASK-done-report/` · **Branch:** `feat/done-report`
- **Started / updated:** 2026-10-30 / 2026-11-02
- **Due:** 2026-11-04
- **Docs:** `Tasks/_plans/Ext-people-export-ui.md`
- **Depends on:** Core-people, Core-subtask-assignee
- **Touches:** packages/core/src/report.ts, report-render.ts (new), git.ts (read-only log helper), index.ts, tests

## Goal
Build the KPI report: tasks and sub-tasks completed in a period, by person, rendered as a self-contained HTML page (print to PDF), Markdown and CSV. Pure data function plus renderers; no UI.

## Gates (T3)
- [x] G1 scope  - [x] G2 static  - [x] G3 tests (new + edge cases)  - [~] G4 run it (Chrome fixture only; real VS Code not run)
- [x] G5 code review (strict)  - [x] G6 security  - [x] G7 docs sync
- [x] G8 PR message  - [ ] G9 human review  - [ ] G10 release plan  - [x] G11 changelog

## Done when
- [ ] `buildReport(board, {from, to, people?, dateField, includeSubtasks})` returns summary, per-person rows and task rows; same filter rules as the UI
- [ ] Done date = date of the commit that moved the file into `5-done/` or `6-deploy/` (`git log --follow`), fallback to the `Started / updated` date, and the row says which was used
- [ ] Per person: tasks completed, sub-tasks completed, on-time vs late against `Due`, average days from start to done, tier mix; a task with no Owner goes under "Unassigned"
- [ ] Template: header (title, period, filters, repo, generated date), KPI tiles, per-person table, tasks grouped by person with sub-task credit, notes (data source, how done date was found); print CSS makes A4 clean
- [ ] Output is one HTML file with inline CSS, no network or script; all text escaped (task titles are untrusted); emails never included; people shown by GitHub name (`github`, else `name`)
- [ ] Tests: empty period, one person, many people, task done twice (moved out and back), file with no git history, title with `<script>`, CSV injection (`=`, `+`, `@` prefixes quoted)
- [x] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge

## Delivery notes (2026-10-30)
- Built on its own branch, merged into `release/0.5.0` with the rest of 0.5.0 (no tag, nothing published).
- Gates run on the merged release: G2 typecheck clean, G3 273 tests pass (new tests for this task included), build clean, `pnpm package` ok (see `Ops-release-0-5`).
- G5: independent code review of the whole release; its findings were fixed on `fix/review-fixes` (test first). G6: independent security review; findings fixed on `fix/security-fixes`. The UI components `board`, `list`, `timeline`, `overview`, `export-dialog`, `subtasks`, `assignee-picker`, `people-filter` were not reached by the reviewers.
- G7: docs in `Docs/architecture/` and `Docs/requirements/views.md`, website pages in `packages/web/docs`.
- G4: seen in Chrome with a fixture board only. NOT yet run in a real VS Code window (F5).
- G9 human review: PENDING (T3). Task stays in `4-testing/` until the owner has reviewed it.
