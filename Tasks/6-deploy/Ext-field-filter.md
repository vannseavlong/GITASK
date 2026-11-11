# Ext-field-filter

- **ID:** T-0086
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T2 · new UI controls and webview state (auto picker, see `PIPELINE.md`)
- **Claimed by:** Claude (session 334c0cd4), 2026-11-07
- **Worktree:** `GITASK/GITASK-Ext-field-filter/` · **Branch:** `feat/Ext-field-filter`
- **Started / updated:** 2026-11-07 / 2026-11-07
- **Docs:** `Tasks/_plans/Core-configurable-fields.md`, `Docs/architecture/config.md`
- **Depends on:** Core-field-values
- **Touches:** `packages/ui/src/shell/filter-bar.tsx`, new `field-filter.tsx`, `components/subtasks.tsx`, `views/*.tsx`, `host/types.ts`, `mock-host.ts`, `packages/core/src/protocol.ts` (set field messages), `packages/web/docs/` (new `custom-fields.md` guide + sidebar, written with the docs-writer skill once users can use the feature)

## Goal
Show the configured fields in the board: badges on cards, list rows and sub-task rows; a filter chip group per field in the filter bar (remembered in `UiState`, "N of M match" counts it); pickers in the detail and sub-task editor. Hidden entirely when no field is configured.

## Gates (copy the rows your tier needs; write `Skipped Gn: reason` if you skip one)
- [x] G1 scope  - [x] G2 static  - [x] G3 tests (new logic has tests)  - [x] G4 run it (mock build in headless Chromium: board and list with filter; no save round trip in a browser, no real VS Code webview)
- [x] G5 code review (fresh agent: 1 medium, 2 low fixed)  - [x] G6 security (same agent: no findings)  - [x] G7 docs sync (`Docs/architecture/ui.md`, web guide `custom-fields.md`)
- [x] G8 PR message  - [x] G9 human review (optional)  - [x] G11 changelog

## Done when
- [x] Example from the plan (Platform: Admin Portal, App, Landing Page) filters Board, List, Timeline and Overview
- [x] Sub-task rows hide when they do not match an active filter
- [x] `validateMessage` rejects ids not in config in both hosts
- [x] Seen in the mock build (headless); not tried in a real VS Code webview
- [x] `Docs/architecture/config.md` updated (G7)
- [x] Root `CHANGELOG.md` entry added
- [x] Worktree and branch removed after merge

## Result
Merged in #23 and released in v0.6.1. Worktree and branch removed 2026-11-12.
