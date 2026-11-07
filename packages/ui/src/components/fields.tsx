import type { FieldDef } from "gitask-core";
import { Check, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { BoardData, UiState } from "@/host/index.ts";
import { pruneFieldSelection } from "@core-src/field-filter.ts";

const NONE = "__none";

/** Own-property read: a field key such as `constructor` never reaches the prototype. */
export const valuesOf = (values: Record<string, string[]> | undefined, key: string): string[] => (values && Object.hasOwn(values, key) ? values[key] : []);

/** The label of a value id; an id the config does not list is shown as written. */
const labelOf = (f: FieldDef, id: string) => f.values.find((v) => v.id === id)?.label ?? id;

/** Small badges for the values a task or sub-task holds, one per configured field value. */
export function FieldBadges({ fields, values, className }: { fields?: readonly FieldDef[]; values?: Record<string, string[]>; className?: string }) {
  if (!fields?.length || !values) return null;
  const badges = fields.flatMap((f) =>
    valuesOf(values, f.key).map((id) => {
      const def = f.values.find((v) => v.id === id);
      return (
        <Badge
          key={`${f.key}:${id}`}
          data-testid="field-badge"
          title={def ? f.label : `${f.label}: "${id}" is not in gitask.json`}
          className={cn(!def && "opacity-60")}
          style={def?.color ? { borderColor: def.color } : undefined}
        >
          {labelOf(f, id)}
        </Badge>
      );
    }),
  );
  return badges.length ? <span className={cn("inline-flex flex-wrap items-center gap-1", className)}>{badges}</span> : null;
}

/**
 * Picker for one field. A single-value field is a select; a `multi` field is a row of toggle buttons.
 * A value the config does not list stays visible and can be removed.
 */
export function FieldPicker({ field, value, onChange, label }: { field: FieldDef; value: readonly string[]; onChange: (ids: string[]) => void; label: string }) {
  const unknown = value.filter((id) => !field.values.some((v) => v.id === id));
  if (!field.multi) {
    const current = value[0];
    return (
      <Select value={current ?? NONE} onValueChange={(v) => onChange(v === NONE ? [] : [v])}>
        <SelectTrigger aria-label={label} className="h-7 min-w-24 text-xs" onClick={(e) => e.stopPropagation()}><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>No {field.label.toLowerCase()}</SelectItem>
          {field.values.map((v) => <SelectItem key={v.id} value={v.id}>{v.label}</SelectItem>)}
          {unknown.map((id) => <SelectItem key={id} value={id}>{id} (not in gitask.json)</SelectItem>)}
        </SelectContent>
      </Select>
    );
  }
  // A change keeps the listed values only: an id the config no longer has would be refused by the host.
  const known = (ids: readonly string[]) => ids.filter((id) => field.values.some((v) => v.id === id));
  const toggle = (id: string) => onChange(known(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]));
  return (
    <span role="group" aria-label={label} className="inline-flex flex-wrap gap-1">
      {[...field.values.map((v) => ({ id: v.id, label: v.label })), ...unknown.map((id) => ({ id, label: `${id} (not in gitask.json)` }))].map((v) => (
        <Button key={v.id} type="button" size="sm" variant={value.includes(v.id) ? "default" : "outline"} aria-pressed={value.includes(v.id)} className="h-6 px-2 text-xs" onClick={(e) => { e.stopPropagation(); toggle(v.id); }}>
          {v.label}
        </Button>
      ))}
    </span>
  );
}

/** One filter button per configured field in the shared filter bar. Nothing is drawn when no field is configured. */
export function FieldFilters({ ui, board, onChange }: { ui: UiState; board: BoardData | null; onChange: (p: Partial<UiState>) => void }) {
  const fields = board?.config?.fields ?? [];
  if (!fields.length) return null;
  const sel = pruneFieldSelection(ui.fields, fields);
  const set = (key: string, ids: string[]) => {
    const next = { ...sel };
    if (ids.length) next[key] = ids;
    else delete next[key];
    onChange({ fields: next });
  };
  return (
    <>
      {fields.map((f) => {
        const picked = valuesOf(sel, f.key).filter((id) => f.values.some((v) => v.id === id));
        const toggle = (id: string) => set(f.key, picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id]);
        return (
          <Popover key={f.key}>
            <PopoverTrigger asChild>
              <Button variant="secondary" size="sm" aria-label={`Filter by ${f.label}`} className="h-6 text-xs">
                <Tag className="mr-1 size-3.5" />{picked.length ? `${f.label} (${picked.length})` : f.label}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-0">
              <Command>
                <CommandList>
                  <CommandEmpty>No values</CommandEmpty>
                  <CommandGroup>
                    {f.values.map((v) => (
                      <CommandItem key={v.id} value={`${v.label} ${v.id}`} onSelect={() => toggle(v.id)}>
                        <span className="flex-1">{v.label}</span>{picked.includes(v.id) && <Check className="size-3.5" />}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
              {picked.length > 0 && <div className="border-t border-border p-1"><Button variant="ghost" size="sm" onClick={() => set(f.key, [])}>Clear {f.label}</Button></div>}
            </PopoverContent>
          </Popover>
        );
      })}
    </>
  );
}
