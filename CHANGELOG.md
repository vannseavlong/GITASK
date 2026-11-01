# Changelog

Merges to `main` across all projects, newest first. Tags: `[Core]`/`[CLI]`/`[Ext]`/`[Ops]`. Format and rules: `Tasks/README.md`.

## 2026-11-02 · [Ops] fix(web): landing navbar label, GitHub icon, hamburger and portfolio link
- Owner: SNLRLONG
- Task: Tasks/3-in-progress/Ops-web-landing-fixes.md
- Branch/PR: fix/web-landing-fixes · not merged yet
- What changed: navbar item reads "What's new"; inline-SVG GitHub mark (`GitHubIcon`) in navbar and footer; the hamburger no longer shows on desktop (the minified CSS let `.icon-link` override the hide rule) and the mobile panel is opaque, closes on Escape, link tap or outside tap, and has `aria-controls`; portfolio link stored in `links.portfolio` and shown in the footer ("Built by Vann Seavlong") and Community column.
- Needs: none

## 2026-10-30 · [Ext] feat(ui): new task dialog with title, description, start/due, tier, status and member
- Owner: SNLRLONG
- Branch/PR: feat/new-task-dialog-fields · merged to main (c0cff3b)
- What changed: the new task dialog mirrors the edit dialog look (Field labels, grid form, DialogFooter) and collects title (required), description, start date, due date, tier, status (dropdown of columns) and member (dropdown of contributors) before creating, in the browser and in VS Code. Core gains `createTaskWithFields` writing the full task file (description into `## Goal`, start/due/tier/owner headers). The `new` message carries the validated fields; both hosts create via `createTaskWithFields`. Protocol validation added for title/description/start/due/tier/owner; tests cover accepted and rejected values.
- Needs: none

## 2026-10-30 · [Ext] feat(ui): new-task dialog and always-visible GitHub sync button
- Owner: SNLRLONG
- Branch/PR: feat/new-task-dialog · merged to main (dfb8d8c)
- What changed: creating a task now opens a dialog that asks for the task id (the H1 title) and target status before creating, in the browser and in VS Code; the `new` message carries an optional validated id and hosts fall back to a generated id when none is given. Sync to GitHub is always visible in the browser filter bar instead of only when `Tasks/gitask.json` already has a github block; when not configured the dialog shows setup instructions.
- Needs: none

## 2026-10-30 · [Ext] feat(report): simple report
- Owner: SNLRLONG
- Task: Tasks/4-testing/Ext-report-simple.md
- Branch/PR: feat/report-simple · merged to main (c68308c)
- What changed: the report is now three tiles (tasks done, sub-tasks done, people) and one section per person with their done tasks and finished sub-tasks; `late` tag only when a Due date exists. Removed per-person tables, tier mix, data notes and date-source labels. CSV is `person,task,sub_task,done_date,sub_tasks_done`. Escaping, CSV formula neutralisation and no-email rules unchanged.
- Needs: none

## 2026-10-30 · [Ext] feat(ui): modern date range picker
- Owner: SNLRLONG
- Task: Tasks/5-done/Ext-ui-date-picker.md
- Branch/PR: feat/ui-date-picker · merged to main (75f75f8)
- What changed: the date range picker is a popover card with a light range band, rounded start/end, normal-weight numbers and Clear / Apply buttons; closing without Apply keeps the old range. Uses theme tokens.
- Needs: none

## 2026-10-30 · [Ext] feat(brand): colourful tab icon and favicon
- Owner: SNLRLONG
- Task: Tasks/5-done/Ext-brand-icon.md
- Branch/PR: feat/brand-icon · merged to main (e01d47e)
- What changed: one coloured icon (`media/icon.svg`, `icon.png` 256 px) on the VS Code tab; `gitask serve` serves `/favicon.svg` and `/favicon.png` so the browser tab shows the icon.
- Needs: none

