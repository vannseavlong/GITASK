# gitask-cli

Command line for [GITASK](https://github.com/vannseavlong/GITASK): a Kanban board for a plain-Markdown `Tasks/` folder where the folder is the status.

```bash
npx gitask-cli board            # or: npm i -g gitask-cli, then `gitask board`
gitask move <task> <column>     # git mv + date bump + commit of that one file
gitask new <id> [column]       # create from Tasks/_TEMPLATE.md
gitask changelog <task>         # add a CHANGELOG.md entry for a done task
gitask people [--json]          # contributors from git history and Tasks/gitask.json
gitask assign <task> <person|none>                    # set or clear the Owner (id, name or GitHub login)
gitask subtask add <task> "<text>" [--assign <person>] [--lane <lane>]
gitask subtask assign <task> <index> <person|none>    # index from `gitask subtask list <task>`
gitask report --format html|md|csv [--from YYYY-MM-DD] [--to YYYY-MM-DD] \
              [--people a,b] [--date done|due|updated] [--no-subtasks] [--out file]
```

`report` prints to stdout without `--out`. Unknown tasks, people, columns, bad dates or formats exit non-zero with a message. `--no-commit` skips the commit for `assign` and `subtask`.

Run it from the repo root that contains `Tasks/`. GITASK never pushes.
