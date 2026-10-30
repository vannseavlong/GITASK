# Ext-ui-edit-delete

- **ID:** T-0052
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T2 · new feature across core, protocol, hosts and UI (auto picker, see `PIPELINE.md`)
- **Claimed by:** claude session (agent), 2026-10-30
- **Worktree:** `GITASK/GITASK-ui-edit-delete/` · **Branch:** `feat/ui-edit-delete`
- **Started / updated:** 2026-10-30 / 2026-10-30
- **Docs:** `Tasks/_plans/Ext-polish-0-5-0.md`
- **Depends on:** none (0.5.0 is merged on main)
- **Touches:** packages/core/src/{taskedit,subtasks}.ts (new + additive), protocol.ts, packages/cli/src/handler.ts, packages/vscode/src/extension.ts, packages/ui board/list/detail/subtasks components

## Goal
Make both main tasks and sub-tasks editable and deletable from a three-dots (vertical ellipsis) action menu instead of the trash icon: Edit / Delete.

## Gates (T2)
- [ ] G1 scope  - [ ] G2 static  - [ ] G3 tests (new)  - [ ] G4 run it
- [ ] G5 code review  - [ ] G6 security (only if input or auth handling changes)  - [ ] G7 docs sync
- [ ] G8 PR message  - [ ] G9 human review (optional)  - [ ] G11 changelog

## Done when
- [ ] Kebab menu (shadcn DropdownMenu, keyboard accessible, `aria-label`) replaces the trash icon on Board cards, List rows, the detail panel and each sub-task row
- [ ] Edit task dialog: title (`# H1`), due date, tier (T0-T3), owner (reuse the picker), claimed by; core `updateTask` rewrites only those lines, keeps CRLF, never renames the file/id, commits by pathspec, refuses symlinks (assertRegularFile)
- [ ] Edit sub-task: text, assignee, lane; `deleteSubtask` removes exactly that checkbox line (checks index+line like toggle); core functions with tests
- [ ] Delete keeps today's safeguards: VS Code modal; browser confirm dialog with the same impact wording and the `confirmed` flag
- [ ] New messages `editTask`, `editSubtask`, `deleteSubtask` validated in core protocol (charsets, lengths, no newlines, date format), handled identically in the extension and `gitask serve`, serialised through the existing queue
- [ ] Tests: core edits (CRLF, `$&` in text, injection of header/checkbox lines through newlines), protocol rejections, handler over HTTP; MockHost supports them for G4
- [ ] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge
