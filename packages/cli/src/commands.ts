import { mkdir, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import {
  addSubtask, buildReport, loadReportHeader, listPeople, readPeople, renderCsv, renderHtml, renderMarkdown, repoRoot,
  setOwner, setSubtaskAssignee, UNASSIGNED_KEY, planSync, applySync, readGithubConfig, readOriginRepo,
  setSubtaskField, setTaskField, filterByFields,
} from "gitask-core";
import type { Board, FieldDef, FieldSelection, Person, ReportDateField, Task } from "gitask-core";

/** Flags that take a value; everything else starting with `--` is a switch. */
const VALUE_FLAGS = new Set(["dir", "from", "to", "people", "date", "format", "out", "assign", "lane", "allow-repo", "field",
  "name", "goal", "start", "end", "capacity", "unfinished", "next", "backlog", "sprint"]);

export interface Parsed {
  positional: string[];
  value: (name: string) => string | undefined;
  has: (name: string) => boolean;
  /** Every value given for a flag that may repeat (`--field a=x --field b=y`), in order. */
  all: (name: string) => string[];
}

export function parseArgs(argv: string[]): Parsed {
  const positional: string[] = [];
  const values = new Map<string, string>();
  const lists = new Map<string, string[]>();
  const switches = new Set<string>();
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) {
      positional.push(a);
      continue;
    }
    const name = a.slice(2);
    if (VALUE_FLAGS.has(name)) {
      const v = argv[i + 1];
      if (v === undefined || v.startsWith("--")) throw new Error(`--${name} needs a value`);
      values.set(name, v);
      lists.set(name, [...(lists.get(name) ?? []), v]);
      i++;
    } else switches.add(name);
  }
  return { positional, value: (n) => values.get(n), has: (n) => switches.has(n) || values.has(n), all: (n) => lists.get(n) ?? [] };
}

/** Saved people from Tasks/gitask.json plus people in git history (saved fields win). Never writes. */
async function knownPeople(dir: string): Promise<Person[]> {
  const saved = await readPeople(dir);
  const root = await repoRoot(dir);
  const byId = new Map(saved.map((p) => [p.id, { ...p }]));
  for (const g of root ? await listPeople(root) : []) {
    const have = byId.get(g.id);
    if (!have) byId.set(g.id, g);
    else have.github ??= g.github;
  }
  return [...byId.values()];
}

function findPerson(people: Person[], q: string): Person {
  const k = q.toLowerCase();
  const hit = people.find((p) => p.id === k || p.name.toLowerCase() === k || p.github?.toLowerCase() === k);
  if (!hit) throw new Error(`Unknown person "${q}". Known: ${people.map((p) => p.id).join(", ") || "(none)"}`);
  return hit;
}

export async function peopleCmd(dir: string, p: Parsed): Promise<void> {
  const people = await knownPeople(dir);
  if (p.has("json")) return console.log(JSON.stringify(people, null, 2));
  if (!people.length) return console.log("No people found (no git history or Tasks/gitask.json entries).");
  for (const x of people) console.log(`${x.id}  ${x.name}${x.github ? `  @${x.github}` : ""}${x.role ? `  (${x.role})` : ""}`);
}

export async function assignCmd(dir: string, board: Board, p: Parsed, find: (b: Board, id: string) => Task): Promise<void> {
  const [, tid, who] = p.positional;
  if (!tid || !who) throw new Error("usage: gitask assign <task> <person|none>");
  const t = find(board, tid);
  const person = who === "none" ? null : findPerson(await knownPeople(dir), who);
  const r = await setOwner(t, person ? person.name : null, { commit: !p.has("no-commit") });
  console.log(`${t.id}: owner ${r.owner || "(none)"}${r.committed ? " (committed)" : ""}`);
}

export async function subtaskCmd(dir: string, board: Board, p: Parsed, find: (b: Board, id: string) => Task): Promise<void> {
  const [, sub, tid, x, y] = p.positional;
  const commit = !p.has("no-commit");
  if (sub === "add") {
    if (!tid || !x) throw new Error('usage: gitask subtask add <task> "<text>" [--assign <person>] [--lane <lane>] [--field key=id]');
    const t = find(board, tid);
    const who = p.value("assign");
    const person = who && who !== "none" ? findPerson(await knownPeople(dir), who) : undefined;
    const values = fieldSelection(board, p);
    const r = await addSubtask(t, x, { assignee: person?.id, lane: p.value("lane"), ...(Object.keys(values).length ? { values: values as Record<string, string[]> } : {}) }, { commit });
    console.log(`${t.id}: sub-task added at line ${r.line}${r.committed ? " (committed)" : ""}`);
    return;
  }
  if (sub === "assign") {
    if (!tid || x === undefined || !y) throw new Error("usage: gitask subtask assign <task> <index> <person|none>");
    const t = find(board, tid);
    if (!/^\d+$/.test(x) || Number(x) >= t.subtasks.length) {
      throw new Error(`Invalid sub-task index "${x}" for ${t.id}: use 0 to ${Math.max(t.subtasks.length - 1, 0)} (${t.subtasks.length} sub-tasks)`);
    }
    const person = y === "none" ? undefined : findPerson(await knownPeople(dir), y);
    const r = await setSubtaskAssignee(t, Number(x), person?.id, { commit });
    console.log(`${t.id}: sub-task ${x} assigned to ${person?.id ?? "(none)"}${r.committed ? " (committed)" : ""}`);
    return;
  }
  if (sub === "field") return subtaskFieldCmd(board, p, find);
  if (sub === "list") {
    if (!tid) throw new Error("usage: gitask subtask list <task>");
    const t = find(board, tid);
    t.subtasks.forEach((s, i) => console.log(`${i}  [${s.checked ? "x" : " "}] ${s.text}${s.assignee ? ` @${s.assignee}` : ""}${s.lane ? ` #${s.lane}` : ""}${Object.entries(s.values ?? {}).flatMap(([k, ids]) => ids.map((id) => ` #${k}:${id}`)).join("")}${s.section ? `  (${s.section})` : ""}`));
    return;
  }
  throw new Error("usage: gitask subtask add|assign|field|list ...");
}

export function checkDate(name: string, v: string | undefined): string | undefined {
  if (v === undefined) return undefined;
  const d = new Date(`${v}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v) {
    throw new Error(`Invalid --${name} "${v}": use YYYY-MM-DD`);
  }
  return v;
}

export async function reportCmd(dir: string, board: Board, p: Parsed): Promise<void> {
  const format = p.value("format");
  if (format !== "html" && format !== "md" && format !== "csv") throw new Error("--format is required: html, md or csv");
  const from = checkDate("from", p.value("from"));
  const to = checkDate("to", p.value("to"));
  if (from && to && from > to) throw new Error(`--from ${from} is after --to ${to}`);
  const dateField = p.value("date") ?? "done";
  if (!["done", "due", "updated"].includes(dateField)) throw new Error(`Invalid --date "${dateField}": use done, due or updated`);

  const people = await knownPeople(dir);
  let only: string[] | undefined;
  const raw = p.value("people");
  if (raw !== undefined) {
    only = raw.split(",").map((s) => s.trim()).filter(Boolean).map((s) => (s.toLowerCase() === UNASSIGNED_KEY ? UNASSIGNED_KEY : findPerson(people, s).id));
    if (!only.length) throw new Error("--people needs at least one person");
  }
  const root = (await repoRoot(dir)) ?? resolve(dir, "..");
  const report = await buildReport(boardForFields(board, p), {
    from, to, people, only, dateField: dateField as ReportDateField,
    includeSubtasks: !p.has("no-subtasks"), repo: basename(root),
  });
  const header = format !== "csv" ? await loadReportHeader(dir) : undefined;
  const text = format === "html" ? renderHtml(report, header) : format === "md" ? renderMarkdown(report, header) : renderCsv(report);
  const out = p.value("out");
  if (!out) return void process.stdout.write(text.endsWith("\n") ? text : text + "\n");
  await mkdir(dirname(resolve(out)), { recursive: true });
  await writeFile(resolve(out), text);
  console.log(`report written to ${out}`);
}

/** `gitask github plan [task...]` (dry run) and `gitask github sync --yes [task...]` (token from GITHUB_TOKEN). */
export async function githubCmd(dir: string, board: Board, p: Parsed): Promise<void> {
  const [, sub, ...tasks] = p.positional;
  if (sub !== "plan" && sub !== "sync") throw new Error("usage: gitask github plan|sync [--yes] [task...]");
  const config = await readGithubConfig(dir);
  if (!config) throw new Error('No GitHub link. Add {"github": {"repo": "owner/name"}} to Tasks/gitask.json first; nothing was sent.');
  const plan = planSync(board, config, await knownPeople(dir), { ...(tasks.length ? { tasks } : {}), origin: await readOriginRepo(dir) });
  if (plan.repoMismatch) {
    console.log(`\n!!! WARNING: ${plan.repoMismatch.message}\n!!! Origin: ${plan.repoMismatch.origin ?? "(none on github.com)"}   Configured: ${plan.repoMismatch.configured}\n`);
  }
  console.log(`GitHub repo ${plan.repo}${plan.project ? `, project #${plan.project}` : ""}`);
  for (const i of plan.issues) {
    console.log(`  ${i.action === "create" ? "create" : `update #${i.issue}`}  ${i.taskId}  [${i.state}]${i.assignees.length ? `  assign ${i.assignees.map((a) => "@" + a).join(", ")}` : ""}${i.status ? `  status ${i.status}` : ""}`);
    for (const s of i.subIssues) console.log(`      sub-issue  ${s.title}  [${s.state}]${s.assignees.length ? `  @${s.assignees.join(", @")}` : ""}`);
  }
  if (plan.notify.length) console.log(`\nGitHub may notify: ${plan.notify.map((n) => `@${n.login}`).join(", ")}`);
  for (const w of plan.warnings) console.log(`warning: ${w}`);
  if (sub === "plan") return console.log("\nDry run: nothing was sent. Run `gitask github sync --yes` to apply.");
  if (!p.has("yes")) throw new Error("Refusing to send without --yes. Review the plan above, then add --yes.");
  const allow = p.value("allow-repo");
  if (plan.repoMismatch && allow?.toLowerCase() !== plan.repo.toLowerCase()) {
    throw new Error(`Refusing to send: ${plan.repo} is not your origin remote. If you really mean it, add --allow-repo ${plan.repo}. Nothing was sent.`);
  }
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("Set GITHUB_TOKEN to a GitHub token first (see Docs/architecture/github.md).");
  const r = await applySync(plan, token, { commit: !p.has("no-commit"), ...(allow ? { allowRepo: allow } : {}) });
  for (const i of r.issues) console.log(`${i.action}  ${i.taskId}  #${i.number}  ${i.url}`);
  for (const w of r.warnings) console.log(`warning: ${w}`);
}

// ---- Configurable fields (`fields` in Tasks/gitask.json) -----------------------------------------------------------

function fieldDefs(board: Board): FieldDef[] {
  return board.config?.fields ?? [];
}

function findField(board: Board, key: string): FieldDef {
  const hit = fieldDefs(board).find((f) => f.key === key.toLowerCase());
  if (!hit) {
    const known = fieldDefs(board).map((f) => f.key).join(", ");
    throw new Error(`Unknown field "${key}". ${known ? `Fields in gitask.json: ${known}` : 'No fields are defined; add a "fields" block to Tasks/gitask.json'}`);
  }
  return hit;
}

/** Value ids typed as `app,landing-page` (or `none` / empty for no value), checked against the field. */
function parseIds(f: FieldDef, text: string | undefined): string[] {
  if (text === undefined) throw new Error(`Give ${f.key} a value: ${f.values.map((v) => v.id).join(", ")} (or none)`);
  if (text === "none" || text === "") return [];
  const ids = [...new Set(text.split(",").map((x) => x.trim()).filter(Boolean))];
  for (const id of ids) {
    if (!f.values.some((v) => v.id === id)) throw new Error(`"${id}" is not a ${f.label} value. Allowed: ${f.values.map((v) => v.id).join(", ")}`);
  }
  return ids;
}

/** `--field platform=app,landing-page` (repeatable) as a selection; refused when the field or a value is not in the config. */
export function fieldSelection(board: Board, p: Parsed): FieldSelection {
  const sel: Record<string, string[]> = {};
  for (const raw of p.all("field")) {
    const eq = raw.indexOf("=");
    if (eq < 1) throw new Error(`Invalid --field "${raw}": use key=id[,id] (for example platform=app)`);
    const f = findField(board, raw.slice(0, eq));
    const ids = parseIds(f, raw.slice(eq + 1));
    if (!ids.length) throw new Error(`--field ${f.key}= needs at least one value`);
    sel[f.key] = [...new Set([...(sel[f.key] ?? []), ...ids])];
  }
  return sel;
}

/** The board with only tasks that match `--field`; the board itself when the flag is not used. */
export function boardForFields(board: Board, p: Parsed): Board {
  return filterByFields(board, fieldSelection(board, p));
}

/** `gitask fields`: the configured fields and their allowed values. */
export function fieldsCmd(board: Board): void {
  const defs = fieldDefs(board);
  if (!defs.length) return console.log('No fields defined. Add a "fields" block to Tasks/gitask.json.');
  for (const f of defs) console.log(`${f.key}  ${f.label}${f.multi ? "  (several values allowed)" : ""}\n    ${f.values.map((v) => v.id).join(", ")}`);
}

/** `gitask field set <task> <key> <ids|none>`: set a field in the task header. */
export async function fieldCmd(board: Board, p: Parsed, find: (b: Board, id: string) => Task): Promise<void> {
  const [, sub, tid, key, ids] = p.positional;
  if (sub !== "set" || !tid || !key) throw new Error("usage: gitask field set <task> <key> <id[,id]|none>");
  const t = find(board, tid);
  const f = findField(board, key);
  const list = parseIds(f, ids);
  const r = await setTaskField(t, f, list, { commit: !p.has("no-commit") });
  console.log(`${t.id}: ${f.key} ${list.join(", ") || "(none)"}${r.committed ? " (committed)" : ""}`);
}

/** `gitask subtask field <task> <index> <key> <ids|none>`. */
export async function subtaskFieldCmd(board: Board, p: Parsed, find: (b: Board, id: string) => Task): Promise<void> {
  const [, , tid, x, key, ids] = p.positional;
  if (!tid || x === undefined || !key) throw new Error("usage: gitask subtask field <task> <index> <key> <id[,id]|none>");
  const t = find(board, tid);
  if (!/^\d+$/.test(x) || Number(x) >= t.subtasks.length) {
    throw new Error(`Invalid sub-task index "${x}" for ${t.id}: use 0 to ${Math.max(t.subtasks.length - 1, 0)} (${t.subtasks.length} sub-tasks)`);
  }
  const f = findField(board, key);
  const list = parseIds(f, ids);
  const r = await setSubtaskField(t, Number(x), f, list, { commit: !p.has("no-commit") });
  console.log(`${t.id}: sub-task ${x} ${f.key} ${list.join(", ") || "(none)"}${r.committed ? " (committed)" : ""}`);
}
