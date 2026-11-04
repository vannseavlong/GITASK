# Core-project-config

- **ID:** T-0071
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T2 · new config block, reads a file path from user input, feeds a shared type (security gate) (auto picker, see `PIPELINE.md`)
- **Claimed by:** none
- **Worktree:** `GITASK/GITASK-project-config/` · **Branch:** `feat/project-config`
- **Started / updated:** none / 2026-11-05
- **Docs:** `Tasks/_plans/Ext-ux-and-branding.md`
- **Depends on:** none
- **Touches:** `packages/core/src/config.ts` (new `project` block), `packages/core/src/types.ts` and `index.ts`, `packages/ui/src/host/types.ts` (read-only `BoardData.project`), `Docs/architecture/` (config page), `packages/core/test/`

## Goal
Define the project identity in `Tasks/gitask.json`: `{ "project": { "title", "subtitle", "logo": "logo.png", "layout": { "align": "left|center|right", "size": "sm|md|lg", "logoPosition": "left|top|right|hidden", "showTitle": true } } }`. Core parses it with the same rules as the colours block (bad input gives defaults, never throws), resolves the logo only to a regular file inside `Tasks/` with an image extension (png, jpg, webp, gif, svg) and a size cap, and puts the result on the board data. Adds `setProject` (write, keeps other keys, commits `gitask.json` by pathspec only if tracked), mirroring `setColumnColor`.

## Gates (copy the rows your tier needs; write `Skipped Gn: reason` if you skip one)
- [ ] G1 scope  - [ ] G2 static  - [ ] G3 tests (new logic has tests)  - [ ] G4 run it
- [ ] G5 code review  - [ ] G6 security  - [ ] G7 docs sync
- [ ] G8 PR message  - [ ] G9 human review (optional)  - [ ] G11 changelog

## Done when
- [ ] `parseProject` returns safe defaults for missing, malformed or hostile values (path traversal, symlinks, huge files, wrong type); tested
- [ ] `setProject` keeps unrelated keys, validates enums, commits only `Tasks/gitask.json`; tested on a real temp git repo
- [ ] `loadBoard` exposes `project` with the logo as a validated relative path plus mime type; no file bytes in the board payload
- [ ] The config shape is documented once in `Docs/architecture/` and linked
- [ ] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge
