import { basename } from "node:path";
import type { WebviewMessage } from "./protocol.ts";

/** Why a delete message must be refused, or undefined when it may run. Only the in-app dialog sets `confirmed: true`. */
export function unconfirmedDelete(m: WebviewMessage): string | undefined {
  if (m.type === "deleteTask" && m.confirmed !== true) return `${basename(m.path, ".md")} was not deleted: deleting needs the confirm dialog.`;
  if (m.type === "deleteColumn" && m.confirmed !== true) return `status ${m.column} was not deleted: deleting needs the confirm dialog.`;
  if (m.type === "deleteSubtask" && m.confirmed !== true) return "the sub-task was not deleted: deleting needs the confirm dialog.";
  return undefined;
}
