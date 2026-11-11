// `gitask sprint ...`, `gitask estimate` and `gitask board --sprint`: thin wrappers over the core sprint writes
// (packages/core/src/sprint-ops.ts). Nothing here edits a file itself. See Docs/architecture/sprints.md.
import { applySprintClose, createSprint, planSprintClose, setEstimate, setTaskSprint, startSprint } from "gitask-core";
import type { Board, BoardSprints, Sprint, SprintClosePlan, Task, UnfinishedAction } from "gitask-core";
import { estimateUnit, scopeBoard, sprintStats, type ResolvedScope } from "../../vscode/src/sprint-scope.ts";
import { checkDate, type Parsed } from "./commands.ts";

type Find = (b: Board, id: string) => Task;

const SPRINTS_OFF = 'Sprints are off: add a "sprint" block to Tasks/gitask.json (for example {"sprint": {}})';

function sprintsOf(board: Board): BoardSprints {
  if (!board.sprints) throw new Error(SPRINTS_OFF);
  return board.sprints;
}

/** A sprint by id (`S7` or `s7`), or `active`; unknown ids are refused. */
function findSprint(board: Board, raw: string): Sprint {
  const sprints = sprintsOf(board);
  if (raw.toLowerCase() === "active") {
    const hit = sprints.list.find((s) => s.id === sprints.active);
    if (!hit) throw new Error("No sprint is active. Start one with: gitask sprint start <id>");
    return hit;
  }
  const id = raw.toUpperCase();
  const hit = sprints.list.find((s) => s.id === id);
  if (!hit) throw new Error(`Unknown sprint "${raw}". Sprints: ${sprints.list.map((s) => s.id).join(", ") || "(none; create one with gitask sprint new)"}`);
  return hit;
}

/** A task by file id (`Core-x`, `Core-x.md`) as elsewhere in the CLI, else by its `ID` header (`T-0101`). */
function findTaskArg(board: Board, arg: string, find: Find): Task {
  try {
    return find(board, arg);
  } catch (e) {
    const hits = board.columns.flatMap((c) => c.tasks).filter((t) => t.displayId && t.displayId.toLowerCase() === arg.toLowerCase());
    if (hits.length === 1) return hits[0];
    throw e;
  }
}

/** A number for an estimate or capacity: digits with an optional fraction (the core checks range and decimals). */
function parseAmount(label: string, text: string | undefined): number {
  if (text === undefined || !/^\d+(\.\d+)?$/.test(text)) throw new Error(`Invalid ${label} "${text ?? ""}": use a number from 0 to 10000 with at most 2 decimals`);
  return Number(text);
}

const committedNote = (r: { committed: boolean }) => (r.committed ? " (committed)" : "");
const range = (s: Sprint) => (s.start || s.end ? `${s.start ?? "?"} → ${s.end ?? "?"}` : "no dates");

function points(n: number, unit: string | undefined): string {
  return unit ? ` · ${n} ${unit}` : "";
}

/** `gitask sprint list|new|start|add|remove|complete ...` */
export async function sprintCmd(dir: string, board: Board, p: Parsed, find: Find): Promise<void> {
  const [, sub, a, b] = p.positional;
  const commit = !p.has("no-commit");
  const sprints = sprintsOf(board);
  switch (sub) {
    case "list":
      return listCmd(board, sprints, p);
    case "new": {
      const capacity = p.value("capacity");
      const r = await createSprint(dir, {
        ...(p.value("name") !== undefined ? { name: p.value("name") } : {}),
        ...(p.value("goal") !== undefined ? { goal: p.value("goal") } : {}),
        ...(p.value("start") !== undefined ? { start: checkDate("start", p.value("start")) } : {}),
        ...(p.value("end") !== undefined ? { end: checkDate("end", p.value("end")) } : {}),
        ...(capacity !== undefined ? { capacity: parseAmount("--capacity", capacity) } : {}),
      }, { commit });
      console.log(`created ${r.sprint.id}: ${r.sprint.name} (planned, ${range(r.sprint)})${committedNote(r)}`);
      return;
    }
    case "start": {
      if (!a) throw new Error("usage: gitask sprint start <id>");
      const s = findSprint(board, a);
      const r = await startSprint(dir, s.id, { commit });
      console.log(`${r.sprint.id}: started (${range(r.sprint)})${committedNote(r)}`);
      return;
    }
    case "add": {
      if (!a) throw new Error("usage: gitask sprint add <task> [sprint]");
      const t = findTaskArg(board, a, find);
      const s = b ? findSprint(board, b) : defaultSprint(sprints);
      const r = await setTaskSprint(t, s.id, { commit });
      console.log(r.changed ? `${t.id}: sprint ${s.id}${committedNote(r)}` : `${t.id}: already in ${s.id}`);
      return;
    }
    case "remove": {
      if (!a) throw new Error("usage: gitask sprint remove <task>");
      const t = findTaskArg(board, a, find);
      const r = await setTaskSprint(t, null, { commit });
      console.log(r.changed ? `${t.id}: back in the backlog (was ${t.sprint ?? "?"})${committedNote(r)}` : `${t.id}: not in a sprint`);
      return;
    }
    case "complete":
      return completeCmd(dir, board, p, find);
    default:
      throw new Error("usage: gitask sprint list|new|start|add|remove|complete ...");
  }
}

