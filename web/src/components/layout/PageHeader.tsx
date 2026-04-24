import type { ReactNode } from "react";
import { motion } from "framer-motion";

import { motionPresets } from "@/lib/motion";

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <motion.header
      {...motionPresets.page}
      className="relative overflow-hidden border-b bg-background/72 px-4 py-6 backdrop-blur md:px-6 md:py-8"
    >
      <div className="absolute inset-y-0 right-0 hidden w-80 opacity-45 ornament-subtle md:block" />
      <div className="relative mx-auto flex w-full max-w-[1320px] flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <p className="mb-2 h-1 w-12 rounded-full bg-primary" />
          <h1 className="font-heading text-3xl font-extrabold leading-tight tracking-tight text-foreground md:text-4xl">
            {title}
          </h1>
          {subtitle ? <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground md:text-base">{subtitle}</p> : null}
        </div>
        {action ? <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div> : null}
      </div>
    </motion.header>
  );
}
