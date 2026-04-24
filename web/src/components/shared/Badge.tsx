import type { ComponentProps } from "react";

import { Badge as UiBadge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type BadgeTone = "default" | "success" | "warning" | "danger" | "muted" | "info";
type BadgeProps = ComponentProps<typeof UiBadge> & {
  tone?: BadgeTone;
};

const toneClass: Record<BadgeTone, string> = {
  default: "border-transparent bg-primary text-primary-foreground",
  success: "border-transparent bg-success text-success-foreground",
  warning: "border-transparent bg-warning text-warning-foreground",
  danger: "border-transparent bg-destructive text-destructive-foreground",
  muted: "border-border bg-secondary text-secondary-foreground",
  info: "border-primary/20 bg-primary/10 text-primary",
};

export function Badge({ className, tone = "default", ...props }: BadgeProps) {
  return (
    <UiBadge
      className={cn("rounded-full px-2.5 py-1 font-semibold", toneClass[tone], className)}
      variant={tone === "default" ? "default" : "outline"}
      {...props}
    />
  );
}
