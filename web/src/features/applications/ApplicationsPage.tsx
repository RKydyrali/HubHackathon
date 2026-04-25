import { ArrowRight, ChartLineUp, ClockCounterClockwise, PaperPlaneTilt } from "@phosphor-icons/react";
import { useQuery } from "convex/react";
import { useMemo, type ReactNode } from "react";
import { Link } from "react-router-dom";

import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { PageHeader } from "@/components/layout/PageHeader";
import { AiAdvisoryNotice } from "@/components/product/AiTrust";
import { buttonVariants } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { api } from "@/lib/convex-api";
import { formatAbsoluteDate } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { AI_MATCHING_ROOT } from "@/routing/navPaths";
import type { ApplicationWithVacancy } from "@/types/domain";
import { ApplicationTable } from "./ApplicationTable";

const terminalStatuses = new Set(["hired", "rejected", "withdrawn"]);

const applicationsPanelCopy = {
  ru: {
    label: "Центр откликов",
    title: "Следите за каждым откликом без лишних переходов",
    body: "Статус, вакансия и AI-комментарий собраны в одной спокойной ленте. Когда работодатель обновит отклик, изменение появится здесь.",
    total: "Всего откликов",
    active: "В работе",
    latest: "Последний отклик",
    tableTitle: "Ваши отклики",
    tableHint: "Нажмите на вакансию, чтобы вернуться к карточке и деталям.",
    noDate: "Дата скоро появится",
  },
  kk: {
    label: "Өтініш орталығы",
    title: "Әр өтініштің күйін бір жерден бақылаңыз",
    body: "Мәртебе, вакансия және AI түсіндірмесі бір тізімде жиналған. Жұмыс беруші өтінішті жаңартқанда, өзгеріс осы жерде көрінеді.",
    total: "Барлық өтініш",
    active: "Қаралуда",
    latest: "Соңғы өтініш",
    tableTitle: "Өтініштеріңіз",
    tableHint: "Вакансия карточкасы мен мәліметтеріне қайту үшін атауын басыңыз.",
    noDate: "Күні жақында пайда болады",
  },
} as const;

export function ApplicationsPage() {
  const applications = useQuery(api.applications.listBySeeker);
  const { copy, locale } = useI18n();
  const panelCopy = applicationsPanelCopy[locale];
  const applicationSummary = useMemo(() => getApplicationSummary(applications ?? []), [applications]);

  return (
    <>
      <PageHeader
        title={copy.applications.title}
        subtitle={copy.applications.subtitle}
        action={
          <Link
            to={AI_MATCHING_ROOT}
            className={cn(buttonVariants({ size: "default", variant: "outline" }), "min-h-11 rounded-full")}
          >
            {copy.applications.findWithAi}
            <ArrowRight data-icon="inline-end" weight="bold" />
          </Link>
        }
      />
      <div className="container-app flex flex-1 flex-col gap-5 py-6">
        {applications === undefined ? (
          <LoadingSkeleton variant="table" />
        ) : applications.length === 0 ? (
          <div
            className="flex flex-1 flex-col items-center justify-center py-12 md:py-20"
            role="status"
            aria-live="polite"
          >
            <Empty className="max-w-sm border-0 bg-transparent p-0">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <PaperPlaneTilt weight="duotone" className="size-4" aria-hidden />
                </EmptyMedia>
                <EmptyTitle className="text-sm font-medium text-foreground">{copy.common.noApplications}</EmptyTitle>
                <EmptyDescription className="text-balance text-muted-foreground">
                  {copy.applications.emptyHelper}
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                <Link
                  to="/vacancies"
                  className={cn(buttonVariants({ size: "default" }), "min-h-11 w-full min-w-0 sm:w-auto")}
                >
                  {copy.applications.findVacancies}
                </Link>
                <Link
                  to={AI_MATCHING_ROOT}
                  className={cn(
                    buttonVariants({ size: "default", variant: "outline" }),
                    "min-h-11 w-full min-w-0 sm:w-auto",
                  )}
                >
                  {copy.applications.findWithAi}
                </Link>
              </EmptyContent>
            </Empty>
          </div>
        ) : (
          <>
            <section className="overflow-hidden rounded-[1.75rem] border border-border/70 bg-card shadow-[0_20px_45px_-28px_rgba(15,23,42,0.35)]">
              <div className="grid gap-5 p-5 md:p-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
                <div className="flex min-w-0 flex-col justify-between gap-5">
                  <div className="space-y-3">
                    <span className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                      <PaperPlaneTilt weight="duotone" className="size-4" aria-hidden />
                      {panelCopy.label}
                    </span>
                    <div className="max-w-3xl space-y-2">
                      <h2 className="text-balance font-heading text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
                        {panelCopy.title}
                      </h2>
                      <p className="max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
                        {panelCopy.body}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Link
                      to="/vacancies"
                      className={cn(buttonVariants({ size: "default" }), "min-h-11 rounded-full")}
                    >
                      {copy.applications.findVacancies}
                    </Link>
                    <Link
                      to={AI_MATCHING_ROOT}
                      className={cn(buttonVariants({ size: "default", variant: "outline" }), "min-h-11 rounded-full")}
                    >
                      {copy.applications.findWithAi}
                    </Link>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                  <ApplicationMetric
                    label={panelCopy.total}
                    value={String(applicationSummary.total)}
                    icon={<PaperPlaneTilt weight="duotone" className="size-4" aria-hidden />}
                  />
                  <ApplicationMetric
                    label={panelCopy.active}
                    value={String(applicationSummary.active)}
                    icon={<ChartLineUp weight="duotone" className="size-4" aria-hidden />}
                  />
                  <ApplicationMetric
                    label={panelCopy.latest}
                    value={applicationSummary.latestTitle}
                    detail={
                      applicationSummary.latestDate
                        ? formatAbsoluteDate(applicationSummary.latestDate)
                        : panelCopy.noDate
                    }
                    icon={<ClockCounterClockwise weight="duotone" className="size-4" aria-hidden />}
                  />
                </div>
              </div>
            </section>

            <section className="grid gap-3">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="font-heading text-lg font-semibold tracking-tight text-foreground">
                    {panelCopy.tableTitle}
                  </h2>
                  <p className="text-sm text-muted-foreground">{panelCopy.tableHint}</p>
                </div>
              </div>
              <AiAdvisoryNotice title={copy.applications.advisoryTitle} body={copy.applications.advisory} />
              <ApplicationTable applications={applications} />
            </section>
          </>
        )}
      </div>
    </>
  );
}

function getApplicationSummary(applications: ApplicationWithVacancy[]) {
  const latest = applications[0];
  return {
    total: applications.length,
    active: applications.filter((item) => !terminalStatuses.has(item.application.status)).length,
    latestTitle: latest?.vacancy?.title ?? "—",
    latestDate: latest?.application._creationTime,
  };
}

function ApplicationMetric({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string;
  detail?: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-muted/30 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.78)]">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        <span className="grid size-7 place-items-center rounded-full bg-card text-primary shadow-sm">{icon}</span>
        {label}
      </div>
      <p className="mt-3 truncate text-2xl font-semibold tracking-tight text-foreground" title={value}>
        {value}
      </p>
      {detail ? <p className="mt-1 truncate text-xs text-muted-foreground">{detail}</p> : null}
    </div>
  );
}
