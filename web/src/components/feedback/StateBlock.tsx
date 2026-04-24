import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Binoculars, LockKey, MagicWand, WarningCircle } from "@phosphor-icons/react";

import { Button } from "@/components/shared/Button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { motionPresets } from "@/lib/motion";
import { cn } from "@/lib/utils";

const icons = {
  empty: Binoculars,
  error: WarningCircle,
  ai: MagicWand,
  permission: LockKey,
};

export function StateBlock({
  title,
  body,
  action,
  kind = "empty",
  className,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
  kind?: keyof typeof icons;
  className?: string;
}) {
  const Icon = icons[kind];

  return (
    <motion.div {...motionPresets.card}>
      <Empty
        className={cn(
          "min-h-44 border bg-card/80 ornament-subtle shadow-card",
          kind === "error" && "border-destructive/20",
          className,
        )}
      >
        <EmptyHeader>
          <EmptyMedia variant="icon" className="size-11 rounded-md bg-secondary text-primary">
            <motion.span
              animate={{ y: [0, -2, 0] }}
              transition={{ duration: 3.8, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
            >
              <Icon weight="duotone" />
            </motion.span>
          </EmptyMedia>
          <EmptyTitle className="text-base">{title}</EmptyTitle>
          {body ? <EmptyDescription>{body}</EmptyDescription> : null}
        </EmptyHeader>
        {action ? (
          <EmptyContent>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {action}
            </div>
          </EmptyContent>
        ) : null}
      </Empty>
    </motion.div>
  );
}

export function StateAction({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <Button type="button" variant="outline" onClick={onClick}>
      {children}
    </Button>
  );
}
