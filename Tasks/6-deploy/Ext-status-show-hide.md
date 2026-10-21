# Ext-status-show-hide

- **ID:** T-0012
- **Repo:** gitask (`packages/vscode`)
- **Owner:** SNLRLONG
- **Tier:** T2 · edits shared webview shell and all four views, new feature (auto picker, see `PIPELINE.md`)
- **Claimed by:** none
- **Worktree:** `GITASK/GITASK-status-show-hide/` · **Branch:** `feat/status-show-hide`
- **Started / updated:** 2026-10-17 / 2026-10-20
- **Docs:** `Tasks/_plans/Ext-board-manage.md`, `Docs/requirements/views.md`
- **Depends on:** none (pairs with Ext-status-color, which shares the status chip UI; whoever lands second reuses it)
- **Touches:** new `packages/vscode/src/status-visibility.ts` (+test), `packages/vscode/src/html.ts` (shared status toggle bar), `packages/vscode/src/views/{board,list,timeline,overview}.ts` and their `*-logic.ts`. Shares `html.ts` with Ext-date-filter, and `board.ts`/`list.ts` with all other board-manage tasks: additive edits only.

## Goal
Show or hide any status (column) in Board, List, Timeline and Overview from one toggle that applies to all four views.

## Gates
- [x] G1 scope  - [x] G2 static  - [x] G3 tests (new)  - [x] G4 run it (checked by owner before v0.4.0)  
- [x] G5 code review (fresh reviewer agent)  - [x] G7 docs sync
- [x] G8 PR message  - [x] G9 human review (owner)  - [x] G11 changelog
- Skipped G6: no new input path; hidden ids are checked against existing column ids.

## Done when
- [x] Toggle bar lists every status as a chip (with task count); click shows/hides it; "show all" resets
- [x] Hidden statuses disappear from the Board columns, List rows, Timeline bars and Overview counts/charts; totals say they are filtered
- [x] One shared hidden set for all four views (not per view), kept in webview state so it is per user and never committed; unknown or deleted statuses are ignored
- [x] Pure `status-visibility.ts` (no `vscode` import) with tests: empty set, unknown id, all hidden shows an "all statuses hidden" empty state
- [x] Combines with the text filter and date range; hiding the status of a dragged-to column cannot lose a card
- [x] Verified in the running extension (G4)
- [x] Root `CHANGELOG.md` entry added
- [x] Worktree and branch removed after merge

## Notes (agent-status-show-hide, 2026-10-20)
- Design: the shell (`html.ts`) keeps `stored.hiddenStatuses` and hands every view a board with hidden columns removed (`SV.apply`), so no view file changed. Detail panel still gets the raw board. Hiding a drop-target column cannot lose a card: cards are not moved, only not shown.
- Gates run: `pnpm test` 109 pass, `pnpm typecheck` clean, `pnpm build` ok. G4 (running extension), G5, G9 pending.
- Draft CHANGELOG entry (not added):
  `## 2026-10-20 · [Ext] feat(views): show or hide statuses` / Owner: SNLRLONG / Task: Tasks/5-done/Ext-status-show-hide.md / Branch: feat/status-show-hide / What changed: status chip bar with counts hides or shows a status in Board, List, Timeline and Overview at once; Show all resets; kept per user in webview state / Needs: none
