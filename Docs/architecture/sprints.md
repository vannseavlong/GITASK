# Sprints

Sprints are files in git, like tasks. They are on only when `Tasks/gitask.json` has a `sprint` block (settings and defaults: [config.md](config.md#sprint)). Code: `packages/core/src/sprints.ts` (read only; nothing writes sprint files or task headers yet). Plan: `Tasks/_plans/Ext-scrum-sprints.md`.

## Sprint files: `Tasks/_sprints/S<n>.md`

One file per sprint. `_sprints` starts with `_`, so it is never a column.

```markdown
# Sprint 7
- **ID:** S7
- **State:** active
- **Start:** 2026-11-16
- **End:** 2026-11-29
- **Goal:** Ship sprint planning
- **Capacity:** 30

## Review
## Retro
## Summary
```

The header uses the task syntax (`parseHeader` in `parse.ts`): `- **Key:** value` lines before the first `##` section, keys case-insensitive, YAML frontmatter as a fallback. Everything from the first `##` on is free text (review and retro notes, the closing summary) and is not parsed.

| Part | Rule | When bad or missing |
|---|---|---|
| file name | `S<n>.md`, `n` from 1 without a leading zero; the id is `S<n>` | file skipped |
| `ID` | informative; the file name is the id | ignored |
| `# heading` | sprint name, cleaned like project text, max 80 characters | `Sprint <n>` |
| `State` | `planned` `active` `closed` (any case) | `planned` |
| `Start`, `End` | real `YYYY-MM-DD` dates; `End` before `Start` is dropped | absent |
| `Goal` | one line, max 200 characters | absent |
| `Capacity` | number >= 0, at most 2 decimals, at most 10000, in the `estimate` unit | absent |

**Reading** (`parseSprint(path, text)` for one file, `readSprints(dir)` for the folder): each value is checked alone and never throws. A missing `_sprints` folder yields no sprints. The folder must be a real directory (a symlinked folder is ignored), and each file a regular file inside `Tasks/` of at most 512 KiB (`assertRegularFile`, the task symlink guard); a symlink, a folder named `S3.md` or any other name is skipped. Sprints are sorted by number. `nextSprintId(list)` is the highest number + 1.

**Active sprint** (`pickActiveSprint`): at most one sprint is active. When several files say `active`, the lowest number wins and a warning naming the others is returned.

## Task headers

```markdown
- **Sprint:** S7
- **Estimate:** 3
```

| Header | Rule | Field |
|---|---|---|
| `Sprint` | a sprint id (`s7` is read as `S7`); not checked against `_sprints/` | `Task.sprint` |
| `Estimate` | number >= 0, at most 2 decimals, at most 10000 | `Task.estimate` |

No `Sprint` header (or a malformed one) means the task is in the backlog. A task belongs to one sprint at a time. Both keys are set on the task only when valid, so a task without them serialises as before, and they are parsed whether sprints are on or off. `sprint` and `estimate` are in `RESERVED_FIELD_KEYS`, so a configured field cannot use them.

## Board payload

`loadBoard` calls `loadSprints(dir, columnIds)` and sets `Board.sprints` only when sprints are on:

```ts
{ config: SprintConfig, list: Sprint[], active?: "S7", warnings?: string[] }
```

`active` is the id of the active sprint (look it up in `list`); `warnings` is absent when there are none. Types are in `packages/core/src/types.ts`.
