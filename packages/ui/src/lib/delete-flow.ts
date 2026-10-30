// Delete confirmation for hosts without a native dialog (the browser). VS Code asks through its own modal,
// so there `requestDelete` just sends the message and the dialog never opens. No React here, so node:test can run it.
import type { Host, WebviewMessage } from "../host/index.ts";

export type DeleteRequest = { kind: "task"; path: string; label: string } | { kind: "column"; column: string; label: string };

type DeleteHost = Pick<Host, "confirmsDelete" | "send">;

let pending: { host: DeleteHost; req: DeleteRequest } | null = null;
const listeners = new Set<() => void>();
const emit = () => { for (const l of listeners) l(); };

export function deleteMessage(req: DeleteRequest, confirmed: boolean): WebviewMessage {
  if (req.kind === "task") return confirmed ? { type: "deleteTask", path: req.path, confirmed: true } : { type: "deleteTask", path: req.path };
  return confirmed ? { type: "deleteColumn", column: req.column, confirmed: true } : { type: "deleteColumn", column: req.column };
}

/** Ask to delete. A host with its own confirm gets the plain message; a browser gets the dialog first. */
export function requestDelete(host: DeleteHost, req: DeleteRequest): void {
  if (!host.confirmsDelete) return host.send(deleteMessage(req, false));
  pending = { host, req };
  if (req.kind === "task") host.send({ type: "deleteImpact", path: req.path });
  emit();
}

export const pendingDelete = (): DeleteRequest | null => pending?.req ?? null;
export const subscribeDelete = (cb: () => void): (() => void) => { listeners.add(cb); return () => void listeners.delete(cb); };

export function cancelDelete(): void {
  pending = null;
  emit();
}

/** The user pressed Delete in the dialog: only now is the confirmed message sent. */
export function confirmDelete(): void {
  if (!pending) return;
  const { host, req } = pending;
  pending = null;
  host.send(deleteMessage(req, true));
  emit();
}
