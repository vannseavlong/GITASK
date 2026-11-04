# Core-logo-hardening

- **ID:** T-0079
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T2 · file writes, git deletes and an HTTP size cap (security gate) (auto picker, see `PIPELINE.md`)
- **Claimed by:** claude (agent-a22f4d2c)
- **Worktree:** `GITASK/GITASK-logo-hardening/` · **Branch:** `fix/logo-hardening`
- **Started / updated:** 2026-11-05 / 2026-11-05
- **Docs:** `Tasks/5-done/Ext-project-layout-settings.md`, `Tasks/5-done/Ext-delete-dialog.md` (review findings)
- **Depends on:** none
- **Touches:** `packages/core/src/project-save.ts`, `packages/core/src/config.ts` (`readLogoBytes`), `packages/core/src/git.ts`, `packages/cli/src/serve.ts`, tests, `Docs/architecture/config.md`, `Docs/architecture/serve.md` · extras: `packages/core/src/svg-check.ts` (new, SVG allow-list), `packages/core/src/project-rules.ts` (hash length), `packages/core/src/index.ts`

## Goal
Close the remaining logo gaps from the reviews: a replaced or removed logo leaves an orphan file in the repo; a parent folder swapped for a symlink between the check and the open is not caught; the larger upload body cap applies to every message type, not only setProject; the SVG check is only a deny-list.

## Gates
- [x] G1 scope  - [x] G2 static (`pnpm typecheck`, `pnpm build`)  - [x] G3 tests (428 pass, new: `logo-hardening.test.ts`, serve cap test)  - [x] G4 run it (real temp git repos and a real `startServer` in tests; not a real VS Code webview)
- [ ] G5 code review (only a same-agent cold self-review so far; a separate review agent is still owed)  - [ ] G6 security (same: self-review only; `/security-review` not run)  - [x] G7 docs sync (`config.md`, `serve.md`)
- [x] G8 PR message (commit lines only; no PR opened)  - [x] G11 changelog

## Done when
- [x] When the project logo changes or is removed, the previous generated file (`logo-<hash>.<ext>`, only that exact pattern, only inside Tasks/) is deleted in the same pathspec commit; hand-named files are never touched; tests
- [x] `readLogoBytes` verifies the opened file really lives under the real Tasks directory (realpath of the path after open), closing the parent-symlink window; test with a swapped parent
- [x] `serve` accepts a body above 64 KiB only for a `setProject` message, rejected early by Content-Length where present; test that another type with the upload header is refused
- [x] SVG upload is parsed with an element and attribute allow-list instead of regexes if that can be done without a new dependency; otherwise keep the deny-list and say why in the doc
- [x] 12 hex of the hash is raised to 16
- [x] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge

## Notes
- SVG: allow-list done without a dependency (`svg-check.ts`). Behaviour change: `<image>`, `<a>` and namespaced editor metadata (Inkscape, Sodipodi) are now refused; export "plain SVG".
- Orphan delete also requires the file's sha256 to match the hex in its name, and only runs when the commit runs. Legacy 12-hex names are still recognised.
- `serve`: the message type is only known after parsing, so a non-`setProject` body between 64 KiB and ~1.4 MiB is buffered, then refused with `413` (token required). Content-Length above the cap is refused before reading.
- Not tested: a real race for the parent-symlink swap (the check is unit-tested through `openedUnder` with a swapped parent), Windows, real VS Code.
