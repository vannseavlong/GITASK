# Ext-readme-screens

- **ID:** T-0062
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T0 · docs and image links only, no logic (auto picker, see `PIPELINE.md`)
- **Claimed by:** claude session, 2026-11-02
- **Worktree:** `GITASK/GITASK-readme-screens/` · **Branch:** `docs/readme-screens`
- **Started / updated:** 2026-11-02 / 2026-11-02
- **Due:** 2026-11-04
- **Docs:** `Tasks/5-done/Ext-readme-guide.md`
- **Depends on:** none (replaces the demo video/GIF item of `Ext-readme-guide`; owner chose screenshots only)
- **Touches:** `README.md`, `packages/vscode/README.md`, `packages/web/docs/intro.md`, `packages/web/docs/getting-started.md`

## Goal
Drop the demo video/GIF plan. Use the real screenshots already on main everywhere a `TODO(demo)` or `TODO(screenshot)` was left.

## Gates (copy the rows your tier needs; write `Skipped Gn: reason` if you skip one)
- [x] G1 scope  - [x] G2 static (build passes)  - [x] G3 tests (Skipped G3: docs only)  - [x] G4 run it (build only, not viewed in a browser)
- [x] G5 (Skipped G5: T0)  - [x] G6 (Skipped G6: no code)  - [x] G7 docs sync
- [ ] G8 PR message  - [ ] G9 human review  - [ ] G10 release plan  - [ ] G11 changelog

## Done when
- [x] No `TODO(demo)` or `TODO(screenshot)` left in the root README, extension README or web docs
- [x] Root README shows the board (dark/light for GitHub); docs intro uses `ThemedImage`; `pnpm --filter gitask-web build` passes
- [ ] Worktree and branch removed after merge
