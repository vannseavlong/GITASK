# Ext-ui-views

- **ID:** T-0039
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T2 · ports four views to the new UI package, edits shared UI (auto picker, see `PIPELINE.md`)
- **Claimed by:** none
- **Worktree:** `GITASK/GITASK-ui-views/` · **Branch:** `feat/ui-views`
- **Started / updated:** 2026-10-30 / 2026-10-30
- **Docs:** `Tasks/_plans/Ext-people-export-ui.md`
- **Depends on:** Ext-ui-foundation
- **Touches:** packages/ui/src/views/{list,timeline,overview,detail}/**, packages/vscode/src/{html,detail,markdown}.ts and views/*.ts (removed)

## Goal
Port List, Timeline, Overview and the task detail panel to React components with shadcn, reusing the tested `*-logic.ts` modules, then delete the string-built views.

## Gates (T2)
- [x] G1 scope  - [x] G2 static  - [x] G3 tests (new)  - [~] G4 run it (Chrome fixture only; real VS Code not run)
- [x] G5 code review  - [x] G6 security (only if input or auth handling changes)  - [x] G7 docs sync
- [x] G8 PR message  - [ ] G9 human review (optional)  - [x] G11 changelog

## Done when
- [ ] Each view reaches parity with `Docs/requirements/views.md` (counts, bars, stale list, filters, empty states)
- [ ] Existing `*-logic.ts` tests keep passing unchanged (logic moved, not rewritten)
- [ ] Markdown in task detail rendered by `react-markdown` with links and HTML disabled; the old `markdown.ts` is removed
- [ ] Old `views/*.ts` string views and their `*_SRC` embedding deleted in this task, not left as dead code
- [ ] Keyboard: tabs, cards and dialogs reachable without a mouse
- [x] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge

## Delivery notes (2026-10-30)
- Built on its own branch, merged into `release/0.5.0` with the rest of 0.5.0 (no tag, nothing published).
- Gates run on the merged release: G2 typecheck clean, G3 273 tests pass (new tests for this task included), build clean, `pnpm package` ok (see `Ops-release-0-5`).
- G5: independent code review of the whole release; its findings were fixed on `fix/review-fixes` (test first). G6: independent security review; findings fixed on `fix/security-fixes`. The UI components `board`, `list`, `timeline`, `overview`, `export-dialog`, `subtasks`, `assignee-picker`, `people-filter` were not reached by the reviewers.
- G7: docs in `Docs/architecture/` and `Docs/requirements/views.md`, website pages in `packages/web/docs`.
- G4: seen in Chrome with a fixture board only. NOT yet run in a real VS Code window (F5).
