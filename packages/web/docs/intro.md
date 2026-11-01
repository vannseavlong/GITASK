---
title: What is GITASK
description: GITASK turns a plain-Markdown Tasks folder into a Kanban board in VS Code and a command line, using git as the history.
slug: /intro
---

import ThemedImage from '@theme/ThemedImage';
import useBaseUrl from '@docusaurus/useBaseUrl';

GITASK is a Kanban board for a `Tasks/` folder. One Markdown file is one task, and the folder it sits in is its status.

## What you can do

- Move cards between statuses in VS Code. Every move is a `git mv` plus a commit of that one file.
- Use four views: Board, List, Timeline and Overview, in VS Code or in a [browser](./serve.md).
- [Assign tasks and split them into sub-tasks](./people-and-subtasks.md) with a person and a lane.
- [Export a report of what was done](./report.md) by person.
- [Sync tasks to GitHub Issues](./github-sync.md), if you want assignees notified.

<ThemedImage alt="The GITASK board with assignees and sub-tasks" width="1280" height="800" loading="lazy" sources={{light: useBaseUrl('/img/views/board-light.webp'), dark: useBaseUrl('/img/views/board-dark.webp')}} />

Open the board in a browser with `npx gitask-cli serve` (or `pnpm dlx gitask-cli serve`, `yarn dlx gitask-cli serve`, `bunx gitask-cli serve`, or `npm i -g gitask-cli` then `gitask serve`). See [serve](./serve.md).

New here? [Install GITASK](./install.md), then see the [CLI reference](./cli.md).
