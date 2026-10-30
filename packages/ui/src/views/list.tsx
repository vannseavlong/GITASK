import * as React from "react";
import { ChevronRight } from "lucide-react";
import type { ListRow } from "@host-src/views/list-logic.ts";
import { LIST_COLUMNS, listOptions, listView } from "virtual:gitask-list-logic";
import type { Person } from "gitask-core";
import { Assignee } from "@/components/assignee-avatar.tsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { ViewProps } from "./registry.tsx";
import type { BoardData, Host } from "@/host/index.ts";
import { collapseAll, expandAll, listSubtasks, toggleExpanded } from "@host-src/subtask-logic.ts";
import { SubtaskRows } from "@/components/subtasks.tsx";

const ALL = "__all";
const FILTERS = [
  { key: "status", label: "statuses", name: "status" },
  { key: "tier", label: "tiers", name: "tier" },
  { key: "owner", label: "owners", name: "owner" },
] as const;

/**
 * Extension point for sub-task rows (the next task, Jira-style expansion). Return the content of the row
 * that opens under `row`, or null when the task has nothing to expand. The chevron column and the
 * expansion row below already exist; only this function needs a body.
 */
export function renderRowExpansion(row: ListRow, ctx?: { board: BoardData; host: Host }): React.ReactNode | null {
  const task = ctx?.board.columns.flatMap((c) => c.tasks).find((t) => t.path === row.path);
  if (!task || !ctx || listSubtasks(task).length === 0) return null;
  return <SubtaskRows task={task} host={ctx.host} people={ctx.board.people} />;
}

