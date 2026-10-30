# CLI-serve

- **ID:** T-0040
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T3 · opens a local network port that can write to the repo, new endpoints (auto picker, see `PIPELINE.md`)
- **Claimed by:** claude session (agent), 2026-10-30
- **Worktree:** `GITASK/GITASK-serve/` · **Branch:** `feat/serve`
- **Started / updated:** 2026-10-30 / 2026-10-30
- **Docs:** `Tasks/_plans/Ext-people-export-ui.md`
- **Depends on:** Ext-ui-foundation
- **Touches:** packages/cli/src/serve.ts (new), main.ts (one case), packages/core/src/protocol.ts (moved from vscode), packages/ui/src/host/http-host.ts, packages/cli/package.json

## Goal
`gitask serve [--port 4173] [--dir Tasks]` serves the same React UI in any browser, with the board live over Server-Sent Events.

## Gates (T3)
- [ ] G1 scope  - [ ] G2 static  - [ ] G3 tests (new + edge cases)  - [ ] G4 run it
- [ ] G5 code review (strict)  - [ ] G6 security  - [ ] G7 docs sync
- [ ] G8 PR message  - [ ] G9 human review  - [ ] G10 release plan  - [ ] G11 changelog

## Done when
- [ ] Binds `127.0.0.1` only; `--host` must be passed explicitly to widen; refuses to start on a busy port with a clear message, `--port 0` picks a free one
- [ ] Prints `http://127.0.0.1:<port>/?token=<random>`; every write needs the token and a matching `Origin`/`Host` (blocks DNS rebinding and other web pages)
- [ ] Message validation moved from `packages/vscode/src/protocol.ts` to core and shared by both hosts; the VS Code file re-exports it; same tests
- [ ] File watcher pushes board updates over SSE; moves, deletes, assign, sub-tasks, colours work as in VS Code
- [ ] UI assets are embedded in the CLI bundle; `npx gitask serve` works with no extra install
- [ ] Tests: bad token, bad origin, path outside Tasks, two clients, port in use
- [ ] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge
