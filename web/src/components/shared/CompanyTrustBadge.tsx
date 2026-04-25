import { Badge } from "@/components/shared/Badge";
import { cn } from "@/lib/utils";
import type { CompanyTrust } from "@/types/domain";

function formatPercent(value: number | null): string | null {
  if (value === null) return null;
  return `${Math.round(value * 100)}%`;
}

function formatHours(value: number | null): string | null {
  if (value === null) return null;
  const hours = Math.round(value / (60 * 60 * 1000));
  if (hours < 24) return `${Math.max(1, hours)} ч`;
  return `${Math.round(hours / 24)} дн`;
}

function trustTitle(trust: CompanyTrust): string {
  const parts = [
    trust.score === null ? null : `Trust Score: ${trust.score}`,
    formatPercent(trust.responseRate) ? `Ответы: ${formatPercent(trust.responseRate)}` : null,
    formatHours(trust.averageResponseTime)
      ? `Средний первый ответ: ${formatHours(trust.averageResponseTime)}`
      : null,
    trust.hiresCount ? `Наймы: ${trust.hiresCount}` : null,
    trust.complaintsCount ? `Подтвержденные жалобы: ${trust.complaintsCount}` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : trust.badgeText;
}

export function CompanyTrustBadge({
  trust,
  className,
}: {
  trust: CompanyTrust | null | undefined;
  className?: string;
}) {
  if (!trust) {
    return null;
  }

  return (
    <Badge
      tone={trust.tone}
      className={cn("h-6 max-w-full gap-1.5 truncate rounded-md px-2 text-[11px]", className)}
      title={trustTitle(trust)}
    >
      <span className="truncate">{trust.badgeText}</span>
    </Badge>
  );
}
