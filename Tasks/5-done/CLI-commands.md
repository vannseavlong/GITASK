# CLI-commands

- **ID:** T-0044
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T2 · new CLI commands over core, edits main.ts (auto picker, see `PIPELINE.md`)
- **Claimed by:** none
- **Worktree:** `GITASK/GITASK-commands/` · **Branch:** `feat/commands`
- **Started / updated:** 2026-10-30 / 2026-10-30
- **Docs:** `Tasks/_plans/Ext-people-export-ui.md`
- **Depends on:** Core-people, Core-subtask-assignee, Core-done-report
- **Touches:** packages/cli/src/main.ts, cli tests, packages/cli README

## Goal
Expose the new core features in `gitask` so scripts, CI and managers can use them without the editor.

## Gates (T2)
- [x] G1 scope  - [x] G2 static  - [x] G3 tests (new)  - [~] G4 run it (Chrome fixture only; real VS Code not run)
- [x] G5 code review  - [x] G6 security (only if input or auth handling changes)  - [x] G7 docs sync
- [x] G8 PR message  - [ ] G9 human review (optional)  - [x] G11 changelog

## Done when
- [ ] `gitask people` lists contributors; `gitask assign <task> <person|none>`; `gitask subtask add|assign <task> ...`
- [ ] `gitask report --from 2026-10-01 --to 2026-10-31 --people a,b --format html|md|csv --out report.html`
- [ ] Help text updated; exit codes non-zero on unknown task, person or column
- [ ] Tests drive the real binary on a temp repo
- [x] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge

## Delivery notes (2026-10-30)
- Built on its own branch, merged into `release/0.5.0` with the rest of 0.5.0 (no tag, nothing published).
- Gates run on the merged release: G2 typecheck clean, G3 273 tests pass (new tests for this task included), build clean, `pnpm package` ok (see `Ops-release-0-5`).
- G5: independent code review of the whole release; its findings were fixed on `fix/review-fixes` (test first). G6: independent security review; findings fixed on `fix/security-fixes`. The UI components `board`, `list`, `timeline`, `overview`, `export-dialog`, `subtasks`, `assignee-picker`, `people-filter` were not reached by the reviewers.
- G7: docs in `Docs/architecture/` and `Docs/requirements/views.md`, website pages in `packages/web/docs`.
- G4: seen in Chrome with a fixture board only. NOT yet run in a real VS Code window (F5).
