export function PlaceholderView({ label }: { label: string }) {
  return (
    <div className="p-6" role="status">
      <h2 className="mb-1 text-base font-semibold">{label} is moving to the new UI</h2>
      <p className="max-w-prose text-muted-foreground">
        This view has not been ported yet (task Ext-ui-views). It still works in the classic board: run the command
        <strong> GITASK: Open Classic Board</strong> from the Command Palette.
      </p>
    </div>
  );
}
