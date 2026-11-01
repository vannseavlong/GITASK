# CLI-serve

- **ID:** T-0040
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T3 · opens a local network port that can write to the repo, new endpoints (auto picker, see `PIPELINE.md`)
- **Claimed by:** none
- **Worktree:** `GITASK/GITASK-serve/` · **Branch:** `feat/serve`
- **Started / updated:** 2026-10-30 / 2026-11-02
- **Due:** 2026-11-04
- **Docs:** `Tasks/_plans/Ext-people-export-ui.md`
- **Depends on:** Ext-ui-foundation
- **Touches:** packages/cli/src/serve.ts (new), main.ts (one case), packages/core/src/protocol.ts (moved from vscode), packages/ui/src/host/http-host.ts, packages/cli/package.json

## Goal
`gitask serve [--port 4173] [--dir Tasks]` serves the same React UI in any browser, with the board live over Server-Sent Events.

## Gates (T3)
- [x] G1 scope  - [x] G2 static  - [x] G3 tests (new + edge cases)  - [~] G4 run it (Chrome fixture only; real VS Code not run)
- [x] G5 code review (strict)  - [x] G6 security  - [x] G7 docs sync
- [x] G8 PR message  - [ ] G9 human review  - [ ] G10 release plan  - [x] G11 changelog

## Done when
- [ ] Binds `127.0.0.1` only; `--host` must be passed explicitly to widen; refuses to start on a busy port with a clear message, `--port 0` picks a free one
- [ ] Prints `http://127.0.0.1:<port>/?token=<random>`; every write needs the token and a matching `Origin`/`Host` (blocks DNS rebinding and other web pages)
- [ ] Message validation moved from `packages/vscode/src/protocol.ts` to core and shared by both hosts; the VS Code file re-exports it; same tests
- [ ] File watcher pushes board updates over SSE; moves, deletes, assign, sub-tasks, colours work as in VS Code
- [ ] UI assets are embedded in the CLI bundle; `npx gitask serve` works with no extra install
- [ ] Tests: bad token, bad origin, path outside Tasks, two clients, port in use
- [x] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge

## Delivery notes (2026-10-30)
- Built on its own branch, merged into `release/0.5.0` with the rest of 0.5.0 (no tag, nothing published).
- Gates run on the merged release: G2 typecheck clean, G3 273 tests pass (new tests for this task included), build clean, `pnpm package` ok (see `Ops-release-0-5`).
- G5: independent code review of the whole release; its findings were fixed on `fix/review-fixes` (test first). G6: independent security review; findings fixed on `fix/security-fixes`. The UI components `board`, `list`, `timeline`, `overview`, `export-dialog`, `subtasks`, `assignee-picker`, `people-filter` were not reached by the reviewers.
- G7: docs in `Docs/architecture/` and `Docs/requirements/views.md`, website pages in `packages/web/docs`.
- G4: seen in Chrome with a fixture board only. NOT yet run in a real VS Code window (F5).
- G9 human review: PENDING (T3). Task stays in `4-testing/` until the owner has reviewed it.
