import * as React from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { BoardData, Host, UiState } from "@/host/index.ts";
import { DEFAULT_VIEW, VIEWS, availableViews } from "@/views/registry.tsx";
import { SV, derive } from "./logic.ts";
import { ViewTabs } from "./view-tabs.tsx";
import { resolveOrder, sameOrder } from "@/lib/view-order.ts";
import { FilterBar } from "./filter-bar.tsx";
import { ProjectHeader } from "./project-header.tsx";
import { StatusBar } from "./status-bar.tsx";
import { SprintStrip } from "./sprint-strip.tsx";
import { ExportDialog } from "@/components/export-dialog.tsx";
import { DeleteConfirm } from "@/components/delete-confirm.tsx";
import { EditDialogs } from "@/components/edit-dialogs.tsx";
import { GithubDialog } from "@/components/github-dialog.tsx";
import { CompleteSprintDialog } from "@/components/complete-sprint-dialog.tsx";
import { ThemeControls } from "@/theme/theme-controls.tsx";
import { readyToOpen } from "@/detail/pending-open.ts";
import { hasVsCodeApi } from "@/host/vscode-host.ts";
import { DetailPanel } from "@/detail/detail-panel.tsx";

const DEFAULT_ORDER = VIEWS.map((v) => v.id);

export function App({ host, initialView }: { host: Host; initialView: string }) {
  const [raw, setRaw] = React.useState<BoardData | null>(null);
  const [error, setError] = React.useState("");
  const [pendingOpen, setPendingOpen] = React.useState<string | null>(null); // a just-created task, opened once the board has it
  const [ui, setUi] = React.useState<UiState>(() => host.loadState());
  // The Sprint tab exists only while sprints are on; a saved or initial `sprint` view falls back until then.
  const shown = availableViews(raw);
  const view = shown.some((v) => v.id === ui.view) ? ui.view! : shown.some((v) => v.id === initialView) ? initialView : DEFAULT_VIEW;
  const defaultOrder = React.useMemo(() => DEFAULT_ORDER.filter((id) => shown.some((v) => v.id === id)), [shown]);

  const tabs = React.useMemo(() => resolveOrder(ui.viewOrder, DEFAULT_ORDER).map((id) => VIEWS.find((v) => v.id === id)!).filter((v) => shown.includes(v)), [ui.viewOrder, shown]);

  React.useEffect(() => {
    const offBoard = host.onBoard((b) => { setRaw(b); setError(""); });
    const offMsg = host.onMessage((m) => {
      if (m.type === "error") setError(m.message);
      else if (m.type === "taskCreated" && typeof m.path === "string") setPendingOpen(m.path);
    });
    host.getBoard().then((b) => { setRaw(b); setError(""); }).catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
    return () => { offBoard(); offMsg(); };
  }, [host]);

  const update = React.useCallback((patch: Partial<UiState>) => {
    setUi((cur) => {
      const next = { ...cur, ...patch };
      host.saveState(next);
      return next;
    });
  }, [host]);
  // A view command on an already open panel ("GITASK: Show Board"): switch tab like a click would.
  React.useEffect(() => host.onMessage((m) => {
    if (m.type === "showView" && VIEWS.some((v) => v.id === m.id)) update({ view: m.id });
  }), [host, update]);

  const [detailPath, setDetailPath] = React.useState<string | null>(null);
  React.useEffect(() => {
    const p = readyToOpen(raw, pendingOpen);
    if (p) { setDetailPath(p); setPendingOpen(null); }
  }, [raw, pendingOpen]);
  const closeDetail = React.useCallback(() => setDetailPath(null), []);
  const [exportOpen, setExportOpen] = React.useState(false);
  const [githubOpen, setGithubOpen] = React.useState(false);
  const [completing, setCompleting] = React.useState<string | null>(null); // sprint id while the strip's Complete dialog is open
  const d = React.useMemo(() => derive(raw, ui), [raw, ui]);

  return (
    <TooltipProvider>
      <div className="flex h-full flex-col">
        <ProjectHeader project={raw?.project} host={host} />
        <Tabs
          value={view}
          onValueChange={(id) => { update({ view: id }); host.send({ type: "view", id }); }}
        >
          <ViewTabs
            items={tabs}
            defaultOrder={defaultOrder}
            onOrder={(order) => update({ viewOrder: sameOrder(order, defaultOrder) ? undefined : order })}
          />
          {error && <div role="alert" className="shrink-0 px-3 pt-1 text-destructive">{error}</div>}
          {raw && d.scope.kind === "sprint" && <SprintStrip sprint={d.scope.sprint} board={raw} onComplete={() => d.scope.kind === "sprint" && setCompleting(d.scope.sprint.id)} />}
          <FilterBar ui={ui} range={d.range} scope={d.scope} board={d.visible} onChange={update} extra={<span className="ml-auto flex gap-1.5">{!hasVsCodeApi() && <ThemeControls />}<Button variant="outline" size="sm" onClick={() => setGithubOpen(true)}>Sync to GitHub</Button><Button variant="outline" size="sm" onClick={() => setExportOpen(true)}>Export</Button></span>} />
          <StatusBar raw={raw} ui={ui} onChange={update} />
          {raw && d.shown && d.visible ? (SV.summary(raw, ui.hiddenStatuses).allHidden ? null : (
            shown.map((v) => (
              <TabsContent key={v.id} value={v.id}>
                {renderView(v.id, d.shown!, raw, host, ui, update, setDetailPath)}
              </TabsContent>
            ))
          )) : (
            <div className="p-6 text-muted-foreground" role="status">{error ? "" : "Loading…"}</div>
          )}
        </Tabs>
        <DeleteConfirm host={host} />
        <EditDialogs host={host} board={raw} />
        <ExportDialog host={host} board={raw} ui={ui} open={exportOpen} onOpenChange={setExportOpen} />
        <GithubDialog host={host} github={raw?.github ?? undefined} open={githubOpen} onOpenChange={setGithubOpen} />
        {raw && completing && (
          <CompleteSprintDialog
            host={host}
            board={raw}
            sprintId={completing}
            open
            onOpenChange={(o) => { if (!o) setCompleting(null); }}
            onPlanNext={(next) => { update({ view: "sprint", sprintScope: next ?? "all" }); host.send({ type: "view", id: "sprint" }); }}
          />
        )}
        <DetailPanel host={host} board={raw} path={detailPath} onOpenTask={setDetailPath} onClose={closeDetail} />
      </div>
    </TooltipProvider>
  );
}

function renderView(id: string, board: BoardData, full: BoardData, host: Host, ui: UiState, update: (p: Partial<UiState>) => void, openTask: (path: string) => void) {
  const v = VIEWS.find((x) => x.id === id)!;
  const C = v.component;
  return <C board={board} full={full} host={host} ui={ui} update={update} openTask={openTask} />;
}
