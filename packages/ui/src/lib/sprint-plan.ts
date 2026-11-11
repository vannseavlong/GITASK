// Pure logic of the Sprint tab (planning): which sprint is planned, the capacity bar, the estimate input, the sprint
// dialog's draft and the Start rule. No React, no DOM; tested in packages/vscode/test/sprint-plan.test.ts.

export interface PlanSprint { id: string; name: string; state: "planned" | "active" | "closed"; start?: string; end?: string; goal?: string; capacity?: number }
export interface PlanSprints { list: readonly PlanSprint[]; active?: string }

/** Same limits as core (`MAX_ESTIMATE`, sprint name and goal). */
export const MAX_ESTIMATE = 10000;
export const MAX_SPRINT_NAME = 80;
export const MAX_SPRINT_GOAL = 200;

/**
 * The sprint the tab plans: the sprint in scope when there is one (even closed: shown read-only), else the active
 * sprint, else the newest planned one. `undefined` when there is none to plan.
 */
export function pickPlanSprint(scoped: PlanSprint | undefined, sprints: PlanSprints | undefined): PlanSprint | undefined {
  if (!sprints) return undefined;
  if (scoped) return sprints.list.find((s) => s.id === scoped.id) ?? scoped;
  const active = sprints.active ? sprints.list.find((s) => s.id === sprints.active) : undefined;
  if (active) return active;
  return [...sprints.list].reverse().find((s) => s.state === "planned");
}

/** Sprints the tab may switch to: planned and active, active first, then by number. */
export function plannable(sprints: PlanSprints | undefined): PlanSprint[] {
  const list = (sprints?.list ?? []).filter((s) => s.state !== "closed");
  return [...list.filter((s) => s.state === "active"), ...list.filter((s) => s.state !== "active")];
}

export interface Capacity {
  /** Sum of estimates of the sprint's tasks (missing = 0). */
  points: number;
  capacity?: number;
  /** Filled share of the bar, 0-100 (100 when over). */
  pct: number;
  over: boolean;
  /** `12 / 30 pts`, or `12 pts · no capacity set`. */
  text: string;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

/** Capacity bar: sum of `estimate` against `capacity`. Over means strictly more than the capacity. */
export function capacityOf(estimates: readonly (number | undefined)[], capacity: number | undefined, unit: string): Capacity {
  const points = round2(estimates.reduce<number>((a, e) => a + (e ?? 0), 0));
  if (capacity === undefined) return { points, pct: 0, over: false, text: `${points} ${unit} · no capacity set` };
  const over = points > capacity;
  const pct = capacity === 0 ? (points > 0 ? 100 : 0) : Math.min(100, Math.round((100 * points) / capacity));
  return { points, capacity, pct, over, text: `${points} / ${capacity} ${unit}${over ? ` · ${round2(points - capacity)} over` : ""}` };
}

/** An estimate or capacity as typed: empty = remove (`null`); else 0-10000 with at most 2 decimals. */
export function parseEstimateInput(text: string): { ok: true; value: number | null } | { ok: false; error: string } {
  const v = text.trim();
  if (!v) return { ok: true, value: null };
  if (!/^\d{1,5}(\.\d{1,2})?$/.test(v) || Number(v) > MAX_ESTIMATE) return { ok: false, error: `Use a number from 0 to ${MAX_ESTIMATE} with at most 2 decimals` };
  return { ok: true, value: Number(v) };
}

/** The sprint dialog's form: plain strings, as typed. */
export interface SprintDraft { name: string; goal: string; start: string; end: string; capacity: string }

export const draftOf = (s: PlanSprint | undefined): SprintDraft => ({
  name: s?.name ?? "",
  goal: s?.goal ?? "",
  start: s?.start ?? "",
  end: s?.end ?? "",
  capacity: s?.capacity === undefined ? "" : String(s.capacity),
});

export interface SprintFields { name?: string; goal?: string | null; start?: string | null; end?: string | null; capacity?: number | null }

const DAY = /^\d{4}-\d{2}-\d{2}$/;
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u001f\u007f\u2028\u2029]/;
const CHECKBOX = /(^|\s)[-*]\s+\[[ xX]\]/;
const oneLine = (v: string): string => v.replace(/[\r\n\u2028\u2029]+/g, " ").trim();

function textProblem(v: string, max: number, label: string): string | undefined {
  if ([...v].length > max) return `${label} must be at most ${max} characters`;
  if (CONTROL.test(v)) return `${label} must not contain control characters`;
  if (CHECKBOX.test(v)) return `${label} must not contain checkbox syntax`;
  return undefined;
}

/**
 * Turn the dialog's draft into the fields to send. New sprint (`current` absent): only filled-in fields (an empty name
 * means the default `Sprint <n>`). Edit: only fields that differ from `current`, emptied ones as `null` (the name
 * cannot be emptied). Returns the first problem instead when the draft is not valid.
 */
export function draftFields(d: SprintDraft, current?: PlanSprint): { ok: true; fields: SprintFields } | { ok: false; error: string } {
  const name = oneLine(d.name);
  const goal = oneLine(d.goal);
  const start = d.start.trim();
  const end = d.end.trim();
  const p = (current && !name ? "Name must not be empty" : undefined)
    ?? textProblem(name, MAX_SPRINT_NAME, "Name")
    ?? textProblem(goal, MAX_SPRINT_GOAL, "Goal")
    ?? (start && !DAY.test(start) ? "Start must be a date" : undefined)
    ?? (end && !DAY.test(end) ? "End must be a date" : undefined)
    ?? (start && end && end < start ? "End must not be before Start" : undefined);
  if (p) return { ok: false, error: p };
  const cap = parseEstimateInput(d.capacity);
  if (!cap.ok) return { ok: false, error: `Capacity: ${cap.error.toLowerCase()}` };
  const f: SprintFields = {};
  if (!current) {
    if (name) f.name = name;
    if (goal) f.goal = goal;
    if (start) f.start = start;
    if (end) f.end = end;
    if (cap.value !== null) f.capacity = cap.value;
    return { ok: true, fields: f };
  }
  if (name !== current.name) f.name = name;
  if (goal !== (current.goal ?? "")) f.goal = goal || null;
  if (start !== (current.start ?? "")) f.start = start || null;
  if (end !== (current.end ?? "")) f.end = end || null;
  if (cap.value !== (current.capacity ?? null)) f.capacity = cap.value;
  return { ok: true, fields: f };
}

/** Why "Start sprint" cannot run for `s`, or `undefined` when it can. */
export function startBlocker(s: PlanSprint, sprints: PlanSprints): string | undefined {
  if (s.state === "active") return `${s.id} is already active`;
  if (s.state === "closed") return `${s.id} is closed`;
  const other = sprints.active ? sprints.list.find((x) => x.id === sprints.active && x.id !== s.id) : undefined;
  if (other) return `${other.id} is active. Complete it before starting ${s.id}.`;
  return undefined;
}

/** The drag payload type for a task row (only this pane's drags are accepted). */
export const TASK_DRAG_TYPE = "application/x-gitask-task";