/** `sprint add` without a sprint: the active one, else the newest planned one. */
function defaultSprint(sprints: BoardSprints): Sprint {
  const active = sprints.list.find((s) => s.id === sprints.active);
  if (active) return active;
  const planned = sprints.list.filter((s) => s.state === "planned").at(-1);
  if (!planned) throw new Error("No active or planned sprint. Create one with: gitask sprint new");
  return planned;
}

function listCmd(board: Board, sprints: BoardSprints, p: Parsed): void {
  const done = sprints.config.doneColumns;
  const rows = sprints.list.map((s) => ({ s, stats: sprintStats(board, s.id, done) }));
  if (p.has("json")) {
    const out = {
      ...(sprints.active ? { active: sprints.active } : {}),
      estimate: sprints.config.estimate,
      sprints: rows.map(({ s, stats }) => ({
        id: s.id, name: s.name, state: s.state,
        ...(s.start ? { start: s.start } : {}), ...(s.end ? { end: s.end } : {}), ...(s.goal ? { goal: s.goal } : {}),
        ...(s.capacity !== undefined ? { capacity: s.capacity } : {}),
        ...stats,
      })),
      warnings: sprints.warnings ?? [],
    };
    return console.log(JSON.stringify(out, null, 2));
  }
  for (const w of sprints.warnings ?? []) console.log(`warning: ${w}`);
  if (!rows.length) return console.log("No sprints yet. Create one with: gitask sprint new");
  const unit = estimateUnit(sprints.config.estimate);
  for (const { s, stats } of rows) {
    const pts = unit ? `  ${stats.donePoints}/${stats.points}${s.capacity !== undefined ? ` (capacity ${s.capacity})` : ""} ${unit}` : "";
    console.log(`${s.id === sprints.active ? "*" : " "} ${s.id}  ${s.state.padEnd(7)}  ${s.name}  ${range(s)}  ${stats.done}/${stats.total} tasks${pts}${s.goal ? `  goal: ${s.goal}` : ""}`);
  }
}

/**
 * `gitask sprint complete <id> [--unfinished backlog|next] [--next <task>] [--backlog <task>] [--keep-status] [--dry-run] [--yes]`.
 * Always prints the plan. Applies only with `--yes` (and without `--dry-run`); blockers exit non-zero and change nothing.
 */
async function completeCmd(dir: string, board: Board, p: Parsed, find: Find): Promise<void> {
  const [, , raw] = p.positional;
  if (!raw) throw new Error("usage: gitask sprint complete <id> [--unfinished backlog|next] [--next <task>] [--backlog <task>] [--keep-status] [--dry-run] [--yes]");
  const sprint = findSprint(board, raw);
  const all = p.value("unfinished");
  if (all !== undefined && all !== "backlog" && all !== "next") throw new Error(`Invalid --unfinished "${all}": use backlog or next`);
  const resetStatus = p.has("keep-status") ? null : undefined;

  // Base plan (config defaults) tells which tasks are unfinished; then apply --unfinished and the per-task overrides.
  const base = planSprintClose(board, sprint.id, {}, resetStatus);
  const actions: Record<string, UnfinishedAction> = {};
  if (all) for (const u of base.unfinished) actions[u.path] = all;
  for (const action of ["next", "backlog"] as const) {
    for (const arg of p.all(action)) {
      const t = findTaskArg(board, arg, find);
      if (!base.unfinished.some((u) => u.path === t.path)) throw new Error(`${t.id} is not an unfinished task of ${sprint.id}`);
      actions[t.path] = action;
    }
  }
  const plan = planSprintClose(board, sprint.id, actions, resetStatus);
  printPlan(board, sprint, plan);

  if (plan.blockers.length) throw new Error(`\nSprint ${plan.id} cannot be completed (${plan.blockers.length} blocker${plan.blockers.length === 1 ? "" : "s"}); nothing was changed.`);
  if (p.has("dry-run") || !p.has("yes")) {
    console.log(`\nDry run: nothing was changed. Add --yes to apply.`);
    return;
  }
  const r = await applySprintClose(dir, { id: plan.id, actions, resetStatus }, plan.planHash, { commit: !p.has("no-commit") });
  const s = r.summary;
  console.log(`\nCompleted ${plan.id}: ${s.done.tasks} done, ${s.toBacklog.length} to backlog, ${s.toNext.length} to ${plan.next}${r.created ? ` (created ${plan.next})` : ""}`);
  console.log(r.committed ? `committed: ${r.message}` : "not committed (autoCommit off or files not tracked)");
}

