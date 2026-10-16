# Ext-verify-in-vscode

- **Repo:** <repo>
- **Owner:** SNLRLONG
- **Tier:** T1 · manual check
- **Claimed by:** none
- **Worktree:** `GITASK/<repo>-<short-name>/` · **Branch:** `feat/<short-name>`
- **Started / updated:** 2026-10-17 / 2026-10-17
- **Docs:** <links>
- **Depends on:** <request item, other task, or none>
- **Touches:** <main files/areas, to spot overlap with other worktrees>

## Goal
Run the extension (F5 on packages/vscode), open the board on a workspace with Tasks/, drag cards, confirm git mv + commit + UI resync. Fix bugs found, then move Ext-webview-board to 5-done.

## Gates (copy the rows your tier needs; write `Skipped Gn: reason` if you skip one)
- [ ] G1 scope  - [ ] G2 static  - [ ] G3 tests  - [ ] G4 run it
- [ ] G5 code review  - [ ] G6 security  - [ ] G7 docs sync
- [ ] G8 PR message  - [ ] G9 human review  - [ ] G10 release plan  - [ ] G11 changelog

## Done when
- [ ] Drag moves file and commits (check git log)
- [ ] New task, open file and live refresh work
- [ ] Autocommit off and non-git folder behave
- [ ] Ext-webview-board moved to 5-done
