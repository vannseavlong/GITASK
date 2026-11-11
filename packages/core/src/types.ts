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
  /** Configurable-field values from trailing `#key:id` tokens (only under `## Sub-tasks`), e.g. `{ platform: ["app"] }`. Not checked against the config. */
  values?: Record<string, string[]>;
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
  /** Values of configured fields from the header (`- **Platform:** app, admin-portal`), by field key. Set by `loadBoard` only when fields are configured. */
  values?: Record<string, string[]>;
  /** Sprint id from the `- **Sprint:** S7` header; absent when missing or malformed (the task is in the backlog). Not checked against `_sprints/`. */
  sprint?: string;
  /** Size from the `- **Estimate:** 3` header: a number >= 0 with at most 2 decimals; absent when missing or malformed. */
  estimate?: number;
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

/** Unit of `Task.estimate` and `Sprint.capacity`; `none` hides points in the UI. */
export type EstimateUnit = "points" | "hours" | "none";
/** What closing a sprint does with an unfinished task by default. */
export type UnfinishedAction = "backlog" | "next";
export type SprintState = "planned" | "active" | "closed";

/** Validated `sprint` block of `Tasks/gitask.json`; every key has a default (see Docs/architecture/sprints.md). */
export interface SprintConfig {
  /** Days from Start to End when a sprint starts, 1 to 60. */
  lengthDays: number;
  estimate: EstimateUnit;
  /** Column ids whose tasks count as done. */
  doneColumns: string[];
  unfinished: UnfinishedAction;
  /** Column a carried-over task is reset to, or `null` to keep its status. */
  resetStatus: string | null;
}

/** One sprint file, `Tasks/_sprints/S<n>.md`. Optional fields are absent when missing or malformed. */
export interface Sprint {
  /** `S<n>`, from the file name. */
  id: string;
  /** The `<n>` of the id; sprints sort by it. */
  number: number;
  /** `# heading` of the file, or `Sprint <n>`. */
  name: string;
  /** `State` header; missing or unknown means `planned`. */
  state: SprintState;
  /** `YYYY-MM-DD`. */
  start?: string;
  /** `YYYY-MM-DD`, never before `start`. */
  end?: string;
  goal?: string;
  /** Planned size in the estimate unit, >= 0. */
  capacity?: number;
  /** Absolute path to the sprint file. */
  path: string;
}

/** Sprint data of a board. Present only when `Tasks/gitask.json` has a `sprint` block. */
export interface BoardSprints {
  config: SprintConfig;
  /** Every valid sprint file, sorted by number. */
  list: Sprint[];
  /** Id of the active sprint; with several marked active, the lowest number wins. */
  active?: string;
  /** Problems found while reading, for hosts to show (e.g. two active sprints). Absent when none. */
  warnings?: string[];
}

export interface Board {
  /** Absolute path to the tasks directory. */
  dir: string;
  columns: Column[];
  project?: Project;
  /** Present only when at least one field is configured, so a board without the block looks as before. */
  config?: BoardConfig;
  /** Present only when sprints are turned on (a `sprint` block in `gitask.json`). */
  sprints?: BoardSprints;
}
