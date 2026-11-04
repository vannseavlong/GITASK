import * as React from "react";
import type { ProjectLayout } from "gitask-core";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { BoardData, Host } from "@/host/index.ts";
import { logoFileProblem, toBase64 } from "@/lib/logo-file.ts";
import { hasChanges, projectChanges, projectSavedReply } from "@/lib/project-diff.ts";
import { HeaderView } from "@/shell/project-header.tsx";
import { MAX_SUBTITLE, MAX_TITLE, PROJECT_LAYOUT_DEFAULTS } from "@host-src/protocol.ts";

type Logo = { kind: "keep" } | { kind: "remove" } | { kind: "new"; name: string; data: string; preview: string };

const OPTIONS: { key: "align" | "size" | "logoPosition"; label: string; values: readonly string[] }[] = [
  { key: "align", label: "Alignment", values: ["left", "center", "right"] },
  { key: "size", label: "Size", values: ["sm", "md", "lg"] },
  { key: "logoPosition", label: "Logo position", values: ["left", "top", "right", "hidden"] },
];

function Choice({ label, value, values, onChange }: { label: string; value: string; values: readonly string[]; onChange: (v: string) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className="grid gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex gap-1">
        {values.map((v) => (
          <Button key={v} type="button" size="sm" role="radio" aria-checked={v === value} variant={v === value ? "default" : "outline"} className="h-7 px-2 text-xs" onClick={() => onChange(v)}>{v}</Button>
        ))}
      </div>
    </div>
  );
}

/**
 * "Customize header": edits the project title, subtitle, layout and logo with a live preview that uses the same
 * `HeaderView` as the real header. Save sends one `setProject` message with only the changed fields and waits for the host's `projectSaved` reply; the host validates it again. A picked logo is
 * sent as base64 (the host copies it into Tasks/ under a name it generates).
 */
export function ProjectDialog({ host, project, currentLogoSrc, open, onOpenChange, onSaved }: { host: Host; project: BoardData["project"]; currentLogoSrc?: string; open: boolean; onOpenChange: (o: boolean) => void; onSaved: () => void }) {
  const [title, setTitle] = React.useState("");
  const [subtitle, setSubtitle] = React.useState("");
  const [layout, setLayout] = React.useState<ProjectLayout>({ ...PROJECT_LAYOUT_DEFAULTS });
  const [logo, setLogo] = React.useState<Logo>({ kind: "keep" });
  const [error, setError] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const wasOpen = React.useRef(false);

  // Start from the saved values each time the dialog opens.
  React.useEffect(() => {
    if (open && !wasOpen.current) {
      setTitle(project?.title ?? "");
      setSubtitle(project?.subtitle ?? "");
      setLayout({ ...PROJECT_LAYOUT_DEFAULTS, ...project?.layout });
      setLogo({ kind: "keep" });
      setError("");
      setSaving(false);
      unsub.current?.(); // a late reply to an earlier, cancelled save is ignored
      unsub.current = undefined;
    }
    wasOpen.current = open;
  }, [open, project]);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    const problem = logoFileProblem(file.name, file.size);
    if (problem) return setError(problem);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const data = toBase64(bytes);
      // The preview is an <img> data URL; the browser's own file type is not trusted, the host checks the content.
      setLogo({ kind: "new", name: file.name, data, preview: `data:${file.type || "application/octet-stream"};base64,${data}` });
      setError("");
    } catch {
      setError("Could not read that file.");
    }
  };

  const previewSrc = logo.kind === "new" ? logo.preview : logo.kind === "keep" ? currentLogoSrc : undefined;
  const hasLogo = logo.kind === "new" || (logo.kind === "keep" && !!project?.logo);

  // The dialog stays open until the host answers: it closes on success and keeps the draft and the error otherwise.
  // Subscribe before sending, so a reply that comes back at once is not missed.
  const unsub = React.useRef<(() => void) | undefined>(undefined);
  React.useEffect(() => () => unsub.current?.(), []);

  const save = () => {
    const changes = projectChanges(
      { title: project?.title, subtitle: project?.subtitle, layout: { ...PROJECT_LAYOUT_DEFAULTS, ...project?.layout }, hasLogo: !!project?.logo },
      { title, subtitle, layout, logo },
    );
    if (!hasChanges(changes)) return onOpenChange(false); // nothing changed: send nothing, commit nothing
    setError("");
    setSaving(true);
    unsub.current?.();
    unsub.current = host.onMessage((m) => {
      // A message the host rejects before it reaches the save (too large, invalid) comes back as a plain `error`.
      const r = projectSavedReply(m) ?? (m.type === "error" ? { ok: false as const, error: m.message } : undefined);
      if (!r) return;
      unsub.current?.();
      unsub.current = undefined;
      setSaving(false);
      if (r.ok) { onSaved(); onOpenChange(false); } else setError(r.error);
    });
    host.send({ type: "setProject", ...changes });
  };

  const set = <K extends keyof ProjectLayout>(k: K, v: ProjectLayout[K]) => setLayout((l) => ({ ...l, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl" aria-describedby="project-dialog-desc">
        <DialogHeader>
          <DialogTitle>Customize header</DialogTitle>
          <DialogDescription id="project-dialog-desc">Shown above every view. Saved in Tasks/gitask.json; a new logo is copied into Tasks/.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <section aria-label="Preview" className="min-h-14 rounded-md border border-border bg-background p-3">
            <HeaderView title={title.trim() || undefined} subtitle={subtitle.trim() || undefined} layout={layout} hasLogo={hasLogo} src={previewSrc} alt="Logo preview" />
            {!title.trim() && !subtitle.trim() && !(hasLogo && previewSrc) && <span className="text-xs text-muted-foreground">Nothing to show yet.</span>}
          </section>
          <label className="grid gap-1 text-sm">Title
            <Input value={title} maxLength={MAX_TITLE} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label className="grid gap-1 text-sm">Subtitle
            <Input value={subtitle} maxLength={MAX_SUBTITLE} onChange={(e) => setSubtitle(e.target.value)} />
          </label>
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            {OPTIONS.map((o) => <Choice key={o.key} label={o.label} value={layout[o.key]} values={o.values} onChange={(v) => set(o.key, v as never)} />)}
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!layout.showTitle} onChange={(e) => set("showTitle", !e.target.checked)} />
            Hide the title (keep subtitle and logo)
          </label>
          <div className="grid gap-1">
            <span className="text-sm">Logo</span>
            <div className="flex flex-wrap items-center gap-2">
              <input aria-label="Logo file" type="file" accept=".png,.jpg,.jpeg,.webp,.gif,.svg,image/png,image/jpeg,image/webp,image/gif,image/svg+xml" className="text-xs" onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ""; }} />
              {hasLogo && <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => setLogo({ kind: "remove" })}>Remove logo</Button>}
            </div>
            <span className="text-xs text-muted-foreground">png, jpg, webp, gif or svg, at most 1 MiB.</span>
          </div>
          {error && <div role="alert" className="text-xs text-destructive">{error}</div>}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => { setLayout({ ...PROJECT_LAYOUT_DEFAULTS }); setError(""); }}>Reset layout</Button>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
