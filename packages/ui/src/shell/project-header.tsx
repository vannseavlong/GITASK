import * as React from "react";
import { Pencil } from "lucide-react";
import type { ProjectLayout } from "gitask-core";
import { Button } from "@/components/ui/button";
import type { BoardData, Host } from "@/host/index.ts";
import { headerClasses, headerParts } from "@/lib/project-header.ts";
import { ProjectDialog } from "@/components/project-dialog.tsx";

/**
 * The header itself: title, subtitle and logo. Shared by the real header and the dialog preview, so the preview
 * cannot drift. Text goes in as React text (never HTML). The logo is only ever an `<img>` (an SVG shown this way
 * runs no script); a missing or broken logo drops out and leaves the text.
 */
export function HeaderView({ title, subtitle, layout, hasLogo, src, alt, onLogoError }: { title?: string; subtitle?: string; layout: ProjectLayout; hasLogo: boolean; src?: string; alt?: string; onLogoError?: () => void }) {
  const parts = headerParts({ title, subtitle, logo: hasLogo ? {} : undefined, layout }, !src);
  if (!parts) return null;
  const c = headerClasses(layout);
  return (
    <div className={c.root}>
      {parts.logo && src && <img src={src} alt={alt ?? title ?? "Project logo"} className={c.logo} onError={onLogoError} />}
      {(parts.title || parts.subtitle) && (
        <div className={c.text}>
          {parts.title && <h1 className={c.title}>{parts.title}</h1>}
          {parts.subtitle && <p className={c.subtitle}>{parts.subtitle}</p>}
        </div>
      )}
    </div>
  );
}

/**
 * Project header above the tabs, on every view, with a "Customize header" button. Without `board.project` only the
 * button shows. The logo source comes from the host (`logoSrc`), which re-validates the file when it serves it.
 * The logo is fetched again after a save, and after a board update when the last fetch failed.
 */
export function ProjectHeader({ project, host }: { project: BoardData["project"]; host: Host }) {
  const logoPath = project?.logo?.path;
  const [src, setSrc] = React.useState<string | undefined>();
  const [failed, setFailed] = React.useState(false);
  const [rev, setRev] = React.useState(0);
  const [open, setOpen] = React.useState(false);
  const refresh = React.useRef(false);

  // A new board while the logo failed, or right after a save, asks for the logo again.
  React.useEffect(() => {
    if (refresh.current || failed) {
      refresh.current = false;
      setRev((r) => r + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only a new board triggers this
  }, [project]);

  React.useEffect(() => {
    setSrc(undefined);
    setFailed(false);
    if (!logoPath) return;
    let live = true;
    host.logoSrc({ path: logoPath }).then((s) => { if (live) { setSrc(s); setFailed(!s); } }, () => { if (live) setFailed(true); });
    return () => { live = false; };
  }, [host, logoPath, rev]);

  return (
    <header aria-label="Project" className="relative shrink-0 border-b border-border px-3 py-2">
      {project && (
        <div className="pr-36">
          <HeaderView title={project.title} subtitle={project.subtitle} layout={project.layout} hasLogo={!!project.logo} src={src} alt={project.title} onLogoError={() => setFailed(true)} />
        </div>
      )}
      <Button variant="ghost" size="sm" className={`h-7 gap-1 text-xs text-muted-foreground ${project ? "absolute right-2 top-1.5" : ""}`} onClick={() => setOpen(true)}>
        <Pencil className="size-3" aria-hidden />{project ? "Customize header" : "Add project header"}
      </Button>
      <ProjectDialog host={host} project={project} currentLogoSrc={src} open={open} onOpenChange={setOpen} onSaved={() => { refresh.current = true; }} />
    </header>
  );
}
