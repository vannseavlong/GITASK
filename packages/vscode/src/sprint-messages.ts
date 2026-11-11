// Sprint planning messages, shared by the VS Code extension and `gitask serve` (like owner.ts). The message is already
// validated by `validateMessage` (ids against the board, number, date and text rules); core re-checks before writing.
import { createSprint, loadBoard, setEstimate, setTaskSprint, startSprint, updateSprint } from "gitask-core";
import type { Board, HostMessage, WebviewMessage } from "gitask-core";

type SprintMessage = Extract<WebviewMessage, { type: "createSprint" | "updateSprint" | "startSprint" }>;
type TaskSprintMessage = Extract<WebviewMessage, { type: "setTaskSprint" | "setEstimate" }>;
export type SprintSaved = Extract<HostMessage, { type: "sprintSaved" }>;

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
