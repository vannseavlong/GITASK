// Host-side handlers for the people messages. No `vscode` import, so node:test runs them on real repos.
import { addPerson, readPeople, setOwner, type Board } from "gitask-core";
import type { WebviewMessage } from "./protocol.ts";

export interface OwnerOptions { commit?: boolean }

const findTask = (board: Board, path: string) => board.columns.flatMap((c) => c.tasks).find((t) => t.path === path);

/** `setOwner`: the person must be null or a saved person; the task must be on the board. */
export async function handleSetOwner(dir: string, board: Board, m: Extract<WebviewMessage, { type: "setOwner" }>, opts: OwnerOptions = {}): Promise<void> {
  const task = findTask(board, m.path);
  if (!task) throw new Error("task not found");
  if (m.person !== null && !(await readPeople(dir)).some((p) => p.id === m.person)) throw new Error(`unknown person "${m.person}"`);
  await setOwner(task, m.person, opts);
}

/** `addPerson`: save the name in gitask.json; with a `path`, also assign that task to the new person. */
export async function handleAddPerson(dir: string, board: Board, m: Extract<WebviewMessage, { type: "addPerson" }>, opts: OwnerOptions = {}): Promise<void> {
  const people = await addPerson(dir, m.name, opts);
  if (!m.path) return;
  const added = people.find((p) => p.name.toLowerCase() === m.name.replace(/\s+/g, " ").trim().toLowerCase());
  if (added) await handleSetOwner(dir, board, { type: "setOwner", path: m.path, person: added.id }, opts);
}
