/** One checkbox (`- [ ]` / `- [x]`) found in a task file. */
export interface Subtask {
  /** Text of the nearest `##` heading above it, or `""` before the first one. */
  section: string;
  text: string;
  checked: boolean;
  /** 1-based line number in the file. */
  line: number;
  /** 0-based offset of the checkbox character (the space or `x`) within that line. */
  col: number;
}

export interface Progress {
  done: number;
  total: number;
}

export interface Task {
  /** File name without `.md`, e.g. `Core-parse-board`. */
  id: string;
  title: string;
  /** Absolute path to the task file. */
  path: string;
  /** Folder name the task sits in, e.g. `2-todo`. */
  column: string;
  /** Header fields from `- **Key:** value` lines, keys lower-cased. */
  fields: Record<string, string>;
  prefix: string;
  tier?: string;
  owner?: string;
  claimedBy?: string;
  /** Every checkbox in the file, in file order. */
  subtasks: Subtask[];
  /** Checkboxes under `## Done when` only; this is what a card shows. */
  progress: Progress;
  /** `YYYY-MM-DD` from the optional `Due` field; undefined when missing or not a real date. */
  due?: string;
  /** Ids of existing tasks named in `Depends on`. */
  dependsOn: string[];
}

export interface Column {
  /** Folder name, e.g. `2-todo`. */
  id: string;
  /** Display name, e.g. `todo`. */
  label: string;
  /** `#rrggbb` from `gitask.json`; undefined when not set. */
  color?: string;
  tasks: Task[];
}

export interface Board {
  /** Absolute path to the tasks directory. */
  dir: string;
  columns: Column[];
}
