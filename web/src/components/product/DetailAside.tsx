import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function DetailAside({
  title,
  subtitle,
  children,
  actions,
  className,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <aside className={cn("sticky top-28 rounded-lg border bg-card", className)}>
      {title || subtitle || actions ? (
        <div className="border-b p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {title ? <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2> : null}
              {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
            </div>
            {actions ? <div className="shrink-0">{actions}</div> : null}
          </div>
        </div>
      ) : null}
      <div className="p-5">{children}</div>
    </aside>
  );
}
