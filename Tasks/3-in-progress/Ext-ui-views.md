# Ext-ui-views

- **ID:** T-0039
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T2 · ports four views to the new UI package, edits shared UI (auto picker, see `PIPELINE.md`)
- **Claimed by:** claude session (agent), 2026-10-30
- **Worktree:** `GITASK/GITASK-ui-views/` · **Branch:** `feat/ui-views`
- **Started / updated:** 2026-10-30 / 2026-10-30
- **Docs:** `Tasks/_plans/Ext-people-export-ui.md`
- **Depends on:** Ext-ui-foundation
- **Touches:** packages/ui/src/views/{list,timeline,overview,detail}/**, packages/vscode/src/{html,detail,markdown}.ts and views/*.ts (removed)

## Goal
Port List, Timeline, Overview and the task detail panel to React components with shadcn, reusing the tested `*-logic.ts` modules, then delete the string-built views.

## Gates (T2)
- [ ] G1 scope  - [ ] G2 static  - [ ] G3 tests (new)  - [ ] G4 run it
- [ ] G5 code review  - [ ] G6 security (only if input or auth handling changes)  - [ ] G7 docs sync
- [ ] G8 PR message  - [ ] G9 human review (optional)  - [ ] G11 changelog

## Done when
- [ ] Each view reaches parity with `Docs/requirements/views.md` (counts, bars, stale list, filters, empty states)
- [ ] Existing `*-logic.ts` tests keep passing unchanged (logic moved, not rewritten)
- [ ] Markdown in task detail rendered by `react-markdown` with links and HTML disabled; the old `markdown.ts` is removed
- [ ] Old `views/*.ts` string views and their `*_SRC` embedding deleted in this task, not left as dead code
- [ ] Keyboard: tabs, cards and dialogs reachable without a mouse
- [ ] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge
