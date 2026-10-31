import { execFile } from "node:child_process";

/** The launcher command for a URL. Only ever called with a URL that holds a one-time code, never the token (argv is visible in `ps`). */
export function launcher(url: string, platform: string = process.platform): [string, ...string[]] {
  return platform === "darwin" ? ["open", url] : platform === "win32" ? ["cmd", "/c", "start", "", url] : ["xdg-open", url];
}

export function openBrowser(url: string, run: (cmd: string, args: string[]) => void = (c, a) => execFile(c, a, () => undefined).unref()): void {
  const [cmd, ...args] = launcher(url);
  try { run(cmd, args); } catch { /* print-only is fine */ }
}
