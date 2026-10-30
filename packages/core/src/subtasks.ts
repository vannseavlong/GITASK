import { readFile, writeFile } from "node:fs/promises";
import { basename, dirname } from "node:path";
import { gitAdd, gitCommitPaths, isTracked, repoRoot } from "./git.ts";
import { fillTemplate } from "./template.ts";
import { isSubtaskSection, parseSubtasks, splitTokens } from "./parse.ts";
import type { Task } from "./types.ts";

export interface SubtaskOptions {
  /** Commit the change (default true). Ignored when the file is not tracked by git. */
  commit?: boolean;
  /** Commit message template; `{id}`, `{text}` are replaced. */
  message?: string;
}

export interface SubtaskResult {
  path: string;
  committed: boolean;
}

export const SUBTASK_MESSAGE = "task({id}): sub-task {text}";

const PERSON = /^[A-Za-z0-9_](?:[\w.-]*\w)?$/;
const LANE = /^[A-Za-z][\w-]*$/;
const HEADING = "## Sub-tasks";

function check(assignee: string | undefined, lane: string | undefined): void {
  if (assignee !== undefined && !PERSON.test(assignee)) throw new Error(`Invalid assignee "${assignee}"`);
  if (lane !== undefined && !LANE.test(lane)) throw new Error(`Invalid lane "${lane}"`);
}

const line = (head: string, text: string, assignee?: string, lane?: string) =>
  [head + text, assignee && `@${assignee}`, lane && `#${lane}`].filter(Boolean).join(" ");

async function commitFile(task: Task, text: string, opts: SubtaskOptions): Promise<boolean> {
  const cwd = dirname(task.path);
  const root = await repoRoot(cwd);
  if (!root || opts.commit === false || !(await isTracked(cwd, task.path))) return false;
  const short = text.length > 60 ? `${text.slice(0, 57)}...` : text;
  const msg = fillTemplate(opts.message ?? SUBTASK_MESSAGE, { id: basename(task.path, ".md"), text: `"${short}"` });
  await gitAdd(root, task.path);
  await gitCommitPaths(root, msg, task.path);
  return true;
}

/** Replace the tokens of one sub-task line. Refuses when the file changed since `task` was read. */
async function retoken(task: Task, index: number, change: { assignee?: string | null; lane?: string | null }, opts: SubtaskOptions) {
  const sub = task.subtasks[index];
  if (!sub) throw new Error(`No sub-task ${index} in ${task.id}`);
  if (!isSubtaskSection(sub.section)) throw new Error(`Sub-task ${index} of ${task.id} is not under "${HEADING}"`);
  const raw = await readFile(task.path, "utf8");
  const now = parseSubtasks(raw).find((s) => s.line === sub.line && s.col === sub.col);
  if (!now || now.text !== sub.text || now.checked !== sub.checked || now.assignee !== sub.assignee || now.lane !== sub.lane) {
    throw new Error(`${task.id} changed since it was read; reload and try again`);
  }
  const lines = raw.split("\n");
  const cr = lines[sub.line - 1].endsWith("\r") ? "\r" : "";
  const body = lines[sub.line - 1].slice(0, lines[sub.line - 1].length - cr.length);
  const head = body.slice(0, body.indexOf("]", sub.col) + 1);
  const rest = body.slice(head.length);
  const lead = /^\s*/.exec(rest)![0];
  const { text } = splitTokens(rest);
  const pick = <T>(v: T | null | undefined, old: T | undefined) => (v === undefined ? old : v === null ? undefined : v);
  lines[sub.line - 1] = line(head + (lead || " "), text, pick(change.assignee, sub.assignee), pick(change.lane, sub.lane)) + cr;
  await writeFile(task.path, lines.join("\n"));
  return { path: task.path, committed: await commitFile(task, sub.text, opts) };
}

/** Set (or with `undefined` clear) the `@assignee` token of one sub-task. Only that line changes. */
export async function setSubtaskAssignee(task: Task, index: number, assignee: string | undefined, opts: SubtaskOptions = {}): Promise<SubtaskResult> {
  check(assignee, undefined);
  return retoken(task, index, { assignee: assignee ?? null }, opts);
}

/** Set (or with `undefined` clear) the `#lane` token of one sub-task. Only that line changes. */
export async function setSubtaskLane(task: Task, index: number, lane: string | undefined, opts: SubtaskOptions = {}): Promise<SubtaskResult> {
  check(undefined, lane);
  return retoken(task, index, { lane: lane ?? null }, opts);
}

/**
 * Append `- [ ] text @assignee #lane` at the end of the `## Sub-tasks` section, creating the section at the end of
 * the file when missing. Everything else, including CRLF line endings, stays as it was.
 */
export async function addSubtask(
  task: Task,
  text: string,
  extra: { assignee?: string; lane?: string } = {},
  opts: SubtaskOptions = {},
): Promise<SubtaskResult & { line: number }> {
  const clean = text.trim();
  if (!clean || /[\r\n]/.test(clean)) throw new Error("Sub-task text must be one non-empty line");
  check(extra.assignee, extra.lane);
  const entry = line("- [ ] ", clean, extra.assignee, extra.lane);

  const raw = await readFile(task.path, "utf8");
  const nl = raw.includes("\r\n") ? "\r\n" : "\n";
  const lines = raw.split(/\r?\n/);
  const finalNl = /\n$/.test(raw);
  if (lines[lines.length - 1] === "") lines.pop();

  let fence = "";
  let start = -1;
  let end = lines.length; // exclusive end of the section
  const skip = raw.startsWith("---") || raw.startsWith("﻿---") ? frontmatterEnd(lines) + 1 : 0;
  for (let i = skip; i < lines.length; i++) {
    const f = /^\s*(```|~~~)/.exec(lines[i])?.[1];
    if (f) {
      fence = !fence ? f : f === fence ? "" : fence;
      continue;
    }
    if (fence) continue;
    const h = /^##\s+(.*?)\s*#*\s*$/.exec(lines[i]);
    if (!h) continue;
    if (start >= 0) {
      end = i;
      break;
    }
    if (isSubtaskSection(h[1])) start = i;
  }

  let at: number;
  if (start < 0) {
    if (lines.length && lines[lines.length - 1].trim()) lines.push("");
    lines.push(HEADING, "", entry);
    at = lines.length;
  } else {
    let last = end - 1;
    while (last > start && !lines[last].trim()) last--;
    if (last === start) lines.splice(start + 1, 0, "", entry), (at = start + 3);
    else lines.splice(last + 1, 0, entry), (at = last + 2);
  }
  await writeFile(task.path, lines.join(nl) + (finalNl || start < 0 ? nl : ""));
  return { path: task.path, committed: await commitFile(task, clean, opts), line: at };
}

function frontmatterEnd(lines: string[]): number {
  const end = lines.findIndex((l, i) => i > 0 && /^(---|\.\.\.)\s*$/.test(l));
  return end < 0 ? -1 : end;
}
