# Ext-sprint-planning

- **ID:** T-0095
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T2 · new view and new webview messages (protocol, both hosts) (auto picker, see `PIPELINE.md`)
- **Claimed by:** none
- **Worktree:** `GITASK/GITASK-sprint-planning/` · **Branch:** `feat/sprint-planning`
- **Started / updated:** 2026-11-12 / 2026-11-12
- **Docs:** `Tasks/_plans/Ext-scrum-sprints.md`
- **Depends on:** Core-sprint-ops, Ext-sprint-scope
- **Touches:** `packages/core/src/protocol.ts` (new messages), `packages/vscode/src/extension.ts` and `view-ids.ts`, `packages/core/src/config.ts` (`BOARD_VIEWS` + `sprint`), `packages/cli/src/handler.ts`, new `packages/ui/src/views/sprint.tsx`, `views/registry.tsx`, `components/new-task-dialog.tsx` (Sprint picker), new `components/sprint-dialog.tsx`, tests, `Docs/architecture/ui.md`, `Docs/requirements/sprints.md`

## Goal
A Sprint tab to plan and start a sprint: backlog beside the sprint, add or remove tasks, estimates, capacity, new/edit/start sprint.

G6 applies: new messages carry user input.

## Gates (T2)
- [x] G1 scope  - [x] G2 static  - [x] G3 tests (new)  - [x] G4 run it
- [x] G5 code review  - [x] G6 security  - [x] G7 docs sync
- [ ] G8 PR message  - [ ] G9 human review (optional)  - [ ] G11 changelog

## Done when
- [x] View id `sprint` added to the UI registry, `VIEW_IDS` and `BOARD_VIEWS` together (existing tests keep them equal); tab hidden when sprints are off
- [x] Backlog pane (search plus the existing filters) and sprint pane; add or remove by button and by drag, keyboard reachable
- [x] Inline estimate edit; capacity bar (sum of estimates vs `Capacity`, over-capacity warning)
- [x] New sprint / Edit sprint dialog (name, goal, dates, capacity) and Start sprint (planned only, refused while another is active)
- [x] New task dialog gets an optional Sprint picker (defaults to the sprint in scope)
- [x] Messages `createSprint`, `updateSprint`, `startSprint`, `setTaskSprint`, `setEstimate` validated in `protocol.ts` (ids against the board, number and date rules, text limits) in VS Code and `gitask serve`
- [x] Empty states: no sprint yet, empty backlog, empty sprint
- [ ] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge

## Notes (2026-11-12, Ext-sprint-planning agent)

Commit `d61eb14` on `feat/sprint-planning` (based on `c3024e7`; `integration/sprints` has since gained CLI-sprint, no file overlap).

**Touches widened (reasons):** `packages/vscode/src/sprint-messages.ts` (new; one handler for both hosts, like `owner.ts`), `packages/ui/src/lib/sprint-plan.ts` (new; pure logic so it is testable), `packages/ui/src/shell/App.tsx` (hide the tab while sprints are off), `packages/ui/src/views/board.tsx` (New task dialog defaults to the sprint in scope), `packages/vscode/package.json` + `packages/vscode/README.md` (`VIEW_COMMANDS` derives from `VIEW_IDS`, so `GITASK: Show Sprint` / `Ctrl+Alt+G S` is required by the view-commands test), `Docs/architecture/config.md` (`defaultView` now allows `sprint`).

**Gates run**
- G1: `git diff --stat c3024e7` = the files above plus the Touches list; nothing else.
- G2: `pnpm typecheck` clean; `pnpm build` ok.
- G3: `pnpm test` 571/571. New: `packages/vscode/test/sprint-protocol.test.ts` (each message, accepts and rejects, sprints off, view id), `packages/vscode/test/sprint-plan.test.ts` (pick sprint, capacity, estimate input, dialog draft, start rule), `packages/cli/test/sprint-handler.test.ts` (serve on real temp git repos: create/plan/estimate/edit/start with pathspec commits, start refused while another active, new task into a sprint, rejects unknown/closed sprint, outside path, symlink, ghost path, bad numbers/dates/text, sprints off, with no write and no commit). Existing view-id equality tests pass with `sprint`.
- G4: built `gitask serve` (dist) on a temp repo with sprints on, headless Chromium (Playwright). Seen: empty state; New sprint dialog created S1 (commit `sprint(S1): create`), strip and switcher switched to S1; Add by button, by drag (backlog to sprint and back), and by keyboard (Tab from search to Add, Enter); estimates by Enter and blur; capacity `10.5 / 8 pts · 2.5 over` in red with warning; bad estimate marked invalid, Escape restored; Edit sprint capacity 12; Start sprint: strip `Nov 12 – Nov 25 · 13 days left`, switcher `Active: S1 · Sprint 1`; S2 created, Start disabled with "S1 is active. Complete it before starting S2."; dialog shows "End must not be before Start"; "+ New task in S2" defaulted the picker to S2 and the file got `Sprint: S2`; Board's New task defaulted to the sprint in scope. Sprints off: tabs Overview, Board, List, Timeline only, no Sprint picker. Light, dark and 390px screenshots, no horizontal overflow. Not checked: the VS Code webview itself (extension host not run). Seen and pre-existing: a CSP console error when any Radix Select opens in `gitask serve` (the existing switcher does it too).
- G7: `Docs/requirements/sprints.md` Planning, `Docs/architecture/ui.md` Sprint planning (message table), `Docs/architecture/config.md` defaultView.
- G5 (lead session, read cold): one shared handler for both hosts (`sprint-messages.ts`), task looked up on a freshly loaded board, sprint replies never throw. No findings. Note: a `new` with a sprint the core then refuses leaves the created task in place and says so (documented).
- G6 (lead): checked the self-check below against `handler.ts` and `sprint-messages.ts`: validate with fresh sprint ids, then `guardMessagePath`, then board lookup; core re-checks. No findings. G8/G11 at merge.

**G6 self-check (for the reviewer):** every new message goes through `validateMessage` in both hosts with `ValidationContext.sprints` from the freshly loaded board; sprint ids by `SPRINT_ID_RE` and must exist (closed refused for start/membership/new); task paths by `taskPathInside`, then `guardMessagePath` (symlink, outside), then "task not found" on the current board; numbers finite, 0-10000, 2 decimals (`parseEstimate` round-trip); dates real `YYYY-MM-DD`, end >= start; name/goal through `cleanText` strict (control and bidi characters) plus checkbox syntax; unknown sprint keys refused; core re-validates everything before writing and commits by pathspec only. UI renders all sprint text as React text. `setEstimate` is allowed with sprints off (core allows it; plain header).

**Deviations:** host answer for create/update/start is a new `sprintSaved { action, ok, id?, error? }` (like `projectSaved`) so the dialog knows the new id and shows errors inline; `setTaskSprint`/`setEstimate` answer like other edits (fresh board; error toast in VS Code, `error` in serve). No Complete sprint button (next task).
