import { DotsThree, MapPin } from "@phosphor-icons/react";
import { useMutation } from "convex/react";
import { Link } from "react-router-dom";

import { DataTable, type DataColumn } from "@/components/product/DataTable";
import { MatchMeter } from "@/components/product/MatchMeter";
import { Badge } from "@/components/shared/Badge";
import { CompanyTrustBadge } from "@/components/shared/CompanyTrustBadge";
import { Icon } from "@/components/shared/Icon";
import { SourceBadge, StatusBadge } from "@/components/shared/StatusBadge";
import { Button as UiButton, buttonVariants } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { api } from "@/lib/convex-api";
import { demoAnalyticsApplyUrlMetadata } from "@/lib/demoAnalyticsClient";
import { formatSalaryForTableCell } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import {
  vacancyCompanyLabel,
  vacancyIsHot,
  vacancyIsNew,
  vacancyListMatchPreview,
} from "@/lib/vacancyListUi";
import { cn } from "@/lib/utils";
import type { CompanyTrust, Vacancy } from "@/types/domain";

function MutedDash() {
  return (
    <span className="text-sm text-muted-foreground/70 tabular-nums" aria-label="—">
      —
    </span>
  );
}

function formatLocationLine(v: Vacancy): string | null {
  const c = v.city?.trim() ?? "";
  const d = v.district?.trim() ?? "";
  if (!c && !d) return null;
  if (c && d) return `${c}, ${d}`;
  return c || d;
}

