import * as React from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { BoardData, Host, UiState } from "@/host/index.ts";
import { DEFAULT_VIEW, VIEWS } from "@/views/registry.tsx";
import { SV, derive } from "./logic.ts";
import { FilterBar } from "./filter-bar.tsx";
import { StatusBar } from "./status-bar.tsx";
import { ExportDialog } from "@/components/export-dialog.tsx";
import { DeleteConfirm } from "@/components/delete-confirm.tsx";
import { EditDialogs } from "@/components/edit-dialogs.tsx";
import { GithubDialog } from "@/components/github-dialog.tsx";
import { DetailPanel } from "@/detail/detail-panel.tsx";

export function App({ host, initialView }: { host: Host; initialView: string }) {
  const [raw, setRaw] = React.useState<BoardData | null>(null);
  const [error, setError] = React.useState("");
  const [ui, setUi] = React.useState<UiState>(() => host.loadState());
  const view = VIEWS.some((v) => v.id === ui.view) ? ui.view! : VIEWS.some((v) => v.id === initialView) ? initialView : DEFAULT_VIEW;

  React.useEffect(() => {
    const offBoard = host.onBoard((b) => { setRaw(b); setError(""); });
    const offMsg = host.onMessage((m) => { if (m.type === "error") setError(m.message); });
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

  const [detailPath, setDetailPath] = React.useState<string | null>(null);
  const closeDetail = React.useCallback(() => setDetailPath(null), []);
  const [exportOpen, setExportOpen] = React.useState(false);
  const [githubOpen, setGithubOpen] = React.useState(false);
  const d = React.useMemo(() => derive(raw, ui), [raw, ui]);

  return (
    <TooltipProvider>
      <div className="flex h-full flex-col">
        <Tabs
          value={view}
          onValueChange={(id) => { update({ view: id }); host.send({ type: "view", id }); }}
        >
          <TabsList aria-label="Views">
            {VIEWS.map((v) => <TabsTrigger key={v.id} value={v.id}>{v.label}</TabsTrigger>)}
          </TabsList>
          {error && <div role="alert" className="shrink-0 px-3 pt-1 text-destructive">{error}</div>}
          <FilterBar ui={ui} range={d.range} board={d.visible} onChange={update} extra={<span className="ml-auto flex gap-1.5">{raw?.github && <Button variant="outline" size="sm" onClick={() => setGithubOpen(true)}>Sync to GitHub</Button>}<Button variant="outline" size="sm" onClick={() => setExportOpen(true)}>Export</Button></span>} />
          <StatusBar raw={raw} ui={ui} onChange={update} />
          {raw && d.shown && d.visible ? (SV.summary(raw, ui.hiddenStatuses).allHidden ? null : (
            VIEWS.map((v) => (
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
        {raw?.github && <GithubDialog host={host} github={raw.github} open={githubOpen} onOpenChange={setGithubOpen} />}
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
