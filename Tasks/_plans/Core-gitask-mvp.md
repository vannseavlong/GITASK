# GITASK MVP plan

## Goal
Render the `Tasks/` folder board (one `.md` per task, folder = status) as a drag-and-drop Kanban in VS Code. A move runs `git mv`, updates the task file and commits that task only. A CLI and a changelog command share the same core.

## Flow
| Step | State |
|---|---|
| Parse task files (`- **Key:** value` header + H1) | new |
| Columns come from numbered folders in `Tasks/` (`_inbox`, `_plans` ignored) | new |
| Move task: `git mv` + bump `Started / updated` + commit specific paths | new |
| Create task from `_TEMPLATE.md` | new |
| Webview board, drag between columns, open file, new task | new |
| Changelog entry from task metadata when a task reaches `5-done` | new |

## Decisions
- Folder is the source of truth for status (no `status` field to drift).
- Parse the existing agent-setup format, not YAML frontmatter, so the board works on any workspace installed from My-Agent-SetUp. Frontmatter is a later option.
- Commit with a pathspec, never `git add -A` (matches `AGENTS.md`).
- `core` has no VS Code dependency, so CLI, extension and Action share it.
- Auto-commit is a setting, default on. Pushing is never automatic.

## Open questions (recommendation)
- Cross-repo team rollup: not in MVP. Recommend a hub repo fed by an Action later.
- Frontmatter support: recommend yes in v0.2.

## Task breakdown
| Task | Depends on | Tier | Size |
|---|---|---|---|
| Core-parse-board | none | T1 | 0.5d |
| Core-move-create | Core-parse-board | T2 (runs git) | 1d |
| CLI-gitask | Core-move-create | T1 | 0.5d |
| Core-changelog | Core-parse-board | T1 | 0.5d |
| Ext-webview-board | Core-move-create | T2 | 2d |
| Ops-ci-release | Ext-webview-board | T1 | 0.5d |

## Out of scope
Web dashboard, GitHub OAuth, cross-repo rollup, marketplace publishing (needs the owner's publisher account).