function VacancyTitleCell({
  vacancy,
  ownerView,
  employerSlim,
}: {
  vacancy: Vacancy;
  ownerView: boolean;
  employerSlim?: boolean;
}) {
  const { copy } = useI18n();
  const href = ownerView ? `/employer/vacancies/${vacancy._id}` : `/vacancies/${vacancy._id}`;
  const showNew = vacancyIsNew(vacancy);
  const showHot = vacancyIsHot(vacancy);
  const title = vacancy.title?.trim() ?? "";
  const titleAsText = ownerView && employerSlim;
  if (!title) {
    return (
      <div className="min-w-0 max-w-md">
        <MutedDash />
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col justify-center gap-1 py-0.5">
      <div className="flex min-w-0 items-start gap-1.5">
        {titleAsText ? (
          <span className="line-clamp-2 min-w-0 flex-1 text-left text-sm font-medium leading-normal text-foreground group-hover:underline">
            {title}
          </span>
        ) : (
          <Link
            className="line-clamp-2 min-w-0 flex-1 text-sm font-medium leading-normal text-primary hover:underline"
            to={href}
            onClick={(e) => e.stopPropagation()}
          >
            {title}
          </Link>
        )}
        <span className="flex shrink-0 flex-wrap items-center justify-end gap-1">
          {showNew ? (
            <Badge tone="info" className="rounded-md px-1.5 py-0 text-[10px] font-semibold">
              {copy.vacancies.badgeNew}
            </Badge>
          ) : null}
          {showHot ? (
            <Badge tone="warning" className="rounded-md px-1.5 py-0 text-[10px] font-semibold">
              {copy.vacancies.badgeHot}
            </Badge>
          ) : null}
        </span>
      </div>
    </div>
  );
}

function OwnerVacancyKebab({ detailHref }: { detailHref: string }) {
  const { copy } = useI18n();
  return (
    <Popover>
      <PopoverTrigger
        render={
          <UiButton
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-muted-foreground"
            aria-label={copy.vacancies.colAction}
            onClick={(e) => e.stopPropagation()}
          />
        }
      >
        <DotsThree weight="bold" className="size-4" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-44 p-1.5" sideOffset={4}>
        <Link
          to={detailHref}
          onClick={(e) => e.stopPropagation()}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-8 w-full justify-start text-xs font-normal")}
        >
          {copy.vacancies.openVacancy}
        </Link>
      </PopoverContent>
    </Popover>
  );
}

function VacancyRowMenu({
  vacancy,
  canApplyNative,
  hhOpen,
  detailHref,
  externalUrl,
  trackExternal,
}: {
  vacancy: Vacancy;
  canApplyNative: boolean;
  hhOpen: boolean;
  detailHref: string;
  externalUrl?: string;
  trackExternal: () => void;
}) {
  const { copy } = useI18n();
  return (
    <Popover>
      <PopoverTrigger
        render={
          <UiButton
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-muted-foreground"
            aria-label={copy.vacancies.colAction}
          />
        }
      >
        <DotsThree weight="bold" className="size-4" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-52 p-1.5" sideOffset={4}>
        <div className="grid gap-0.5">
          <Link
            to={detailHref}
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-8 justify-start text-xs font-normal")}
          >
            {copy.vacancies.openVacancy}
          </Link>
          {canApplyNative ? (
            <Link
              to={`/vacancies/${vacancy._id}/apply`}
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-8 justify-start text-xs font-normal")}
            >
              {copy.vacancies.applyShort}
            </Link>
          ) : null}
          {hhOpen && externalUrl ? (
            <a href={externalUrl} target="_blank" rel="noreferrer" onClick={trackExternal}>
              <UiButton variant="ghost" size="sm" className="h-8 w-full justify-start text-xs font-normal">
                <Icon icon="ExternalLink" data-icon="inline-start" weight="bold" className="size-3.5" />
                {copy.vacancies.applyHh}
              </UiButton>
            </a>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function VacancyActions({
  vacancy,
  ownerView,
  employerSlim,
  align = "start",
}: {
  vacancy: Vacancy;
  ownerView: boolean;
  employerSlim?: boolean;
  align?: "start" | "end";
}) {
  const { copy } = useI18n();
  const trackDemo = useMutation(api.demoAnalytics.track);
  const detailHref = ownerView ? `/employer/vacancies/${vacancy._id}` : `/vacancies/${vacancy._id}`;
  const canApplyNative =
    !ownerView && vacancy.source === "native" && vacancy.status === "published" && vacancy.ownerUserId;
  const hhOpen = !ownerView && vacancy.source === "hh" && Boolean(vacancy.externalApplyUrl);
  const extUrl = vacancy.externalApplyUrl ?? undefined;

  const trackExternal = () => {
    if (!extUrl) return;
    void trackDemo({
      kind: "external_apply_clicked",
      vacancyId: vacancy._id,
      surface: "vacancy_table",
      metadata: demoAnalyticsApplyUrlMetadata(extUrl),
    });
  };

  if (ownerView) {
    if (employerSlim) {
      return (
        <div
          className={cn("flex justify-end", align === "end" ? "w-full" : "")}
          onClick={(e) => e.stopPropagation()}
        >
          <OwnerVacancyKebab detailHref={detailHref} />
        </div>
      );
    }
    return (
      <div className={cn("flex flex-wrap gap-1.5", align === "end" ? "justify-end" : "justify-start")}>
        <Link to={detailHref} onClick={(e) => e.stopPropagation()}>
          <UiButton size="sm" variant="default" className="h-7 rounded-md px-2.5 text-xs font-medium">
            {copy.vacancies.details}
          </UiButton>
        </Link>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex min-w-0 max-w-full flex-nowrap items-center justify-end gap-0.5 overflow-hidden",
        align === "end" ? "ml-auto w-full" : "",
      )}
    >
      {canApplyNative ? (
        <Link to={`/vacancies/${vacancy._id}/apply`} className="shrink-0">
          <UiButton size="sm" className="h-7 rounded-md px-2.5 text-xs font-medium">
            {copy.vacancies.applyShort}
          </UiButton>
        </Link>
      ) : null}
      {hhOpen && extUrl && !canApplyNative ? (
        <a
          href={extUrl}
          target="_blank"
          rel="noreferrer"
          className="shrink-0"
          onClick={trackExternal}
        >
          <UiButton size="sm" variant="default" className="h-7 gap-1 rounded-md px-2.5 text-xs font-medium">
            <Icon icon="ExternalLink" data-icon="inline-start" weight="bold" className="size-3.5" />
            {copy.vacancies.applyHh}
          </UiButton>
        </a>
      ) : null}
      {!canApplyNative && !hhOpen ? (
        <Link to={detailHref} className="shrink-0">
          <UiButton size="sm" variant="default" className="h-7 rounded-md px-2.5 text-xs font-medium">
            {copy.vacancies.openVacancy}
          </UiButton>
        </Link>
      ) : null}
      {canApplyNative || hhOpen ? (
        <VacancyRowMenu
          vacancy={vacancy}
          canApplyNative={Boolean(canApplyNative)}
          hhOpen={hhOpen}
          detailHref={detailHref}
          externalUrl={extUrl}
          trackExternal={trackExternal}
        />
      ) : null}
    </div>
  );
}

function VacancyMobileCard({
  vacancy,
  ownerView,
  onOwnerNavigate,
  employerSlim,
  trust,
}: {
  vacancy: Vacancy;
  ownerView: boolean;
  onOwnerNavigate?: (v: Vacancy) => void;
  employerSlim?: boolean;
  trust?: CompanyTrust;
}) {
  const { copy, locale } = useI18n();
  const match = ownerView ? null : vacancyListMatchPreview(vacancy._id);
  const locLine = formatLocationLine(vacancy);
  const salLine = formatSalaryForTableCell(vacancy, locale);
  const ownerInteractive = ownerView && employerSlim && onOwnerNavigate;
  return (
    <article
      className={cn(
        "rounded-lg border border-border/70 bg-card/50 px-3 py-2.5",
        ownerInteractive && "cursor-pointer transition-colors hover:bg-muted/30",
      )}
      onClick={ownerInteractive ? () => onOwnerNavigate(vacancy) : undefined}
      onKeyDown={
        ownerInteractive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onOwnerNavigate(vacancy);
              }
            }
          : undefined
      }
      role={ownerInteractive ? "button" : undefined}
      tabIndex={ownerInteractive ? 0 : undefined}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <VacancyTitleCell vacancy={vacancy} ownerView={ownerView} employerSlim={employerSlim} />
          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5">
            <p className="text-xs text-muted-foreground">{vacancyCompanyLabel(vacancy, locale)}</p>
            <CompanyTrustBadge trust={trust} />
          </div>
        </div>
        <SourceBadge source={vacancy.source} locale={locale} compact className="shrink-0" />
      </div>
      <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {locLine ? (
          <span className="inline-flex min-w-0 items-center gap-1">
            <MapPin weight="bold" className="size-3.5 shrink-0" />
            {locLine}
          </span>
        ) : (
          <MutedDash />
        )}
        {salLine != null ? <span className="font-medium text-foreground">{salLine}</span> : <MutedDash />}
      </div>
      {ownerView ? (
        <div className="mt-2 flex justify-end">
          <StatusBadge status={vacancy.status} locale={locale} />
        </div>
      ) : match !== null ? (
        <div className="mt-2">
          <p className="mb-0.5 text-[10px] font-medium text-muted-foreground">{copy.vacancies.colMatch}</p>
          <MatchMeter value={match} label={copy.vacancies.matchPreviewHint} compact className="min-w-0" />
        </div>
      ) : null}
      <div className="mt-2.5 flex flex-wrap justify-end gap-1.5 border-t border-border/50 pt-2.5">
        <VacancyActions
          vacancy={vacancy}
          ownerView={ownerView}
          employerSlim={employerSlim}
          align="end"
        />
      </div>
    </article>
  );
}

export function VacancyTable({
  vacancies,
  ownerView = false,
  employerSlim = false,
  onOwnerRowNavigate,
  stickyHeader = false,
  stickyHeaderClassName,
  matchMap,
  trustByVacancyId,
}: {
  vacancies: Vacancy[];
  ownerView?: boolean;
  /** Tighter table for employer list: no company column. */
  employerSlim?: boolean;
  onOwnerRowNavigate?: (vacancy: Vacancy) => void;
  stickyHeader?: boolean;
  stickyHeaderClassName?: string;
  /** Optional: real match scores keyed by vacancy id; falls back to deterministic preview. */
  matchMap?: Record<string, number>;
  /** Optional: company trust keyed by vacancy id. */
  trustByVacancyId?: Record<string, CompanyTrust>;
}) {
  const { copy, locale } = useI18n();

  const companyCell = (vacancy: Vacancy) => {
    const label = vacancyCompanyLabel(vacancy, locale).trim();
    if (!label) return <MutedDash />;
    const trust = trustByVacancyId?.[String(vacancy._id)];
    return (
      <div className="flex min-w-0 flex-col items-start gap-1">
        <span
          className="line-clamp-2 min-w-0 break-words text-left text-sm leading-normal text-muted-foreground"
          title={label}
        >
          {label}
        </span>
        <CompanyTrustBadge trust={trust} />
      </div>
    );
  };

  const titleW = ownerView && employerSlim ? "w-[38%] min-w-0 align-middle" : "w-[30%] min-w-0 align-middle";
  const companyW = "w-[14%] min-w-0 align-middle";
  const locW = ownerView && employerSlim ? "w-[18%] min-w-0 align-middle" : "w-[12%] min-w-0 align-middle";
  const salW = ownerView && employerSlim ? "w-[16%] min-w-0 align-middle" : "w-[12%] min-w-0 align-middle";
  const srcW = ownerView && employerSlim ? "w-[8%] min-w-0 align-middle" : "w-[8%] min-w-0 align-middle";
  const statusW = "w-[10%] min-w-0 align-middle";

  const seekerColumns: DataColumn<Vacancy>[] = [
    {
      key: "title",
      header: copy.vacancies.colTitle,
      className: titleW,
      cell: (vacancy) => (
        <VacancyTitleCell vacancy={vacancy} ownerView={ownerView} employerSlim={employerSlim} />
      ),
    },
    ...(ownerView && employerSlim
      ? ([] satisfies DataColumn<Vacancy>[])
      : ([
          {
            key: "company",
            header: copy.vacancies.colCompany,
            className: companyW,
            cell: (vacancy) => companyCell(vacancy),
          },
        ] satisfies DataColumn<Vacancy>[])),
    {
      key: "location",
      header: copy.vacancies.colLocation,
      className: locW,
      cell: (vacancy) => {
        const line = formatLocationLine(vacancy);
        if (!line) {
          return <MutedDash />;
        }
        return (
          <span className="inline-flex min-w-0 max-w-full items-start gap-1 text-muted-foreground">
            <MapPin weight="bold" className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/80" />
            <span className="line-clamp-2 min-w-0 text-sm leading-snug">{line}</span>
          </span>
        );
      },
    },
    {
      key: "salary",
      header: copy.vacancies.colSalary,
      className: cn(salW, "whitespace-nowrap tabular-nums"),
      cell: (vacancy) => {
        const s = formatSalaryForTableCell(vacancy, locale);
        if (s === null) return <MutedDash />;
        return (
          <span className="block truncate text-sm text-foreground/90" title={s}>
            {s}
          </span>
        );
      },
    },
    {
      key: "source",
      header: copy.vacancies.colSource,
      className: srcW,
      cell: (vacancy) => (
        <div className="min-w-0 max-w-full overflow-hidden">
          <SourceBadge
            source={vacancy.source}
            locale={locale}
            compact
            className="max-w-full"
          />
        </div>
      ),
    },
    ...(ownerView
      ? ([
          {
            key: "status",
            header: copy.vacancies.colStatus,
            className: employerSlim ? statusW : "w-[12%] min-w-0 align-middle",
            cell: (vacancy: Vacancy) => <StatusBadge status={vacancy.status} locale={locale} />,
          },
        ] satisfies DataColumn<Vacancy>[])
      : ([
          {
            key: "match",
            header: copy.vacancies.colMatch,
            className: "w-[8%] min-w-0 align-middle",
            cell: (vacancy: Vacancy) => (
              <div className="min-w-0 max-w-full">
                <MatchMeter
                  value={matchMap?.[String(vacancy._id)] ?? vacancyListMatchPreview(vacancy._id)}
                  label={copy.vacancies.matchPreviewHint}
                  compact
                  className="w-full min-w-0 max-w-full"
                />
              </div>
            ),
          },
        ] satisfies DataColumn<Vacancy>[])),
    {
      key: "action",
      header: copy.vacancies.colAction,
      className: cn(
        "text-right align-middle",
        ownerView && employerSlim ? "w-10 min-w-10 max-w-10" : "w-[1%] min-w-[7.5rem] max-w-[10rem]",
      ),
      cell: (vacancy) => (
        <VacancyActions vacancy={vacancy} ownerView={ownerView} employerSlim={employerSlim} align="end" />
      ),
    },
  ];

  const ownerRowClick =
    ownerView && onOwnerRowNavigate
      ? (v: Vacancy) => {
          onOwnerRowNavigate(v);
        }
      : undefined;

  return (
    <DataTable
      columns={seekerColumns}
      data={vacancies}
      getKey={(vacancy) => vacancy._id}
      empty={<span className="text-sm text-muted-foreground">{copy.vacancies.noResults}</span>}
      mobileRow={(vacancy) => (
          <VacancyMobileCard
            vacancy={vacancy}
            ownerView={ownerView}
            employerSlim={employerSlim}
            onOwnerNavigate={onOwnerRowNavigate}
            trust={trustByVacancyId?.[String(vacancy._id)]}
          />
      )}
      onRowClick={ownerRowClick}
      dense
      denseVariant={ownerView && employerSlim ? "tight" : "comfortable"}
      stickyHeader={stickyHeader}
      stickyHeaderClassName={stickyHeaderClassName}
      tableClassName="border-0"
      tableContainerClassName="min-w-0 overflow-x-clip"
    />
  );
}
