import { join, resolve } from "node:path";
import { appendChangelog, createTask, loadBoard, moveTask, repoRoot } from "gitask-core";
import type { Board, Task } from "gitask-core";
import { assignCmd, parseArgs, peopleCmd, reportCmd, subtaskCmd } from "./commands.ts";

const USAGE = `gitask: Kanban over a Tasks/ folder (folder = status)

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

Options: --dir <path>  tasks folder (default ./Tasks)   --no-commit  move without committing`;

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

async function main(argv: string[]) {
  const args = argv.filter((a) => !a.startsWith("--"));
  const flag = (n: string) => argv.includes(`--${n}`);
  const di = argv.indexOf("--dir");
  const dirArg = di >= 0 ? argv[di + 1] : undefined;
  const dir = resolve(dirArg ?? "Tasks");
  const positional = args.filter((a) => a !== dirArg);
  const [cmd, a, b] = positional;

  if (!cmd || cmd === "help") return console.log(USAGE);
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
    default:
      throw new Error(`Unknown command: ${cmd}\n\n${USAGE}`);
  }
}

main(process.argv.slice(2)).catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
