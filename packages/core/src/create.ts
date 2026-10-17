import { localDate } from "./date.ts";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const FALLBACK = (title: string, owner: string, date: string) => `# ${title}

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

/** Create `<column>/<id>.md` from `_TEMPLATE.md` (or a built-in fallback). Never overwrites. */
export async function createTask(
  tasksDir: string,
  column: string,
  id: string,
  opts: CreateOptions = {},
): Promise<string> {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(id)) throw new Error(`Invalid task id: ${id}`);
  const dest = join(tasksDir, column, `${id}.md`);
  const exists = await access(dest).then(() => true, () => false);
  if (exists) throw new Error(`Task already exists: ${dest}`);

  const date = opts.today ?? localDate();
  const owner = opts.owner ?? "Owner";
  let body: string;
  try {
    body = (await readFile(join(tasksDir, "_TEMPLATE.md"), "utf8"))
      .replace(/^#\s+.*$/m, `# ${id}`)
      .replaceAll("{{OWNER}}", owner)
      .replace(/^(\s*[-*]\s+\*\*Owner:\*\*\s*).*$/m, `$1${owner}`)
      .replace(/^(\s*[-*]\s+\*\*Started \/ updated:\*\*\s*).*$/m, `$1${date} / ${date}`);
  } catch {
    body = FALLBACK(id, owner, date);
  }
  await mkdir(join(tasksDir, column), { recursive: true });
  await writeFile(dest, body);
  return dest;
}