function printPlan(board: Board, sprint: Sprint, plan: SprintClosePlan): void {
  const unit = estimateUnit(board.sprints!.config.estimate);
  const title = new Map(board.columns.flatMap((c) => c.tasks).map((t) => [t.path, t.title]));
  const est = (e: number | undefined) => (unit && e !== undefined ? `  ${e} ${unit}` : "");
  const s = plan.summary;
  console.log(`Complete ${sprint.id} · ${sprint.name} (${sprint.state})`);
  console.log(`Committed: ${s.committed.tasks} tasks${points(s.committed.points, unit)}   Done: ${s.done.tasks}${points(s.done.points, unit)}`);
  console.log(`\nDone (${plan.done.length}): stay where they are`);
  for (const t of plan.done) console.log(`  ${t.label}  ${title.get(t.path) ?? ""}  [${t.column}]${est(t.estimate)}`);
  console.log(`\nUnfinished (${plan.unfinished.length}):`);
  for (const u of plan.unfinished) {
    const where = u.to === u.column ? `stays in ${u.column}` : `${u.column} → ${u.to}`;
    console.log(`  ${u.label}  ${title.get(u.path) ?? ""}  ${u.action === "backlog" ? "backlog" : `next (${plan.next})`}, ${where}${est(u.estimate)}`);
  }
  for (const w of plan.warnings) console.log(`warning: ${w}`);
  for (const b of plan.blockers) console.log(`blocked: ${b}`);
}

/** `gitask estimate <task> <n|none>`. Works whether sprints are on or off (it is only a task header). */
export async function estimateCmd(board: Board, p: Parsed, find: Find): Promise<void> {
  const [, tid, value] = p.positional;
  if (!tid || value === undefined) throw new Error("usage: gitask estimate <task> <n|none>");
  const t = findTaskArg(board, tid, find);
  const n = value === "none" ? null : parseAmount("estimate", value);
  const r = await setEstimate(t, n, { commit: !p.has("no-commit") });
  console.log(r.changed ? `${t.id}: estimate ${n ?? "(none)"}${committedNote(r)}` : `${t.id}: estimate already ${n ?? "(none)"}`);
}

/**
 * The board narrowed by `--sprint <id|active|backlog>` (same rule as the UI switcher: backlog = no Sprint header and not
 * done), plus a header line to print; the board itself when the flag is not used.
 */
export function boardForSprint(board: Board, p: Parsed): { board: Board; header?: string } {
  const raw = p.value("sprint");
  if (raw === undefined) return { board };
  const sprints = sprintsOf(board);
  if (raw.toLowerCase() === "backlog") {
    const scope: ResolvedScope = { kind: "backlog", value: "backlog" };
    return { board: scopeBoard(board, scope, sprints), header: "Backlog (tasks in no sprint, not done)" };
  }
  const s = findSprint(board, raw);
  const scope: ResolvedScope = { kind: "sprint", value: s.id, sprint: s };
  const st = sprintStats(board, s.id, sprints.config.doneColumns);
  const unit = estimateUnit(sprints.config.estimate);
  const pts = unit ? ` · ${st.donePoints}/${st.points}${s.capacity !== undefined ? ` (capacity ${s.capacity})` : ""} ${unit}` : "";
  return { board: scopeBoard(board, scope, sprints), header: `${s.id} · ${s.name} (${s.state}, ${range(s)}) · ${st.done}/${st.total} tasks${pts}${s.goal ? `\nGoal: ${s.goal}` : ""}` };
}
