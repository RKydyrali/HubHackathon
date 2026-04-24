import type { ReactNode } from "react";
import { motion } from "framer-motion";

import { motionPresets } from "@/lib/motion";
import { cn } from "@/lib/utils";

export function SectionPanel({
  title,
  subtitle,
  action,
  children,
  className,
  patterned = false,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  patterned?: boolean;
}) {
  return (
    <motion.section
      {...motionPresets.card}
      className={cn(
        "surface-panel overflow-hidden rounded-2xl",
        patterned && "ornament-subtle",
        className,
      )}
    >
      {title || subtitle || action ? (
        <div className="flex flex-col gap-3 border-b bg-card/74 px-5 py-5 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            {title ? <h2 className="font-heading text-lg font-extrabold tracking-tight text-foreground">{title}</h2> : null}
            {subtitle ? <p className="mt-1 text-sm leading-6 text-muted-foreground">{subtitle}</p> : null}
          </div>
          {action ? <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div> : null}
        </div>
      ) : null}
      <div className="p-5">{children}</div>
    </motion.section>
  );
}

export function MetricTile({
  label,
  value,
  helper,
  icon,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  helper?: string;
  icon?: ReactNode;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  return (
    <motion.div
      {...motionPresets.listItem}
      className={cn(
        "surface-card rounded-2xl p-5 transition-transform hover:-translate-y-0.5",
        tone === "success" && "border-success/20",
        tone === "warning" && "border-warning/20",
        tone === "danger" && "border-destructive/20",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <div className="mt-2 font-heading text-3xl font-extrabold tracking-tight text-foreground">{value}</div>
        </div>
        {icon ? <div className="grid size-12 place-items-center rounded-xl bg-primary/10 text-primary">{icon}</div> : null}
      </div>
      {helper ? <p className="mt-3 text-sm leading-6 text-muted-foreground">{helper}</p> : null}
    </motion.div>
  );
}
