import { Check, Users } from "lucide-react";
import { UNASSIGNED } from "@host-src/people-filter.ts";
import { PersonAvatar } from "@/components/assignee-avatar.tsx";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { BoardData, UiState } from "@/host/index.ts";

/** "People" multi-select in the shared filter bar. Combines with the date and text filters in every view. */
export function PeopleFilter({ ui, board, onChange }: { ui: UiState; board: BoardData | null; onChange: (p: Partial<UiState>) => void }) {
  const people = board?.people ?? [];
  const selected = ui.people ?? [];
  const toggle = (id: string) => onChange({ people: selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id] });
  const label = selected.length === 0 ? "People" : `People (${selected.length})`;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="secondary" size="sm" aria-label="Filter by people" className="h-6 text-xs"><Users className="mr-1 size-3.5" />{label}</Button>
      </PopoverTrigger>
      <PopoverContent className="w-60 p-0">
        <Command>
          <CommandInput placeholder="Search people" aria-label="Search people to filter" />
          <CommandList>
            <CommandEmpty>No match</CommandEmpty>
            <CommandGroup>
              <CommandItem value="unassigned none" onSelect={() => toggle(UNASSIGNED)}>
                <span className="flex-1">Unassigned</span>{selected.includes(UNASSIGNED) && <Check className="size-3.5" />}
              </CommandItem>
              {people.map((p) => (
                <CommandItem key={p.id} value={`${p.name} ${p.github ?? ""} ${p.id}`} onSelect={() => toggle(p.id)}>
                  <PersonAvatar name={p.name} className="mr-2 size-5" />
                  <span className="flex-1">{p.name}</span>{selected.includes(p.id) && <Check className="size-3.5" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
        {people.length === 0 && <div className="border-t border-border p-2 text-xs opacity-70">No contributors yet. Assign a task by typing a name.</div>}
        {selected.length > 0 && <div className="border-t border-border p-1"><Button variant="ghost" size="sm" onClick={() => onChange({ people: [] })}>Clear people</Button></div>}
      </PopoverContent>
    </Popover>
  );
}
