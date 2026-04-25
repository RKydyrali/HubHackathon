import type { ReactNode } from "react";
import { motion } from "framer-motion";

import { motionPresets } from "@/lib/motion";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  subtitle,
  action,
  compact = false,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <motion.header
      {...motionPresets.page}
      className={cn(
        "relative border-b bg-background px-4 md:px-7",
        compact ? "py-3 md:py-3.5" : "py-5 md:py-6",
      )}
    >
      <div
        className={cn(
          "relative mx-auto flex w-full max-w-[1320px] flex-col md:flex-row md:items-end md:justify-between",
          compact ? "gap-2" : "gap-4",
        )}
      >
        <div className="min-w-0">
          <h1
            className={cn(
              "font-heading font-semibold leading-tight tracking-tight text-foreground",
              compact ? "text-lg md:text-xl" : "text-2xl md:text-3xl",
            )}
          >
            {title}
          </h1>
          {subtitle ? (
            <p
              className={cn(
                "max-w-3xl text-muted-foreground",
                compact ? "mt-1 text-xs leading-5" : "mt-2 text-sm leading-6",
              )}
            >
              {subtitle}
            </p>
          ) : null}
        </div>
        {action ? <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div> : null}
      </div>
    </motion.header>
  );
}
