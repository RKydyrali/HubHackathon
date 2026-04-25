import { StatusBadge } from "@/components/shared/StatusBadge";
import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { formatSalaryForTableCell } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { type DraftKey } from "./createModeModel";
import {
  NATIVE_CITY_DEFAULT,
  type GeneratedVacancyFields,
} from "./vacancyFormModel";

type Draft = Record<DraftKey, string>;

export function VacancyPreview({
  draft,
  lastValid,
  genLoading,
  genError,
  onRetry,
  rawTextSummary,
  hasUserStarted,
}: {
  draft: Draft;
  lastValid: GeneratedVacancyFields | null;
  genLoading: boolean;
  genError: boolean;
  onRetry: () => void;
  /** Same string passed to `generateVacancy` for context line count. */
  rawTextSummary: string;
  /** False until the user sends their first message in the create session. */
  hasUserStarted: boolean;
}) {
  const { copy, locale } = useI18n();
  const ev = copy.employerVacancies;

  if (!hasUserStarted) {
    return (
      <Card
        className={cn(
          "h-full min-h-0 border-border/70 bg-card/90 shadow-sm",
          "flex min-h-[320px] flex-col",
        )}
      >
        <CardHeader className="space-y-3 border-b border-border/60 pb-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {ev.previewKicker}
          </p>
          <Skeleton className="h-7 w-4/5 max-w-md" />
          <div className="flex flex-wrap gap-1.5">
            <Skeleton className="h-5 w-16 rounded-md" />
            <Skeleton className="h-5 w-24 rounded-md" />
            <Skeleton className="h-5 w-20 rounded-md" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-4 w-40" />
          </div>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-4 pt-4">
          <p className="text-sm text-muted-foreground transition-opacity duration-200">
            {ev.previewBeforeStart}
          </p>
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayTitle = (
    lastValid?.title?.trim() ||
    draft.role.trim() ||
    (locale === "kk" ? "Жоба" : "Черновик")
  ).slice(0, 200);

  const cityLine = (lastValid?.city ?? NATIVE_CITY_DEFAULT).trim();
  const district = draft.location.trim();
  const locBits = [cityLine, district].filter(Boolean);
  const salaryLine = lastValid
    ? formatSalaryForTableCell(
        {
          salaryMin: lastValid.salaryMin ?? null,
          salaryMax: lastValid.salaryMax ?? null,
          salaryCurrency: lastValid.salaryCurrency ?? "KZT",
        },
        locale,
      )
    : draft.salary.trim() || null;

  const hasStructured = Object.values(draft).some((v) => (v as string).trim().length > 0);
  const aboutFromAi = lastValid?.description?.trim() ?? "";
  const responsibilities = draft.responsibilities.trim();
  const requirements = [draft.experience.trim(), draft.schedule.trim()].filter(Boolean).join("\n");

  const showTitleSkeleton = !lastValid?.title?.trim() && !draft.role.trim();
  const showSalarySkeleton = !salaryLine;
  const showAboutSkeleton =
    hasStructured && (draft.role || draft.location) && !aboutFromAi && rawTextSummary.trim().length >= 12;

  return (
    <Card
      className={cn(
        "h-full min-h-0 border-border/70 bg-card/90 shadow-sm",
        "flex min-h-[320px] flex-col",
      )}
    >
      <CardHeader className="space-y-3 border-b border-border/60 pb-4">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {ev.previewKicker}
        </p>
        {showTitleSkeleton ? (
          <Skeleton className="h-7 w-4/5 max-w-md transition-opacity duration-200" />
        ) : (
          <CardTitle className="text-lg font-semibold leading-snug text-foreground transition-opacity duration-200">
            {displayTitle}
          </CardTitle>
        )}
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge status="draft" locale={locale} />
          {locBits.length > 0 ? (
            <Badge tone="info" className="rounded-md px-1.5 py-0 text-[10px] font-medium">
              {locBits.join(" · ")}
            </Badge>
          ) : null}
          <Badge tone="success" className="rounded-md px-1.5 py-0 text-[10px] font-medium">
            {ev.previewTagDraft}
          </Badge>
        </div>
        {(salaryLine || hasStructured || showSalarySkeleton) && (
          <div className="transition-opacity duration-200">
            <p className="text-[11px] font-medium text-muted-foreground">{ev.sectionMeta}</p>
            {salaryLine ? (
              <p className="mt-0.5 text-sm font-medium tabular-nums text-foreground">{salaryLine}</p>
            ) : showSalarySkeleton && hasStructured ? (
              <Skeleton className="mt-1 h-4 w-36" />
            ) : null}
            <div className="mt-2 space-y-1.5 text-sm text-muted-foreground">
              {draft.schedule.trim() ? (
                <p>
                  <span className="text-foreground/80">{ev.previewSchedulePrefix} </span>
                  {draft.schedule.trim()}
                </p>
              ) : null}
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4 pt-4">
        {!hasStructured && !lastValid && !rawTextSummary.trim() && (
          <p className="text-sm text-muted-foreground transition-opacity duration-200">
            {ev.previewEmpty}
          </p>
        )}

        {hasStructured && (draft.role || draft.location) && !aboutFromAi && (
          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {ev.sectionAbout}
            </h3>
            {showAboutSkeleton ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            ) : (
              <p className="text-sm leading-relaxed text-foreground/90 transition-opacity duration-200">
                {draft.role.trim() || "—"}
              </p>
            )}
          </section>
        )}

        {responsibilities ? (
          <section className="space-y-2 transition-opacity duration-200">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {ev.sectionResponsibilities}
            </h3>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
              {responsibilities}
            </p>
          </section>
        ) : hasStructured ? (
          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {ev.sectionResponsibilities}
            </h3>
            <Skeleton className="h-14 w-full" />
          </section>
        ) : null}

        {requirements ? (
          <section className="space-y-2 transition-opacity duration-200">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {ev.sectionRequirements}
            </h3>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
              {requirements}
            </p>
          </section>
        ) : hasStructured ? (
          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {ev.sectionRequirements}
            </h3>
            <Skeleton className="h-10 w-full" />
          </section>
        ) : null}

        {aboutFromAi ? (
          <section className="space-y-2">
            <Separator className="mb-1" />
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {ev.sectionAbout}
              </h3>
              {genLoading && !genError ? (
                <div
                  className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground"
                  role="status"
                >
                  <Spinner className="size-3" />
                  {ev.aiRefining}
                </div>
              ) : null}
            </div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90 transition-opacity duration-200">
              {aboutFromAi}
            </p>
            {genError ? (
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm text-destructive">{ev.previewError}</p>
                <Button type="button" size="sm" variant="outline" onClick={onRetry}>
                  {copy.common.retry}
                </Button>
              </div>
            ) : null}
          </section>
        ) : (
          (hasStructured && rawTextSummary.trim().length >= 12) || genLoading ? (
            <section className="space-y-2">
              {genLoading && !genError ? (
                <div
                  className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground transition-opacity duration-200"
                  role="status"
                >
                  <Spinner className="size-3.5" />
                  {ev.previewLoading}
                </div>
              ) : null}
              {genError ? (
                <div className="space-y-2">
                  <p className="text-sm text-destructive">{ev.previewError}</p>
                  <Button type="button" size="sm" variant="outline" onClick={onRetry}>
                    {copy.common.retry}
                  </Button>
                </div>
              ) : null}
            </section>
          ) : null
        )}
      </CardContent>
    </Card>
  );
}
