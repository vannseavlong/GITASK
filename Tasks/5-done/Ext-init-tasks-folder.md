# Ext-init-tasks-folder

- **ID:** T-0017
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T2 · new feature (new command, new core export `initTasks`); not auth, data or release files
- **Claimed by:** none
- **Worktree:** `GITASK/GITASK-init-tasks/` · **Branch:** `feat/init-tasks-folder`
- **Started / updated:** 2026-10-18 / 2026-10-18
- **Due:** none
- **Docs:** `packages/vscode/README.md`
- **Depends on:** none
- **Touches:** `packages/core/src/init.ts`, `packages/core/src/index.ts`, `packages/core/test/init.test.ts`, `packages/vscode/src/extension.ts`, `packages/vscode/package.json`, `packages/vscode/README.md`, `CHANGELOG.md`

## Goal
A new project has no `Tasks/` folder, so the board shows `ENOENT` and there is nowhere to start. Add the command **GITASK: Initialize Tasks Folder** that creates the six status folders and a `_TEMPLATE.md`, then opens the board.

## Gates (T2)
- [x] G1 scope  - [x] G2 static (typecheck + build pass)
- [x] G3 tests (2 new in `packages/core/test/init.test.ts`; 102 pass)  - [ ] G4 run it (install the .vsix in an empty project and run the command)
- [ ] G5 code review  - [x] G6 security (Skipped G6: no auth/data/input; the folder name comes from the existing `gitask.tasksDir` setting, ids are fixed constants)  - [x] G7 docs sync (vscode README)
- [ ] G8 PR message  - [x] G11 changelog

## Done when
- [x] Command appears in the Command Palette and creates `1-backlog` … `6-deploy` + `_TEMPLATE.md`
- [x] Running it twice changes nothing
- [ ] G4 checked in a real VS Code window
- [x] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge
- [ ] Release 0.3.0 per `Docs/architecture/release.md` (bump is in the PR; tag by the owner)

## Notes
- Left to the owner: commit, PR, merge, tag.
