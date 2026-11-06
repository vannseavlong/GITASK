/** Pure rules for configurable fields, shared by the parser and the config reader (no I/O, no imports). */

export const RESERVED_FIELD_KEYS: readonly string[] = [
  "id", "repo", "owner", "tier", "claimed", "claimed-by", "worktree", "branch", "started", "updated", "due",
  "docs", "depends", "depends-on", "touches", "status", "title", "lane", "assignee", "people",
];

export const FIELD_KEY_RE = /^[a-z][a-z0-9-]{0,23}$/;
export const FIELD_VALUE_RE = /^[a-z0-9][a-z0-9-]{0,31}$/;

export const isFieldKey = (v: unknown): v is string => typeof v === "string" && FIELD_KEY_RE.test(v) && !RESERVED_FIELD_KEYS.includes(v);
export const isFieldValueId = (v: unknown): v is string => typeof v === "string" && FIELD_VALUE_RE.test(v);
