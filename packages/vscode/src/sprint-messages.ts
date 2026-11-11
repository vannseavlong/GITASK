// Sprint planning messages, shared by the VS Code extension and `gitask serve` (like owner.ts). The message is already
// validated by `validateMessage` (ids against the board, number, date and text rules); core re-checks before writing.
import { SprintCloseError, applySprintClose, assertRegularFile, createSprint, loadBoard, planSprintClose, setEstimate, setTaskSprint, startSprint, unconfirmedBulk, updateSprint } from "gitask-core";
import type { Board, HostMessage, SprintClosePlan, SprintClosePlanView, WebviewMessage } from "gitask-core";

type SprintMessage = Extract<WebviewMessage, { type: "createSprint" | "updateSprint" | "startSprint" }>;
type TaskSprintMessage = Extract<WebviewMessage, { type: "setTaskSprint" | "setEstimate" }>;
export type SprintSaved = Extract<HostMessage, { type: "sprintSaved" }>;
type ClosePlanMessage = Extract<WebviewMessage, { type: "sprintClosePlan" }>;
type CompleteMessage = Extract<WebviewMessage, { type: "completeSprint" }>;
export type ClosePlanResult = Extract<HostMessage, { type: "sprintClosePlanResult" }>;
export type SprintCompleted = Extract<HostMessage, { type: "sprintCompleted" }>;

/** The sprint list for `ValidationContext.sprints` (absent when sprints are off). */
export const sprintContext = (board: Board): { id: string; state: string }[] | undefined =>
  board.sprints?.list.map((s) => ({ id: s.id, state: s.state }));

/** Create, edit or start a sprint. Never throws: the answer is a `sprintSaved` message. */
export async function handleSprintMessage(dir: string, m: SprintMessage, opts: { commit?: boolean }): Promise<SprintSaved> {
  const action = m.type === "createSprint" ? "create" : m.type === "updateSprint" ? "update" : "start";
  try {
    const r =
      m.type === "createSprint" ? await createSprint(dir, m.sprint, opts)
      : m.type === "updateSprint" ? await updateSprint(dir, m.id, m.patch, opts)
      : await startSprint(dir, m.id, opts);
    return { type: "sprintSaved", action, ok: true, id: r.sprint.id };
  } catch (e) {
    return { type: "sprintSaved", action, ok: false, ...(m.type !== "createSprint" ? { id: m.id } : {}), error: (e as Error).message };
  }
}

/** Put a task into a sprint or set its estimate. The task must be on `board`; throws with the reason otherwise. */
export async function handleTaskSprintMessage(board: Board, m: TaskSprintMessage, opts: { commit?: boolean }): Promise<void> {
  const task = board.columns.flatMap((c) => c.tasks).find((t) => t.path === m.path);
  if (!task) throw new Error("task not found");
  if (m.type === "setTaskSprint") await setTaskSprint(task, m.sprint, opts);
  else await setEstimate(task, m.value, opts);
}

/**
 * After a `new` message with `sprint`: put the just-created task into it. A new file is not tracked yet, so nothing is
 * committed. Throws with a message naming the task when the sprint cannot take it (the task itself stays).
 */
export async function putNewTaskInSprint(dir: string, file: string, sprint: string, opts: { commit?: boolean }): Promise<void> {
  const task = (await loadBoard(dir)).columns.flatMap((c) => c.tasks).find((t) => t.path === file);
  try {
    if (!task) throw new Error("task not found");
    await setTaskSprint(task, sprint, opts);
  } catch (e) {
    throw new Error(`created ${task?.id ?? file}, but could not add it to ${sprint}: ${(e as Error).message}`);
  }
}

/**
 * What the dialog may see of a close plan: board paths, labels, titles, columns and estimates. Drops the target paths
 * (`toPath`) and the plan hash (sent beside it); never reads a file.
 */
export function toClosePlanView(plan: SprintClosePlan, board: Board): SprintClosePlanView {
  const title = new Map(board.columns.flatMap((c) => c.tasks).map((t) => [t.path, t.title]));
  const task = (t: SprintClosePlan["done"][number]) => ({
    path: t.path, label: t.label, title: title.get(t.path) ?? t.id, column: t.column, ...(t.estimate !== undefined ? { estimate: t.estimate } : {}),
  });
  return {
    id: plan.id, next: plan.next, createNext: plan.createNext, resetStatus: plan.resetStatus, actions: { ...plan.actions },
    done: plan.done.map(task),
    unfinished: plan.unfinished.map((u) => ({
      ...task(u), action: u.action, to: u.to, ...(u.claimedBy ? { claimedBy: u.claimedBy } : {}), ...(u.worktree ? { worktree: u.worktree } : {}),
    })),
    summary: { committed: { ...plan.summary.committed }, done: { ...plan.summary.done }, toBacklog: [...plan.summary.toBacklog], toNext: [...plan.summary.toNext] },
    blockers: [...plan.blockers],
    warnings: [...plan.warnings],
  };
}

/** Dry run of a sprint close on the current board (reads nothing else, writes nothing). Never throws. */
export function handleSprintClosePlan(board: Board, m: ClosePlanMessage): ClosePlanResult {
  try {
    const plan = planSprintClose(board, m.id, m.actions ?? {}, m.resetStatus);
    return { type: "sprintClosePlanResult", plan: toClosePlanView(plan, board), planHash: plan.planHash };
  } catch (e) {
    return { type: "sprintClosePlanResult", error: (e as Error).message };
  }
}

/**
 * Complete a sprint with the plan the dialog showed. Refused without `confirmed` (only the dialog sets it), for a path
 * that is not a regular task file on the current board, and by core when the plan hash is stale or the plan has
 * blockers. Core plans again, writes everything or nothing and makes one commit. Never throws.
 */
export async function handleCompleteSprint(dir: string, m: CompleteMessage, opts: { commit?: boolean }): Promise<SprintCompleted> {
  const unconfirmed = unconfirmedBulk(m);
  if (unconfirmed) return { type: "sprintCompleted", ok: false, error: unconfirmed };
  try {
    const board = await loadBoard(dir);
    const onBoard = new Set(board.columns.flatMap((c) => c.tasks).map((t) => t.path));
    for (const p of Object.keys(m.actions)) {
      if (!onBoard.has(p)) throw new SprintCloseError("stale", "A task in the plan is no longer on the board, so nothing was changed. Plan again.");
      await assertRegularFile(p, dir); // never move or edit through a symlink
    }
    const r = await applySprintClose(dir, { id: m.id, actions: m.actions, resetStatus: m.resetStatus }, m.planHash, opts);
    const next = `S${Number(m.id.slice(1)) + 1}`;
    const exists = (await loadBoard(dir)).sprints?.list.some((s) => s.id === next) ?? false;
    return { type: "sprintCompleted", ok: true, summary: r.summary, committed: r.committed, ...(exists ? { next } : {}) };
  } catch (e) {
    const stale = e instanceof SprintCloseError && e.kind === "stale";
    const msg = (e as Error).message;
    return { type: "sprintCompleted", ok: false, error: /nothing was changed/i.test(msg) ? msg : `${msg.replace(/\.$/, "")}. Nothing was changed.`, ...(stale ? { stale: true as const } : {}) };
  }
}
