# Ext-sprint-scope

- **ID:** T-0093
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T2 · new UI feature, edits the shared shell and filter logic (auto picker, see `PIPELINE.md`)
- **Claimed by:** none
- **Worktree:** `GITASK/GITASK-sprint-scope/` · **Branch:** `feat/sprint-scope`
- **Started / updated:** 2026-11-12 / 2026-11-12
- **Docs:** `Tasks/_plans/Ext-scrum-sprints.md`
- **Depends on:** Core-sprint-model
- **Touches:** `packages/ui/src/shell/` (`App.tsx`, `logic.ts`, `filter-bar.tsx`, new `sprint-switcher.tsx`, new `sprint-strip.tsx`), `packages/ui/src/host/` types (`UiState.sprintScope`), `packages/vscode/src/filter-logic.ts` if `derive` lives there, tests, `Docs/architecture/ui.md`, `Docs/requirements/sprints.md` (new). Not `protocol.ts`: no new messages

## Goal
A sprint switcher (Active sprint · a chosen sprint · Backlog · All) that scopes all four views, plus a strip showing the sprint goal, dates, days left and progress.

## Gates (T2)
- [x] G1 scope  - [x] G2 static  - [x] G3 tests (new)  - [x] G4 run it
- [x] G5 code review  - [x] G6 security  - [x] G7 docs sync
- [ ] G8 PR message  - [ ] G9 human review (optional)  - [ ] G11 changelog

## Done when
- [x] Hidden when `Board.sprints` is absent; nothing changes for teams without sprints
- [x] Scope stored in `UiState` (never committed); default is the active sprint when one exists, else All; an unknown or deleted sprint falls back to All
- [x] Scope combines with the text, date, people, field and status filters in the same `derive` step (AND); the `N of M match` line counts it
- [x] Strip: name, goal, `start – end · N days left` (or `ended N days ago` in warning colour), `done/total tasks` and points when `estimate` is not `none`
- [x] Backlog scope = tasks with no `Sprint` that are not in a done status
- [x] Card, list row and detail show a small sprint badge and the estimate
- [x] Tests for the scope logic; `Docs/requirements/sprints.md` started (switcher and strip)
- [ ] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge

## Notes (2026-11-12, commit 4c7ed50 on `feat/sprint-scope`, from `integration/sprints`)

**Scope widened** (all needed for the Done-when, recorded here): `packages/vscode/src/sprint-scope.ts` + `packages/vscode/test/sprint-scope.test.ts` (new pure scope logic, the people-filter pattern; `filter-logic.ts` untouched), `packages/ui/src/components/sprint-badges.tsx` (new, shared badge), `packages/ui/src/views/board.tsx`, `views/list.tsx`, `detail/detail-panel.tsx` (badges), `Docs/README.md` (index line for the new requirements doc). Not touched: `packages/core`, `protocol.ts`, `Docs/architecture/sprints.md`.

**Gates**
- G1: `git diff --stat integration/sprints` = 9 modified + 6 new files, all listed in Touches or above.
- G2: `pnpm typecheck` clean, `pnpm build` ok.
- G3: `pnpm test` 528/528 pass; new `sprint-scope.test.ts` (11 tests: off, default/active, unknown id, sprint/backlog/all filters, custom doneColumns, AND with other filters, stats, units, dates/overdue, labels).
- G4: built CLI `gitask serve` on a temp repo (sprint block, `S1` closed, `S2` active, 7 tasks across backlog/todo/in-progress/done, one with no sprint in done), headless Chromium (Playwright) screenshots, light + dark, 1280px and 420px. Seen: default = `Active: S2 · Sprint 2`, strip `S2 · Sprint 2 · Ship sprint scope · Nov 2 – Nov 15 · 3 days left · 1/3 tasks · 8/16 pts`, board shows only T-0003/4/5, `3 of 7 match`; Backlog shows only the 2 backlog tasks (done task without sprint hidden), `2 of 7 match`; All shows 7, no strip; closed S1 shows only its done task and `closed`. End date moved to the past: dates/time in red `ended 2 days ago`; second active sprint: warning icon with "More than one sprint is active; using S2, ignoring S3". List rows and detail panel show `S2` and `3 pts`; Overview counts 3 tasks. `estimate: "none"`: points hidden on strip and cards. No sprint block: no switcher, strip or badges. Keyboard: focus select, Enter, ArrowDown, Enter picked Backlog. Narrow 420px: strip and filter bar wrap, no overflow besides the board's own horizontal scroll. Not checked: inside the VS Code webview (same bundle and payload spread, `extension.ts` sends `{ ...board }`), high-contrast theme.
- G7: `Docs/requirements/sprints.md` started (switcher, strip, badges; Planning and Complete headings left for T-0095/T-0096), `Docs/architecture/ui.md` "Sprint scope" section and Shell row, `Docs/README.md` index.
- G5 (lead session, read cold): scope resolved against `Board.sprints` (unknown id → All, off when sprints absent), applied once in `derive` after hidden statuses, stats over the unfiltered board; pure logic tested. No findings.
- G6: no new messages or host input; saved `sprintScope` is only compared against sprint ids; sprint names, goals and ids render as React text (no raw HTML). No findings. G8/G11 at merge.

**Decisions:** the strip sits between the tabs and the filter bar; its counts use the raw board (filters do not change them). A saved id equal to the active sprint shows as "Active". Badges only render when `Board.sprints` exists. Status chips still count the unscoped board (existing behaviour, unchanged).
