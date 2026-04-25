import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export function MatchMeter({
  value,
  label,
  className,
  compact,
}: {
  value: number;
  label?: string;
  className?: string;
  /** Denser row layout: thinner bar, smaller numbers. */
  compact?: boolean;
}) {
  const normalized = Math.max(0, Math.min(100, Math.round(value)));
  const aria = label ?? "Match";

  return (
    <div
      className={cn(
        "flex min-w-0 items-center",
        compact ? "max-w-full gap-2" : "min-w-32 gap-3",
        className,
      )}
    >
      <span
        className={cn(
          "shrink-0 font-medium tabular-nums text-success",
          compact ? "min-w-8 text-xs" : "min-w-10 text-sm",
        )}
      >
        {normalized}%
      </span>
      <Progress
        value={normalized}
        aria-label={aria}
        className={cn(
          "min-w-0 flex-1 !gap-0",
          /* Success fill; root keeps flex for track width */
          "[&_[data-slot=progress-track]]:min-h-0 [&_[data-slot=progress-track]]:w-full",
          "[&_[data-slot=progress-indicator]]:bg-success",
          compact ? "h-1" : "h-1.5",
        )}
      />
    </div>
  );
}
