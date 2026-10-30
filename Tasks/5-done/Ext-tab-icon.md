# Ext-tab-icon

- **ID:** T-0036
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T1 · one-line UI change, no logic (auto picker, see `PIPELINE.md`)
- **Claimed by:** none
- **Worktree:** `GITASK/GITASK-tab-icon/` · **Branch:** `feat/tab-icon`
- **Started / updated:** 2026-10-30 / 2026-10-30
- **Docs:** `Tasks/_plans/Ext-people-export-ui.md`
- **Depends on:** none
- **Touches:** packages/vscode/src/extension.ts (`createWebviewPanel` block), packages/vscode/media/

## Goal
Show the GITASK icon on the editor tab (image 2 shows the generic file icon).

## Gates (T1)
- [x] G1 scope  - [x] G2 static  - [x] G3 tests (existing pass)  - [~] G4 run it (Chrome fixture only; real VS Code not run) (quick)
- [x] G8 PR message  - [x] G11 changelog

## Done when
- [ ] `panel.iconPath` set from `media/` (light and dark variants; add a square SVG or PNG that reads at 16 px)
- [ ] Icon appears on the tab when the board opens, in light and dark themes
- [ ] `.vscodeignore` / `files` still ship the icon in the `.vsix`
- [x] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge

## Delivery notes (2026-10-30)
- Built on its own branch, merged into `release/0.5.0` with the rest of 0.5.0 (no tag, nothing published).
- Gates run on the merged release: G2 typecheck clean, G3 273 tests pass (new tests for this task included), build clean, `pnpm package` ok (see `Ops-release-0-5`).
- G5: independent code review of the whole release; its findings were fixed on `fix/review-fixes` (test first). G6: independent security review; findings fixed on `fix/security-fixes`. The UI components `board`, `list`, `timeline`, `overview`, `export-dialog`, `subtasks`, `assignee-picker`, `people-filter` were not reached by the reviewers.
- G7: docs in `Docs/architecture/` and `Docs/requirements/views.md`, website pages in `packages/web/docs`.
- G4: seen in Chrome with a fixture board only. NOT yet run in a real VS Code window (F5).
