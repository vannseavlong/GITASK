# Polish after first run in VS Code (folded into 0.5.0)

Updated: 2026-10-30 · Source: the owner's first run of the 0.5.0 `.vsix` in VS Code and in the browser (screenshots: board works, tab icon shows, calendar works).

## Goal
Make the first run feel finished: colourful identity everywhere, a modern date range picker, edit/delete for tasks and sub-tasks, a real dashboard, a simple report, theme control in the browser, and a normal way to start `serve`. Nothing is tagged yet, so these go into 0.5.0; no version bump.

## Findings from the first run
- Board, filters, People, Export and the calendar work in a real VS Code window; the tab shows the new glyph but it is monochrome and not like the Marketplace icon.
- The calendar is functional but heavy: bold numerals, saturated bands, no Apply step. The owner's reference (`images/6.png`) is a clean popover with a light range band, rounded ends and `Clear` / `Filter Now`.
- The browser tab has no icon (globe). `serve` has no favicon route.
- Starting the server needs `node packages/cli/dist/gitask.js serve`, which nobody will type.

## Decisions
- One colourful icon family (Marketplace icon style) for the tab, favicon and listing; Figma MCP used for the master if available.
- `npx gitask-cli serve` is the primary command; `gitask` and `gitask-cli` bins both work.
- Edit/delete live in a kebab menu (three vertical dots); delete safeguards unchanged (VS Code modal, browser confirm).
- Dashboard charts use the dataviz rules; heatmap data comes from git history of `Tasks/` in core, read once.
- The report keeps its data model and drops noise in the renderers only.
- Theme toggle and custom tokens are browser-only (VS Code owns its theme); values are validated hex applied through CSSOM.

## Task breakdown (all independent, one branch each, parallel)
| Task | Tier | Size |
|---|---|---|
| Ext-brand-icon | T1 | 0.5d |
| CLI-npx-run | T2 | 0.5d |
| Ext-ui-date-picker | T1 | 0.5d |
| Ext-ui-edit-delete | T2 | 2d |
| Ext-ui-dashboard-charts | T2 | 1.5d |
| Ext-report-simple | T3 | 1d |
| Ext-ui-theme | T2 | 1d |

Shared files (additive edits, rebase on merge): `packages/ui/src/index.css` (theme, date picker), the shell header (theme, export, icon), `protocol.ts`/`handler.ts`/`extension.ts` (edit-delete), `overview.tsx` (charts).

## Open questions (recommendation)
1. Should custom colour tokens also be shareable per repo (`Tasks/gitask.json`)? Recommend no for now: per-user, localStorage, JSON export/import.
2. Are tags like `late` wanted in the simple report? Recommend yes, only when a Due date exists.

## Out of scope
Per-repo themes, light/dark in VS Code (it follows VS Code), PDF export, editing the markdown body inside the UI.
