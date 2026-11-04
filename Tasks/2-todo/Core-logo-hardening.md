# Core-logo-hardening

- **ID:** T-0079
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T2 · file writes, git deletes and an HTTP size cap (security gate) (auto picker, see `PIPELINE.md`)
- **Claimed by:** none
- **Worktree:** `GITASK/GITASK-logo-hardening/` · **Branch:** `fix/logo-hardening`
- **Started / updated:** none / 2026-11-05
- **Docs:** `Tasks/5-done/Ext-project-layout-settings.md`, `Tasks/5-done/Ext-delete-dialog.md` (review findings)
- **Depends on:** none
- **Touches:** `packages/core/src/project-save.ts`, `packages/core/src/config.ts` (`readLogoBytes`), `packages/core/src/git.ts`, `packages/cli/src/serve.ts`, tests, `Docs/architecture/config.md`, `Docs/architecture/serve.md`

## Goal
Close the remaining logo gaps from the reviews: a replaced or removed logo leaves an orphan file in the repo; a parent folder swapped for a symlink between the check and the open is not caught; the larger upload body cap applies to every message type, not only setProject; the SVG check is only a deny-list.

## Gates
- [ ] G1 scope  - [ ] G2 static  - [ ] G3 tests (new logic has tests)  - [ ] G4 run it
- [ ] G5 code review  - [ ] G6 security  - [ ] G7 docs sync
- [ ] G8 PR message  - [ ] G11 changelog

## Done when
- [ ] When the project logo changes or is removed, the previous generated file (`logo-<hash>.<ext>`, only that exact pattern, only inside Tasks/) is deleted in the same pathspec commit; hand-named files are never touched; tests
- [ ] `readLogoBytes` verifies the opened file really lives under the real Tasks directory (realpath of the path after open), closing the parent-symlink window; test with a swapped parent
- [ ] `serve` accepts a body above 64 KiB only for a `setProject` message, rejected early by Content-Length where present; test that another type with the upload header is refused
- [ ] SVG upload is parsed with an element and attribute allow-list instead of regexes if that can be done without a new dependency; otherwise keep the deny-list and say why in the doc
- [ ] 12 hex of the hash is raised to 16
- [ ] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge
