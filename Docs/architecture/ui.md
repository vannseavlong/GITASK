# UI package (`packages/ui`)

React + TypeScript + Vite + Tailwind + shadcn (Radix) UI. One UI, two transports. Layout and commands: `CLAUDE.md`. Plan: `Tasks/_plans/Ext-people-export-ui.md`.

## Layers

| Layer | Where | Rule |
|---|---|---|
| Host | `packages/ui/src/host/` | The only code that knows how messages travel. `Host` = `getBoard`, `send`, `onBoard`, `onMessage`, `loadState`, `saveState`. |
| Shell | `src/shell/` | Tabs, text filter, date-range picker, status chips, remembered state. Pure logic is in `src/shell/logic.ts`. |
| Views | `src/views/` | One entry per tab in `views/registry.tsx` (`id`, `label`, `component`). Gets a filtered `board`, the `full` board and the `host`. |
| Components | `src/components/ui/` | shadcn components as source (Button, Dialog, Popover, Command, Calendar, date-range picker, Tabs, Badge, Avatar, Select, Tooltip, Input). |

Hosts: `VsCodeHost` (postMessage, the protocol in `packages/vscode/src/protocol.ts`, unchanged), `HttpHost` (stub; `gitask serve` fills it in), `MockHost` (fixture board, only in dev and `--mode mock` builds, removed from the production bundle).

## Shared logic

The UI does not copy the tested logic. `status-visibility.ts` is imported as is. `filter-logic.ts` is a JS string (tested by evaluating it); the webview CSP forbids `eval`, so `vite.config.ts` emits the same string as an ES module (`virtual:gitask-filter-logic`). The old string views in `packages/vscode/src/views/` keep their `*-logic.ts` and tests until `Ext-ui-views` ports them.

## Webview and CSP

`packages/vscode/src/html.ts` (`uiHtml`) builds the page; `extension.ts` passes `asWebviewUri` links to `dist/ui/ui.js` and `ui.css`. CSP:

```
default-src 'none'; script-src 'nonce-N' ${cspSource}; style-src ${cspSource} 'nonce-N'; style-src-attr 'unsafe-inline';
```

- Scripts: this page's nonce plus the extension's own files. No inline script, no `eval`.
- `style-src-attr 'unsafe-inline'` covers style **attributes** only (Radix and React position elements with them). It does not allow `<style>` elements.
- Radix injects one `<style>` (scroll lock). It gets the page nonce: the page puts it in `data-nonce`, `main.tsx` sets `__webpack_nonce__`.
- Every webview message still goes through `validateMessage` in `extension.ts`. Tab ids in `views/registry.tsx` must equal the ids in `packages/vscode/src/views/registry.ts` (a test checks this).

The old string-built page is still reachable with the command `GITASK: Open Classic Board` until all views are ported.

## Theme

`src/index.css` maps shadcn tokens to VS Code variables (`--background: var(--vscode-editor-background, ...)`). Light, dark and high contrast follow the VS Code theme; outside VS Code the fallbacks and `prefers-color-scheme` apply.

## Build

- `pnpm build` runs `vite build` in `packages/ui` from the extension's build script; output goes to `packages/vscode/dist/ui/` (`ui.js`, `ui.css`), which `.vscodeignore` keeps in the `.vsix`.
- `pnpm --filter gitask-ui build:mock` writes a standalone page with fixture data (`GITASK_UI_MOCK_OUT` sets the folder) to look at the UI in a browser; `pnpm --filter gitask-ui dev` serves it.
- Dependencies are pinned to exact versions, at least two weeks old when added.
