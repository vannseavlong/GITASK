// Which edit dialog is open. Tiny store (like delete-flow) so any menu can open the one dialog mounted in App.
// No React here, so node:test can run it. The dialog reads the live task from the board by path.
import type { Host } from "../host/index.ts";

export type EditRequest = { kind: "task"; path: string } | { kind: "subtask"; path: string; index: number; line: number };

let pending: { host: Pick<Host, "send">; req: EditRequest } | null = null;
const listeners = new Set<() => void>();
const emit = () => { for (const l of listeners) l(); };

export function requestEdit(host: Pick<Host, "send">, req: EditRequest): void {
  pending = { host, req };
  emit();
}
export const pendingEdit = (): EditRequest | null => pending?.req ?? null;
export const subscribeEdit = (cb: () => void): (() => void) => { listeners.add(cb); return () => void listeners.delete(cb); };
export function closeEdit(): void {
  pending = null;
  emit();
}
