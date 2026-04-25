import { useAuth } from "@clerk/clerk-react";
import { useQuery } from "convex/react";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { ActionEmptyState } from "@/components/product/ActionEmptyState";
import { AiAdvisoryNotice } from "@/components/product/AiTrust";
import { BrandMark } from "@/components/shared/BrandMark";
import { Button } from "@/components/shared/Button";
import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { useVacancyFilters } from "@/hooks/useVacancyFilters";
import { useVacancyMatchMap } from "@/hooks/useVacancyMatchMap";
import { api, type Id } from "@/lib/convex-api";
import { useI18n } from "@/lib/i18n";
import {
  sortVacancies,
  vacancyIsHot,
  vacancyIsNew,
  vacancyMatchesExperience,
  vacancyMatchesSalaryBand,
} from "@/lib/vacancyListUi";
import { cn } from "@/lib/utils";
import { AI_MATCHING_ROOT } from "@/routing/navPaths";
import { Button as ShadButton, buttonVariants } from "@/components/ui/button";

import { VacancyListFilterBar } from "./VacancyListFilterBar";
import { VacancyTable } from "./VacancyTable";

const PAGE_SIZE = 10;

function formatListSummary(template: string, from: number, to: number, total: number) {
  return template
    .replace("{{from}}", String(from))
    .replace("{{to}}", String(to))
    .replace("{{total}}", String(total));
}

function formatCount(template: string, n: number) {
  return template.replace("{{n}}", String(n));
}

/**
 * Pager for ≤7 shows all; otherwise: 1 … mid-window … last.
 */
function pageButtons(current: number, total: number): (number | "gap")[] {
  if (total <= 1) return [1];
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const set = new Set([1, total, current, current - 1, current + 1].filter((p) => p >= 1 && p <= total));
  const arr = [...set].sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  for (let i = 0; i < arr.length; i++) {
    if (i > 0) {
      const prev = arr[i - 1]!;
      const cur = arr[i]!;
      if (cur - prev > 1) out.push("gap");
    }
    out.push(arr[i]!);
  }
  return out;
}

