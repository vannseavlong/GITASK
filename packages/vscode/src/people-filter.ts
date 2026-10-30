// Pure "filter by person" shared by every view. No `vscode` import; the UI imports it as is.
// People are chosen by id; a task owner is free text (`- **Owner:** Sam Lee`), so it matches a person
// by id slug, name or GitHub login, ignoring case. `UNASSIGNED` selects tasks without an owner.

export const UNASSIGNED = "__unassigned__";

export interface PersonLite { id: string; name: string; github?: string }
export interface OwnedTask { owner?: string; subtasks?: readonly { assignee?: string }[] }

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

/** One owner text against the selection (a missing owner is "unassigned"). */
function ownerSelected(owner: string | undefined, selected: readonly string[], people: readonly PersonLite[] | undefined): boolean {
  const o = (owner ?? "").trim();
  if (!o) return selected.includes(UNASSIGNED);
  const known = personOf(o, people);
  if (known) return selected.includes(known.id);
  return selected.some((id) => id !== UNASSIGNED && slug(o) === id);
}

/**
 * No selection passes everything; otherwise a task passes when its owner, or the assignee of any of its
 * sub-tasks, is one of the selected people. "Unassigned" only matches a task with no owner.
 */
export function matchesPeople(t: OwnedTask, selected: readonly string[] | undefined, people: readonly PersonLite[] | undefined): boolean {
  if (!selected || selected.length === 0) return true;
  if (ownerSelected(t.owner, selected, people)) return true;
  // Sub-task assignees are ids (`@ann-roe`); a task owned by someone else still matches through them.
  return (t.subtasks ?? []).some((s) => !!s.assignee && ownerSelected(s.assignee, selected.filter((id) => id !== UNASSIGNED), people));
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