function ListFilterSelect({ field, label, value, options, onChange }: { field: string; label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <Select value={value || ALL} onValueChange={(v) => onChange(v === ALL ? "" : v)}>
      <SelectTrigger aria-label={`Filter by ${field}`} className="min-w-28">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>All {label}</SelectItem>
        {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function Cell({ r, k, color, people }: { r: ListRow; k: string; color?: string; people?: Person[] }) {
  switch (k) {
    case "owner":
      return <TableCell>{r.owner ? <Assignee owner={r.owner} people={people} /> : null}</TableCell>;
    case "displayId":
      return <TableCell className="whitespace-nowrap font-mono opacity-80">{r.displayId}</TableCell>;
    case "title":
      return <TableCell className="min-w-40 break-words">{r.title}</TableCell>;
    case "status":
      return (
        <TableCell>
          <span
            className={cn("inline-block rounded-full border border-transparent px-2", color && "pl-3")}
            style={color ? { borderColor: color, boxShadow: `inset 4px 0 0 ${color}` } : undefined}
          >
            {r.status}
          </span>
        </TableCell>
      );
    case "progress":
      return (
        <TableCell className="min-w-28 whitespace-nowrap">
          {r.total > 0 && (
            <span className="inline-flex items-center gap-1.5" title={`${r.done} of ${r.total} done`}>
              <Progress value={(r.progress ?? 0) * 100} className="w-14" />
              <span className="text-[11px]">{r.done}/{r.total}</span>
            </span>
          )}
        </TableCell>
      );
    default:
      return <TableCell>{String(r[k as keyof ListRow] ?? "")}</TableCell>;
  }
}

export function ListView({ board, full, ui, update, host, openTask }: ViewProps) {
  const st = ui.list ?? {};
  const set = (patch: Partial<NonNullable<typeof ui.list>>) => update({ list: { ...st, ...patch } });
  const expandedList = st.expanded ?? [];
  const expanded: ReadonlySet<string> = new Set(expandedList);
  const rowRefs = React.useRef<(HTMLTableRowElement | null)[]>([]);

  const { all, shown } = listView(board, st);
  // A remembered filter whose value no longer exists would hide everything: ignore it.
  const f = Object.fromEntries(FILTERS.map(({ key }) => [key, listOptions(all, key).includes((st as Record<string, string | undefined>)[key] ?? "") ? (st as Record<string, string>)[key] : ""]));
  const view = listView(board, { ...st, ...f });
  const rows = view.shown;
  const color: Record<string, string> = {};
  for (const c of board.columns) if (c.color) color[c.label] = c.color;

  const sortBy = (key: string) => {
    if (st.sort !== key) set({ sort: key, dir: "asc" });
    else if (st.dir === "asc") set({ dir: "desc" });
    else set({ sort: "", dir: "" });
  };
  const toggle = (path: string) => set({ expanded: toggleExpanded(expandedList, path) });
  const expandable = rows.filter((r) => renderRowExpansion(r, { board, host }) != null).map((r) => r.path);

  return (
    <div className="p-3">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Input
          type="search"
          className="w-56"
          placeholder="Search title, id, owner"
          aria-label="Search tasks"
          value={st.q ?? ""}
          onChange={(e) => set({ q: e.target.value })}
        />
        {FILTERS.map(({ key, label, name }) => (
          <ListFilterSelect key={key} field={name} label={label} value={f[key]} options={listOptions(all, key)} onChange={(v) => set({ [key]: v })} />
        ))}
        {expandable.length > 0 && (
          <>
            <Button variant="secondary" size="sm" onClick={() => set({ expanded: expandAll(expandable) })}>Expand all</Button>
            <Button variant="secondary" size="sm" onClick={() => set({ expanded: collapseAll() })}>Collapse all</Button>
          </>
        )}
        <span className="ml-auto opacity-80" aria-live="polite">{rows.length} of {all.length}</span>
      </div>
      {rows.length === 0 ? (
        <div className="py-6 opacity-70">{all.length === 0 ? "No tasks yet." : "No tasks match the current filters."}</div>
      ) : (
        <Table>
          <TableCaption>All tasks</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="w-6"><span className="sr-only">Expand</span></TableHead>
              {LIST_COLUMNS.map((c) => {
                const on = st.sort === c.key && (st.dir === "asc" || st.dir === "desc");
                return (
                  <TableHead key={c.key} scope="col" aria-sort={on ? (st.dir === "asc" ? "ascending" : "descending") : "none"}>
                    <Button variant="ghost" size="sm" className={cn("font-semibold", on && "text-primary")} onClick={() => sortBy(c.key)}>
                      {c.label}
                      <span aria-hidden="true">{on ? (st.dir === "asc" ? "▲" : "▼") : ""}</span>
                    </Button>
                  </TableHead>
                );
              })}
              <TableHead scope="col">Open</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => {
              const extra = renderRowExpansion(r, { board, host });
              const isOpen = extra != null && expanded.has(r.path);
              return (
                <React.Fragment key={r.path}>
                  <TableRow
                    ref={(el) => { rowRefs.current[i] = el; }}
                    tabIndex={0}
                    data-testid="list-row"
                    className="cursor-pointer outline-none hover:bg-accent focus-visible:bg-accent focus-visible:ring-1 focus-visible:ring-ring"
                    onClick={() => openTask(r.path)}
                    onKeyDown={(e) => {
                      if (e.target !== e.currentTarget) return;
                      if (e.key === "Enter") { e.preventDefault(); openTask(r.path); }
                      else if (e.key === "ArrowDown") { e.preventDefault(); rowRefs.current[i + 1]?.focus(); }
                      else if (e.key === "ArrowUp") { e.preventDefault(); rowRefs.current[i - 1]?.focus(); }
                      else if (e.key === "ArrowRight" && extra != null && !isOpen) { e.preventDefault(); toggle(r.path); }
                      else if (e.key === "ArrowLeft" && isOpen) { e.preventDefault(); toggle(r.path); }
                    }}
                  >
                    <TableCell className="w-6 p-0 pl-1">
                      {extra != null && (
                        <button
                          type="button"
                          aria-expanded={isOpen}
                          aria-label={`${isOpen ? "Collapse" : "Expand"} ${r.title}`}
                          className="grid size-5 place-items-center rounded-sm outline-none hover:bg-secondary focus-visible:ring-1 focus-visible:ring-ring"
                          onClick={(e) => { e.stopPropagation(); toggle(r.path); }}
                          onKeyDown={(e) => e.stopPropagation()}
                        >
                          <ChevronRight className={cn("size-4 transition-transform", isOpen && "rotate-90")} />
                        </button>
                      )}
                    </TableCell>
                    {LIST_COLUMNS.map((c) => <Cell key={c.key} r={r} k={c.key} color={color[r.status]} people={full.people} />)}
                    <TableCell>
                      <Button
                        variant="secondary"
                        size="sm"
                        aria-label={`Open file ${r.id}`}
                        onClick={(e) => { e.stopPropagation(); host.send({ type: "open", path: r.path }); }}
                        onKeyDown={(e) => e.stopPropagation()}
                      >
                        Open file
                      </Button>
                    </TableCell>
                  </TableRow>
                  {isOpen && (
                    <TableRow data-testid="list-row-expansion" className="bg-sidebar">
                      <TableCell />
                      <TableCell colSpan={LIST_COLUMNS.length + 1}>{extra}</TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
