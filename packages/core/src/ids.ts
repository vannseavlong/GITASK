import { readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { loadBoard } from "./board.ts";
import { gitAdd, gitCommitPaths, isTracked, repoRoot } from "./git.ts";
import type { Board } from "./types.ts";

/** A display id: `T-` plus digits. Anything else in the `ID` field is treated as missing. */
export const DISPLAY_ID = /^T-\d+$/;

export const formatDisplayId = (n: number): string => `T-${String(n).padStart(4, "0")}`;

const ID_LINE = /^(\s*[-*]\s+\*\*ID:\*\*).*$/im;
const FIELD_LINE = /^\s*[-*]\s+\*\*[^*:]+:\*\*/;

/** The next free display id: highest valid number on the board plus one. */
export function nextDisplayId(board: Board): string {
  let max = 0;
  for (const c of board.columns) for (const t of c.tasks) {
    if (t.displayId) max = Math.max(max, parseInt(t.displayId.slice(2), 10));
  }
  return formatDisplayId(max + 1);
}

/**
 * Return `content` with its header `- **ID:** <id>` line set. Replaces an existing ID line in the
 * header block, otherwise inserts one before the first header field (or after the title).
 * Line endings are kept.
 */
export function setIdField(content: string, id: string): string {
  const eol = content.includes("\r\n") ? "\r\n" : "\n";
  const lines = content.split(/\r?\n/);
  let i = 0;
  if (/^﻿?---\s*$/.test(lines[0] ?? "")) {
    const end = lines.findIndex((l, n) => n > 0 && /^(---|\.\.\.)\s*$/.test(l));
    if (end > 0) i = end + 1;
  }
  const headerEnd = lines.findIndex((l, n) => n >= i && /^##\s/.test(l));
  const stop = headerEnd < 0 ? lines.length : headerEnd;
  const existing = lines.findIndex((l, n) => n >= i && n < stop && ID_LINE.test(l));
  if (existing >= 0) {
    lines[existing] = lines[existing].replace(ID_LINE, `$1 ${id}`);
    return lines.join(eol);
  }
  const line = `- **ID:** ${id}`;
  const firstField = lines.findIndex((l, n) => n >= i && n < stop && FIELD_LINE.test(l));
  if (firstField >= 0) lines.splice(firstField, 0, line);
  else {
    const title = lines.findIndex((l, n) => n >= i && /^#\s+/.test(l));
    if (title >= 0) lines.splice(title + 1, 0, "", line);
    else lines.splice(i, 0, line, "");
  }
  return lines.join(eol);
}

export interface AssignIdsOptions {
  /** Commit the touched files (default true). Only tracked files are committed. */
  commit?: boolean;
  message?: string;
}

export interface AssignIdsResult {
  /** Task paths that got a new ID, with the ID written. */
  assigned: { path: string; displayId: string }[];
  committed: boolean;
}

export const ASSIGN_IDS_MESSAGE = "chore(tasks): assign task IDs";

/**
 * Give every task without a valid, unique display ID the next free one. Never changes an ID that
 * is already valid and first in board order; later duplicates are renumbered. A no-op (no write,
 * no commit) when nothing needs an ID. Commits the touched tracked files by pathspec only.
 */
export async function assignIds(tasksDir: string, opts: AssignIdsOptions = {}): Promise<AssignIdsResult> {
  const board = await loadBoard(tasksDir);
  let next = parseInt(nextDisplayId(board).slice(2), 10);
  const seen = new Set<string>();
  const assigned: AssignIdsResult["assigned"] = [];
  for (const c of board.columns) for (const t of c.tasks) {
    if (t.displayId && !seen.has(t.displayId)) {
      seen.add(t.displayId);
      continue;
    }
    const id = formatDisplayId(next++);
    const raw = await readFile(t.path, "utf8");
    await writeFile(t.path, setIdField(raw, id));
    assigned.push({ path: t.path, displayId: id });
  }

  let committed = false;
  if (assigned.length && opts.commit !== false) {
    const cwd = dirname(assigned[0].path);
    const root = await repoRoot(cwd);
    if (root) {
      const tracked: string[] = [];
      for (const a of assigned) if (await isTracked(dirname(a.path), a.path)) tracked.push(a.path);
      if (tracked.length) {
        await gitAdd(root, ...tracked);
        await gitCommitPaths(root, opts.message ?? ASSIGN_IDS_MESSAGE, ...tracked);
        committed = true;
      }
    }
  }
  return { assigned, committed };
}
