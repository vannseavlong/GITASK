// Export dialog logic with no `vscode` import: filter state -> report request, and the host-side
// handler that builds the report from a VALIDATED request. CLI-serve reuses `buildReportFile`.
import { basename, dirname } from "node:path";
import { buildReport, loadBoard, loadReportHeader, readPeople, renderCsv, renderHtml, renderMarkdown } from "gitask-core";
import type { Person } from "gitask-core";
import type { ReportFormat, ReportRequest } from "./protocol.ts";
import { reportFileName } from "./report-options.ts";

const MIME: Record<ReportFormat, string> = { html: "text/html; charset=utf-8", markdown: "text/markdown; charset=utf-8", csv: "text/csv; charset=utf-8" };

export interface ReportFile { name: string; mime: string; content: string }

/** Build a report file from validated options. Never takes HTML from the caller. */
export async function buildReportFile(tasksDir: string, o: ReportRequest, format: ReportFormat, people?: Person[]): Promise<ReportFile> {
  const board = await loadBoard(tasksDir);
  const report = await buildReport(board, {
    from: o.from,
    to: o.to,
    dateField: o.dateField,
    only: o.people,
    includeSubtasks: o.includeSubtasks,
    people: people ?? (await readPeople(tasksDir)),
    repo: basename(dirname(tasksDir)),
  });
  const header = format !== "csv" && o.includeHeader !== false ? await loadReportHeader(tasksDir) : undefined;
  const content = format === "html" ? renderHtml(report, header) : format === "markdown" ? renderMarkdown(report, header) : renderCsv(report);
  return { name: reportFileName(o, format), mime: MIME[format], content };
}
