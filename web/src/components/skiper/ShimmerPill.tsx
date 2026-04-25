import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type ShimmerPillProps = {
  children: ReactNode;
  className?: string;
  dot?: boolean;
};

export function ShimmerPill({ children, className, dot = true }: ShimmerPillProps) {
  return (
    <span
      className={cn(
        "relative inline-flex items-center gap-1.5 overflow-hidden rounded-full border border-primary/20",
        "bg-card/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary shadow-card",
        className,
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-primary/15 to-transparent animate-[shimmer-pan_2.6s_ease_infinite]"
      />
      {dot && (
        <span className="relative grid place-items-center">
          <span className="absolute inline-flex size-2 rounded-full bg-success/50 animate-ping" />
          <span className="relative inline-flex size-2 rounded-full bg-success" />
        </span>
      )}
      <span className="relative">{children}</span>
    </span>
  );
}
