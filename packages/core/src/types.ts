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
}

export interface Column {
  /** Folder name, e.g. `2-todo`. */
  id: string;
  /** Display name, e.g. `todo`. */
  label: string;
  tasks: Task[];
}

export interface Board {
  /** Absolute path to the tasks directory. */
  dir: string;
  columns: Column[];
}
