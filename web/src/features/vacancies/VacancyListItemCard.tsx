import { ArrowRight, Lightning } from "@phosphor-icons/react";
import { Link } from "react-router-dom";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatSalary } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { vacancyIsHot, vacancyIsNew, vacancyListMatchPreview } from "@/lib/vacancyListUi";
import { cn } from "@/lib/utils";
import type { Vacancy } from "@/types/domain";

type VacancyListItemCardProps = {
  vacancy: Vacancy;
  companyLabel: string;
  className?: string;
};

function matchBadgeClass(score: number): string {
  if (score >= 80) return "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200";
  if (score >= 68) return "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-100";
  return "border-border text-muted-foreground";
}

/**
 * List row for the public vacancy catalog — layout is presentation-only; data comes from props.
 */
export function VacancyListItemCard({ vacancy, companyLabel, className }: VacancyListItemCardProps) {
  const { copy, locale } = useI18n();
  const match = vacancyListMatchPreview(vacancy._id);
  const href = `/vacancies/${vacancy._id}`;
  const isNew = vacancyIsNew(vacancy);
  const isHot = vacancyIsHot(vacancy);
  const locationText = [vacancy.city, vacancy.district].filter(Boolean).join(", ");
  const canApplyNative = vacancy.source === "native" && vacancy.status === "published" && vacancy.ownerUserId;

  return (
    <Card
      size="sm"
      className={cn(
        "transition-shadow hover:shadow-md",
        "border-border/80 bg-card/80",
        className,
      )}
    >
      <CardContent className="px-4 py-3 sm:px-4 sm:py-3.5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                to={href}
                className="font-heading text-base font-semibold leading-snug text-foreground transition-colors hover:text-primary"
              >
                {vacancy.title}
              </Link>
              {isNew ? (
                <Badge variant="secondary" className="h-5 font-medium">
                  {copy.vacancies.badgeNew}
                </Badge>
              ) : null}
              {isHot ? (
                <Badge
                  variant="outline"
                  className="h-5 gap-0.5 border-amber-500/40 bg-amber-500/5 font-medium text-amber-900 dark:text-amber-100"
                >
                  <Lightning weight="fill" className="size-3" />
                  {copy.vacancies.badgeHot}
                </Badge>
              ) : null}
            </div>
            <p className="text-sm text-muted-foreground">{companyLabel}</p>
            <div className="flex flex-col gap-1.5 text-sm sm:flex-row sm:items-baseline sm:gap-4">
              <span className="font-semibold tabular-nums text-foreground">
                {formatSalary(vacancy, locale)}
              </span>
              <span className="text-muted-foreground">{locationText}</span>
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-stretch gap-2 sm:max-w-[10rem] sm:items-end">
            <div className="flex items-center justify-between gap-2 sm:flex-col sm:items-end">
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground sm:text-right">
                {copy.vacancies.colMatch}
              </span>
              <Badge
                variant="outline"
                className={cn("h-6 min-w-[2.75rem] justify-center font-semibold tabular-nums", matchBadgeClass(match))}
              >
                {match}%
              </Badge>
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <Link
                to={href}
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-8 px-2 text-xs")}
              >
                {copy.vacancies.details}
                <ArrowRight className="size-3.5" weight="bold" />
              </Link>
              {canApplyNative ? (
                <Link to={`${href}/apply`} className={cn(buttonVariants({ size: "sm" }), "h-8 text-xs")}>
                  {copy.vacancies.applyShort}
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
