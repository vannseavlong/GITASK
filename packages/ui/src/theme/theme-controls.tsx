import * as React from "react";
import { Moon, Monitor, Palette, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { applyTheme, computedHex } from "./apply.ts";
import {
  DEFAULT_SETTINGS, PRESETS, RADIUS_MAX, RADIUS_MIN, TOKEN_KEYS, applyPreset, clampRadius, contrastRatio, exportTheme,
  importTheme, isHex, loadSettings, lowContrast, pickForeground, saveSettings, type ThemeMode, type ThemeSettings, type TokenKey,
} from "./logic.ts";

const store = (): Storage | undefined => { try { return window.localStorage; } catch { return undefined; } };
const NEXT: Record<ThemeMode, ThemeMode> = { system: "light", light: "dark", dark: "system" };
const LABEL: Record<ThemeMode, string> = { system: "System", light: "Light", dark: "Dark" };
const ICON = { system: Monitor, light: Sun, dark: Moon };
const FIELDS: { key: TokenKey; label: string; vars: string }[] = [
  { key: "primary", label: "Primary", vars: "--primary" },
  { key: "accent", label: "Accent", vars: "--accent" },
  { key: "background", label: "Background", vars: "--background" },
  { key: "card", label: "Card", vars: "--card" },
  { key: "border", label: "Border", vars: "--border" },
];

/** Browser only: the Light / Dark / System toggle and the Theme dialog. VS Code follows its own theme and never renders this. */
export function ThemeControls() {
  const [s, setS] = React.useState<ThemeSettings>(() => loadSettings(store()));
  const [open, setOpen] = React.useState(false);
  const commit = React.useCallback((next: ThemeSettings) => { setS(next); applyTheme(next); saveSettings(store(), next); }, []);
  React.useEffect(() => {
    applyTheme(s);
    if (s.mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const on = () => applyTheme(s);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [s]);
  const Icon = ICON[s.mode];
  return (
    <>
      <Button variant="outline" size="sm" aria-label={`Theme: ${LABEL[s.mode]}. Switch to ${LABEL[NEXT[s.mode]]}`} title={`Theme: ${LABEL[s.mode]}`} onClick={() => commit({ ...s, mode: NEXT[s.mode] })}>
        <Icon aria-hidden className="size-4" />
      </Button>
      <Button variant="outline" size="sm" aria-label="Customize theme" title="Customize theme" onClick={() => setOpen(true)}>
        <Palette aria-hidden className="size-4" />
      </Button>
      <ThemeDialog open={open} onOpenChange={setOpen} settings={s} commit={commit} />
    </>
  );
}

function ThemeDialog({ open, onOpenChange, settings, commit }: { open: boolean; onOpenChange: (o: boolean) => void; settings: ThemeSettings; commit: (s: ThemeSettings) => void }) {
  const [note, setNote] = React.useState("");
  const [drafts, setDrafts] = React.useState<Partial<Record<TokenKey, string>>>({});
  const fileRef = React.useRef<HTMLInputElement>(null);
  const set = (key: TokenKey, v: string) => {
    setDrafts((d) => ({ ...d, [key]: v }));
    if (isHex(v)) commit({ ...settings, tokens: { ...settings.tokens, [key]: v.toLowerCase() } });
  };
  const primary = settings.tokens.primary ?? computedHex("--primary");
  const fg = pickForeground(primary);
  const ratio = contrastRatio(fg, primary);
  const warn = lowContrast(fg, primary);
  const radius = settings.radius ?? 4;

  const doExport = () => {
    const url = URL.createObjectURL(new Blob([exportTheme(settings)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url; a.download = "gitask-theme.json"; a.click();
    URL.revokeObjectURL(url);
  };
  const doImport = async (file: File | undefined) => {
    if (!file) return;
    const r = importTheme(await file.text());
    if (r.ok) { commit({ ...settings, tokens: r.settings.tokens, radius: r.settings.radius }); setDrafts({}); setNote("Theme imported."); }
    else setNote(`Import failed: ${r.error}`);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-auto" aria-describedby="theme-desc">
        <DialogHeader>
          <DialogTitle>Theme</DialogTitle>
          <DialogDescription id="theme-desc">Colours apply live and are kept in this browser only.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Presets">
          {Object.entries(PRESETS).map(([id, p]) => (
            <Button key={id} variant="outline" size="sm" onClick={() => { commit(applyPreset(settings, id)); setDrafts({}); setNote(""); }}>
              <span aria-hidden className="mr-1.5 inline-block size-3 rounded-full border" style={{ background: p.primary ?? (settings.mode === "dark" ? "#e5e5e5" : "#171717") }} />
              {p.label}
            </Button>
          ))}
        </div>
        <div className="grid grid-cols-[6rem_auto_1fr] items-center gap-x-3 gap-y-2">
          {FIELDS.map((f) => {
            const value = settings.tokens[f.key] ?? computedHex(f.vars);
            const draft = drafts[f.key] ?? value;
            return (
              <React.Fragment key={f.key}>
                <label htmlFor={`theme-${f.key}`}>{f.label}</label>
                <input id={`theme-${f.key}`} type="color" aria-label={`${f.label} colour`} value={value} onChange={(e) => set(f.key, e.target.value)} className="h-7 w-10 cursor-pointer rounded border bg-transparent p-0.5" />
                <input aria-label={`${f.label} hex`} aria-invalid={!isHex(draft)} value={draft} maxLength={7} spellCheck={false} onChange={(e) => set(f.key, e.target.value)} className={`w-28 rounded border bg-input px-2 py-1 font-mono ${isHex(draft) ? "" : "border-destructive"}`} />
              </React.Fragment>
            );
          })}
          <label htmlFor="theme-radius">Radius</label>
          <input id="theme-radius" type="range" min={RADIUS_MIN} max={RADIUS_MAX} step={1} value={radius} onChange={(e) => commit({ ...settings, radius: clampRadius(e.target.value) })} className="col-span-2 accent-[var(--primary)]" />
        </div>
        <p role={warn ? "alert" : "status"} className={`text-sm ${warn ? "text-destructive" : "text-muted-foreground"}`}>
          {warn ? `Text on primary is ${ratio.toFixed(1)}:1, below the 4.5:1 minimum for readable text.` : `Text on primary: ${ratio.toFixed(1)}:1, ${fg === "#000000" ? "black" : "white"} text is used.`}
        </p>
        <div aria-label="Preview" className="flex flex-wrap items-center gap-2 rounded-md border bg-card p-3 text-card-foreground">
          <Button size="sm">Primary</Button>
          <Button size="sm" variant="outline">Outline</Button>
          <span className="rounded-md bg-accent px-2 py-1 text-accent-foreground">Accent</span>
          <span className="text-muted-foreground">Card with border</span>
        </div>
        {note && <p role="status" className="text-sm">{note}</p>}
        <DialogFooter className="gap-1.5">
          <input ref={fileRef} type="file" accept="application/json,.json" aria-label="Import theme file" hidden onChange={(e) => void doImport(e.target.files?.[0])} />
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>Import</Button>
          <Button variant="outline" size="sm" onClick={doExport}>Export</Button>
          <Button variant="outline" size="sm" onClick={() => { commit({ ...DEFAULT_SETTINGS, mode: settings.mode, tokens: {} }); setDrafts({}); setNote("Theme reset."); }}>Reset</Button>
          <Button size="sm" onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