## 2026-10-30 · [Ext] feat(ui): dashboard charts on the Overview tab
- Owner: SNLRLONG
- Task: Tasks/5-done/Ext-ui-dashboard-charts.md
- Branch/PR: feat/ui-dashboard-charts · merged to main (2238de1)
- What changed: Overview tab gains real charts: donut by status and by tier, bar per person (owner + sub-task assignees) and completed per week (last 12 weeks), and a GitHub-style activity heatmap of the last 12 months. Core gains `taskActivity(dir)`/`taskActivityCached(dir)`: one `git log --since --name-only`, committer dates, counts per day, `[]` outside git/empty repo, never throws, cached by HEAD; exposed as an `activity` field on the board payload in both hosts (heatmap always the full year, status/tier/person charts follow the existing filters). Charts use theme tokens (`--chart-*`, `--heat-*`), accessible palette, tooltips with numbers, `role=img` + `aria-label`, empty states, hand-made SVG (no new dependency).
- Needs: none

## 2026-10-30 · [Ext] feat(ui): browser System/Light/Dark theme with custom colour tokens
- Owner: SNLRLONG
- Task: Tasks/5-done/Ext-ui-theme.md
- Branch/PR: feat/ui-theme · merged to main (d9ba1eb)
- What changed: browser-only System/Light/Dark toggle applied before first paint (inline nonce script under the existing CSP, no unsafe-inline) and remembered in localStorage; hidden in VS Code which owns its theme. Theme popover: presets (Neutral, Blue, Green, Violet, Orange, Red), custom #rrggbb for primary/accent/background/card/border, radius slider 0-20, live preview, Reset, strict JSON export/import (unknown keys dropped). Every custom value is validated and applied only through `document.documentElement.style.setProperty`; contrast warns below 4.5:1. Explicit light/dark token sets in `index.css` so charts and the calendar follow the theme.
- Needs: none

## 2026-10-30 · [CLI] feat(cli): npx/gitask-cli serve, walk-up Tasks discovery and init
- Owner: SNLRLONG
- Task: Tasks/5-done/CLI-npx-run.md
- Branch/PR: feat/npx-run · merged to main (8dbcdb1)
- What changed: `bin` exposes both `gitask` and `gitask-cli` from `dist/gitask.js` (shebang + exec bit survive `npm pack`); `gitask serve` with no `--dir` walks up to find `Tasks/` and fails with a clear `init` suggestion; new `gitask init` scaffolds `Tasks/`; root `pnpm gitask` / `pnpm serve` scripts build the CLI first when `dist` is missing. Verified via `npm pack`: `npx --yes <tarball> serve` and `pnpm dlx <tarball> serve` both serve (200 page, 401 on `/api/board` without token). `yarn dlx` and `bunx` were not available in this environment. Docs show the four runners and `npm i -g gitask-cli`.
- Needs: none

## 2026-10-30 · [Ext] feat(ui): edit/delete tasks and sub-tasks from a three-dots menu
- Owner: SNLRLONG
- Task: Tasks/5-done/Ext-ui-edit-delete.md
- Branch/PR: feat/ui-edit-delete · merged to main (cbf8178)
- What changed: kebab (vertical ellipsis) DropdownMenu replaces the trash icon on Board cards, List rows, the detail panel and sub-task rows (aria-label, stopPropagation, keyboard accessible). Edit task: title, due, tier T0-T3, owner (reuse picker), claimed by; core `updateTask` rewrites only patched lines, keeps CRLF, never renames, asserts regular file (symlink refused), commits by pathspec with `fillTemplate`. Edit/delete sub-task: text, assignee, lane; `deleteSubtask` removes exactly the index+line checkbox line. Delete keeps safeguards: VS Code modal, browser confirm with the `confirmed` flag. `editTask`/`editSubtask`/`deleteSubtask` validated in core protocol and handled identically in the extension and `gitask serve` through `serialQueue`. MockHost supports them; tests cover CRLF, `$&`, newline injection, stale line, symlink, protocol rejections and handler over HTTP.
- Needs: none

