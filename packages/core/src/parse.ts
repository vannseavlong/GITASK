import type { Progress, Subtask, Task } from "./types.ts";

const FIELD = /^\s*[-*]\s+\*\*([^*:]+):\*\*\s*(.*)$/;
const CHECKBOX = /(?<=^|\s)[-*]\s+\[([ xX])\](?=\s|$)/g;
const FENCE = /^\s*(```|~~~)/;

/**
 * Leading YAML frontmatter (`---` ... `---`, simple `key: value` scalars).
 * `end` is the 0-based index of the closing line. Returns undefined when absent or malformed
 * (the block is then plain content). Never throws.
 */
export function parseFrontmatter(content: string): { fields: Record<string, string>; end: number } | undefined {
  const lines = content.replace(/^\uFEFF/, "").split(/\r?\n/);
  if (!/^---\s*$/.test(lines[0] ?? "")) return undefined;
  const end = lines.findIndex((l, i) => i > 0 && /^(---|\.\.\.)\s*$/.test(l));
  if (end < 0) return undefined;
  const fields: Record<string, string> = {};
  let last: string | undefined;
  for (const line of lines.slice(1, end)) {
    if (!line.trim() || /^\s*#/.test(line)) continue;
    const item = /^\s*-\s+(.*)$/.exec(line);
    if (item && last !== undefined) {
      fields[last] = [fields[last], unquote(item[1])].filter(Boolean).join(", ");
      continue;
    }
    if (/^\s/.test(line)) continue; // nested content: ignored
    const m = /^([A-Za-z][\w .-]*?)\s*:(?:\s+(.*))?$/.exec(line);
    if (!m) return undefined;
    const key = m[1].replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").trim().toLowerCase();
    last = key;
    if (key !== "status") fields[key] = unquote(m[2] ?? "");
  }
  return { fields, end };
}

function unquote(raw: string): string {
  const v = raw.trim();
  const q = /^(["'])(.*?)\1(?:\s+#.*)?$/.exec(v);
  if (q) return q[2];
  return v.replace(/\s+#.*$/, "").trim();
}

/** Checkbox lines, grouped by `##` section. Code fences are skipped; a line may hold several (gate rows). */
export function parseSubtasks(content: string): Subtask[] {
  const out: Subtask[] = [];
  let section = "";
  let fenced = false;
  const skip = (parseFrontmatter(content)?.end ?? -1) + 1;
  content.split(/\r?\n/).forEach((line, i) => {
    if (i < skip) return;
    if (FENCE.test(line)) {
      fenced = !fenced;
      return;
    }
    if (fenced) return;
    const h = /^##\s+(.*?)\s*#*\s*$/.exec(line);
    if (h) {
      section = h[1];
      return;
    }
    const hits = [...line.matchAll(CHECKBOX)];
    hits.forEach((m, n) => {
      const end = hits[n + 1]?.index ?? line.length;
      out.push({
        section,
        text: line.slice(m.index! + m[0].length, end).trim(),
        checked: m[1] !== " ",
        line: i + 1,
        col: m.index! + m[0].indexOf("[") + 1,
      });
    });
  });
  return out;
}

export function progressOf(subtasks: Subtask[]): Progress {
  const items = subtasks.filter((s) => /^done when\b/i.test(s.section));
  return { done: items.filter((s) => s.checked).length, total: items.length };
}

/** `YYYY-MM-DD` if the text starts with a real calendar date, otherwise undefined. Never throws. */
export function parseDue(text: string | undefined): string | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})\b/.exec(text?.trim() ?? "");
  if (!m) return undefined;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  const real = dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
  return real ? m[0] : undefined;
}

/** Task ids from free text that exist in `known`, in order, without duplicates or `self`. */
export function parseDependsOn(text: string | undefined, known: ReadonlySet<string>, self: string): string[] {
  const ids = (text ?? "")
    .split(/[^A-Za-z0-9._-]+/)
    .map((t) => t.replace(/^[._-]+|[._-]+$/g, ""))
    .filter((t) => t !== self && known.has(t));
  return [...new Set(ids)];
}

/**
 * Parse one task file in the My-Agent-SetUp format.
 * `knownIds` are the ids of every task on the board; without it `dependsOn` is empty.
 */
export function parseTask(path: string, column: string, content: string, knownIds: ReadonlySet<string> = new Set()): Task {
  const id = path.replace(/^.*[\\/]/, "").replace(/\.md$/, "");
  const fm = parseFrontmatter(content);
  const lines = content.split(/\r?\n/).slice(fm ? fm.end + 1 : 0);
  const title = lines.find((l) => /^#\s+/.test(l))?.replace(/^#\s+/, "").trim() || id;

  const fields: Record<string, string> = {};
  for (const line of lines) {
    if (/^##\s/.test(line)) break; // header block ends at the first section
    const m = FIELD.exec(line);
    if (m) fields[m[1].trim().toLowerCase()] = m[2].trim();
  }
  for (const [k, v] of Object.entries(fm?.fields ?? {})) if (!(k in fields)) fields[k] = v; // bullet header wins

  const claimed = fields["claimed by"];
  const tier = fields["tier"]?.match(/T[0-3]/)?.[0];
  const subtasks = parseSubtasks(content);
  return {
    id,
    title,
    path,
    column,
    fields,
    prefix: id.includes("-") ? id.split("-")[0] : "",
    tier,
    owner: fields["owner"] || undefined,
    claimedBy: claimed && !/^none$/i.test(claimed) ? claimed : undefined,
    subtasks,
    progress: progressOf(subtasks),
    due: parseDue(fields["due"]),
    dependsOn: parseDependsOn(fields["depends on"], knownIds, id),
  };
}