export function VacancyListPage() {
  const filters = useVacancyFilters();
  const { copy } = useI18n();
  const { isLoaded, isSignedIn } = useAuth();
  const vacancies = useQuery(api.vacancies.listPublicOrOwner, filters.convexArgs);
  const { matchMap } = useVacancyMatchMap();
  const filterKey = useMemo(
    () =>
      [
        filters.search,
        filters.district,
        filters.source,
        filters.tag,
        filters.salaryBand,
        filters.experience,
        filters.sort,
      ].join("|"),
    [
      filters.search,
      filters.district,
      filters.source,
      filters.tag,
      filters.salaryBand,
      filters.experience,
      filters.sort,
    ],
  );
  const [pageState, setPageState] = useState({ filterKey, page: 1 });
  const page = pageState.filterKey === filterKey ? pageState.page : 1;

  const processedVacancies = useMemo(() => {
    const list = vacancies ?? [];
    const query = filters.search.trim().toLowerCase();
    let next = query
      ? list.filter((vacancy) =>
          `${vacancy.title} ${vacancy.description} ${vacancy.city} ${vacancy.district ?? ""}`
            .toLowerCase()
            .includes(query),
        )
      : list;
    if (filters.tag === "new") next = next.filter((v) => vacancyIsNew(v));
    if (filters.tag === "hot") next = next.filter((v) => vacancyIsHot(v));
    next = next.filter((v) => vacancyMatchesSalaryBand(v, filters.salaryBand));
    next = next.filter((v) => vacancyMatchesExperience(v, filters.experience));
    return sortVacancies(next, filters.sort);
  }, [
    vacancies,
    filters.search,
    filters.tag,
    filters.salaryBand,
    filters.experience,
    filters.sort,
  ]);

  const pageCount = Math.max(1, Math.ceil(processedVacancies.length / PAGE_SIZE));
  const pageSafe = Math.min(page, pageCount);
  const pagedVacancies = useMemo(
    () => processedVacancies.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE),
    [processedVacancies, pageSafe],
  );
  const pagedVacancyIds = useMemo(
    () => pagedVacancies.map((vacancy) => vacancy._id as Id<"vacancies">),
    [pagedVacancies],
  );
  const trustRows = useQuery(
    api.companyTrust.listVacancyTrust,
    pagedVacancyIds.length ? { vacancyIds: pagedVacancyIds } : "skip",
  );
  const trustByVacancyId = useMemo(
    () =>
      Object.fromEntries(
        (trustRows ?? []).map((row) => [String(row.vacancyId), row.trust]),
      ),
    [trustRows],
  );

  const pages = useMemo(() => pageButtons(pageSafe, pageCount), [pageSafe, pageCount]);

  const showReset =
    Boolean(filters.search.trim()) ||
    Boolean(filters.district) ||
    filters.source !== "all" ||
    filters.salaryBand !== "all" ||
    filters.experience !== "all" ||
    filters.sort !== "newest";

  const total = processedVacancies.length;
  const fromIdx = total === 0 ? 0 : (pageSafe - 1) * PAGE_SIZE + 1;
  const toIdx = Math.min(pageSafe * PAGE_SIZE, total);
  const nativeCount = processedVacancies.filter((v) => v.source === "native").length;
  const hhCount = processedVacancies.filter((v) => v.source === "hh").length;

  return (
    <div className="min-h-dvh bg-background text-foreground">
      {isLoaded && !isSignedIn ? (
        <header
          className="sticky top-0 z-20 border-b border-border/70 bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/80"
          aria-label={copy.vacancies.title}
        >
          <div className="container-app flex min-h-14 max-w-6xl items-center justify-between gap-3 py-2.5">
            <BrandMark to="/" className="shrink-0" />
            <Link
              to="/login"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "shrink-0 rounded-full")}
            >
              {copy.nav.signIn}
            </Link>
          </div>
        </header>
      ) : null}

      <VacancyListFilterBar
        district={filters.district}
        setDistrict={filters.setDistrict}
        tag={filters.tag}
        setTag={filters.setTag}
        salaryBand={filters.salaryBand}
        setSalaryBand={filters.setSalaryBand}
        experience={filters.experience}
        setExperience={filters.setExperience}
        source={filters.source}
        setSource={filters.setSource}
        sort={filters.sort}
        setSort={filters.setSort}
        onReset={filters.resetAll}
        showReset={showReset}
      />

      <div className="container-app max-w-6xl space-y-3 py-3 md:py-4">
        {vacancies !== undefined ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-card/40 px-3 py-2 text-xs text-muted-foreground">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border bg-background px-2 py-1 tabular-nums">
                {formatCount(copy.vacancies.metricsTotal, total)}
              </span>
              <span className="rounded-full border bg-background px-2 py-1 tabular-nums">
                {formatCount(copy.vacancies.metricsNative, nativeCount)}
              </span>
              <span className="rounded-full border bg-background px-2 py-1 tabular-nums">
                {formatCount(copy.vacancies.metricsHh, hhCount)}
              </span>
            </div>
            {showReset ? (
              <span className="rounded-full border bg-secondary px-2 py-1 text-xs font-medium text-foreground">
                {copy.vacancies.metricsFiltersActive}
              </span>
            ) : null}
          </div>
        ) : null}
        {vacancies === undefined ? (
          <LoadingSkeleton variant="vacancy-list" />
        ) : total === 0 ? (
          <ActionEmptyState
            title={copy.vacancies.emptyStateTitle}
            body={copy.vacancies.emptyStateHint}
            action={
              showReset ? (
                <Button type="button" onClick={filters.resetAll}>
                  {copy.vacancies.resetFilters}
                </Button>
              ) : (
                <Link
                  to={isSignedIn ? AI_MATCHING_ROOT : "/login"}
                  state={isSignedIn ? undefined : { from: AI_MATCHING_ROOT }}
                  className={cn(buttonVariants({ variant: "outline" }), "max-md:min-h-11")}
                >
                  {copy.vacancies.hintTryAi}
                </Link>
              )
            }
            secondaryAction={
              showReset ? (
                <Link
                  to={AI_MATCHING_ROOT}
                  className={cn(buttonVariants({ variant: "ghost" }), "max-md:min-h-11")}
                >
                  {copy.ai.title}
                </Link>
              ) : null
            }
          />
        ) : (
          <div className="grid gap-3">
            <AiAdvisoryNotice title={copy.applications.advisoryTitle} body={copy.vacancies.matchPreviewHint} />
            <VacancyTable
              vacancies={pagedVacancies}
              ownerView={false}
              matchMap={matchMap}
              trustByVacancyId={trustByVacancyId}
            />
          </div>
        )}

        {vacancies !== undefined && total > 0 ? (
          <div
            className={cn(
              "flex flex-col gap-2 border-t border-border/50 pt-3 sm:flex-row sm:items-center sm:justify-between",
            )}
          >
            <p className="text-xs text-muted-foreground tabular-nums">
              {formatListSummary(copy.vacancies.listSummary, fromIdx, toIdx, total)}
            </p>
            <div className="flex flex-wrap items-center justify-end gap-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 rounded-md px-1.5"
                disabled={pageSafe <= 1}
                onClick={() =>
                  setPageState({
                    filterKey,
                    page: Math.max(1, pageSafe - 1),
                  })
                }
                aria-label={copy.vacancies.paginationPrev}
              >
                <CaretLeft weight="bold" className="size-4" />
              </Button>
              <div className="flex items-center gap-0.5">
                {pages.map((item, i) =>
                  item === "gap" ? (
                    <span
                      key={`g-${i}`}
                      className="px-1.5 text-xs text-muted-foreground/80"
                      aria-hidden
                    >
                      …
                    </span>
                  ) : (
                    <ShadButton
                      key={item}
                      type="button"
                      variant={item === pageSafe ? "secondary" : "ghost"}
                      size="sm"
                      className="h-7 min-w-7 px-1.5 text-xs font-medium tabular-nums"
                      onClick={() => setPageState({ filterKey, page: item })}
                      aria-label={`${item}`}
                      aria-current={item === pageSafe ? "page" : undefined}
                    >
                      {item}
                    </ShadButton>
                  ),
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 rounded-md px-1.5"
                disabled={pageSafe >= pageCount}
                onClick={() =>
                  setPageState({
                    filterKey,
                    page: Math.min(pageCount, pageSafe + 1),
                  })
                }
                aria-label={copy.vacancies.paginationNext}
              >
                <CaretRight weight="bold" className="size-4" />
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
