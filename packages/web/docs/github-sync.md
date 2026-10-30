---
title: Sync tasks to GitHub Issues
description: Optionally create GitHub issues from your tasks so assigning a person notifies them through GitHub. Off by default, with a dry run first.
slug: /github-sync
---

After this page you can push your tasks to GitHub Issues so the person you assign hears about it. Needs GITASK 0.5.0.

It is **off by default** and one-way: your `Tasks/` files stay the source of truth, and nothing is sent until you confirm.

## Turn it on

1. Add the repository to `Tasks/gitask.json` (`project` is optional):

   ```json
   { "github": { "repo": "owner/name", "project": 7 } }
   ```

2. Give GITASK a token. In the command line, set `GITHUB_TOKEN`. In VS Code, GITASK uses your GitHub sign-in after you confirm. The token is never written to a file or to git. A fine-grained token needs **Issues: write**, plus **Projects: write** on the organization if you set `project`. Details: [Docs/architecture/github.md](https://github.com/vannseavlong/GITASK/blob/main/Docs/architecture/github.md).

## Preview, then sync

```bash
gitask github plan            # dry run: what would be created or updated, and who is notified
gitask github sync --yes      # do it
```

In VS Code run **GITASK: Sync to GitHub**; it lists the same plan and asks before sending.

Each open task becomes an issue assigned to the owner's GitHub name, and its sub-tasks become sub-issues. GITASK writes `- **Issue:** #123` into the task so the next sync updates the same issue. A person without a GitHub name is skipped with a warning.

:::warning
Syncing creates real issues and notifies real people. Try it first on a throwaway repository.
:::

Syncing a large board can hit GitHub's rate limits. If it stops, wait and sync fewer tasks at a time: `gitask github sync --yes Web-login`.
