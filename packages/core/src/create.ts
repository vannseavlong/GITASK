import { localDate } from "./date.ts";
import { lstat, mkdir, readFile, writeFile } from "node:fs/promises";
import { assertRegularFile } from "./taskfile.ts";
import { join } from "node:path";
import { loadBoard } from "./board.ts";
import { nextDisplayId, setIdField } from "./ids.ts";

const FALLBACK = (title: string, owner: string, date: string) => `# ${title}

- **ID:** T-0000
- **Repo:** <repo>
- **Owner:** ${owner}
- **Tier:** T1 · <signals>
- **Claimed by:** none
- **Started / updated:** ${date} / ${date}
- **Due:** none
- **Depends on:** none
- **Touches:** <main files/areas>

## Goal
<1-2 lines>

## Done when
- [ ] <check>
`;

export interface CreateOptions {
  owner?: string;
  today?: string;
}

/** Fields the new-task dialog can set when creating a task. */
export interface CreateTaskFields {
  title?: string;
  description?: string;
  start?: string | null;
  due?: string | null;
  tier?: "T0" | "T1" | "T2" | "T3" | null;
  owner?: string | null;
}

/** Create `<column>/<id>.md` from `_TEMPLATE.md` (or a built-in fallback). Never overwrites. */
export async function createTask(
  tasksDir: string,
  column: string,
  id: string,
  opts: CreateOptions = {},
): Promise<string> {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(id)) throw new Error(`Invalid task id: ${id}`);
  const dest = join(tasksDir, column, `${id}.md`);
  const colDir = join(tasksDir, column);
  const col = await lstat(colDir).catch(() => undefined);
  if (col && (col.isSymbolicLink() || !col.isDirectory())) throw new Error(`Not a status folder: ${column}`);

  const date = opts.today ?? localDate();
  const owner = opts.owner ?? "Owner";
  let body: string;
  try {
    const template = join(tasksDir, "_TEMPLATE.md");
    await assertRegularFile(template, tasksDir); // a symlinked template would copy a foreign file into a task
    body = (await readFile(template, "utf8"))
      .replace(/^#\s+.*$/m, () => `# ${id}`)
      .replaceAll("{{OWNER}}", () => owner)
      .replace(/^(\s*[-*]\s+\*\*Owner:\*\*\s*).*$/m, (_m, head: string) => `${head}${owner}`)
      .replace(/^(\s*[-*]\s+\*\*Started \/ updated:\*\*\s*).*$/m, (_m, head: string) => `${head}${date} / ${date}`);
  } catch {
    body = FALLBACK(id, owner, date);
  }
  const displayId = nextDisplayId(await loadBoard(tasksDir).catch(() => ({ dir: tasksDir, columns: [] })));
  body = setIdField(body, displayId);
  await mkdir(join(tasksDir, column), { recursive: true });
  try {
    await writeFile(dest, body, { flag: "wx" }); // O_EXCL: never follows a planted (even dangling) symlink, never overwrites
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "EEXIST") throw new Error(`Task already exists: ${dest}`);
    throw e;
  }
  return dest;
}

/** Create `<column>/<id>.md` with the new-task dialog fields filled in. Never overwrites. `id` must
 * already be validated (`^[A-Za-z0-9][A-Za-z0-9._-]*$`). `description` goes into the `## Goal`
 * section; `start`/`due` are `YYYY-MM-DD` real days. */
export async function createTaskWithFields(
  tasksDir: string,
  column: string,
  id: string,
  fields: CreateTaskFields = {},
): Promise<string> {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(id)) throw new Error(`Invalid task id: ${id}`);
  const dest = join(tasksDir, column, `${id}.md`);
  const colDir = join(tasksDir, column);
  const col = await lstat(colDir).catch(() => undefined);
  if (col && (col.isSymbolicLink() || !col.isDirectory())) throw new Error(`Not a status folder: ${column}`);

  const date = fields.start ?? localDate();
  const owner = fields.owner ?? "Owner";
  const tier = fields.tier ?? "T1";
  const due = fields.due ?? "";
  const description = fields.description ?? "";
  const body =
    `# ${fields.title ?? id}\n\n` +
    `- **ID:** T-0000\n` +
    `- **Repo:** <repo>\n` +
    `- **Owner:** ${owner}\n` +
    `- **Tier:** ${tier} · <signals>\n` +
    `- **Claimed by:** none\n` +
    `- **Started / updated:** ${date} / ${date}\n` +
    `- **Due:** ${due || "none"}\n` +
    `- **Depends on:** none\n` +
    `- **Touches:** <main files/areas>\n\n` +
    `## Goal\n` +
    `${description.trim() || "<1-2 lines>"}\n\n` +
    `## Done when\n` +
    `- [ ] <check>\n`;
  const displayId = nextDisplayId(await loadBoard(tasksDir).catch(() => ({ dir: tasksDir, columns: [] })));
  const out = setIdField(body, displayId);
  await mkdir(join(tasksDir, column), { recursive: true });
  try {
    await writeFile(dest, out, { flag: "wx" });
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "EEXIST") throw new Error(`Task already exists: ${dest}`);
    throw e;
  }
  return dest;
}
