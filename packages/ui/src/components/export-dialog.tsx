import * as React from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { BoardData, Host, UiState } from "@/host/index.ts";
import type { ReportFormat, ReportRequest } from "@host-src/protocol.ts";
import { filterToReportRequest, peopleChoices } from "@host-src/report-options.ts";

const today = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/** The preview is the real HTML report. It runs in a sandbox with no scripts; the page nonce lets its <style> pass the CSP. */
function withNonce(html: string): string {
  const nonce = document.getElementById("root")?.dataset.nonce;
  return nonce ? html.replace(/<style>/g, `<style nonce="${nonce}">`) : html;
}

const FORMATS: { id: ReportFormat; label: string }[] = [
  { id: "html", label: "HTML (print to PDF)" },
  { id: "markdown", label: "Markdown" },
  { id: "csv", label: "CSV" },
];

export function ExportDialog({ host, board, ui, open, onOpenChange }: { host: Host; board: BoardData | null; ui: UiState; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [req, setReq] = React.useState<ReportRequest>(() => filterToReportRequest(ui, today()));
  const [format, setFormat] = React.useState<ReportFormat>("html");
  const [html, setHtml] = React.useState("");
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [saved, setSaved] = React.useState("");
  const choices = React.useMemo(() => peopleChoices(board as Parameters<typeof peopleChoices>[0]), [board]);

  // Pre-fill from the active filter each time the dialog opens.
  const wasOpen = React.useRef(false);
  React.useEffect(() => {
    if (open && !wasOpen.current) {
      setReq(filterToReportRequest(ui, today()));
      setSaved(""); setError("");
    }
    wasOpen.current = open;
  }, [open, ui]);

  React.useEffect(() => host.onMessage((m) => {
    if (m.type === "reportPreview") { setHtml(m.html); setError(m.error ?? ""); }
    if (m.type === "reportExported") { setBusy(false); setSaved(m.ok ? (m.path ?? "Saved") : ""); if (m.error) setError(m.error); }
  }), [host]);

  const key = JSON.stringify(req);
  React.useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => host.send({ type: "previewReport", options: req }), 250);
    return () => clearTimeout(t);
  }, [open, key, host]);

  const togglePerson = (id: string) => setReq((r) => ({ ...r, people: r.people.includes(id) ? r.people.filter((p) => p !== id) : [...r.people, id] }));
  const invalid = Boolean(req.from && req.to && req.from > req.to);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-auto" aria-describedby="export-desc">
        <DialogHeader>
          <DialogTitle>Export report</DialogTitle>
          <DialogDescription id="export-desc">What was done in a period, by person. Names only, no email addresses.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 md:grid-cols-[18rem_1fr]">
          <div className="grid content-start gap-3 text-xs">
            <div className="grid gap-1">
              <span>Period</span>
              <DateRangePicker label="Report period" value={{ from: req.from, to: req.to }} onChange={(r) => setReq((c) => ({ ...c, ...r }))} />
            </div>
            <div className="grid gap-1">
              <span>Date field</span>
              <Select value={req.dateField} onValueChange={(v) => setReq((c) => ({ ...c, dateField: v as ReportRequest["dateField"] }))}>
                <SelectTrigger aria-label="Report date field" className="h-6 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="done">Done</SelectItem>
                  <SelectItem value="due">Due</SelectItem>
                  <SelectItem value="updated">Updated</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <fieldset className="grid gap-1">
              <legend>People {req.people.length ? `(${req.people.length} selected)` : "(everyone)"}</legend>
              <div className="max-h-32 overflow-auto rounded border border-border p-1">
                {choices.length === 0 && <span className="opacity-70">No people found</span>}
                {choices.map((p) => (
                  <label key={p.id} className="flex items-center gap-1.5 py-0.5">
                    <input type="checkbox" checked={req.people.includes(p.id)} onChange={() => togglePerson(p.id)} />
                    {p.label}
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="flex items-center gap-1.5">
              <input type="checkbox" checked={req.includeSubtasks} onChange={(e) => setReq((c) => ({ ...c, includeSubtasks: e.target.checked }))} />
              Include sub-tasks
            </label>
            <div className="grid gap-1">
              <span>Format</span>
              <Select value={format} onValueChange={(v) => setFormat(v as ReportFormat)}>
                <SelectTrigger aria-label="Report format" className="h-6 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{FORMATS.map((f) => <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid min-h-64 content-start gap-1">
            <span className="text-xs">Preview (HTML)</span>
            {invalid ? <div role="alert" className="text-destructive text-xs">The start date is after the end date.</div> : error ? <div role="alert" className="text-destructive text-xs">{error}</div> : null}
            <iframe title="Report preview" sandbox="" srcDoc={withNonce(html)} className="h-96 w-full rounded border border-border bg-white" />
          </div>
        </div>
        <DialogFooter className="items-center">
          {saved && <span role="status" className="mr-auto text-xs opacity-80">Saved {saved}</span>}
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button disabled={invalid || busy} onClick={() => { setBusy(true); setSaved(""); host.send({ type: "exportReport", options: req, format }); }}>
            <Download /> Export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
