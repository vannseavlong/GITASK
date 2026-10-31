---
title: Install GITASK and open your first board
description: Install the GITASK extension from the VS Code Marketplace or Open VSX, or the gitask-cli package from npm, and open a board on a Tasks folder.
slug: /install
---

After this page you can see your first board, in VS Code or in a terminal.

## Install the extension

- **VS Code:** install [GITASK from the Marketplace](https://marketplace.visualstudio.com/items?itemName=vannseavlong.gitask-vscode), or run:

  ```bash
  code --install-extension vannseavlong.gitask-vscode
  ```

- **VSCodium, Cursor, Windsurf:** install [GITASK from Open VSX](https://open-vsx.org/extension/vannseavlong/gitask-vscode).
- **Offline:** download the `.vsix` from [GitHub Releases](https://github.com/vannseavlong/GITASK/releases/latest) and run `code --install-extension <file>.vsix`.

## Install the command line

Needs Node 20 or newer.

```bash
npm i -g gitask-cli       # then run: gitask
npx gitask-cli board      # or run it once, no install
```

`pnpm dlx`, `yarn dlx` and `bunx` work the same way. The package installs two commands, `gitask` and `gitask-cli`.

## Open a board

1. In your project folder, create the status folders: run `gitask init`, or **GITASK: Initialize Tasks Folder** in VS Code. It never overwrites anything.
2. Add a task: `gitask new Web-login-page`, or **GITASK: New Task**.
3. See it: **GITASK: Open Board** in VS Code, `gitask board` in a terminal, or [`gitask serve`](./serve.md) in a browser.

A move commits only that task's file. GITASK never pushes.

Next: [the CLI reference](./cli.md).
