import { constants } from "node:fs";
import { open } from "node:fs/promises";
import { resolve } from "node:path";
import { MAX_LOGO_BYTES, readProject, resolveLogo } from "./config.ts";
import type { PersonRow, Report, ReportTask } from "./report.ts";
import type { ProjectLayout } from "./types.ts";

// Renderers for a Report. Every string that came from a task file (titles, names, sub-task text) is
// untrusted: HTML escapes it, Markdown escapes it, CSV quotes it and defuses spreadsheet formulas.

const HTML_ESC: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const escapeHtml = (s: string): string => s.replace(/[&<>"']/g, (c) => HTML_ESC[c]);

const period = (r: Report): string =>
  r.from && r.to ? `${r.from} to ${r.to}` : r.from ? `From ${r.from}` : r.to ? `Up to ${r.to}` : "All time";
const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;
/** The one muted line under the title: period, people filter (by name) and generated date. */
const subtitle = (r: Report): string =>
  [period(r), ...(r.only.length ? [`People: ${r.people.map((p) => p.name).join(", ") || "none"}`] : []), `Generated ${r.generated}`].join(" \u00b7 ");
const countsText = (p: PersonRow, withSubs: boolean): string =>
  [plural(p.tasksDone, "task", "tasks"), ...(withSubs ? [plural(p.subtasksDone, "sub-task", "sub-tasks")] : [])].join(", ");
/** `late` only for a task that has a Due date and was done after it. */
const isLate = (t: ReportTask): boolean => t.timeliness === "late";

/** Tasks listed under a person: the ones they own plus those where they completed sub-tasks. */
function groups(r: Report): { person: PersonRow; tasks: { task: ReportTask; owns: boolean; subs: ReportTask["subtasks"] }[] }[] {
  const selected = (key: string) => r.only.length === 0 || r.only.includes(key.toLowerCase());
  return r.people.map((person) => ({
    person,
    tasks: r.tasks.flatMap((task) => {
      const owns = task.personKey === person.key && selected(task.personKey);
      const subs = task.subtasks.filter((s) => s.personKey === person.key);
      return owns || subs.length ? [{ task, owns, subs }] : [];
    }),
  }));
}

// ---------- Project header ----------

/** Project identity ready to render. The logo is already read and encoded; nothing here touches the disk. */
export interface ReportHeader {
  title?: string;
  subtitle?: string;
  layout: ProjectLayout;
  /** `data:` URI built from a logo that passed `resolveLogo` just now. */
  logoUri?: string;
}

/**
 * Read the project block of `Tasks/gitask.json` for a report header; undefined when no project is set.
 * The logo is checked again here (regular file, size cap, inside `dir`) and its bytes are read only now,
 * because the file may have changed since the board loaded. A logo that fails is dropped, the rest stays.
 */
export async function loadReportHeader(dir: string): Promise<ReportHeader | undefined> {
  const project = await readProject(dir);
  if (!project) return undefined;
  const header: ReportHeader = { layout: project.layout, ...(project.title ? { title: project.title } : {}), ...(project.subtitle ? { subtitle: project.subtitle } : {}) };
  if (project.logo && project.layout.logoPosition !== "hidden") {
    try {
      const logo = await resolveLogo(dir, project.logo.path);
      // O_NOFOLLOW + fstat on the open handle: a swap to a symlink after resolveLogo cannot redirect the read.
      const fh = await open(resolve(dir, ...logo.path.split("/")), constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
      let bytes: Buffer;
      try {
        const st = await fh.stat();
        if (!st.isFile() || st.size === 0 || st.size > MAX_LOGO_BYTES) throw new Error("logo changed");
        bytes = await fh.readFile();
      } finally {
        await fh.close();
      }
      if (bytes.length > 0 && bytes.length <= MAX_LOGO_BYTES) header.logoUri = `data:${logo.mime};base64,${bytes.toString("base64")}`;
    } catch {
      // dropped: the report still shows the text
    }
  }
  return header.title || header.subtitle || header.logoUri ? header : undefined;
}

const LOGO_PX = { sm: 32, md: 48, lg: 72 } as const;
const TITLE_PX = { sm: 18, md: 22, lg: 30 } as const;
const ALIGN_FLEX = { left: "flex-start", center: "center", right: "flex-end" } as const;

/** Header block for the HTML report. Only enum values and numbers go into style; text is escaped. */
function headerHtml(h: ReportHeader | undefined): string {
  if (!h) return "";
  const l = h.layout;
  const logo = h.logoUri && l.logoPosition !== "hidden" ? `<img class="plogo" alt="" src="${escapeHtml(h.logoUri)}" style="height:${LOGO_PX[l.size]}px">` : "";
  const title = h.title ? `<div class="ptitle" style="font-size:${TITLE_PX[l.size]}px">${escapeHtml(h.title)}</div>` : "";
  const sub = h.subtitle ? `<div class="psub">${escapeHtml(h.subtitle)}</div>` : "";
  if (!logo && !title && !sub) return "";
  const text = title || sub ? `<div class="ptext">${title}${sub}</div>` : "";
  const dir = l.logoPosition === "top" ? "column" : l.logoPosition === "right" ? "row-reverse" : "row";
  const items = l.logoPosition === "top" ? ALIGN_FLEX[l.align] : "center";
  return `<header class="phead" style="flex-direction:${dir};align-items:${items};justify-content:${ALIGN_FLEX[l.align]};text-align:${l.align}">${logo}${text}</header>\n`;
}

// ---------- HTML ----------

const CSS = `
:root{--ink:#1c2430;--mute:#667085;--line:#e4e7ec;--soft:#f6f7f9;--late:#c2410c;--bg:#fff}
*{box-sizing:border-box}
body{margin:0;background:var(--soft);color:var(--ink);font:14px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;-webkit-font-smoothing:antialiased}
.page{max-width:820px;margin:0 auto;padding:44px 36px 56px;background:var(--bg)}
h1{margin:0 0 4px;font-size:26px;line-height:1.2;letter-spacing:-.01em}
.sub{margin:0 0 26px;color:var(--mute);font-size:13px}
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px;margin-bottom:8px}
.tile{border:1px solid var(--line);border-radius:10px;padding:14px 16px}
.tile .v{font-size:30px;font-weight:700;letter-spacing:-.02em;font-variant-numeric:tabular-nums;line-height:1.1}
.tile .l{margin-top:4px;color:var(--mute);font-size:12px}
.person{margin-top:30px}
.person h2{margin:0 0 8px;font-size:16px;display:flex;justify-content:space-between;align-items:baseline;gap:12px;padding-bottom:6px;border-bottom:1px solid var(--ink)}
.person h2 span{font-size:12px;color:var(--mute);font-weight:400;font-variant-numeric:tabular-nums;white-space:nowrap}
table{width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums}
td{padding:7px 0;border-bottom:1px solid var(--line);vertical-align:top}
tr:last-child td{border-bottom:0}
td.d{width:96px;text-align:right;color:var(--mute);white-space:nowrap}
.tag{display:inline-block;margin-left:6px;padding:0 7px;border-radius:99px;font-size:11px;font-weight:600;background:#fdeee6;color:var(--late);vertical-align:1px}
h3{margin:14px 0 4px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--mute);font-weight:600}
.subs{margin:0;padding:0;list-style:none}
.subs li{padding:3px 0;color:var(--ink)}
.subs li span{color:var(--mute)}
.empty{padding:28px;text-align:center;color:var(--mute);border:1px dashed var(--line);border-radius:10px;margin-top:24px}
.phead{display:flex;gap:14px;margin:0 0 26px;padding-bottom:18px;border-bottom:1px solid var(--line)}
.plogo{display:block;width:auto;max-width:100%;object-fit:contain}
.ptitle{font-weight:700;line-height:1.2;letter-spacing:-.01em}
.psub{color:var(--mute);font-size:13px}
@media (max-width:640px){.page{padding:24px 16px}}
@media print{
@page{size:A4;margin:14mm 12mm}
body{background:#fff;font-size:11px}
.page{max-width:none;padding:0}
h1{font-size:22px}.tile .v{font-size:22px}
.tile,tr,.subs li{break-inside:avoid}
.person h2,h3{break-after:avoid}
*{-webkit-print-color-adjust:exact;print-color-adjust:exact}
}`;

function tileHtml(value: number, label: string): string {
  return `<div class="tile"><div class="v">${value}</div><div class="l">${escapeHtml(label)}</div></div>`;
}

/** One self-contained HTML page: inline CSS, no script, no network (a project logo is a `data:` image). Prints cleanly on A4. */
export function renderHtml(r: Report, header?: ReportHeader): string {
  const s = r.summary;
  const e = escapeHtml;
  const tiles = [tileHtml(s.tasksDone, "Tasks done"), ...(r.includeSubtasks ? [tileHtml(s.subtasksDone, "Sub-tasks done")] : []), tileHtml(s.people, "People")].join("");

  const sections = groups(r)
    .map(({ person, tasks }) => {
      const owned = tasks.filter((x) => x.owns);
      const taskRows = owned
        .map(({ task }) => `<tr><td>${e(task.title)}${isLate(task) ? '<span class="tag">late</span>' : ""}</td><td class="d">${e(task.doneDate || "-")}</td></tr>`)
        .join("");
      const subItems = r.includeSubtasks ? tasks.flatMap(({ task, subs }) => subs.map((x) => `<li>${e(x.text)} <span>(${e(task.title)})</span></li>`)) : [];
      return `<section class="person"><h2>${e(person.name)}<span>${e(countsText(person, r.includeSubtasks))}</span></h2>${taskRows ? `<table><tbody>${taskRows}</tbody></table>` : ""}${subItems.length ? `<h3>Sub-tasks finished</h3><ul class="subs">${subItems.join("")}</ul>` : ""}</section>`;
    })
    .join("");

  const empty = r.tasks.length === 0 ? `<div class="empty">No tasks were completed in this period.</div>` : "";
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'${header?.logoUri ? "; img-src data:" : ""}">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${e(`Done report ${period(r)}`)}</title>
<style>${CSS}</style></head>
<body><div class="page">
${headerHtml(header)}<h1>${e(r.repo ? `${r.repo}: work completed` : "Work completed")}</h1>
<p class="sub">${e(subtitle(r))}</p>
<div class="tiles">${tiles}</div>
${empty}${sections}
</div></body></html>
`;
}

// ---------- Markdown ----------

/** Escape text for use inside a Markdown table cell or line. */
export function escapeMd(s: string): string {
  const ZWSP = "​"; // invisible; breaks @mentions and bare-URL autolinks without a visible escape
  return s
    .replace(/@/g, () => `@${ZWSP}`)
    .replace(/\b(https?|ftp):\/\//gi, (_m, scheme: string) => `${scheme}:${ZWSP}//`)
    .replace(/\bwww\./gi, () => `www${ZWSP}.`)
    .replace(/\r?\n/g, " ").replace(/[\\`*_{}[\]<>()#+!|~&]/g, (c) => (c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === "&" ? "&amp;" : `\\${c}`)).replace(/^-/, "\\-");
}

export function renderMarkdown(r: Report, header?: ReportHeader): string {
  const s = r.summary;
  const m = escapeMd;
  const out: string[] = [
    ...(header?.title ? [`# ${m(header.title)}`, ""] : []),
    ...(header?.subtitle ? [m(header.subtitle), ""] : []),
    `# ${m(r.repo ? `${r.repo}: work completed` : "Work completed")}`,
    "",
    m(subtitle(r)),
    "",
    [`**${s.tasksDone}** tasks done`, ...(r.includeSubtasks ? [`**${s.subtasksDone}** sub-tasks done`] : []), `**${s.people}** ${s.people === 1 ? "person" : "people"}`].join(" · "),
    "",
  ];
  if (!r.tasks.length) out.push("No tasks were completed in this period.", "");
  for (const { person, tasks } of r.tasks.length ? groups(r) : []) {
    out.push(`## ${m(person.name)}`, "", m(countsText(person, r.includeSubtasks)), "");
    const owned = tasks.filter((x) => x.owns);
    for (const { task } of owned) out.push(`- ${m(task.title)}: ${task.doneDate || "-"}${isLate(task) ? " (late)" : ""}`);
    if (owned.length) out.push("");
    const subs = r.includeSubtasks ? tasks.flatMap(({ task, subs: xs }) => xs.map((x) => `- ${m(x.text)} (${m(task.title)})`)) : [];
    if (subs.length) out.push("Sub-tasks finished", "", ...subs, "");
  }
  return out.join("\n");
}

// ---------- CSV ----------

export const CSV_HEADER = ["person", "task", "sub_task", "done_date", "sub_tasks_done"];

/** One CSV cell: quoted, quotes doubled, and a leading `= + - @` (or tab/CR) defused with a `'`. */
export function csvCell(v: string | number | undefined): string {
  if (v === undefined) return '""';
  let t = String(v);
  if (/^[=+\-@\t\r]/.test(t)) t = `'${t}`;
  return `"${t.replace(/"/g, '""')}"`;
}

/**
 * One row per done task (under its owner), plus one row per finished sub-task (under its assignee)
 * when sub-tasks are included. Task rows leave `sub_task` empty; sub-task rows leave the count empty.
 * CRLF line ends.
 */
export function renderCsv(r: Report): string {
  const selected = (key: string) => r.only.length === 0 || r.only.includes(key.toLowerCase());
  const lines = [CSV_HEADER.map((h) => `"${h}"`).join(",")];
  const row = (cells: (string | number | undefined)[]) => lines.push(cells.map(csvCell).join(","));
  for (const t of r.tasks) {
    if (selected(t.personKey)) row([t.owner || "Unassigned", t.title, "", t.doneDate, r.includeSubtasks ? t.subtasks.filter((x) => selected(x.personKey)).length : ""]);
    for (const x of t.subtasks) {
      if (selected(x.personKey)) row([x.assignee || "Unassigned", t.title, x.text, t.doneDate, ""]);
    }
  }
  return lines.join("\r\n") + "\r\n";
}
