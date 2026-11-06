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
- **Touches:** `packages/ui/src/shell/filter-bar.tsx`, new `field-filter.tsx`, `components/subtasks.tsx`, `views/*.tsx`, `host/types.ts`, `mock-host.ts`, `packages/core/src/protocol.ts` (set field messages), `packages/web/docs/` (new `fields.md` guide + sidebar, written with the docs-writer skill once users can use the feature)

## Goal
Show the configured fields in the board: badges on cards, list rows and sub-task rows; a filter chip group per field in the filter bar (remembered in `UiState`, "N of M match" counts it); pickers in the detail and sub-task editor. Hidden entirely when no field is configured.

## Gates (copy the rows your tier needs; write `Skipped Gn: reason` if you skip one)
- [ ] G1 scope  - [ ] G2 static  - [ ] G3 tests (new logic has tests)  - [ ] G4 run it
- [ ] G5 code review (fresh agent)  - [ ] G6 security (config is untrusted input)  - [ ] G7 docs sync
- [ ] G8 PR message  - [ ] G9 human review (optional)  - [ ] G11 changelog

## Done when
- [ ] Example from the plan (Platform: Admin Portal, App, Landing Page) filters Board, List, Timeline and Overview
- [ ] Sub-task rows hide when they do not match an active filter
- [ ] `validateMessage` rejects ids not in config in both hosts
- [ ] Seen in the mock build (headless) and in VS Code or noted as not tried
- [ ] `Docs/architecture/config.md` updated (G7)
- [ ] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge
