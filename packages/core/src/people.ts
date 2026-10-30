import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { CONFIG_FILE } from "./config.ts";
import { gitAdd, gitCommitPaths, isTracked, repoRoot } from "./git.ts";
import type { Task } from "./types.ts";

const run = promisify(execFile);

/** A contributor. Names and ids only: emails are read in memory and never stored or returned. */
export interface Person {
  /** Stable slug of the name, e.g. `sam-lee`. */
  id: string;
  name: string;
  /** GitHub login: hand-set, else taken from a `users.noreply.github.com` commit email. */
  github?: string;
  role?: string;
}

export const PEOPLE_MESSAGE = "board: update people";
export const OWNER_MESSAGE = "task({id}): owner {owner}";

const NOREPLY = /^(?:\d+\+)?([^@\s]+)@users\.noreply\.github\.com$/i;
const SHORTLOG_LINE = /^\s*(\d+)\t(.*?)\s*<([^>]*)>\s*$/;
const OWNER_LINE = /^(\s*[-*]\s+\*\*Owner:\*\*).*$/i;
const FIELD_LINE = /^\s*[-*]\s+\*\*[^*:]+:\*\*/;

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown): string | undefined => (typeof v === "string" && v.trim() ? v.trim() : undefined);

/** Lower-case slug with `-` between runs of letters and digits; empty when the name has none. */
export const personId = (name: string): string =>
  name.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/**
 * People in a repo's history, most commits first. `git shortlog` applies `.mailmap`, so one person
 * under several emails or spellings is already one entry; entries with the same name are merged too.
 * Bot authors (`[bot]`) are left out. No commits, no repo or any git error yields `[]`, never throws.
 */
export async function listPeople(repoDir: string): Promise<Person[]> {
  let out: string;
  try {
    // `HEAD` is explicit: without a revision shortlog reads stdin when it is not a terminal.
    ({ stdout: out } = await run("git", ["shortlog", "-sne", "HEAD"], { cwd: repoDir, maxBuffer: 64 * 1024 * 1024 }));
  } catch {
    return [];
  }
  const found = new Map<string, { person: Person; commits: number }>();
  for (const line of out.split(/\r?\n/)) {
    const m = SHORTLOG_LINE.exec(line);
    if (!m) continue;
    const [, count, rawName, email] = m;
    const name = rawName.trim();
    const id = personId(name);
    if (!id || /\[bot\]/i.test(name) || /\[bot\]/i.test(email)) continue;
    const github = NOREPLY.exec(email)?.[1];
    const prev = found.get(id);
    if (prev) {
      prev.commits += Number(count);
      prev.person.github ??= github;
    } else {
      found.set(id, { person: github ? { id, name, github } : { id, name }, commits: Number(count) });
    }
  }
  return [...found.values()].sort((a, b) => b.commits - a.commits).map((e) => e.person);
}

/** Parse the `people` list of `Tasks/gitask.json`. Bad input yields `[]`; entries without a name or id are skipped. */
export function parsePeople(text: string): Person[] {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return [];
  }
  const list = isRecord(json) ? json.people : undefined;
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>();
  const out: Person[] = [];
  for (const e of list) {
    if (!isRecord(e)) continue;
    const name = str(e.name);
    const id = str(e.id) ?? (name ? personId(name) : undefined);
    if (!id || !name || seen.has(id)) continue;
    seen.add(id);
    const p: Person = { id, name };
    const github = str(e.github);
    const role = str(e.role);
    if (github) p.github = github;
    if (role) p.role = role;
    out.push(p);
  }
  return out;
}

/** People saved in `<dir>/gitask.json`; `[]` when the file is missing or malformed. */
export async function readPeople(dir: string): Promise<Person[]> {
  try {
    return parsePeople(await readFile(join(dir, CONFIG_FILE), "utf8"));
  } catch {
    return [];
  }
}

export interface PeopleOptions {
  /** Commit the file when it is tracked by git (default true). */
  commit?: boolean;
}

/**
 * Merge people from git history into `<dir>/gitask.json` and return the saved list. Hand edits win:
 * a saved person keeps every field it has, git only adds new people and fills a missing `github`.
 * Other keys (column colours) are kept. Writes only when something changed; commits that file only,
 * and only when it is already tracked. Without a repo the saved list is returned as it is.
 */
export async function syncPeople(dir: string, opts: PeopleOptions = {}): Promise<Person[]> {
  const file = join(dir, CONFIG_FILE);
  let json: Record<string, unknown> = {};
  try {
    const parsed: unknown = JSON.parse(await readFile(file, "utf8"));
    if (!isRecord(parsed)) throw new Error(`${CONFIG_FILE} is not a JSON object`);
    json = parsed;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw new Error(`Cannot update ${CONFIG_FILE}: ${(e as Error).message}`);
  }
  const saved = parsePeople(JSON.stringify(json));
  const root = await repoRoot(dir);
  const fromGit = root ? await listPeople(root) : [];
  const byId = new Map(saved.map((p) => [p.id, p]));
  let changed = false;
  for (const g of fromGit) {
    const have = byId.get(g.id);
    if (!have) {
      byId.set(g.id, g);
      changed = true;
    } else if (!have.github && g.github) {
      have.github = g.github;
      changed = true;
    }
  }
  const people = [...byId.values()];
  if (!changed) return people;

  json.people = people;
  await writeFile(file, JSON.stringify(json, null, 2) + "\n");
  if (root && opts.commit !== false && (await isTracked(dir, file))) {
    await gitAdd(root, file);
    await gitCommitPaths(root, PEOPLE_MESSAGE, file);
  }
  return people;
}

/**
 * Return `content` with its header `- **Owner:** <owner>` line set (empty value when `owner` is
 * empty). Only that line changes; line endings are kept. Inserts the line before the first header
 * field when missing, unless there is nothing to set.
 */
export function setOwnerField(content: string, owner: string): string {
  const eol = content.includes("\r\n") ? "\r\n" : "\n";
  const lines = content.split(/\r?\n/);
  let i = 0;
  if (/^﻿?---\s*$/.test(lines[0] ?? "")) {
    const end = lines.findIndex((l, n) => n > 0 && /^(---|\.\.\.)\s*$/.test(l));
    if (end > 0) i = end + 1;
  }
  const headerEnd = lines.findIndex((l, n) => n >= i && /^##\s/.test(l));
  const stop = headerEnd < 0 ? lines.length : headerEnd;
  const value = owner.replace(/\s+/g, " ").trim();
  const existing = lines.findIndex((l, n) => n >= i && n < stop && OWNER_LINE.test(l));
  if (existing >= 0) {
    lines[existing] = lines[existing].replace(OWNER_LINE, value ? `$1 ${value}` : "$1");
    return lines.join(eol);
  }
  if (!value) return content;
  const line = `- **Owner:** ${value}`;
  const firstField = lines.findIndex((l, n) => n >= i && n < stop && FIELD_LINE.test(l));
  if (firstField >= 0) lines.splice(firstField, 0, line);
  else {
    const title = lines.findIndex((l, n) => n >= i && /^#\s+/.test(l));
    if (title >= 0) lines.splice(title + 1, 0, "", line);
    else lines.splice(i, 0, line, "");
  }
  return lines.join(eol);
}

export interface OwnerResult {
  path: string;
  /** The text now in the `Owner` line; `""` when unassigned. */
  owner: string;
  committed: boolean;
}

/**
 * Assign `task` to a person (by id) or unassign it (`null`). Writes the person's name from
 * `Tasks/gitask.json` into the `- **Owner:**` line (the id itself when the person is not saved),
 * changes nothing else in the file, and commits that file only.
 */
export async function setOwner(task: Task, personId: string | null, opts: PeopleOptions = {}): Promise<OwnerResult> {
  const cwd = dirname(task.path);
  let owner = "";
  if (personId !== null) {
    if (!personId.trim()) throw new Error("Person id is empty");
    const people = await readPeople(dirname(cwd));
    owner = people.find((p) => p.id === personId)?.name ?? personId;
  }
  const raw = await readFile(task.path, "utf8");
  const out = setOwnerField(raw, owner);
  if (out === raw) return { path: task.path, owner, committed: false };
  await writeFile(task.path, out);

  let committed = false;
  const root = await repoRoot(cwd);
  if (root && opts.commit !== false && (await isTracked(cwd, task.path))) {
    await gitAdd(root, task.path);
    await gitCommitPaths(root, OWNER_MESSAGE.replace("{id}", task.id).replace("{owner}", owner || "none"), task.path);
    committed = true;
  }
  return { path: task.path, owner, committed };
}
