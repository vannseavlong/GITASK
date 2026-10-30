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
gitask github plan [task...]                          # dry run of a GitHub Issues sync
gitask github sync --yes [task...]                    # apply it (token in GITHUB_TOKEN)
gitask serve [--port 4173] [--host 127.0.0.1] [--no-open]   # the board in your browser
```

`serve` listens on `127.0.0.1` only and every request needs the random token in the printed URL; requests from other web pages are rejected. Using `--host 0.0.0.0` leaves the token as the only protection over plain HTTP. Details: [serve.md](https://github.com/vannseavlong/GITASK/blob/main/Docs/architecture/serve.md).

`github` is off until `Tasks/gitask.json` has `{"github": {"repo": "owner/name"}}`. `plan` sends nothing; `sync` needs `--yes`. Try it on a throwaway repo first. Details and token permissions: [github.md](https://github.com/vannseavlong/GITASK/blob/main/Docs/architecture/github.md).

`report` prints to stdout without `--out`. Unknown tasks, people, columns, bad dates or formats exit non-zero with a message. `--no-commit` skips the commit for `assign` and `subtask`.

Run it from the repo root that contains `Tasks/`. GITASK never pushes.

## Start the board

```bash
npx gitask-cli serve            # no install needed
pnpm dlx gitask-cli serve
yarn dlx gitask-cli serve
bunx gitask-cli serve
npm i -g gitask-cli             # global install
gitask serve                    # after global install
gitask serve [--port 4173] [--host 127.0.0.1] [--no-open]   # the board in your browser
```

Inside this monorepo you can also run `pnpm gitask serve` or `pnpm serve` (the root script builds the CLI first if `dist` is missing).
