# Ext-default-view

- **ID:** T-0090
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T1 · one optional config key read on open; re-tier to T2 if it grows into protocol or shared UI changes (auto picker, see `PIPELINE.md`)
- **Claimed by:** none
- **Worktree:** `GITASK/GITASK-default-view/` · **Branch:** `feat/default-view`
- **Started / updated:** 2026-11-12 / 2026-11-12
- **Docs:** promoted from `Tasks/1-backlog/Ext-config-more-options.md`; config format in `Docs/`
- **Depends on:** none
- **Touches:** `packages/core/src/config.ts` (read/validate `defaultView`), core tests, `packages/vscode/src/extension.ts` (initial view), `packages/cli/src/serve.ts` if `gitask serve` picks a view, config docs. Overlap: `Ext-view-commands` also edits `extension.ts`; keep edits small and local.

## Goal
A team-wide `"defaultView"` in `Tasks/gitask.json` (`overview` | `board` | `list` | `timeline`) used when the board opens and the user has no remembered view. Unknown values fall back to `overview`.

## Gates (T1)
- [x] G1 scope  - [x] G2 static  - [x] G3 tests (existing + new for config parsing)  - [x] G4 run it (quick)
- [x] G7 docs sync (config format doc)  - [ ] G8 PR message  - [ ] G11 changelog (on merge)

## Done when
- [x] `defaultView` is read and validated in core; invalid or missing value means `overview`
- [x] VS Code panel and `gitask serve` open on it when no view is remembered
- [x] Config doc lists the key
- [ ] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge

## Notes (2026-11-12, commit 819ba7c on feat/default-view)
- Tier re-checked on the real diff: stays T1 (8 files, 65+/8-, no protocol or shared UI change; `serve` only fills the existing `data-initial-view`).
- Core: `parseDefaultView` / `readDefaultView` / `BOARD_VIEWS` in `config.ts`, exported from `index.ts` (index export is outside the listed Touches but needed). Test keeps `BOARD_VIEWS` equal to the extension's `VIEW_IDS`.
- VS Code: a valid remembered `gitask.lastView` wins; otherwise the panel HTML is set after `readDefaultView`. Serve: read on every page load; the browser's remembered tab (localStorage) still wins.
- Docs: `Docs/architecture/config.md` (`defaultView` section), `Docs/architecture/ui.md` (one phrase), `packages/web/docs/views.md` (one line).
- G2: `pnpm typecheck` clean, `pnpm build` ok. G3: `pnpm test` 498/498 pass (6 new core, 1 new serve). G4: built `gitask serve` on a temp repo: `defaultView: board` gives `data-initial-view="board"`, a bogus value gives `overview`.
- Not run: the VS Code panel live (no VS Code GUI here); covered by typecheck/build only. G8/G11 on PR/merge.
