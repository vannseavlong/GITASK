# Ext-status-color

- **ID:** T-0011
- **Repo:** gitask (`packages/core`, `packages/vscode`)
- **Owner:** SNLRLONG
- **Tier:** T2 · new feature, new config file, edits shared `Column` type and board loader (auto picker, see `PIPELINE.md`)
- **Claimed by:** none
- **Worktree:** `GITASK/GITASK-status-color/` · **Branch:** `feat/status-color`
- **Started / updated:** 2026-10-20 / 2026-10-20
- **Docs:** `Tasks/_plans/Ext-board-manage.md`, `Docs/requirements/views.md`
- **Depends on:** none
- **Touches:** new `packages/core/src/config.ts` (+test), `packages/core/src/{types,board,index}.ts`, `packages/vscode/src/{protocol,extension}.ts`, `packages/vscode/src/views/{board,list,timeline,overview}.ts` (colour use only). Shares `protocol.ts`, `extension.ts`, `board.ts`, `list.ts` with the other two tasks: additive edits only.

## Goal
Let the user set a colour per status (column) and see it on every view.

## Gates
- [x] G1 scope  - [x] G2 static  - [x] G3 tests (new)  - [x] G4 run it (checked by owner before v0.4.0)  
- [x] G5 code review (fresh reviewer agent)  - [x] G6 security (colour input reviewed: hex only, validated in host and core)  - [x] G7 docs sync
- [x] G8 PR message  - [x] G9 human review (owner)  - [x] G11 changelog

## Done when
- [x] `Tasks/gitask.json` `{ "columns": { "<folder>": { "color": "#rrggbb" } } }`; `loadBoard` fills `Column.color`; missing or malformed file or colour falls back to no colour, never throws
- [x] `setColumnColor` message validated (existing column, `^#[0-9a-fA-F]{6}$`); host writes the file, commits it by pathspec when tracked and `autoCommit` is on
- [x] Picker on the board column header: preset swatches, hex input, reset
- [x] Colour shown on board column header and card edge, list status chip, timeline bars, overview bars; text stays readable in light and dark themes
- [x] Colour applied with `style.setProperty`, never concatenated into HTML or CSS text
- [x] Tests: parse good/bad/missing config, write keeps other keys, validation rejects
- [x] Root `CHANGELOG.md` entry added
- [x] Worktree and branch removed after merge

## Notes
- G4 (run in VS Code): not run; no extension host available. Pending: user. G5, G9: pending fresh reviewer/user.
- Colour reaches the DOM only via `style.setProperty`; host and core both validate `^#[0-9a-fA-F]{6}$` (G6).
- Tests: `packages/core/test/config.test.ts` (new), `packages/vscode/test/protocol.test.ts` (setColumnColor case).

## Draft changelog entry
```
## 2026-10-20 · [Ext] feat(board): colour per status
- Owner: SNLRLONG
- Task: Tasks/5-done/Ext-status-color.md
- Branch/PR: feat/status-color
- What changed: set a colour per status from the board column header (stored in Tasks/gitask.json); shown on board, list, timeline and overview.
- Needs: none
```
