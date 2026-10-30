import * as React from "react";
import { Check, UserPlus } from "lucide-react";
import type { Person } from "gitask-core";
import { personOf } from "@host-src/people-filter.ts";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PersonAvatar } from "./assignee-avatar.tsx";
import type { Host } from "@/host/index.ts";

/**
 * Searchable assignee combobox. Sends `setOwner` for a known person or "Unassigned"; typing a name
 * nobody has yet offers "Add <name>", which sends `addPerson` (and assigns the task).
 */
export function AssigneePicker({ path, owner, people, host, children, label }: {
  path: string;
  owner?: string;
  people?: readonly Person[];
  host: Host;
  /** The trigger content; defaults to the current assignee. */
  children?: React.ReactNode;
  label?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const current = personOf(owner, people);
  const list = people ?? [];
  const typed = q.trim();
  const canAdd = typed.length > 0 && !list.some((p) => p.name.toLowerCase() === typed.toLowerCase());
  const pick = (person: string | null) => { host.send({ type: "setOwner", path, person }); setOpen(false); };
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();
  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQ(""); }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          draggable={false}
          aria-label={label ?? `Assignee: ${owner || "Unassigned"}. Change`}
          className="inline-flex items-center gap-1 rounded-sm px-0.5 outline-none hover:bg-accent focus-visible:ring-1 focus-visible:ring-ring"
          onClick={stop}
          onKeyDown={stop}
        >
          {children ?? (owner ? <><PersonAvatar name={current?.name ?? owner} /><span>{current?.name ?? owner}</span></> : <span className="opacity-60">Unassigned</span>)}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" onClick={stop} onKeyDown={(e) => { if (e.key !== "Escape") e.stopPropagation(); }}>
        <Command>
          <CommandInput value={q} onValueChange={setQ} placeholder={list.length ? "Search or type a name" : "Type a name to add a person"} aria-label="Search people" />
          <CommandList>
            {list.length === 0 && !typed && <div className="p-3 text-xs opacity-70">No contributors yet. Type a name to add one.</div>}
            <CommandEmpty>{canAdd ? "" : "No match"}</CommandEmpty>
            <CommandGroup>
              <CommandItem value="unassigned" onSelect={() => pick(null)}>
                <span className="flex-1">Unassigned</span>
                {!owner && <Check className="size-3.5" />}
              </CommandItem>
              {list.map((p) => (
                <CommandItem key={p.id} value={`${p.name} ${p.github ?? ""} ${p.id}`} onSelect={() => pick(p.id)}>
                  <PersonAvatar name={p.name} className="mr-2 size-5" />
                  <span className="flex-1">{p.name}{p.github && <span className="ml-1 opacity-60">@{p.github}</span>}</span>
                  {current?.id === p.id && <Check className="size-3.5" />}
                </CommandItem>
              ))}
              {canAdd && (
                <CommandItem forceMount value={`add ${typed}`} onSelect={() => { host.send({ type: "addPerson", name: typed, path }); setOpen(false); }}>
                  <UserPlus className="mr-2 size-4" />Add &ldquo;{typed}&rdquo;
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
