import type { ReactNode } from "react";
import { MagnifyingGlass, X } from "@phosphor-icons/react";

import { Button } from "@/components/shared/Button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function DataToolbar({
  search,
  onSearchChange,
  searchPlaceholder = "Search",
  filters,
  actions,
  onReset,
  className,
}: {
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filters?: ReactNode;
  actions?: ReactNode;
  onReset?: () => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3 border-b bg-background px-4 py-4 md:flex-row md:items-center md:justify-between", className)}>
      <div className="flex min-w-0 flex-1 flex-col gap-3 md:flex-row md:items-center">
        {onSearchChange ? (
          <label className="relative block min-w-0 md:w-80">
            <span className="sr-only">{searchPlaceholder}</span>
            <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search ?? ""}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={searchPlaceholder}
              className="h-10 rounded-lg pl-10"
            />
          </label>
        ) : null}
        {filters ? <div className="flex flex-wrap items-center gap-2">{filters}</div> : null}
        {onReset ? (
          <Button type="button" variant="ghost" size="sm" onClick={onReset}>
            <X data-icon="inline-start" weight="bold" />
            Reset
          </Button>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
