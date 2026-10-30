import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { BoardData, Host, UiState } from "@/host/index.ts";
import { DEFAULT_VIEW, VIEWS } from "@/views/registry.tsx";
import { SV, derive } from "./logic.ts";
import { FilterBar } from "./filter-bar.tsx";
import { StatusBar } from "./status-bar.tsx";

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
          <FilterBar ui={ui} range={d.range} board={d.visible} onChange={update} />
          <StatusBar raw={raw} ui={ui} onChange={update} />
          {raw && d.shown && d.visible ? (SV.summary(raw, ui.hiddenStatuses).allHidden ? null : (
            VIEWS.map((v) => (
              <TabsContent key={v.id} value={v.id}>
                {renderView(v.id, d.shown!, raw, host)}
              </TabsContent>
            ))
          )) : (
            <div className="p-6 text-muted-foreground" role="status">{error ? "" : "Loading…"}</div>
          )}
        </Tabs>
      </div>
    </TooltipProvider>
  );
}

function renderView(id: string, board: BoardData, full: BoardData, host: Host) {
  const v = VIEWS.find((x) => x.id === id)!;
  const C = v.component;
  return <C board={board} full={full} host={host} />;
}
