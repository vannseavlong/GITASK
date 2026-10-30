// Pure (no node, no vscode, no core runtime): used by the export dialog in the browser and by tests.
import type { ReportFormat, ReportRequest } from "./protocol.ts";

/** The slice of the shell's state the export dialog starts from. */
export interface FilterState {
  range?: { from?: string; to?: string; field?: string };
  /** Person ids selected in the shared People filter (Ext-ui-assign), if it exists. */
  people?: string[];
}

const day = (v: unknown): string => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : "");

/**
 * Pre-fill the report from the active filter. The board's date field (`due`/`updated`) carries over;
 * with no active period the report defaults to "done this calendar month", the common manager question.
 * The text filter and hidden statuses do not apply: a report always covers 5-done and 6-deploy.
 */
export function filterToReportRequest(f: FilterState, today: string): ReportRequest {
  const from = day(f.range?.from);
  const to = day(f.range?.to);
  const field = f.range?.field;
  const active = Boolean(from || to);
  const dateField: ReportRequest["dateField"] = active && (field === "due" || field === "updated") ? field : "done";
  const month = today.slice(0, 7);
  const [y, m] = [Number(today.slice(0, 4)), Number(today.slice(5, 7))];
  const last = String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, "0");
  return {
    from: active ? from : `${month}-01`,
    to: active ? to : `${month}-${last}`,
    dateField,
    people: [...new Set(f.people ?? [])],
    includeSubtasks: true,
  };
}


export interface PersonChoice { id: string; label: string }

/**
 * People to pick from: the board's `people` when the host sends them (Ext-ui-assign), plus any task
 * owner not in that list (keyed `name:<lowercase>`, the same key the report gives unknown owners).
 */
export function peopleChoices(board: { people?: { id: string; name: string; github?: string }[]; columns: { tasks: { owner?: string }[] }[] } | null): PersonChoice[] {
  const out = new Map<string, PersonChoice>();
  const known = new Set<string>();
  for (const p of board?.people ?? []) {
    out.set(p.id, { id: p.id, label: p.github || p.name });
    for (const k of [p.id, p.name, p.github]) if (k) known.add(k.trim().replace(/^@/, "").toLowerCase());
  }
  for (const c of board?.columns ?? []) {
    for (const t of c.tasks) {
      const o = (t.owner ?? "").trim();
      const key = o.replace(/^@/, "").toLowerCase();
      if (!o || o.includes("@") || known.has(key) || out.has(`name:${key}`)) continue;
      out.set(`name:${key}`, { id: `name:${key}`, label: o });
    }
  }
  return [...out.values()].sort((a, b) => a.label.localeCompare(b.label));
}

const EXT: Record<ReportFormat, string> = { html: "html", markdown: "md", csv: "csv" };
export function reportFileName(o: ReportRequest, format: ReportFormat): string {
  return `gitask-report-${o.from || "start"}_${o.to || "end"}.${EXT[format]}`;
}

