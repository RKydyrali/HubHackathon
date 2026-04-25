import { Link } from "react-router-dom";

import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatAiSummaryPreview } from "@/features/applications/AiSummaryRichText";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import type { ApplicantWithProfile } from "@/types/domain";

export function EmployerApplicationInboxItem({
  item,
  selected,
}: {
  item: ApplicantWithProfile;
  selected: boolean;
}) {
  const { copy, locale } = useI18n();
  const name = item.profile?.fullName ?? (locale === "kk" ? "Аты жоқ" : "Без имени");
  const vacancy = item.vacancy?.title ?? (locale === "kk" ? "Вакансия жоқ" : "Вакансия");
  const preview = formatAiSummaryPreview(item.application.aiSummary);

  return (
    <Link
      to={`/employer/applications/${item.application._id}`}
      className={cn(
        "group block rounded-xl border p-3.5 text-left transition-colors",
        selected
          ? "border-primary/40 bg-primary/[0.06] ring-1 ring-primary/20 shadow-sm"
          : "border-border/70 bg-card hover:border-primary/25 hover:bg-muted/40",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-foreground group-hover:text-primary">{name}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{vacancy}</p>
        </div>
        <div className="shrink-0">
          <StatusBadge status={item.application.status} locale={locale} />
        </div>
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {typeof item.application.aiScore === "number" ? (
          <span className="rounded-md bg-secondary px-2 py-0.5 font-mono text-[11px] font-semibold text-foreground">
            {copy.applications.match} {item.application.aiScore}%
          </span>
        ) : null}
        {preview ? (
          <p className="line-clamp-2 min-w-0 flex-1 leading-snug" title={preview}>
            {preview}
          </p>
        ) : (
          <span className="text-muted-foreground/80">{copy.applications.noSummary}</span>
        )}
      </div>
    </Link>
  );
}
