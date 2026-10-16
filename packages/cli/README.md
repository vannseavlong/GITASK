# gitask-cli

Command line for [GITASK](https://github.com/vannseavlong/GITASK): a Kanban board for a plain-Markdown `Tasks/` folder where the folder is the status.

```bash
npx gitask-cli board            # or: npm i -g gitask-cli, then `gitask board`
gitask move <task> <column>     # git mv + date bump + commit of that one file
gitask new <id> [column]       # create from Tasks/_TEMPLATE.md
gitask changelog <task>         # add a CHANGELOG.md entry for a done task
```

Run it from the repo root that contains `Tasks/`. GITASK never pushes.
