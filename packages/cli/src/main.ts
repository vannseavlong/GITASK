import { join, resolve } from "node:path";
import { hostWarning, startServer } from "./serve.ts";
import { openBrowser } from "./open.ts";
import { appendChangelog, createTask, initTasks, loadBoard, moveTask, repoRoot } from "gitask-core";
import type { Board, Task } from "gitask-core";
import { findTasksDir, noTasksMessage } from "./find-tasks.ts";
import { assignCmd, githubCmd, parseArgs, peopleCmd, reportCmd, subtaskCmd } from "./commands.ts";

const USAGE = `gitask: Kanban over a Tasks/ folder (folder = status)

  gitask init                       create a Tasks/ folder (six status folders + template) in the current folder
  gitask board                      print the board
  gitask move <task> <column>       move a task (git mv + commit); column = 2-todo or todo
  gitask new <id> [column]          create a task from _TEMPLATE.md (default column: backlog)
  gitask changelog <task>           add a CHANGELOG.md entry for a task (idempotent)
  gitask people [--json]            list contributors (id, name, GitHub login)
  gitask assign <task> <person|none>   set or clear the task Owner (person = id, name or GitHub login)
  gitask subtask add <task> "<text>" [--assign <person>] [--lane <lane>]
  gitask subtask assign <task> <index> <person|none>   index from "subtask list" (0-based)
  gitask subtask list <task>        list a task's checkboxes with their index
  gitask report --format html|md|csv [--from YYYY-MM-DD] [--to YYYY-MM-DD] [--people a,b]
                [--date done|due|updated] [--no-subtasks] [--out file]   done report by person (stdout without --out)
  gitask github plan [task...]      dry run: what a GitHub sync would create/update and who is notified
  gitask github sync --yes [--allow-repo owner/name] [task...]   apply it (token from GITHUB_TOKEN; needs "github" in
                                    Tasks/gitask.json; --allow-repo is required when that repo is not your origin remote)
  gitask serve [--port 4173] [--host 127.0.0.1] [--no-open]   the board in your browser (local, token-protected)

Options: --dir <path>  tasks folder (default: nearest Tasks/ in this or a parent folder)   --no-commit  move without committing`;

function resolveColumn(board: Board, name: string): string {
  const hit = board.columns.find((c) => c.id === name || c.label === name || c.id.startsWith(`${name}-`));
  if (!hit) throw new Error(`Unknown column "${name}". Columns: ${board.columns.map((c) => c.label).join(", ")}`);
  return hit.id;
}

function findTask(board: Board, id: string): Task {
  const name = id.replace(/\.md$/, "");
  const hits = board.columns.flatMap((c) => c.tasks).filter((t) => t.id === name);
  if (hits.length !== 1) throw new Error(hits.length ? `Ambiguous task: ${name}` : `Task not found: ${name}`);
  return hits[0];
}

const cmd0 = (argv: string[]) => argv.find((a) => !a.startsWith("--"));

async function main(argv: string[]) {
  const args = argv.filter((a) => !a.startsWith("--"));
  const flag = (n: string) => argv.includes(`--${n}`);
  const di = argv.indexOf("--dir");
  const dirArg = di >= 0 ? argv[di + 1] : undefined;
  const dir = dirArg ? resolve(dirArg) : (cmd0(argv) === "init" ? resolve("Tasks") : findTasksDir(process.cwd()));
  const positional = args.filter((a) => a !== dirArg);
  const [cmd, a, b] = positional;

  if (!cmd || cmd === "help") return console.log(USAGE);
  if (cmd === "init") {
    const r = await initTasks(dir!);
    console.log(r.created.length ? `Created ${dir}\n${r.created.length} item(s). Next: gitask serve` : `${dir} already set up. Nothing changed.`);
    return;
  }
  if (!dir) throw new Error(noTasksMessage(process.cwd()));
  const board = await loadBoard(dir);

  switch (cmd) {
    case "board":
      for (const c of board.columns) {
        console.log(`\n${c.label} (${c.tasks.length})`);
        for (const t of c.tasks) console.log(`  ${t.tier ?? "--"}  ${t.id}${t.claimedBy ? `  [claimed: ${t.claimedBy}]` : ""}`);
      }
      return;
    case "move": {
      if (!a || !b) throw new Error("usage: gitask move <task> <column>");
      const t = findTask(board, a);
      const r = await moveTask(dir, t.path, resolveColumn(board, b), { commit: !flag("no-commit") });
      console.log(`${t.id}: ${t.column} → ${resolveColumn(board, b)}${r.committed ? " (committed)" : ""}`);
      return;
    }
    case "new": {
      if (!a) throw new Error("usage: gitask new <id> [column]");
      const p = await createTask(dir, resolveColumn(board, b ?? "backlog"), a, { owner: process.env.GIT_AUTHOR_NAME });
      console.log(`created ${p}`);
      return;
    }
    case "changelog": {
      if (!a) throw new Error("usage: gitask changelog <task>");
      const t = findTask(board, a);
      const root = (await repoRoot(join(dir))) ?? resolve(dir, "..");
      const added = await appendChangelog(join(root, "CHANGELOG.md"), t.path, root);
      console.log(added ? `changelog entry added for ${t.id}` : `${t.id} already in changelog`);
      return;
    }
    case "people":
      return peopleCmd(dir, parseArgs(argv));
    case "assign":
      return assignCmd(dir, board, parseArgs(argv), findTask);
    case "subtask":
      return subtaskCmd(dir, board, parseArgs(argv), findTask);
    case "report":
      return reportCmd(dir, board, parseArgs(argv));
    case "github":
      return githubCmd(dir, board, parseArgs(argv));
    case "serve": {
      const val = (n: string) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : undefined; };
      const port = val("port") === undefined ? 4173 : Number(val("port"));
      if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error("--port must be 0-65535");
      const { assets } = await import("./ui-assets.ts"); // lazy: only serve needs the bundled UI
      const srv = await startServer({ dir, port, host: val("host") ?? "127.0.0.1", commit: !flag("no-commit"), owner: process.env.GIT_AUTHOR_NAME, assets });
      const warn = hostWarning(srv.host);
      if (warn) console.error(`\n!!! ${warn}\n`);
      console.log(`GITASK board: ${srv.url}\nServing ${dir}. Ctrl+C to stop.`);
      if (!flag("no-open")) openBrowser(srv.openUrl()); // one-time code, not the token: argv shows up in `ps`
      const stop = () => void srv.close().then(() => process.exit(0));
      process.on("SIGINT", stop); process.on("SIGTERM", stop);
      return new Promise<void>(() => undefined); // run until signalled
    }
    default:
      throw new Error(`Unknown command: ${cmd}\n\n${USAGE}`);
  }
}

main(process.argv.slice(2)).catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
