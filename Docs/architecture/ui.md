# UI package (`packages/ui`)

React + TypeScript + Vite + Tailwind + shadcn (Radix) UI. One UI, two transports. Layout and commands: `CLAUDE.md`. Plan: `Tasks/_plans/Ext-people-export-ui.md`.

## Layers

| Layer | Where | Rule |
|---|---|---|
| Host | `packages/ui/src/host/` | The only code that knows how messages travel. `Host` = `getBoard`, `send`, `onBoard`, `onMessage`, `loadState`, `saveState`. |
| Shell | `src/shell/` | Tabs, text filter, date-range picker, status chips, remembered state. Pure logic is in `src/shell/logic.ts`. |
| Views | `src/views/` | One entry per tab in `views/registry.tsx` (`id`, `label`, `component`): Board, List, Timeline, Overview. A view gets the filtered `board`, the `full` board, the `host`, the remembered `ui` state with `update(patch)`, and `openTask(path)`. |
| Task detail | `src/detail/` | Side panel (Radix Dialog: focus trap, Esc, focus returns) opened by `openTask` from any view. Asks the host for `readTask`, renders the `taskBody` text with `react-markdown` + `remark-gfm` (raw HTML skipped, only http(s) links, images shown as alt text). Checkboxes map to sub-tasks by file line and send `toggleSubtask`. Shows fields, progress, depends-on chips, Open file and Delete. |
| Components | `src/components/ui/` | shadcn components as source (Button, Dialog, Popover, Command, Calendar, date-range picker, Tabs, Badge, Avatar, Select, Tooltip, Input, Table, Progress). |

Hosts: `VsCodeHost` (postMessage, the protocol in `packages/vscode/src/protocol.ts`, unchanged), `HttpHost` (stub; `gitask serve` fills it in), `MockHost` (fixture board, only in dev and `--mode mock` builds, removed from the production bundle).

## Shared logic

The UI does not copy the tested logic. `status-visibility.ts` is imported as is. `filter-logic.ts` is a JS string (tested by evaluating it); the webview CSP forbids `eval`, so `vite.config.ts` emits the same string as an ES module (`virtual:gitask-filter-logic`). `list-logic.ts` is also a JS string and is emitted the same way (`virtual:gitask-list-logic`). `timeline-logic.ts` (`timelineLogic()`) and `overview-logic.ts` (`computeOverview`) are plain functions and are imported directly. All three stay in `packages/vscode/src/views/` with their tests.

`renderRowExpansion` in `views/list.tsx` and the chevron column are the slot where a List row expands into sub-task rows.

People: `packages/vscode/src/people-filter.ts` (pure, tested; owner-to-person matching, `filterPeople`, `initials`) is imported as is; host handlers for `setOwner`/`addPerson` are in `packages/vscode/src/owner.ts`; components are `components/assignee-avatar.tsx`, `components/assignee-picker.tsx` and `shell/people-filter.tsx`.

## Webview and CSP

`packages/vscode/src/html.ts` (`uiHtml`) builds the page; `extension.ts` passes `asWebviewUri` links to `dist/ui/ui.js` and `ui.css`. CSP:

```
default-src 'none'; script-src 'nonce-N' ${cspSource}; style-src ${cspSource} 'nonce-N'; style-src-attr 'unsafe-inline';
```

- Scripts: this page's nonce plus the extension's own files. No inline script, no `eval`.
- `style-src-attr 'unsafe-inline'` covers style **attributes** only (Radix and React position elements with them). It does not allow `<style>` elements.
- Radix injects one `<style>` (scroll lock). It gets the page nonce: the page puts it in `data-nonce`, `main.tsx` sets `__webpack_nonce__`.
- Every webview message still goes through `validateMessage` in `extension.ts`. Tab ids in `views/registry.tsx` must equal `VIEW_IDS` in `packages/vscode/src/view-ids.ts` (a test checks this). The old string-built page and its command are gone.

## Theme

`src/index.css` maps shadcn tokens to VS Code variables (`--background: var(--vscode-editor-background, ...)`). Light, dark and high contrast follow the VS Code theme; outside VS Code the fallbacks and `prefers-color-scheme` apply.

## Build

- `pnpm build` runs `vite build` in `packages/ui` from the extension's build script; output goes to `packages/vscode/dist/ui/` (`ui.js`, `ui.css`), which `.vscodeignore` keeps in the `.vsix`.
- `pnpm --filter gitask-ui build:mock` writes a standalone page with fixture data (`GITASK_UI_MOCK_OUT` sets the folder) to look at the UI in a browser; `pnpm --filter gitask-ui dev` serves it.
- Dependencies are pinned to exact versions, at least two weeks old when added.
