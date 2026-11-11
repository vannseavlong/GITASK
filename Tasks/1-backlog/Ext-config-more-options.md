# Ext-config-more-options

- **ID:** T-0088
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T2 · decided per item when promoted
- **Claimed by:** none
- **Worktree:** none yet
- **Started / updated:** none / 2026-11-07
- **Docs:** `Tasks/_plans/Core-configurable-fields.md`
- **Depends on:** Core-field-values
- **Touches:** none yet

## Goal
Later wave of `gitask.json` options once configurable fields are in. Promote items one at a time with `task-planner`.

## Ideas
- Settings dialog to edit fields and values from the board (`setFields` message, committed by pathspec)
- Configurable lanes list and the "Split into ..." button set (today hard-coded backend / UX/UI / frontend)
- Configurable tiers and task prefixes (`Core`, `CLI`, `Ext`, `Ops`) with the template header fields
- Default date field and default filters when the board opens (default view promoted to `Ext-default-view`)
- Status labels and order (display name separate from the folder name)
- Commit message templates (`COLOR_MESSAGE`, `SUBTASK_MESSAGE` and others) in config
- Field types beyond pick-lists: text, number, date; fields in `_TEMPLATE.md`
- Saved filters (named combinations such as "My App work")

## Done when
- [ ] Each promoted item has its own task file
