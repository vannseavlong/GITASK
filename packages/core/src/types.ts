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
  /** Person id from a trailing `@id` token (only under `## Sub-tasks`); not checked against the people list. */
  assignee?: string;
  /** Lane from a trailing `#lane` token (only under `## Sub-tasks`), e.g. `backend`. */
  lane?: string;
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
  /** Short visible id like `T-0001` from the `ID` header field; undefined when missing or malformed. */
  displayId?: string;
  tier?: string;
  owner?: string;
  claimedBy?: string;
  /** Every checkbox in the file, in file order. */
  subtasks: Subtask[];
  /** Checkboxes under `## Done when` and `## Sub-tasks`; this is what a card shows. */
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

/** `project.layout` of `Tasks/gitask.json`; every field has a default. */
export interface ProjectLayout {
  align: "left" | "center" | "right";
  size: "sm" | "md" | "lg";
  logoPosition: "left" | "top" | "right" | "hidden";
}

/** A validated logo: a file inside `Tasks/` (no bytes here; hosts serve it). */
export interface ProjectLogo {
  /** Relative to the Tasks dir, `/` separated, no `..`. */
  path: string;
  mime: string;
  /** File mtime (ms) and size, so a host can refetch a logo replaced by hand under the same name. */
  version?: string;
}

/** Project identity from `Tasks/gitask.json`. Present on a board only when a title, subtitle or logo is set. */
export interface Project {
  title?: string;
  subtitle?: string;
  logo?: ProjectLogo;
  layout: ProjectLayout;
}

/** One allowed value of a configured field, e.g. `{ id: "admin-portal", label: "Admin Portal" }`. */
export interface FieldValueDef {
  /** Lower-case slug written in task files (`#platform:admin-portal`, `- **Platform:** admin-portal`). */
  id: string;
  label: string;
  /** `#rrggbb`; undefined when not set. */
  color?: string;
}

/** A team-defined pick-list from the `fields` block of `Tasks/gitask.json`, e.g. Platform. */
export interface FieldDef {
  /** Lower-case slug, the header key and the sub-task token prefix. */
  key: string;
  label: string;
  /** More than one value allowed on a task. */
  multi: boolean;
  values: FieldValueDef[];
}

/** Validated settings from `Tasks/gitask.json` that hosts need beyond columns and project. */
export interface BoardConfig {
  fields: FieldDef[];
}

export interface Board {
  /** Absolute path to the tasks directory. */
  dir: string;
  columns: Column[];
  project?: Project;
  /** Present only when at least one field is configured, so a board without the block looks as before. */
  config?: BoardConfig;
}
