import {
  Archive,
  BellSimple,
  Briefcase,
  CheckCircle,
  Clock,
  Eye,
  PaperPlaneTilt,
  SealCheck,
  WarningCircle,
  XCircle,
} from "@phosphor-icons/react";

import { Badge } from "@/components/shared/Badge";
import { getSourceMeta, getStatusMeta } from "@/lib/status-ui";
import { cn } from "@/lib/utils";
import type { Locale } from "@/lib/i18n";
import type { VacancySource } from "@/types/domain";

const statusIcon = {
  submitted: PaperPlaneTilt,
  reviewing: Eye,
  shortlisted: SealCheck,
  interview: Briefcase,
  offer_sent: SealCheck,
  hired: SealCheck,
  rejected: XCircle,
  withdrawn: Archive,
  draft: Clock,
  published: CheckCircle,
  paused: Clock,
  archived: Archive,
  queued: Clock,
  sent: CheckCircle,
  failed: WarningCircle,
  skipped: BellSimple,
  scheduled: Clock,
  completed: SealCheck,
  cancelled: XCircle,
  read: CheckCircle,
  unread: BellSimple,
} as const;

export function StatusBadge({
  status,
  locale = "ru",
  className,
}: {
  status: string;
  locale?: Locale;
  className?: string;
}) {
  const meta = getStatusMeta(status, locale);
  const Icon = statusIcon[status as keyof typeof statusIcon] ?? Clock;

  return (
    <Badge tone={meta.tone} className={cn("h-6 gap-1.5 px-2.5 text-[11px] transition-colors", className)}>
      <Icon data-icon="inline-start" weight="bold" />
      {meta.label}
    </Badge>
  );
}

export function SourceBadge({
  source,
  locale = "ru",
  compact = false,
  className,
}: {
  source: VacancySource;
  locale?: Locale;
  compact?: boolean;
  className?: string;
}) {
  const meta = getSourceMeta(source, locale);
  const Icon = source === "native" ? Briefcase : PaperPlaneTilt;

  return (
    <Badge
      tone={source === "native" ? "default" : "muted"}
      className={cn("gap-1.5", source === "hh" && "border-primary/15", className)}
      title={meta.actionHint}
    >
      <Icon data-icon="inline-start" weight="bold" />
      {compact ? meta.label : `${meta.fullLabel} · ${meta.helper}`}
    </Badge>
  );
}
