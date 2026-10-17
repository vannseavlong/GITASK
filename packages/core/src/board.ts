import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { parseTask } from "./parse.ts";
import type { Board, Column } from "./types.ts";

/** Numbered folders (`1-backlog`, `2-todo`, …) are columns; `_inbox`, `_plans` and friends are not. */
const COLUMN_DIR = /^\d+-.+/;

export const columnLabel = (id: string): string => id.replace(/^\d+-/, "");

export async function loadBoard(dir: string): Promise<Board> {
  const entries = await readdir(dir, { withFileTypes: true });
  const ids = entries
    .filter((e) => e.isDirectory() && COLUMN_DIR.test(e.name))
    .map((e) => e.name)
    .sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

  const listed = await Promise.all(
    ids.map(async (id) => ({
      id,
      files: (await readdir(join(dir, id))).filter((f) => f.endsWith(".md")).sort(),
    })),
  );
  const known = new Set(listed.flatMap((c) => c.files.map((f) => f.replace(/\.md$/, ""))));

  const columns: Column[] = [];
  for (const { id, files } of listed) {
    const tasks = await Promise.all(
      files.map(async (f) => {
        const path = join(dir, id, f);
        return parseTask(path, id, await readFile(path, "utf8"), known);
      }),
    );
    columns.push({ id, label: columnLabel(id), tasks });
  }
  return { dir, columns };
}
