import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function ActionFooter({
  children,
  meta,
  className,
}: {
  children: ReactNode;
  meta?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "sticky bottom-0 z-10 -mx-4 mt-6 border-t bg-background/95 px-4 py-3 backdrop-blur md:-mx-6 md:px-6",
        className,
      )}
    >
      <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 text-sm text-muted-foreground">{meta}</div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">{children}</div>
      </div>
    </div>
  );
}