## 2026-10-30 · [Ops] chore(release): 0.5.0
- Owner: SNLRLONG
- Task: Tasks/5-done/Ops-release-0-5.md
- Branch/PR: feat/release-prep (into release/0.5.0, then main) · tag `v0.5.0` by the owner
- What changed: CLI and extension bumped to 0.5.0 with `pnpm bump`; `engines.node` is `>=22.18` at the repo root (tests run TypeScript through Node type stripping). README files, the website docs and the docs index cover people, sub-tasks, the report, `gitask serve` and GitHub sync.
- Needs: owner tags `v0.5.0` and approves the `release` environment; Marketplace screenshots still to be captured

## 2026-10-30 · [Ext] feat(github): sync tasks to GitHub Issues
- Owner: SNLRLONG
- Task: Tasks/5-done/Ext-github-sync.md
- Branch/PR: feat/github-sync
- What changed: opt-in, one-way sync (`"github"` in `Tasks/gitask.json`). `gitask github plan` is a dry run, `gitask github sync --yes` and `GITASK: Sync to GitHub` apply it: issue per task, assignee from the Owner's GitHub name, sub-tasks as sub-issues, optional Project status, `Issue:` line written back. Token from `GITHUB_TOKEN` or the VS Code GitHub sign-in, never stored.
- Needs: a GitHub token with Issues write (Projects write for a Project)

## 2026-10-30 · [Ext] feat(ui): export dialog with live report preview
- Owner: SNLRLONG
- Task: Tasks/5-done/Ext-ui-export.md
- Branch/PR: feat/ui-export
- What changed: Export button opens a dialog (period, date field, people, sub-tasks, format) with a live preview of the real report; save as HTML, Markdown or CSV in VS Code, download in the browser over `gitask serve`. The host validates the options and builds the report.
- Needs: none

## 2026-10-30 · [Ext] feat(ui): sub-tasks in List, Board and detail
- Owner: SNLRLONG
- Task: Tasks/5-done/Ext-ui-subtasks.md
- Branch/PR: feat/ui-subtasks
- What changed: Jira-style sub-tasks: expand a List row, a Sub-tasks toggle on Board cards, and a detail section to add, tick, assign, set the lane or split into backend / UX/UI / frontend. New validated messages `addSubtask`, `setSubtaskAssignee`, `setSubtaskLane`.
- Needs: none

## 2026-10-30 · [Ext] feat(ui): assignee picker, avatars and People filter
- Owner: SNLRLONG
- Task: Tasks/5-done/Ext-ui-assign.md
- Branch/PR: feat/ui-assign
- What changed: pick the Owner from the contributors in a searchable combobox (Board card and detail), avatars on Board, List and detail, and a People filter (with Unassigned) that also matches sub-task assignees. `setOwner` and `addPerson` are validated.
- Needs: none

## 2026-10-30 · [CLI] feat(serve): gitask serve, the UI in a browser
- Owner: SNLRLONG
- Task: Tasks/5-done/CLI-serve.md
- Branch/PR: feat/serve
- What changed: `gitask serve` opens the same UI in a browser on `127.0.0.1`, protected by a random token plus Host and Origin checks, the same message validation as VS Code, a body cap and a strict CSP. The UI is bundled into the CLI, so `npx gitask-cli serve` needs no other files.
- Needs: none

## 2026-10-30 · [Ext] feat(ui): List, Timeline, Overview and task detail in React
- Owner: SNLRLONG
- Task: Tasks/5-done/Ext-ui-views.md
- Branch/PR: feat/ui-views
- What changed: the three views and the task detail panel (react-markdown, no raw HTML) moved to `packages/ui` with shadcn; List keeps a chevron column and expandable row slot for sub-tasks. Removed the string-built views, `detail.ts`, `markdown.ts`, `webviewHtml` and the `GITASK: Open Classic Board` command.
- Needs: none

