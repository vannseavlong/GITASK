# Ext-sprint-complete

- **ID:** T-0096
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T2 · new dialog and messages that move many files at once (auto picker, see `PIPELINE.md`)
- **Claimed by:** none
- **Worktree:** `GITASK/GITASK-sprint-complete/` · **Branch:** `feat/sprint-complete`
- **Started / updated:** 2026-11-12 / 2026-11-12
- **Docs:** `Tasks/_plans/Ext-scrum-sprints.md`
- **Depends on:** Ext-sprint-planning
- **Touches:** `packages/core/src/protocol.ts`, `packages/core/src/confirm.ts` + `index.ts` (widened: shared `unconfirmedBulk` rule, like `unconfirmedDelete`), `packages/vscode/src/sprint-messages.ts` (widened: shared host handler), `packages/ui/src/shell/App.tsx` + `sprint-strip.tsx` (widened: strip button; the dialog lives in App so it survives the strip vanishing on close), new `packages/ui/src/lib/sprint-close.ts`, `packages/vscode/src/extension.ts`, `packages/cli/src/handler.ts`, `packages/ui/src/views/sprint.tsx`, new `packages/ui/src/components/complete-sprint-dialog.tsx`, tests, `Docs/architecture/ui.md`, `Docs/requirements/sprints.md`, new `packages/web/docs/sprints.md` (user guide), web sidebar

## Goal
Close a sprint from the board: see what is done, choose per unfinished task Backlog or Next sprint, confirm, and start planning the next sprint.

G6 applies: a single confirmed message moves many files.

## Gates (T2)
- [x] G1 scope  - [x] G2 static  - [x] G3 tests (new)  - [x] G4 run it
- [x] G5 code review  - [x] G6 security  - [x] G7 docs sync
- [ ] G8 PR message  - [ ] G9 human review (optional)  - [ ] G11 changelog

## Done when
- [x] "Complete sprint" on the Sprint tab and the strip (active sprint only) opens the dialog; the host sends `sprintClosePlan` → `sprintClosePlanResult {plan, planHash}`
- [x] Dialog: summary tiles, unfinished tasks with an action select and "Apply to all", "Reset status to todo", warnings for claimed tasks and for creating the next sprint
- [x] `completeSprint {id, actions, resetStatus, planHash, confirmed: true}` refused without `confirmed`, with a stale hash or with unknown paths; success returns the summary, failure says nothing changed
- [x] Success screen offers "Plan next sprint" (Sprint tab scoped to the new or next sprint)
- [x] User guide `packages/web/docs/sprints.md`: turn on, plan, run, complete (backlog vs next)
- [ ] Checked in a real VS Code window and in `gitask serve` (serve: done; VS Code webview: not run): close with tasks going both ways, then plan the next sprint
- [ ] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge

## Gate results (2026-11-12, commit d745700 on feat/sprint-complete)
- G1: `git diff --stat integration/sprints` = 18 files: Touches plus the widened paths above. Nothing else.
- G2: `pnpm typecheck` clean; `pnpm build` ok (ui, cli, extension); `pnpm --filter gitask-web build` ok (only the site-wide `/#download` broken-anchor warning that every page already has).
- G3: `pnpm test` 595/595. New: `packages/vscode/test/sprint-close-protocol.test.ts` (accept/reject for both messages: closed/planned/unknown sprint, escaping and unknown paths, duplicates, cap, bad hash, bad resetStatus, faked or missing `confirmed`, list test for `CONFIRM_MESSAGE_TYPES`), `packages/vscode/test/sprint-close.test.ts` (dialog logic), `packages/cli/test/sprint-complete-handler.test.ts` (real temp repo: tasks both ways + reset, one commit, files where expected, summary, unrelated dirty file untouched; stale hash and stale options change nothing; missing `confirmed`; unknown path, symlink, non-unfinished path blocker, closed sprint; name-clash blocker; sprints off).
- G4: built `gitask serve` on a temp repo, headless Chromium (Playwright): planned S1 in the Sprint tab (New sprint, Add x3, Start), finished one task (`move` message to 5-done), Complete sprint: one task to backlog, one to next, reset ticked; success screen; Plan next sprint showed S2 (planned) holding Search box (todo), backlog holding Cache layer. Git: one commit `sprint(S1): complete, 1 done, 1 to backlog, 1 to S2`. Blocked case (name clash in backlog): blocker shown, Confirm disabled with the reason; Apply to all → Next sprint cleared it; a stale confirm (estimate changed behind the dialog) showed the re-plan notice and changed nothing. Screenshots light/dark/narrow. VS Code webview not run. Console: one CSP `style-src` error when any Radix Select opens in serve; also happens with the existing "Sprint to plan" select, so it predates this task.
- G7: `Docs/requirements/sprints.md` (Complete sprint), `Docs/architecture/ui.md` (Complete sprint section, messages), user guide `packages/web/docs/sprints.md` + sidebar.
- G5 (lead session, read cold): shared `handleCompleteSprint` for both hosts; refuses without `confirmed`, re-checks every action path on a fresh board and with `assertRegularFile`, then core re-plans with the hash and rolls back on failure; errors always say nothing changed. No findings.
- G6 (lead): confirm rule in core `confirm.ts` like deletes; protocol caps `actions` at 2000, normalises and de-duplicates paths through `taskPathInside`, 64-hex hash, active sprint only; the plan sent to the webview carries no target paths or file contents. No findings.
