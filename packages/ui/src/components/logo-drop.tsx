import * as React from "react";
import { ImagePlus, Replace, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatBytes } from "@/lib/logo-file.ts";
import { cn } from "@/lib/utils";

export const LOGO_ACCEPT = ".png,.jpg,.jpeg,.webp,.gif,.svg,image/png,image/jpeg,image/webp,image/gif,image/svg+xml";

/** Checkerboard behind a thumbnail, so a transparent logo is visible on any theme. */
const CHECKER: React.CSSProperties = {
  backgroundImage:
    "linear-gradient(45deg, var(--checker) 25%, transparent 25%, transparent 75%, var(--checker) 75%), linear-gradient(45deg, var(--checker) 25%, transparent 25%, transparent 75%, var(--checker) 75%)",
  backgroundSize: "12px 12px",
  backgroundPosition: "0 0, 6px 6px",
  ["--checker" as string]: "color-mix(in srgb, var(--muted-foreground) 25%, transparent)",
};

/**
 * Logo upload area: a drop zone driven by a button, with a visually hidden file input (never the browser's native
 * input look). Idle, drag-over, selected (thumbnail, name, size, Replace, Remove) and error states. The parent does
 * the file checks and reading; this only collects the file and shows what it is told.
 */
export function LogoDrop({ preview, name, size, error, onFile, onRemove }: { preview?: string; name?: string; size?: number; error?: string; onFile: (f: File) => void; onRemove: () => void }) {
  const input = React.useRef<HTMLInputElement>(null);
  const [over, setOver] = React.useState(false);
  const [broken, setBroken] = React.useState(false);
  React.useEffect(() => setBroken(false), [preview]);
  const browse = () => input.current?.click();
  const hintId = React.useId();
  const errId = React.useId();

  const dragProps = {
    onDragEnter: (e: React.DragEvent) => { e.preventDefault(); setOver(true); },
    onDragOver: (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; setOver(true); },
    onDragLeave: (e: React.DragEvent) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(false); },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      setOver(false);
      const f = e.dataTransfer.files?.[0];
      if (f) onFile(f);
    },
  };
  const selected = !!name || !!preview;
  const border = over ? "border-primary bg-accent" : error ? "border-destructive" : "border-border";

  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-1.5" data-testid="logo-drop">
      <input
        ref={input}
        type="file"
        accept={LOGO_ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        data-testid="logo-input"
        onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) onFile(f); }}
      />
      {selected ? (
        <div {...dragProps} data-over={over} className={cn("flex items-center gap-3 rounded-md border bg-background p-2 transition-colors", border)}>
          <div style={CHECKER} className="grid size-14 shrink-0 place-items-center overflow-hidden rounded border border-border">
            {preview && !broken ? <img src={preview} alt="" className="max-h-full max-w-full object-contain" onError={() => setBroken(true)} /> : <ImagePlus className="size-5 text-muted-foreground" aria-hidden />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm" title={name}>{name ?? "Current logo"}</div>
            <div className="text-xs text-muted-foreground">{size !== undefined ? formatBytes(size) : "Saved logo"}</div>
          </div>
          <Button type="button" size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={browse}><Replace className="size-3" aria-hidden />Replace</Button>
          <Button type="button" size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={onRemove}><Trash2 className="size-3" aria-hidden />Remove</Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={browse}
          aria-describedby={`${hintId} ${errId}`}
          data-over={over}
          {...dragProps}
          className={cn("flex w-full flex-col items-center gap-1 rounded-md border border-dashed px-3 py-4 text-center outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring", border)}
        >
          <ImagePlus className="size-6 text-muted-foreground" aria-hidden />
          <span className="text-sm">Drop an image or <span className="underline underline-offset-2">browse</span></span>
          <span id={hintId} className="text-xs text-muted-foreground">png, jpg, webp, gif or svg, at most 1 MiB</span>
        </button>
      )}
      <div id={errId} aria-live="polite" className="text-xs text-destructive">{error}</div>
    </div>
  );
}
