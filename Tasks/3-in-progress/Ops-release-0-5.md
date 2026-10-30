# Ops-release-0-5

- **ID:** T-0045
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T3 · release and version files, docs, marketplace listing (auto picker, see `PIPELINE.md`)
- **Claimed by:** claude session (agent), 2026-10-30
- **Worktree:** `GITASK/GITASK-release-0-5/` · **Branch:** `feat/release-0-5`
- **Started / updated:** 2026-10-30 / 2026-10-30
- **Docs:** `Tasks/_plans/Ext-people-export-ui.md`
- **Depends on:** all tasks above merged
- **Touches:** package versions via `pnpm bump`, CHANGELOG.md, Docs/architecture/ui.md, Docs/requirements/views.md, READMEs, packages/web/docs, Marketplace screenshots

## Goal
Ship all five features as one release (0.5.0). Nothing publishes until this task: only a tag does.

## Gates (T3)
- [ ] G1 scope  - [ ] G2 static  - [ ] G3 tests (new + edge cases)  - [ ] G4 run it
- [ ] G5 code review (strict)  - [ ] G6 security  - [ ] G7 docs sync
- [ ] G8 PR message  - [ ] G9 human review  - [ ] G10 release plan  - [ ] G11 changelog

## Done when
- [ ] Every task above, including Ext-github-sync, is merged
- [ ] `pnpm bump 0.5.0` in the PR; typecheck, test and `pnpm package` green from a clean install
- [ ] Docs: UI architecture, people and sub-task format, report fields, `gitask serve` security notes; website docs and README screenshots updated (`docs-writer`, `launch-checklist`)
- [ ] Release plan G10 written in this file: rollback (unpublish or 0.5.1), what to watch (Marketplace install, `npx gitask serve`)
- [ ] Human reviews the PR, tags and approves; the agent does not tag
- [ ] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge
