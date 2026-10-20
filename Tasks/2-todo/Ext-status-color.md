# Ext-status-color

- **Repo:** gitask (`packages/core`, `packages/vscode`)
- **Owner:** SNLRLONG
- **Tier:** T2 · new feature, new config file, edits shared `Column` type and board loader (auto picker, see `PIPELINE.md`)
- **Claimed by:** none
- **Worktree:** `GITASK/gitask-status-color/` · **Branch:** `feat/status-color`
- **Started / updated:** 2026-10-20 / 2026-10-20
- **Docs:** `Tasks/_plans/Ext-board-manage.md`, `Docs/requirements/views.md`
- **Depends on:** none
- **Touches:** new `packages/core/src/config.ts` (+test), `packages/core/src/{types,board,index}.ts`, `packages/vscode/src/{protocol,extension}.ts`, `packages/vscode/src/views/{board,list,timeline,overview}.ts` (colour use only). Shares `protocol.ts`, `extension.ts`, `board.ts`, `list.ts` with the other two tasks: additive edits only.

## Goal
Let the user set a colour per status (column) and see it on every view.

## Gates
- [ ] G1 scope  - [ ] G2 static  - [ ] G3 tests (new)  - [ ] G4 run it
- [ ] G5 code review  - [ ] G6 security (colour comes from a file: hex only)  - [ ] G7 docs sync
- [ ] G8 PR message  - [ ] G9 human review (optional)  - [ ] G11 changelog

## Done when
- [ ] `Tasks/gitask.json` `{ "columns": { "<folder>": { "color": "#rrggbb" } } }`; `loadBoard` fills `Column.color`; missing or malformed file or colour falls back to no colour, never throws
- [ ] `setColumnColor` message validated (existing column, `^#[0-9a-fA-F]{6}$`); host writes the file, commits it by pathspec when tracked and `autoCommit` is on
- [ ] Picker on the board column header: preset swatches, hex input, reset
- [ ] Colour shown on board column header and card edge, list status chip, timeline bars, overview bars; text stays readable in light and dark themes
- [ ] Colour applied with `style.setProperty`, never concatenated into HTML or CSS text
- [ ] Tests: parse good/bad/missing config, write keeps other keys, validation rejects
- [ ] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge
