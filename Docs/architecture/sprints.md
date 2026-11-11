# Sprints

Sprints are files in git, like tasks. They are on only when `Tasks/gitask.json` has a `sprint` block (settings and defaults: [config.md](config.md#sprint)). Code: `packages/core/src/sprints.ts` (reading) and `packages/core/src/sprint-ops.ts` (writing, [below](#writing)). Plan: `Tasks/_plans/Ext-scrum-sprints.md`.

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

## Writing

All writes are in `sprint-ops.ts`. Each refuses when sprints are off (except `setEstimate`), validates its input before touching a file, commits by pathspec only (never `git add -A`, so unrelated dirty files stay out), honours `commit: false` (autoCommit off: files are written, nothing is committed) and never commits a file git does not track. When the commit fails, the file is put back and unstaged. Options for all: `{ commit?: boolean; today?: "YYYY-MM-DD" }`.

| Function | Does | Commit subject |
|---|---|---|
| `createSprint(dir, {name?, goal?, start?, end?, capacity?})` | new `_sprints/S<n>.md` (`n` = highest + 1, name `Sprint <n>`), `planned`, with `## Review` and `## Retro`. With `start` and no `end`, End = Start + `lengthDays` - 1. Never overwrites | `sprint(S7): create` |
| `updateSprint(dir, id, patch)` | name, goal, start, end, capacity (`null` removes the line); not the state | `sprint(S7): edit goal, end` |
| `startSprint(dir, id)` | only a `planned` sprint, only when no other is active: `State: active`, Start = today and End = Start + `lengthDays` - 1 when empty | `sprint(S7): start` |
| `setTaskSprint(task, id \| null)` | sets the task's `Sprint` line (the sprint must exist and not be closed) or removes it | `task(Core-x): sprint S7` / `sprint none` |
| `setEstimate(task, n \| null)` | sets or removes the `Estimate` line | `task(Core-x): estimate 3` / `estimate none` |

Input rules: name one line of 1-80 characters, goal 1-200 (no control characters, no checkbox syntax), dates real `YYYY-MM-DD` with End not before Start, estimate and capacity a number 0-10000 with at most 2 decimals (`formatEstimate`). A header line is replaced where it is, or added after the last header line when missing (`editHeaderField`); `null` removes it (`removeHeaderField`). Only header lines change; line endings are kept.

### Closing a sprint

Two steps, so the dialog can show what will happen and the host can refuse a stale request.

**`planSprintClose(board, id, actions?, resetStatus?)`** is pure. `actions` maps a task path to `"backlog"` or `"next"`; unlisted tasks get `sprint.unfinished`. `resetStatus` `undefined` uses the config, `null` keeps the status. It returns:

```ts
{ id, next: "S8", createNext, resetStatus, actions /* resolved, by path */,
  done: CloseTask[], unfinished: CloseUnfinished[] /* action, to, toPath, claimedBy?, worktree? */,
  summary: { committed: {tasks, points}, done: {tasks, points}, toBacklog: string[], toNext: string[] },
  blockers: string[], warnings: string[], planHash /* sha256 hex */ }
```

- **Done** = the sprint's tasks in a `doneColumns` status. They are never moved or edited.
- **Unfinished**, action `backlog`: moved to `1-backlog/` (or the status labelled `backlog`) and the `Sprint` line removed. Action `next`: `Sprint: S<n+1>` and, when `resetStatus` is set, moved there.
- **Next sprint** is `S<n+1>`. It is created (`planned`, no dates) only when a task goes to it; an existing one must be `planned`.
- **Blockers** (apply refuses): the sprint is not active; none of `doneColumns` exists; an explicit `resetStatus` that is not a column or is a done status; no backlog status; a file of the same name already in the target folder, or two tasks moving to the same path; an `actions` path that is not an unfinished task of the sprint; `S<n+1>` exists but is not planned.
- **Warnings** (shown, not blocking): a claimed task or one with a `Worktree` (GITASK never removes worktrees); a done status that does not exist (ignored); the config `resetStatus` is not a column (tasks keep their status); the next sprint will be created.
- Bad input throws: sprints off, unknown sprint id, an action other than `backlog`/`next`.
- `planHash` covers what the close does (paths, columns, targets, estimates, blockers), not the warnings, so a plan passed back as the request gives the same hash.

**`applySprintClose(dir, {id, actions?, resetStatus?}, planHash)`** (a plan is itself a valid request) loads the board, plans again and throws `SprintCloseError` with `kind: "stale"` when the hash differs, or `"blocked"` when there are blockers. Then it checks every file (regular file inside `Tasks/`, target free, next sprint file free) before the first write, and:

1. moves each unfinished task (`git mv` when tracked, a rename when not; `Started / updated` bumped like `moveTask`) and edits its `Sprint` line;
2. creates the next sprint file when needed;
3. sets `State: closed` and writes `## Summary` into the sprint file (replacing an existing `## Summary` section, else appended):
   ```markdown
   ## Summary
   - Closed: 2026-11-29
   - Committed: 12 tasks · 34 pts · Done: 8 · 25 pts
   - To backlog: T-0101, T-0104 · To S8: T-0102
   ```
   Tasks are named by `ID` (`T-0101`) or file id; points show as `h` for `hours` and are left out for `none`.
4. makes **one** commit by pathspec of every touched tracked path, move sources included: `sprint(S7): complete, 8 done, 3 to backlog, 1 to S8`.

Untracked task files are moved and edited but not committed; with `commit: false` nothing is committed (tracked moves stay staged, as with `moveTask`). On any failure (a write, a hook rejecting the commit) every file is put back in reverse order and the touched paths are reset in the index to `HEAD`, so the board and git look as before; a staged-but-uncommitted change on a touched file is unstaged (its content is kept). Returns `{ committed, summary, moved: {from, to}[], edited, created?, message }`.
