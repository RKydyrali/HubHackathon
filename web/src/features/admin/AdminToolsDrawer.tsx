import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";

export function AdminToolsDrawer() {
  return (
    <div className="rounded-md border bg-card p-4 text-sm">
      <p className="font-medium">Admin tools</p>
      <p className="mt-1 text-muted-foreground">Sensitive actions require confirmation.</p>
      <div className="mt-3">
        <ConfirmDialog label="Confirm action" onConfirm={() => undefined} />
      </div>
    </div>
  );
}
