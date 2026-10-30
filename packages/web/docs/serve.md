---
title: Open the board in a browser with gitask serve
description: Run gitask serve to use the GITASK board in any browser on your own machine, protected by a local token.
slug: /serve
---

After this page you can open the same board you see in VS Code in a browser. Needs GITASK 0.5.0 and Node 20 or newer.

1. In the folder that contains `Tasks/`, run:

   ```bash
   npx gitask-cli serve
   ```

2. Open the address it prints. It looks like `http://127.0.0.1:4173/?token=...`. Your browser opens it for you unless you pass `--no-open`.

Options: `--port 4173` (`0` picks a free port), `--host 127.0.0.1`, `--dir Tasks`, `--no-open`, `--no-commit`. Moves and edits commit the one file they touch, like the rest of GITASK, unless you pass `--no-commit`.

## Is it safe?

The server can change your repo, so it is closed by default: it listens on `127.0.0.1` only, every request needs the random token from the address, and requests from other web pages are rejected. Anything that changes a task goes through the same validation as VS Code.

:::warning
`--host 0.0.0.0` makes the board reachable on your network over plain HTTP, with the token as the only protection. Use it only on a network you trust.
:::

The full model is in [Docs/architecture/serve.md](https://github.com/vannseavlong/GITASK/blob/main/Docs/architecture/serve.md).

Next: [sync tasks to GitHub](./github-sync.md).
