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
  interview: Briefcase,
  hired: SealCheck,
  rejected: XCircle,
  draft: Clock,
  published: CheckCircle,
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
    <Badge tone={meta.tone} className={cn("gap-1.5 transition-colors", className)}>
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
      title={meta.helper}
    >
      <Icon data-icon="inline-start" weight="bold" />
      {compact ? meta.label : `${meta.label} · ${meta.helper}`}
    </Badge>
  );
}