## 2026-10-30 · [Ext] feat(ui): React and shadcn UI foundation
- Owner: SNLRLONG
- Task: Tasks/5-done/Ext-ui-foundation.md
- Branch/PR: feat/ui-foundation
- What changed: new `packages/ui` (React, Vite, Tailwind, shadcn) behind a `Host` interface, with the shell and Board; the webview loads it under a strict CSP (nonce scripts) and follows the VS Code theme.
- Needs: none

## 2026-10-30 · [CLI] feat(cli): people, assign, subtask and report commands
- Owner: SNLRLONG
- Task: Tasks/5-done/CLI-commands.md
- Branch/PR: feat/cli-commands
- What changed: `gitask people`, `assign`, `subtask add|assign|list` and `report --format html|md|csv` with period, people and date-field options.
- Needs: none

## 2026-10-30 · [Core] feat(core): done report by person
- Owner: SNLRLONG
- Task: Tasks/5-done/Core-done-report.md
- Branch/PR: feat/done-report
- What changed: report of what was done in a period, per person (tasks and sub-tasks done, on time vs late, average days, tier mix), as self-contained HTML, Markdown or CSV. Done date comes from the git move commit, falling back to `Updated`; GitHub names only, never emails.
- Needs: none

## 2026-10-30 · [Core] feat(core): sub-task assignee and lane
- Owner: SNLRLONG
- Task: Tasks/5-done/Core-subtask-assignee.md
- Branch/PR: feat/subtask-assignee
- What changed: sub-task lines under `## Sub-tasks` accept `@person` and `#lane` tokens; `addSubtask`, `setSubtaskAssignee` and `setSubtaskLane` edit only that line. Card progress counts `Done when` and `Sub-tasks`.
- Needs: none

## 2026-10-30 · [Core] feat(core): people from git history
- Owner: SNLRLONG
- Task: Tasks/5-done/Core-people.md
- Branch/PR: feat/people
- What changed: contributors read from git history and `.mailmap`, merged with `people` in `Tasks/gitask.json` (stable id, name, GitHub name, role; emails never stored); `setOwner` writes the task Owner.
- Needs: none

## 2026-10-30 · [Ext] feat(ext): GITASK icon on the editor tab
- Owner: SNLRLONG
- Task: Tasks/5-done/Ext-tab-icon.md
- Branch/PR: feat/tab-icon
- What changed: the board tab shows the GITASK icon (light and dark).
- Needs: none

## 2026-10-21 · [Ext] feat(board): task ID, delete task or empty status
- Owner: SNLRLONG
- Task: Tasks/6-deploy/Ext-task-id-delete.md
- Branch/PR: feat/task-id-delete (released in v0.4.0)
- What changed: every task gets a short ID (`T-0001`, `- **ID:**` line), backfilled once for old tasks; shown on cards, list and detail and searchable. Delete a task (confirm, committed by pathspec) or an empty status from the board. Git calls now use literal pathspecs.
- Needs: none

## 2026-10-21 · [Ext] feat(views): show or hide statuses
- Owner: SNLRLONG
- Task: Tasks/6-deploy/Ext-status-show-hide.md
- Branch/PR: feat/status-show-hide (released in v0.4.0)
- What changed: chip bar to show or hide any status in Board, List, Timeline and Overview at once; kept per user in the webview, never committed.
- Needs: none

## 2026-10-21 · [Ext] feat(board): colour per status
- Owner: SNLRLONG
- Task: Tasks/6-deploy/Ext-status-color.md
- Branch/PR: feat/status-color (released in v0.4.0)
- What changed: set a colour per status from the board column header (stored in `Tasks/gitask.json`); shown on board, list, timeline and overview.
- Needs: none

