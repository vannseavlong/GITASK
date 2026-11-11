# UI package (`packages/ui`)

React + TypeScript + Vite + Tailwind + shadcn (Radix) UI. One UI, two transports. Layout and commands: `CLAUDE.md`. Plan: `Tasks/_plans/Ext-people-export-ui.md`.

## Layers

| Layer | Where | Rule |
|---|---|---|
| Host | `packages/ui/src/host/` | The only code that knows how messages travel. `Host` = `getBoard`, `send`, `onBoard`, `onMessage`, `loadState`, `saveState`. |
| Shell | `src/shell/` | Tabs, sprint switcher and strip, text filter, date-range picker, status chips, remembered state. Pure logic is in `src/shell/logic.ts`. |
| Views | `src/views/` | One entry per tab in `views/registry.tsx` (`id`, `label`, `component`) in the default order Overview, Board, List, Timeline, Sprint (an entry with `requires: "sprints"` is left out by `availableViews` while the board has no `sprints`, so its tab is hidden and a saved or initial `sprint` view falls back; the view opened opened when nothing is saved is `defaultView` from [config.md](config.md#defaultview), else Overview). In VS Code, `GITASK: Show Overview/Board/List/Timeline/Sprint` (`packages/vscode/src/view-commands.ts`, chord `Ctrl+Alt+G` then `O`/`B`/`L`/`T`/`S`) open the panel on that view; on an already open panel the host sends `showView { id }` and the shell switches tab like a click (a hidden panel gets it after its next `ready`). A view gets the filtered `board`, the `full` board, the `host`, the remembered `ui` state with `update(patch)`, and `openTask(path)`. |
| Tab order | `src/shell/view-tabs.tsx`, `src/lib/view-order.ts` | Tabs reorder by native HTML5 drag (drop marker on the tab edge, no dependency) or Alt+Left/Right on a focused tab; "Reset tab order" appears once the order differs from the default. The order is `UiState.viewOrder` (view ids), saved through `saveState` like the rest of the UI state, so it lives in webview state in VS Code and in localStorage in `gitask serve`. It is only a preference: `resolveOrder` drops unknown or duplicate ids and appends missing ones, so every view renders once. Ids stay validated by `VIEW_IDS`; the saved default order is stored as absent. Pure logic is tested in `packages/vscode/test/view-order.test.ts`. |
| Project header | `src/shell/project-header.tsx`, `src/lib/project-header.ts` | Above the tabs on every view; renders nothing without `board.project`. Title and subtitle are React text. `project.layout` maps to classes in `headerClasses` (align, size, logo position; text wraps at narrow width, tested in `packages/vscode/test/project-header.test.ts`). The logo is an `<img>` only (an SVG shown this way runs no script). Its `src` comes from `host.logoSrc`; a missing, rejected or failing logo drops out and the text stays, with no broken-image icon. See "Project logo" below. |
| Customize header | `src/components/project-dialog.tsx`, `src/components/logo-drop.tsx`, `src/lib/logo-file.ts` | Opened from the kebab menu in the project header corner ("Customize header"); without a project the header shows only a quiet "Add project header" action. Edits title, subtitle, alignment, size, logo position and the logo. The logo area (`LogoDrop`) is a drop zone driven by a button over a visually hidden file input (Enter or Space opens the picker; dragging a file over it highlights it): idle, drag-over, selected (checkerboard thumbnail, name, size, Replace, Remove) and error (an `aria-live` line in the area). The file is checked in the page (`logoFileProblem`) and read as base64. The live preview is the same `HeaderView` as the real header. Save sends one `setProject` message with only the fields that differ from the saved project (`lib/project-diff.ts`; no change means nothing is sent and the dialog just closes), then waits: the host answers `projectSaved { ok, error? }` (a plain `error` also counts). The dialog closes on success and, on failure, stays open with the draft and shows the error. Rules: [config.md](config.md). Reset layout restores the layout defaults (only differing keys are sent). The header fetches the logo again after a save, when `project.logo.path` or `version` changes, and after a board update when the last fetch failed. |
| Task detail | `src/detail/` | Side panel (Radix Dialog: focus trap, Esc, focus returns) opened by `openTask` from any view. Asks the host for `readTask`, renders the `taskBody` text with `react-markdown` + `remark-gfm` (raw HTML skipped, only http(s) links, images shown as alt text). Checkboxes map to sub-tasks by file line and send `toggleSubtask`. Shows fields, progress, depends-on chips, Open file and Delete. After a task is created the host sends `taskCreated { path }` (VS Code `newTask`, `gitask serve` reply to `new`; never on failure); the shell remembers the path and opens the panel once the board holds that task (`detail/pending-open.ts`). |
| Components | `src/components/ui/` | shadcn components as source (Button, Dialog, Popover, Command, Calendar, date-range picker, Tabs, Badge, Avatar, Select, Tooltip, Input, Table, Progress). |

Hosts: `VsCodeHost` (postMessage, the protocol in `packages/vscode/src/protocol.ts`, unchanged), `HttpHost` (stub; `gitask serve` fills it in), `MockHost` (fixture board, only in dev and `--mode mock` builds, removed from the production bundle).

## Shared logic

The UI does not copy the tested logic. `status-visibility.ts` is imported as is. `filter-logic.ts` is a JS string (tested by evaluating it); the webview CSP forbids `eval`, so `vite.config.ts` emits the same string as an ES module (`virtual:gitask-filter-logic`). `list-logic.ts` is also a JS string and is emitted the same way (`virtual:gitask-list-logic`). `timeline-logic.ts` (`timelineLogic()`) and `overview-logic.ts` (`computeOverview`) are plain functions and are imported directly. All three stay in `packages/vscode/src/views/` with their tests.

`renderRowExpansion` in `views/list.tsx` and the chevron column are the slot where a List row expands into sub-task rows.

People: `packages/vscode/src/people-filter.ts` (pure, tested; owner-to-person matching, `filterPeople`, `initials`) is imported as is; host handlers for `setOwner`/`addPerson` are in `packages/vscode/src/owner.ts`; components are `components/assignee-avatar.tsx`, `components/assignee-picker.tsx` and `shell/people-filter.tsx`.

Configurable fields (see [config.md](config.md#fields)): `packages/core/src/field-filter.ts` has no imports besides types, so the UI imports it as is through the `@core-src` alias (`vite.config.ts`, `tsconfig.json`). `shell/logic.ts` `derive()` applies it after the people filter and before the text filter; the selection is `UiState.fields` (`{ key: ids }`, a viewing preference, never committed). `components/fields.tsx` holds `FieldFilters` (one filter button per field in the filter bar, drawn only when `Board.config.fields` exists), `FieldBadges` (card, list title, sub-task row) and `FieldPicker` (detail panel, sub-task row). The pickers send `setTaskField` / `setSubtaskField`; `validateMessage` checks the shape (key and ids are slugs, at most 30, no duplicates) and each host checks the key and ids against `gitask.json` through core before writing. `SubtaskRows` hides sub-tasks that do not match an active selection when another sub-task of the task does.

## Sprint scope

What the user sees: [requirements/sprints.md](../requirements/sprints.md). Data: `Board.sprints` ([sprints.md](sprints.md#board-payload)); both hosts spread the core board into the payload, so it reaches the UI without a new message.

- Logic: `packages/vscode/src/sprint-scope.ts` (pure, structural types, imported as is; tests in `packages/vscode/test/sprint-scope.test.ts`). `resolveScope(UiState.sprintScope, board.sprints)` checks the saved value (`all`, `active`, `backlog` or a sprint id) against the board: `off` without sprints, default and `active` give the active sprint else All, an unknown id gives All. `scopeBoard` keeps the tasks in scope; `sprintStats`, `sprintRange`, `sprintTime` and `estimateUnit` feed the strip and badges.
- `shell/logic.ts` `derive()` applies the scope right after hidden statuses and before the date, people, field and text filters, and returns it as `scope`. `FilterBar` applies the same scope to its `N of M match` count and draws `shell/sprint-switcher.tsx` (a `Select`; warnings from `board.sprints.warnings` as an icon with a tooltip).
- `shell/sprint-strip.tsx` sits between the tabs and the filter bar while `scope.kind` is `sprint`; its counts use the raw board. `components/sprint-badges.tsx` draws the sprint and estimate badges on the board card, the List title cell and the detail panel.
- `UiState.sprintScope` is saved through `saveState` like the other filters (webview state in VS Code, localStorage in `gitask serve`); nothing is sent to the host.

## Sprint planning

What the user sees: [requirements/sprints.md](../requirements/sprints.md#planning). Writes: core `sprint-ops.ts` ([sprints.md](sprints.md#writing)).

- View: `src/views/sprint.tsx` (tab id `sprint`, `requires: "sprints"`). The planned sprint is `pickPlanSprint(scope sprint, board.sprints)` (scope sprint, else active, else newest planned); picking another one in the tab sets `UiState.sprintScope`, so the switcher and strip follow. The backlog pane is `derive(full, { ...ui, sprintScope: "backlog" })` (every shell filter except the scope) plus a pane search (`matchesText`); the sprint pane lists every task of the sprint from the raw board. Rows drag with the type `application/x-gitask-task` between the two panes (`DropPane`); Add/Remove buttons do the same from the keyboard.
- Pure logic: `src/lib/sprint-plan.ts` (`pickPlanSprint`, `plannable`, `capacityOf`, `parseEstimateInput`, `draftFields`, `startBlocker`; tests in `packages/vscode/test/sprint-plan.test.ts`).
- Dialogs: `components/sprint-dialog.tsx` (New/Edit sprint; sends only filled or changed fields, waits for `sprintSaved` or a rejection `error` like the project dialog). `components/new-task-dialog.tsx` gets `sprints` and `defaultSprint` (Board passes the sprint in scope, the Sprint tab the planned sprint) and sends `new { …, sprint }`.
- Messages, validated in `validateMessage` with `ValidationContext.sprints` (the board's sprint ids and states; absent when sprints are off, which refuses every sprint message except `setEstimate`):

  | Message | Rules | Answer |
  |---|---|---|
  | `createSprint { sprint: {name?, goal?, start?, end?, capacity?} }` | name 1-80 and goal 1-200 characters (`cleanText` rules: no control or bidi characters, plus no checkbox syntax); real `YYYY-MM-DD` dates, end not before start; capacity finite 0-10000, at most 2 decimals; unknown keys and `null` refused | `sprintSaved { action: "create", ok, id?, error? }` |
  | `updateSprint { id, patch }` | id `S<n>` of an existing sprint; same field rules, `null` removes a line (not `name`); empty patch refused | `sprintSaved { action: "update", … }` |
  | `startSprint { id }` | existing, not closed (core refuses a non-planned sprint and a second active one; the reason comes back in `error`) | `sprintSaved { action: "start", … }` |
  | `setTaskSprint { path, sprint }` | path a task file under an existing column (`taskPathInside`, then `guardMessagePath` and "task not found" on the current board); sprint an existing, not closed id, or `null` | fresh board; failure as an edit error |
  | `setEstimate { path, value }` | same path rule; value finite 0-10000 with at most 2 decimals, or `null` | fresh board; failure as an edit error |
  | `new { …, sprint? }` | sprint an existing, not closed id; the host creates the task, then writes its `Sprint` line (`putNewTaskInSprint`; a new file is untracked, so nothing is committed) | `taskCreated` as before |

  Both hosts run the same handlers from `packages/vscode/src/sprint-messages.ts` (VS Code `extension.ts`, `gitask serve` `packages/cli/src/handler.ts`). A rejected message gets `error` (`Rejected: …`) and writes nothing.
- Completing a sprint is the next task (Ext-sprint-complete); the Sprint tab has no Complete button yet.

## Webview and CSP

`packages/vscode/src/html.ts` (`uiHtml`) builds the page; `extension.ts` passes `asWebviewUri` links to `dist/ui/ui.js` and `ui.css`. CSP:

```
default-src 'none'; script-src 'nonce-N' ${cspSource}; style-src ${cspSource} 'nonce-N'; style-src-attr 'unsafe-inline';
```

- Scripts: this page's nonce plus the extension's own files. No inline script, no `eval`.
- `style-src-attr 'unsafe-inline'` covers style **attributes** only (Radix and React position elements with them). It does not allow `<style>` elements.
- Radix injects one `<style>` (scroll lock). It gets the page nonce: the page puts it in `data-nonce`, `main.tsx` sets `__webpack_nonce__`.
- Every webview message still goes through `validateMessage` in `extension.ts`. Tab ids in `views/registry.tsx` must equal `VIEW_IDS` in `packages/vscode/src/view-ids.ts` (a test checks this). The old string-built page and its command are gone.

## Project logo

The board payload carries only `project.logo.path`/`mime`, never bytes. One core helper, `readLogoBytes(dir)` (`packages/core/src/config.ts`), serves it: it takes no path, re-reads `Tasks/gitask.json`, re-runs `resolveLogo` (regular file, not a symlink, inside `Tasks/`, extension allow-list, 1 MiB cap), opens with `O_NOFOLLOW` and checks the size again, so a file swapped after the board loaded is not followed. Config rules: [config.md](config.md).

- **VS Code:** the webview sends `readLogo` (no fields); the extension answers `logo` with a `data:` URL from `readLogoBytes`/`logoDataUrl`. The Tasks folder is not added to `localResourceRoots`, so the webview can read nothing else from it. CSP gains `img-src ${cspSource} data:` and nothing remote.
- **`gitask serve`:** `GET /api/logo` (token in the header or, because `<img>` cannot send one, `?token=`; any other query is ignored). Fixed `Content-Type` from the allow-list, `nosniff`, `Content-Security-Policy: default-src 'none'; sandbox`, 404 when there is no valid logo. The page CSP already has `img-src 'self' data:`.
- `Host.logoSrc(logo)` hides the difference from the UI.

## Add status

The board's "+ Add status" button opens `components/add-status-dialog.tsx` (name, optional `#rrggbb` colour, position). It sends `addColumn { name, after?, color? }` and waits for the host's `columnAdded { ok, column?, error? }`; on failure the dialog stays open and shows the message. Both hosts call one core function, `addColumn` (`packages/core/src/add-column.ts`), and `validateMessage` runs the same `validateStatusName` first, so the rules exist once:

- Name: ASCII letters, digits, spaces and hyphens, at most 40 characters; the folder is `<number>-<lower-case slug>`. Refused: empty, `..`, separators, a leading `_` or `.`, non-ASCII, reserved names (`con`, `nul`, `com1`, `gitkeep`, ...), and any name whose slug matches an existing status, ignoring case.
- Number: one past the highest existing number (so `7-review` after `6-deploy`; gaps are never filled). With `after`, the number right after that status, only if it is free, so no folder is renamed; if not, the dialog says so. Reordering existing statuses is done by renaming folders.
- Safety: the final path must be a direct child of `Tasks/`; the folder is created non-recursively and never overwrites.
- Commit: a `.gitkeep` is written (as in `initTasks`) and committed by pathspec as `status(<id>): add`, only inside a repo with `autoCommit` on. A colour goes through `setColumnColor`.

## Theme

`src/index.css` maps shadcn tokens to VS Code variables (`--background: var(--vscode-editor-background, ...)`). Light, dark and high contrast follow the VS Code theme; outside VS Code the fallbacks and `prefers-color-scheme` apply.

## Build

- `pnpm build` runs `vite build` in `packages/ui` from the extension's build script; output goes to `packages/vscode/dist/ui/` (`ui.js`, `ui.css`), which `.vscodeignore` keeps in the `.vsix`.
- `pnpm --filter gitask-ui build:mock` writes a standalone page with fixture data (`GITASK_UI_MOCK_OUT` sets the folder) to look at the UI in a browser; `pnpm --filter gitask-ui dev` serves it.
- Dependencies are pinned to exact versions, at least two weeks old when added.
