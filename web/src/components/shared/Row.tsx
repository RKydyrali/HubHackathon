import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function Row({
  title,
  meta,
  aside,
  children,
  className,
}: {
  title: ReactNode;
  meta?: ReactNode;
  aside?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("border-b bg-card/62 p-5 transition-colors last:border-b-0 hover:bg-muted/45", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-foreground">{title}</div>
          {meta ? <div className="mt-1 text-xs leading-5 text-muted-foreground">{meta}</div> : null}
        </div>
        {aside ? <div className="shrink-0">{aside}</div> : null}
      </div>
      {children ? <div className="mt-3 text-sm leading-6 text-muted-foreground">{children}</div> : null}
    </div>
  );
}