## 2026-10-21 · [Ext] feat(views): date range filter
- Owner: SNLRLONG
- Task: Tasks/6-deploy/Ext-date-filter.md
- Branch/PR: feat/date-filter (released in v0.4.0)
- What changed: one From/To date filter (Due or Updated) on Board, List, Timeline and Overview, remembered per view; "No tasks in range." empty state.
- Needs: none

## 2026-10-18 · [Ext] feat: Ext-marketplace-metadata
- Owner: SNLRLONG
- Task: Tasks/5-done/Ext-marketplace-metadata.md
- Branch/PR: `fix/marketplace-metadata`
- What changed: The VS Code Marketplace rejects the 0.3.0 `.vsix` ("Your extension has suspicious content. Please fix your extension metadata"), so 0.3.0 is only on npm, Open VSX and GitHub, and VS Code users cannot auto-update. Find which metadata is flagged and ship 0.3.1 that the Marketplace accepts.

## 2026-10-18 · [Ext] fix: Ext-marketplace-metadata
- Owner: SNLRLONG
- Task: Tasks/3-in-progress/Ext-marketplace-metadata.md
- Branch/PR: `fix/marketplace-metadata`
- What changed: The VS Code Marketplace rejected 0.3.0 with "suspicious content". Manual upload tests showed the code and README are fine and a keyword was flagged, so the `agents` keyword is removed. Version bumped to 0.3.1 (CLI and extension).
- Needs: manual upload of the `.vsix` on the Marketplace manage page (no `VSCE_PAT` secret yet)

## 2026-10-18 · [Ext] feat: Ext-init-tasks-folder
- Owner: SNLRLONG
- Task: Tasks/3-in-progress/Ext-init-tasks-folder.md
- Branch/PR: `feat/init-tasks-folder`
- What changed: New command **GITASK: Initialize Tasks Folder** creates the six status folders and a `_TEMPLATE.md` in a project with no `Tasks/`, then opens the board. Core gains `initTasks`. Version bumped to 0.3.0.
- Needs: none

## 2026-10-18 · [Ops] feat: Ops-web-redesign
- Owner: SNLRLONG
- Task: Tasks/5-done/Ops-web-redesign.md
- Branch/PR: `feat/web-redesign`
- What changed: Port the Figma Make landing page (`~/Downloads/Redesign GITASK Landing Page`) into Docusaurus. Docs keep the Docusaurus navbar/footer.

