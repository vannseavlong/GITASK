# CLAUDE.md

GITASK: Kanban for a `Tasks/` folder (VS Code extension + CLI + core).

- `packages/core` pure TS library (no vscode import), `packages/cli`, `packages/vscode` (webview).
- Commands: `npm test` (node:test on real temp git repos), `npm run typecheck`, `npm run build`, `npm run package`.
- Core imports use `.ts` extensions; esbuild bundles. Keep VS Code APIs out of core.
- Moves must commit by pathspec only, never `git add -A` (see AGENTS.md).

## Agent rules

Shared rules for every agent live in `AGENTS.md` and apply here too:

@AGENTS.md
