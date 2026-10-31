import { createHttpHost } from "./http-host.ts";
import { createMockHost } from "./mock-host.ts";
import { createVsCodeHost, hasVsCodeApi } from "./vscode-host.ts";
import type { Host } from "./types.ts";

export type { BoardData, Host, UiState, WebviewMessage, HostMessage } from "./types.ts";

/** Pick the transport for where the UI runs. `__MOCK__` is true only in dev and `--mode mock` builds. */
export function createHost(): Host {
  if (hasVsCodeApi()) return createVsCodeHost();
  if (__MOCK__) return createMockHost();
  return createHttpHost();
}
