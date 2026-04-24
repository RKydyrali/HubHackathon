import { FlowerLotus } from "@phosphor-icons/react";
import { Link } from "react-router-dom";

import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function BrandMark({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  const { copy } = useI18n();

  return (
    <Link to="/" className={cn("group inline-flex items-center gap-3", className)}>
      <span className="brand-mark grid size-11 shrink-0 place-items-center rounded-[1rem] text-primary-foreground shadow-[0_12px_24px_rgba(217,75,22,0.2)] transition-transform group-hover:-translate-y-0.5">
        <FlowerLotus weight="bold" />
      </span>
      {!compact ? (
        <span className="min-w-0">
          <span className="block font-heading text-xl font-extrabold leading-none tracking-tight text-primary">
            {copy.brand}
          </span>
          <span className="mt-1 block text-xs font-medium text-muted-foreground">{copy.city}</span>
        </span>
      ) : null}
    </Link>
  );
}
