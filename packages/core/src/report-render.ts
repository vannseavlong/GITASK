import type { PersonRow, Report, ReportTask } from "./report.ts";

// Renderers for a Report. Every string that came from a task file (titles, names, sub-task text) is
// untrusted: HTML escapes it, Markdown escapes it, CSV quotes it and defuses spreadsheet formulas.

const HTML_ESC: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const escapeHtml = (s: string): string => s.replace(/[&<>"']/g, (c) => HTML_ESC[c]);

const FIELD_LABEL = { done: "Done date", due: "Due date", updated: "Updated date" } as const;
const SOURCE_LABEL = { git: "git", updated: "updated field", none: "no date" } as const;
const TIMELY_LABEL = { "on-time": "On time", late: "Late", "no-due": "No due date", unknown: "No done date" } as const;

const period = (r: Report): string =>
  r.from && r.to ? `${r.from} to ${r.to}` : r.from ? `From ${r.from}` : r.to ? `Up to ${r.to}` : "All time";
const num = (n: number | null): string => (n === null ? "-" : String(n));
const pct = (part: number, whole: number): string => (whole ? `${Math.round((part / whole) * 100)}%` : "-");
const tierText = (tiers: Record<string, number>): string =>
  Object.entries(tiers).sort(([a], [b]) => a.localeCompare(b)).map(([t, n]) => `${t}: ${n}`).join(", ") || "-";
const filtersText = (r: Report): string =>
  [`Dates: ${FIELD_LABEL[r.dateField]}`, r.includeSubtasks ? "Sub-tasks included" : "Sub-tasks not included", r.only.length ? `People: ${r.only.join(", ")}` : "All people"].join(" / ");

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

// ---------- HTML ----------

const CSS = `
:root{--ink:#1c2430;--mute:#667085;--line:#e4e7ec;--soft:#f6f7f9;--accent:#2b5fd9;--ok:#1f8f5f;--late:#c2410c;--bg:#fff}
*{box-sizing:border-box}
body{margin:0;background:var(--soft);color:var(--ink);font:14px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;-webkit-font-smoothing:antialiased}
.page{max-width:960px;margin:0 auto;padding:40px 32px 56px;background:var(--bg)}
header{border-bottom:2px solid var(--ink);padding-bottom:18px;margin-bottom:26px}
.eyebrow{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--accent);font-weight:700}
h1{margin:4px 0 6px;font-size:28px;line-height:1.15;letter-spacing:-.01em}
.meta{display:flex;flex-wrap:wrap;gap:4px 22px;color:var(--mute);font-size:13px}
.meta b{color:var(--ink);font-weight:600}
h2{font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:var(--mute);margin:34px 0 12px;font-weight:700}
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(138px,1fr));gap:12px}
.tile{border:1px solid var(--line);border-radius:10px;padding:14px 16px;background:var(--bg)}
.tile .v{font-size:30px;font-weight:700;letter-spacing:-.02em;font-variant-numeric:tabular-nums;line-height:1.1}
.tile .l{margin-top:4px;color:var(--mute);font-size:12px}
.tile.ok .v{color:var(--ok)}.tile.late .v{color:var(--late)}
table{width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums}
th,td{padding:9px 10px;text-align:left;border-bottom:1px solid var(--line);vertical-align:top}
th{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--mute);font-weight:600;border-bottom:1px solid var(--ink)}
td.n,th.n{text-align:right}
tbody tr:last-child td{border-bottom:0}
.who{font-weight:600}
.bar{display:flex;height:6px;width:96px;border-radius:3px;overflow:hidden;background:var(--line);margin-top:5px}
.bar i{display:block;height:100%}.bar .g{background:var(--ok)}.bar .o{background:var(--late)}
.person{margin-top:26px;break-inside:avoid-page}
.person h3{margin:0 0 6px;font-size:16px;display:flex;justify-content:space-between;align-items:baseline;gap:12px}
.person h3 span{font-size:12px;color:var(--mute);font-weight:400}
.tag{display:inline-block;padding:1px 8px;border-radius:99px;font-size:11px;font-weight:600;background:var(--soft);color:var(--mute);white-space:nowrap}
.tag.ok{background:#e6f4ee;color:var(--ok)}.tag.late{background:#fdeee6;color:var(--late)}
.id{color:var(--mute);font-size:12px;margin-right:6px;white-space:nowrap}
.subs{margin:5px 0 0;padding:0;list-style:none;color:var(--mute);font-size:12.5px}
.subs li:before{content:"\\2713\\00a0";color:var(--ok)}
.sub-note{color:var(--mute);font-size:12px}
.empty{padding:28px;text-align:center;color:var(--mute);border:1px dashed var(--line);border-radius:10px}
.notes{color:var(--mute);font-size:12.5px;padding-left:18px}.notes li{margin:3px 0}
footer{margin-top:34px;padding-top:12px;border-top:1px solid var(--line);color:var(--mute);font-size:12px}
@media (max-width:640px){.page{padding:24px 16px}}
@media print{
@page{size:A4;margin:14mm 12mm}
body{background:#fff;font-size:11px}
.page{max-width:none;padding:0}
h1{font-size:22px}.tile .v{font-size:22px}
.tile,.person,tr{break-inside:avoid}
h2{break-after:avoid}
*{-webkit-print-color-adjust:exact;print-color-adjust:exact}
}`;

function tileHtml(value: string, label: string, cls = ""): string {
  return `<div class="tile ${cls}"><div class="v">${escapeHtml(value)}</div><div class="l">${escapeHtml(label)}</div></div>`;
}

function timelyTag(t: ReportTask): string {
  const cls = t.timeliness === "on-time" ? " ok" : t.timeliness === "late" ? " late" : "";
  return `<span class="tag${cls}">${TIMELY_LABEL[t.timeliness]}</span>`;
}

/** One self-contained HTML page: inline CSS, no script, no network. Prints cleanly on A4. */
export function renderHtml(r: Report): string {
  const s = r.summary;
  const e = escapeHtml;
  const tiles = [
    tileHtml(String(s.tasksDone), "Tasks done"),
    ...(r.includeSubtasks ? [tileHtml(String(s.subtasksDone), "Sub-tasks done")] : []),
    tileHtml(pct(s.onTime, s.onTime + s.late), "On time (of tasks with a due date)", "ok"),
    tileHtml(String(s.late), "Done late", s.late ? "late" : ""),
    tileHtml(num(s.avgDays), "Avg days start to done"),
    tileHtml(String(s.people), "People"),
  ].join("");

  const rowsHtml = r.people
    .map((p) => {
      const dated = p.onTime + p.late;
      const bar = dated
        ? `<div class="bar" title="${p.onTime} on time, ${p.late} late"><i class="g" style="width:${Math.round((p.onTime / dated) * 100)}%"></i><i class="o" style="width:${Math.round((p.late / dated) * 100)}%"></i></div>`
        : "";
      return `<tr><td class="who">${e(p.name)}</td><td class="n">${p.tasksDone}</td>${r.includeSubtasks ? `<td class="n">${p.subtasksDone}</td>` : ""}<td class="n">${p.onTime}</td><td class="n">${p.late}</td><td class="n">${p.noDue}</td><td>${bar || "&nbsp;"}</td><td class="n">${num(p.avgDays)}</td><td>${e(tierText(p.tiers))}</td></tr>`;
    })
    .join("");
  const table = r.people.length
    ? `<table><thead><tr><th>Person</th><th class="n">Tasks</th>${r.includeSubtasks ? '<th class="n">Sub-tasks</th>' : ""}<th class="n">On time</th><th class="n">Late</th><th class="n">No due</th><th>Timeliness</th><th class="n">Avg days</th><th>Tier mix</th></tr></thead><tbody>${rowsHtml}</tbody></table>`
    : "";

  const byPerson = groups(r)
    .map(({ person, tasks }) => {
      const rows = tasks
        .map(({ task, owns, subs }) => {
          const subList = subs.length
            ? `<ul class="subs">${subs.map((x) => `<li>${e(x.text)}${x.lane ? ` <span class="sub-note">#${e(x.lane)}</span>` : ""}</li>`).join("")}</ul>`
            : "";
          const role = owns ? "" : `<div class="sub-note">Sub-tasks only (task owner: ${e(task.owner || "Unassigned")})</div>`;
          return `<tr><td>${task.displayId ? `<span class="id">${e(task.displayId)}</span>` : ""}${e(task.title)}${role}${subList}</td><td>${e(task.doneDate || "-")}<div class="sub-note">source: ${SOURCE_LABEL[task.doneSource]}</div></td><td>${e(task.due || "-")}</td><td>${owns ? timelyTag(task) : ""}</td><td class="n">${task.days === undefined ? "-" : task.days}</td><td>${e(task.tier)}</td></tr>`;
        })
        .join("");
      return `<section class="person"><h3>${e(person.name)}<span>${person.tasksDone} tasks${r.includeSubtasks ? `, ${person.subtasksDone} sub-tasks` : ""}</span></h3><table><thead><tr><th>Task</th><th>Done</th><th>Due</th><th>Result</th><th class="n">Days</th><th>Tier</th></tr></thead><tbody>${rows}</tbody></table></section>`;
    })
    .join("");

  const empty = r.tasks.length === 0 ? `<div class="empty">No tasks were completed in this period.</div>` : "";
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${e(`Done report ${period(r)}`)}</title>
<style>${CSS}</style></head>
<body><div class="page">
<header><div class="eyebrow">GITASK done report</div><h1>${e(r.repo ? `${r.repo}: work completed` : "Work completed")}</h1>
<div class="meta"><span><b>Period</b> ${e(period(r))}</span><span><b>Filters</b> ${e(filtersText(r))}</span>${r.repo ? `<span><b>Repo</b> ${e(r.repo)}</span>` : ""}<span><b>Generated</b> ${e(r.generated)}</span></div></header>
<h2>Summary</h2><div class="tiles">${tiles}</div>
${empty}
${r.people.length ? `<h2>By person</h2>${table}<h2>Tasks by person</h2>${byPerson}` : ""}
<h2>Data notes</h2><ul class="notes">${r.notes.map((n) => `<li>${e(n)}</li>`).join("")}</ul>
<footer>Generated by GITASK from the Tasks folder and its git history. Names are GitHub names; no email addresses are included.</footer>
</div></body></html>
`;
}

// ---------- Markdown ----------

/** Escape text for use inside a Markdown table cell or line. */
export function escapeMd(s: string): string {
  const ZWSP = "\u200b"; // invisible; breaks @mentions and bare-URL autolinks without a visible escape
  return s
    .replace(/@/g, () => `@${ZWSP}`)
    .replace(/\b(https?|ftp):\/\//gi, (_m, scheme: string) => `${scheme}:${ZWSP}//`)
    .replace(/\bwww\./gi, () => `www${ZWSP}.`)
    .replace(/\r?\n/g, " ").replace(/[\\`*_{}[\]<>()#+!|~&]/g, (c) => (c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === "&" ? "&amp;" : `\\${c}`)).replace(/^-/, "\\-");
}

export function renderMarkdown(r: Report): string {
  const s = r.summary;
  const m = escapeMd;
  const out: string[] = [
    `# ${m(r.repo ? `${r.repo}: work completed` : "Work completed")}`,
    "",
    `- Period: ${m(period(r))}`,
    `- Filters: ${m(filtersText(r))}`,
    ...(r.repo ? [`- Repo: ${m(r.repo)}`] : []),
    `- Generated: ${m(r.generated)}`,
    "",
    "## Summary",
    "",
    `- Tasks done: ${s.tasksDone}`,
    ...(r.includeSubtasks ? [`- Sub-tasks done: ${s.subtasksDone}`] : []),
    `- On time: ${s.onTime} / Late: ${s.late} / No due date: ${s.noDue}`,
    `- Average days start to done: ${num(s.avgDays)}`,
    `- People: ${s.people}`,
    "",
  ];
  if (!r.tasks.length) out.push("No tasks were completed in this period.", "");
  else {
    out.push("## By person", "");
    out.push(`| Person | Tasks | ${r.includeSubtasks ? "Sub-tasks | " : ""}On time | Late | No due | Avg days | Tier mix |`);
    out.push(`| --- | ---: | ${r.includeSubtasks ? "---: | " : ""}---: | ---: | ---: | ---: | --- |`);
    for (const p of r.people) {
      out.push(`| ${m(p.name)} | ${p.tasksDone} | ${r.includeSubtasks ? `${p.subtasksDone} | ` : ""}${p.onTime} | ${p.late} | ${p.noDue} | ${num(p.avgDays)} | ${m(tierText(p.tiers))} |`);
    }
    out.push("", "## Tasks by person", "");
    for (const { person, tasks } of groups(r)) {
      out.push(`### ${m(person.name)}`, "");
      for (const { task, owns, subs } of tasks) {
        const id = task.displayId ? `${m(task.displayId)} ` : "";
        const detail = owns ? `${TIMELY_LABEL[task.timeliness]}, due ${task.due || "-"}` : `sub-tasks only, owner ${task.owner || "Unassigned"}`;
        out.push(`- ${id}${m(task.title)}: done ${task.doneDate || "-"} (${SOURCE_LABEL[task.doneSource]}), ${m(detail)}`);
        for (const x of subs) out.push(`  - [x] ${m(x.text)}${x.lane ? ` \\#${m(x.lane)}` : ""}`);
      }
      out.push("");
    }
  }
  out.push("## Data notes", "", ...r.notes.map((n) => `- ${m(n)}`), "");
  return out.join("\n");
}

// ---------- CSV ----------

export const CSV_HEADER = ["person", "kind", "task_id", "title", "lane", "done_date", "date_source", "due", "result", "days_start_to_done", "tier", "task_owner"];

/** One CSV cell: quoted, quotes doubled, and a leading `= + - @` (or tab/CR) defused with a `'`. */
export function csvCell(v: string | number | undefined): string {
  if (v === undefined) return '""';
  let t = String(v);
  if (/^[=+\-@\t\r]/.test(t)) t = `'${t}`;
  return `"${t.replace(/"/g, '""')}"`;
}

/** One row per task (under its owner) and per completed sub-task (under its assignee). CRLF line ends. */
export function renderCsv(r: Report): string {
  const selected = (key: string) => r.only.length === 0 || r.only.includes(key.toLowerCase());
  const lines = [CSV_HEADER.map((h) => `"${h}"`).join(",")];
  const row = (cells: (string | number | undefined)[]) => lines.push(cells.map(csvCell).join(","));
  for (const t of r.tasks) {
    if (selected(t.personKey)) {
      row([t.owner || "Unassigned", "task", t.displayId ?? t.id, t.title, "", t.doneDate, t.doneSource, t.due, TIMELY_LABEL[t.timeliness], t.days, t.tier, t.owner || "Unassigned"]);
    }
    for (const x of t.subtasks) {
      if (selected(x.personKey)) row([x.assignee || "Unassigned", "sub-task", t.displayId ?? t.id, x.text, x.lane, t.doneDate, t.doneSource, t.due, "", "", t.tier, t.owner || "Unassigned"]);
    }
  }
  return lines.join("\r\n") + "\r\n";
}
