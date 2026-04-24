import type { ReactNode } from "react";

export function DetailPanel({
  title,
  children,
  actions,
}: {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <aside className="surface-panel min-h-0 overflow-hidden rounded-2xl md:rounded-none md:border-y-0 md:border-r-0">
      <div className="flex items-center justify-between gap-3 border-b bg-card/64 px-5 py-4">
        <h2 className="min-w-0 truncate font-heading text-lg font-extrabold tracking-tight">{title}</h2>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
      <div className="p-5">{children}</div>
    </aside>
  );
}
