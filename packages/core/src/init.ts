import { access, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

/** The status folders of a board, in order. A task's folder is its status. */
export const STATUS_FOLDERS = ["1-backlog", "2-todo", "3-in-progress", "4-testing", "5-done", "6-deploy"] as const;

const TEMPLATE = `# <Task title>

- **Owner:** {{OWNER}}
- **Started / updated:** <date> / <date>
- **Due:** none
- **Depends on:** none

## Goal
<1-2 lines>

## Done when
- [ ] <check>
`;

export interface InitResult {
  /** Paths created by this call; empty when the board already existed. */
  created: string[];
}

const exists = (p: string) => access(p).then(() => true, () => false);

/**
 * Scaffold a Tasks folder: the six status folders (each with a `.gitkeep` so git tracks it empty)
 * and a `_TEMPLATE.md` that `createTask` copies. Idempotent: never overwrites anything that exists.
 */
export async function initTasks(tasksDir: string): Promise<InitResult> {
  const created: string[] = [];
  for (const id of STATUS_FOLDERS) {
    const dir = join(tasksDir, id);
    if (!(await exists(dir))) {
      await mkdir(dir, { recursive: true });
      await writeFile(join(dir, ".gitkeep"), "");
      created.push(dir);
    }
  }
  const template = join(tasksDir, "_TEMPLATE.md");
  if (!(await exists(template))) {
    await writeFile(template, TEMPLATE);
    created.push(template);
  }
  return { created };
}