## 2026-10-17 · [Ops] feat: Ops-publish-prep
- Owner: SNLRLONG
- Task: Tasks/5-done/Ops-publish-prep.md
- Branch/PR: `feat/release-cicd`
- What changed: CI/CD release on a `v*` tag (same pattern as longcelot-sheet-staging): test, then publish `gitask-cli` to npm, and the extension to VS Code Marketplace + Open VSX, attach the .vsix to a GitHub Release. Switch dev to pnpm. Real publisher id, repo URL, icon, screenshot/GIF in README, then publish to VS Code Marketplace and Open VSX (needs the owner's accounts and tokens; do not publish without owner approval).

## 2026-10-17 · [Ops] feat: Ops-npm-audit
- Owner: SNLRLONG
- Task: Tasks/5-done/Ops-npm-audit.md
- Branch/PR: `feat/npm-audit`
- What changed: Review the npm audit warnings from install; fix or document each.

## 2026-10-17 · [Ext] feat: Ext-webview-board
- Owner: SNLRLONG
- Task: Tasks/5-done/Ext-webview-board.md
- Branch/PR: main
- What changed: Kanban webview with drag-and-drop, open file, new task, file watcher, settings.

## 2026-10-17 · [Ext] feat: Ext-view-shell
- Owner: SNLRLONG
- Task: Tasks/5-done/Ext-view-shell.md
- Branch/PR: `feat/view-shell`
- What changed: Split the one-page board into a view shell: a tab bar (Board, List, Timeline, Overview), a view registry that each view registers into, a typed message protocol between webview and extension, a strict Content-Security-Policy, and the last-used view remembered. The Board becomes the first registered view with sub-task progress on cards.

## 2026-10-17 · [Ext] feat: Ext-timeline
- Owner: SNLRLONG
- Task: Tasks/5-done/Ext-timeline.md
- Branch/PR: `feat/timeline`
- What changed: Calendar and waterfall. Calendar: month grid with due dates. Waterfall: one bar per task from Started to Due, arrows from `Depends on`, a today line, zoom by week or month. Tasks without `Due` get an open-ended bar.

## 2026-10-17 · [Ext] feat: Ext-task-detail
- Owner: SNLRLONG
- Task: Tasks/5-done/Ext-task-detail.md
- Branch/PR: `feat/task-detail`
- What changed: Open a task from a card or row into a detail panel: title, header fields, each section rendered as Markdown, sub-task checkboxes you can toggle, progress bar, and an Open file button. Replaces opening the raw `.md` as the default click.

## 2026-10-17 · [Ext] feat: Ext-overview
- Owner: SNLRLONG
- Task: Tasks/5-done/Ext-overview.md
- Branch/PR: `feat/overview`
- What changed: A project dashboard: counts per status, tier and owner; tasks not updated for N days (setting, default 14); claimed tasks; overdue tasks; the last 10 moves from git history. Numbers come from a pure `stats` function in core so the CLI can reuse it later.

## 2026-10-17 · [Ext] feat: Ext-list-view
- Owner: SNLRLONG
- Task: Tasks/5-done/Ext-list-view.md
- Branch/PR: `feat/list-view`
- What changed: A table of every task: title, status, tier, owner, claimed by, updated, due, progress. Sort by any column, filter by status/tier/owner, search by text, click to open the detail.

## 2026-10-17 · [Core] feat: Core-task-model
- Owner: SNLRLONG
- Task: Tasks/5-done/Core-task-model.md
- Branch/PR: `feat/task-model`
- What changed: Extend the task model: parse sub-tasks (checkbox lines grouped by `

## 2026-10-17 · [Core] feat: Core-frontmatter-support
- Owner: SNLRLONG
- Task: Tasks/5-done/Core-frontmatter-support.md
- Branch/PR: `feat/frontmatter`
- What changed: Also parse YAML frontmatter in task files; keep the folder as the status source.

## 2026-10-16 · [Ops] feat: Ops-github-remote
- Owner: SNLRLONG
- Task: Tasks/5-done/Ops-github-remote.md
- Branch/PR: `feat/<short-name>`
- What changed: Create the GitHub repo and push, then confirm ci.yml and changelog.yml run green. Ask the owner before creating or pushing.

## 2026-10-17 · [Ops] feat: Ops-ci-release
- Owner: SNLRLONG
- Task: Tasks/6-deploy/Ops-ci-release.md
- Branch/PR: main
- What changed: CI (typecheck, test, package vsix), README, MIT license.

## 2026-10-17 · [Core] feat: Core-changelog
- Owner: SNLRLONG
- Task: Tasks/6-deploy/Core-changelog.md
- Branch/PR: main
- What changed: Idempotent changelog entry from task metadata.

## 2026-10-17 · [CLI] feat: CLI-gitask
- Owner: SNLRLONG
- Task: Tasks/6-deploy/CLI-gitask.md
- Branch/PR: main
- What changed: gitask board | move | new | changelog from the terminal.

## 2026-10-17 · [Core] feat: Core-move-create
- Owner: SNLRLONG
- Task: Tasks/6-deploy/Core-move-create.md
- Branch/PR: main
- What changed: Move a task between columns (git mv, bump date, commit by pathspec) and create tasks from _TEMPLATE.md.

## 2026-10-17 · [Core] feat: Core-parse-board
- Owner: SNLRLONG
- Task: Tasks/6-deploy/Core-parse-board.md
- Branch/PR: main
- What changed: Parse task files and build the board (columns from numbered folders).
