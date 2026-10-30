// Pure "filter by person" shared by every view. No `vscode` import; the UI imports it as is.
// People are chosen by id; a task owner is free text (`- **Owner:** Sam Lee`), so it matches a person
// by id slug, name or GitHub login, ignoring case. `UNASSIGNED` selects tasks without an owner.

export const UNASSIGNED = "__unassigned__";

export interface PersonLite { id: string; name: string; github?: string }
export interface OwnedTask { owner?: string }

const slug = (s: string): string =>
  s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/** True when the owner text names this person. */
export function ownerIs(owner: string | undefined, p: PersonLite): boolean {
  const o = (owner ?? "").trim();
  if (!o) return false;
  const l = o.toLowerCase();
  return slug(o) === p.id || l === p.name.toLowerCase() || (!!p.github && l === p.github.toLowerCase());
}

/** The saved person an owner text names, if any. */
export function personOf(owner: string | undefined, people: readonly PersonLite[] | undefined): PersonLite | undefined {
  return (people ?? []).find((p) => ownerIs(owner, p));
}

/** No selection passes everything; otherwise a task passes when its owner is one of the selected people. */
export function matchesPeople(t: OwnedTask, selected: readonly string[] | undefined, people: readonly PersonLite[] | undefined): boolean {
  if (!selected || selected.length === 0) return true;
  const o = (t.owner ?? "").trim();
  if (!o) return selected.includes(UNASSIGNED);
  const known = personOf(o, people);
  if (known) return selected.includes(known.id);
  return selected.some((id) => id !== UNASSIGNED && slug(o) === id);
}

/** A copy of the board keeping only matching tasks; the same object back when nothing is selected. */
export function filterPeople<B extends { columns: { tasks: OwnedTask[] }[] }>(board: B, selected: readonly string[] | undefined, people: readonly PersonLite[] | undefined): B {
  if (!selected || selected.length === 0) return board;
  return { ...board, columns: board.columns.map((c) => ({ ...c, tasks: c.tasks.filter((t) => matchesPeople(t, selected, people)) })) };
}

/** Up to two letters for an avatar: first letters of the first two words, else the first two characters. */
export function initials(name: string): string {
  const words = name.trim().split(/[\s._-]+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return (words[0] ?? "?").slice(0, 2).toUpperCase();
}
