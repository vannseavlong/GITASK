import type { Task } from "./types.ts";

const FIELD = /^\s*[-*]\s+\*\*([^*:]+):\*\*\s*(.*)$/;

/** Parse one task file in the My-Agent-SetUp format. */
export function parseTask(path: string, column: string, content: string): Task {
  const id = path.replace(/^.*[\\/]/, "").replace(/\.md$/, "");
  const lines = content.split(/\r?\n/);
  const title = lines.find((l) => /^#\s+/.test(l))?.replace(/^#\s+/, "").trim() || id;

  const fields: Record<string, string> = {};
  for (const line of lines) {
    if (/^##\s/.test(line)) break; // header block ends at the first section
    const m = FIELD.exec(line);
    if (m) fields[m[1].trim().toLowerCase()] = m[2].trim();
  }

  const claimed = fields["claimed by"];
  const tier = fields["tier"]?.match(/T[0-3]/)?.[0];
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
  };
}
