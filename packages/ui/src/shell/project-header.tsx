import * as React from "react";
import type { BoardData, Host } from "@/host/index.ts";
import { headerClasses, headerParts } from "@/lib/project-header.ts";

/**
 * Project title, subtitle and logo above the tabs, on every view. Renders nothing without `board.project`.
 * Text goes in as React text (never HTML). The logo is only ever an `<img>` (an SVG shown this way runs no script);
 * its source comes from the host (`logoSrc`), which re-validates the file when it serves it. A missing or broken
 * logo drops out and leaves the text.
 */
export function ProjectHeader({ project, host }: { project: BoardData["project"]; host: Host }) {
  const logoPath = project?.logo?.path;
  const [src, setSrc] = React.useState<string | undefined>();
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    setSrc(undefined);
    setFailed(false);
    if (!logoPath) return;
    let live = true;
    host.logoSrc({ path: logoPath }).then((s) => { if (live) { setSrc(s); setFailed(!s); } }, () => { if (live) setFailed(true); });
    return () => { live = false; };
  }, [host, logoPath]);

  const parts = headerParts(project, failed);
  if (!project || !parts) return null;
  const c = headerClasses(project.layout);
  return (
    <header aria-label="Project" className={`shrink-0 border-b border-border px-3 py-2 ${c.root}`}>
      {parts.logo && src && <img src={src} alt={project.title ?? "Project logo"} className={c.logo} onError={() => setFailed(true)} />}
      {(parts.title || parts.subtitle) && (
        <div className={c.text}>
          {parts.title && <h1 className={c.title}>{parts.title}</h1>}
          {parts.subtitle && <p className={c.subtitle}>{parts.subtitle}</p>}
        </div>
      )}
    </header>
  );
}
