import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { formatSalaryForTableCell } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/shared/Badge";
import { type GeneratedVacancyFields, NATIVE_CITY_DEFAULT } from "./vacancyFormModel";

export type VacancyPreviewState = "empty" | "loading" | "error" | "ready";

export function VacancyLivePreview({
  state,
  generated,
  district,
  onRetry,
}: {
  state: VacancyPreviewState;
  generated: GeneratedVacancyFields | null;
  /** User-entered district; shown when no city in generated. */
  district: string;
  onRetry: () => void;
}) {
  const { copy, locale } = useI18n();
  const ev = copy.employerVacancies;

  const cityLine = (generated?.city ?? NATIVE_CITY_DEFAULT).trim();
  const districtLine = district.trim();
  const locationBits = [cityLine, districtLine].filter(Boolean);
  const salaryLine = formatSalaryForTableCell(
    {
      salaryMin: generated?.salaryMin ?? null,
      salaryMax: generated?.salaryMax ?? null,
      salaryCurrency: generated?.salaryCurrency ?? "KZT",
    },
    locale,
  );

  return (
    <Card
      className={cn(
        "h-full min-h-0 border-border/70 bg-card/80 shadow-sm",
        "flex flex-col",
      )}
    >
      <CardHeader className="space-y-1.5 border-b border-border/60 pb-3">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {locale === "kk" ? "Алдымен көрініс" : "Предпросмотр"}
        </p>
        <CardTitle className="text-base font-semibold">
          {state === "ready" && generated?.title?.trim()
            ? generated.title
            : state === "empty" || state === "loading" || state === "error"
              ? "—"
              : locale === "kk"
                ? "Атаусыз"
                : "Без названия"}
        </CardTitle>
        {state === "ready" && generated ? (
          <div className="flex flex-wrap gap-1.5">
            <StatusBadge status="draft" locale={locale} />
            {locationBits.length > 0 ? (
              <Badge tone="info" className="rounded-md px-1.5 py-0 text-[10px] font-medium">
                {locationBits.join(" · ")}
              </Badge>
            ) : null}
            <Badge tone="success" className="rounded-md px-1.5 py-0 text-[10px] font-medium">
              {ev.previewTagDraft}
            </Badge>
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-3 pt-3">
        {state === "empty" ? (
          <p className="text-sm leading-relaxed text-muted-foreground">{ev.previewEmpty}</p>
        ) : null}
        {state === "loading" ? (
          <div className="space-y-2" role="status" aria-live="polite" aria-label={ev.previewLoading}>
            <p className="text-xs text-muted-foreground">{ev.previewLoading}</p>
            <div className="flex items-center gap-2">
              <Spinner className="size-4" />
            </div>
            <Skeleton className="h-3 w-[60%]" />
            <Skeleton className="h-3 w-4/5" />
            <Skeleton className="h-3 w-2/5" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : null}
        {state === "error" ? (
          <div className="space-y-3">
            <p className="text-sm text-destructive">{ev.previewError}</p>
            <Button type="button" variant="outline" size="sm" onClick={onRetry}>
              {copy.common.retry}
            </Button>
          </div>
        ) : null}
        {state === "ready" && generated ? (
          <div className="space-y-2">
            {salaryLine ? <p className="text-sm font-medium tabular-nums text-foreground">{salaryLine}</p> : null}
            {generated.description?.trim() ? (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {generated.description}
              </p>
            ) : null}
            {!generated.description?.trim() && (generated.title?.length ?? 0) > 0 ? (
              <p className="text-sm text-muted-foreground">
                {locale === "kk" ? "Сипаттама дайындалады…" : "Описание появится после генерации…"}
              </p>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
