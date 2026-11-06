# Configurable fields plan: Platform (and other dimensions) from `gitask.json`

Updated: 2026-11-07 · Requirements: none yet (G7 adds an entry to `Docs/requirements/views.md`); config rules live in `Docs/architecture/config.md`.

## Goal
Let a team define its own task dimensions in `Tasks/gitask.json`, for example **Platform: Admin Portal, App, Landing Page**. Each value can be set on a task and on its sub-tasks (the "task breakdown"), shows as a badge, and can be filtered in every view, the CLI and reports. Also make the other hard-coded lists configurable (lanes, tiers, filters defaults) in later waves.

## Flow
| Step | State |
|---|---|
| `gitask.json` read by small per-key parsers (`parseColors`, `parseProject`, `parseGithubConfig`); unknown keys kept on write | exists |
| New `fields` block: list of `{ key, label, values: [{ id, label, color? }], multi? }` validated alone, bad entry dropped | new |
| Task value: header line `- **Platform:** app, admin-portal` (parsed into `Task.fields`, already generic) | exists / change (resolve against config) |
| Sub-task value: trailing token on a `## Sub-tasks` line | change (see decision 2) |
| `Board.config.fields` + `Task.values` / `Subtask.values` resolved against the config; unknown ids kept but flagged | new |
| Filter: new chip group per field in the filter bar, remembered in `UiState`, applied in `derive()` after people | new |
| Badge on card, list row, sub-task row, detail; field picker in detail and sub-task editor | new |
| CLI: `gitask add --platform`, `list --platform`, `report` grouping | new |
| Edit the list of fields and values from a board settings dialog (`setFields` message) | new, later wave |

## Screens and states
Existing: filter bar (`filter-bar.tsx`, `people-filter.tsx` is the model to copy), card, list row, sub-task row, detail dialog, project dialog. New states: no fields configured (nothing shown, board looks as today), task with a value not in config (neutral badge, tooltip "not in gitask.json"), filter active with zero matches ("N of M match" line already exists). No design frames exist; use the same theme variables as the people filter.

## Data and API
No backend. Config shape (draft):

```json
{ "fields": [
  { "key": "platform", "label": "Platform", "multi": true,
    "values": [ { "id": "admin-portal", "label": "Admin Portal", "color": "#3794ff" },
                { "id": "app", "label": "App" }, { "id": "landing-page", "label": "Landing Page" } ] } ] }
```

Rules: `key` `^[a-z][a-z0-9-]{0,23}$`, unique, not a reserved header key (`id owner tier claimed by due depends on repo worktree branch docs touches status`); `label` max 40 chars; at most 8 fields and 30 values per field; value `id` `^[a-z0-9][a-z0-9-]{0,31}$` unique in the field; `color` `#rrggbb`; text cleaned with `cleanText`. Webview protocol: filters stay in `UiState` (viewing preference, same rule as hidden statuses); later `setFields` validated in `protocol.ts` and committed by pathspec (`Tasks/gitask.json`) like `setProject`.

## Gaps and decisions
1. **"Task breakdown" = the `## Sub-tasks` section** (Docs/requirements/views.md), where each line already carries `@person` and `#lane`. Platform is therefore a sub-task attribute, with an optional task-level value for tasks that have no breakdown.
2. **Sub-task token syntax.** `#lane` is free text today and `splitTokens` only knows one `#` token. Decision: a configured field value is written `#platform:app` (`#<key>:<id>`); a plain `#word` stays a lane. Keeps old files valid, no ambiguity, easy to grep. The parser stays pure: it keeps `#key:id` tokens as raw `{key,id}` and `loadBoard` resolves them against config.
3. **Lanes are a field too.** Decision: do not migrate lanes in this wave; a later task can expose the existing lane list through the same `fields` mechanism (`Core-config-lanes`, backlog).
4. **Where the filter lives.** Viewing preference in `UiState`, not in `gitask.json`, so it never shows up in git (same rule as `Ext-board-manage`).
5. **Task-level rollup.** A task matches a platform filter if the task value or any of its sub-tasks has it. Filtering sub-task rows inside an expanded task also hides non-matching rows.
6. **Unknown ids** (value removed from config, typo): kept as written, shown neutral, never rewritten. Removing a value from config does not edit task files.
7. Config is untrusted input: every field validated alone; one bad entry never hides the others; the file stays editable by hand (no schema migration).

## Open questions (recommendation)
1. Single or multi value per task? Recommend `multi` per field, default false for sub-tasks (one platform each) and true at task level.
2. Should the filter combine with AND across fields and OR within a field? Recommend yes.
3. Which other settings do you want first? Recommend the backlog list below; tell me to promote any.

## Task breakdown
| Task | Repo | Depends on | Tier | Size |
|---|---|---|---|---|
| Core-config-fields | core | none | T2 | 1.5d |
| Core-field-values | core | Core-config-fields | T2 | 1.5d |
| Ext-field-filter | ui + vscode | Core-field-values | T2 | 2d |
| CLI-field-options | cli | Core-field-values | T1 | 1d |
| Later wave (backlog): `Ext-config-more-options` | all | after the above | per item | - |

**Parallel:** Core-config-fields and Core-field-values are sequential (same files: `config.ts`, `parse.ts`, `types.ts`). After Core-field-values merges, Ext-field-filter and CLI-field-options run in parallel (different packages).

## Out of scope
Editing fields from the UI (`setFields`), custom field types other than pick-lists (text, number, date), per-person permissions, GitHub label sync for fields, migrating lanes.
