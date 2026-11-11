// The rule "a delete needs confirmed:true", shared by the VS Code extension and `gitask serve` so the two hosts cannot drift.
// Only the in-app dialog sets `confirmed: true`; `validateMessage` already rejects any other value for it.
import { basename } from "node:path";
import type { WebviewMessage } from "./protocol.ts";

/** Message types that delete something. Every one needs the confirm dialog (a test checks this list against the protocol). */
export const DELETE_MESSAGE_TYPES = ["deleteTask", "deleteColumn", "deleteSubtask"] as const;

/** Why a delete message must be refused, or undefined when it may run. */
export function unconfirmedDelete(m: WebviewMessage): string | undefined {
  if (m.type === "deleteTask" && m.confirmed !== true) return `${basename(m.path, ".md")} was not deleted: deleting needs the confirm dialog.`;
  if (m.type === "deleteColumn" && m.confirmed !== true) return `status ${m.column} was not deleted: deleting needs the confirm dialog.`;
  if (m.type === "deleteSubtask" && m.confirmed !== true) return "the sub-task was not deleted: deleting needs the confirm dialog.";
  return undefined;
}

/** Message types that move or edit many files at once. Each needs the in-app confirm dialog, like a delete. */
export const CONFIRM_MESSAGE_TYPES = ["completeSprint"] as const;

/** Why a bulk write must be refused (no `confirmed: true` from the dialog), or undefined when it may run. */
export function unconfirmedBulk(m: WebviewMessage): string | undefined {
  if (m.type === "completeSprint" && m.confirmed !== true) return `Sprint ${m.id} was not completed: completing needs the confirm dialog. Nothing was changed.`;
  return undefined;
}
