import * as React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SUBTASK_DELETE_DETAIL } from "@host-src/protocol.ts";
import type { Host } from "@/host/index.ts";
import { cancelDelete, confirmDelete, pendingDelete, subscribeDelete } from "@/lib/delete-flow.ts";

const COLUMN_DETAIL = (column: string) => `The folder ${column}/ is removed.`;

/** Confirm dialog for deletes in the browser. The host answers `deleteImpact` with the same wording VS Code shows. */
export function DeleteConfirm({ host }: { host: Host }) {
  const req = React.useSyncExternalStore(subscribeDelete, pendingDelete, pendingDelete);
  const [detail, setDetail] = React.useState("");

  React.useEffect(() => host.onMessage((m) => {
    const cur = pendingDelete();
    if (m.type === "deleteImpact" && cur?.kind === "task" && cur.path === m.path) setDetail(m.detail);
  }), [host]);
  React.useEffect(() => { setDetail(""); }, [req]);

  const text = req?.kind === "column" ? COLUMN_DETAIL(req.column) : req?.kind === "subtask" ? SUBTASK_DELETE_DETAIL : detail;
  return (
    <Dialog open={!!req} onOpenChange={(o) => { if (!o) cancelDelete(); }}>
      <DialogContent aria-describedby="delete-desc">
        <DialogHeader>
          <DialogTitle>{req?.kind === "column" ? `Delete the empty status "${req.label}"?` : req?.kind === "subtask" ? `Delete sub-task "${req.label}"?` : `Delete task "${req?.label ?? ""}"?`}</DialogTitle>
          <DialogDescription id="delete-desc">{text || "Checking what this will remove…"}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="secondary" onClick={cancelDelete}>Cancel</Button>
          <Button variant="destructive" disabled={!text} onClick={confirmDelete}>Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
