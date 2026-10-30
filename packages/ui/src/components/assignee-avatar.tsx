import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials, personOf } from "@host-src/people-filter.ts";
import type { Person } from "gitask-core";

/** Avatar with initials (no images: names only, never emails). */
export function PersonAvatar({ name, className }: { name: string; className?: string }) {
  return (
    <Avatar className={className ?? "size-4"} aria-hidden="true">
      <AvatarFallback>{initials(name)}</AvatarFallback>
    </Avatar>
  );
}

/** The owner of a task as avatar + name; the saved person's display name when known. Renders nothing when unassigned. */
export function Assignee({ owner, people }: { owner?: string; people?: readonly Person[] }) {
  if (!owner) return null;
  const p = personOf(owner, people);
  const label = p?.name ?? owner;
  return (
    <span className="inline-flex items-center gap-1" title={p?.github ? `${label} (@${p.github})` : label}>
      <PersonAvatar name={label} />
      <span>{label}</span>
    </span>
  );
}
