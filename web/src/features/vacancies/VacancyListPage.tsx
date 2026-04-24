import { useQuery } from "convex/react";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { Funnel, SquaresFour, X } from "@phosphor-icons/react";

import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { StateBlock } from "@/components/feedback/StateBlock";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionPanel } from "@/components/layout/SectionPanel";
import { Button } from "@/components/shared/Button";
import { api } from "@/lib/convex-api";
import { useI18n } from "@/lib/i18n";
import { motionPresets } from "@/lib/motion";
import { useVacancyFilters } from "@/hooks/useVacancyFilters";
import { VacancyCard } from "./VacancyCard";
import { VacancyFilters } from "./VacancyFilters";

export function VacancyListPage() {
  const filters = useVacancyFilters();
  const { copy } = useI18n();
  const vacancies = useQuery(api.vacancies.listPublic, filters.convexArgs);
  const filteredVacancies = useMemo(() => {
    const query = filters.search.trim().toLowerCase();
    if (!vacancies || !query) return vacancies ?? [];
    return vacancies.filter((vacancy) =>
      `${vacancy.title} ${vacancy.description}`.toLowerCase().includes(query),
    );
  }, [filters.search, vacancies]);

  const hasFilters = Boolean(filters.search || filters.district || filters.source !== "all");

  return (
    <>
      <PageHeader title={copy.vacancies.title} subtitle={copy.vacancies.subtitle} />
      {hasFilters ? (
        <div className="no-scrollbar flex gap-2 overflow-x-auto border-b bg-card/58 px-6 py-3">
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground">
            <Funnel weight="bold" />
            {copy.common.filters}
          </span>
          {filters.search ? (
            <FilterChip label={`${copy.vacancies.search}: ${filters.search}`} onClear={() => filters.setSearch("")} />
          ) : null}
          {filters.district ? (
            <FilterChip label={`${copy.vacancies.district}: ${filters.district}`} onClear={filters.clearDistrict} />
          ) : null}
          {filters.source !== "all" ? (
            <FilterChip label={`${copy.vacancies.source}: ${filters.source === "native" ? "JumysAI" : "HH.kz"}`} onClear={filters.clearSource} />
          ) : null}
        </div>
      ) : null}
      <VacancyFilters {...filters} />
      <div className="container-app grid gap-4 py-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <SectionPanel
          title={copy.vacancies.title}
          subtitle={vacancies === undefined ? copy.common.loading : `${filteredVacancies.length} / ${vacancies.length}`}
          action={
            <Button variant="outline" size="icon-sm" aria-label={copy.vacancies.title}>
              <SquaresFour weight="bold" />
            </Button>
          }
        >
          {vacancies === undefined ? (
            <div className="grid gap-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <LoadingSkeleton key={index} variant="vacancy-card" />
              ))}
            </div>
          ) : filteredVacancies.length ? (
            <motion.div {...motionPresets.list} className="grid gap-3">
              {filteredVacancies.map((vacancy) => (
                <VacancyCard key={vacancy._id} vacancy={vacancy} />
              ))}
            </motion.div>
          ) : (
            <StateBlock title={copy.vacancies.noResults} body={copy.vacancies.subtitle} />
          )}
        </SectionPanel>
        <aside className="hidden xl:block">
          <div className="sticky top-24">
            <SectionPanel title={copy.common.filters} patterned>
              <div className="grid gap-3 text-sm text-muted-foreground">
                <p>{copy.vacancies.subtitle}</p>
                <div className="rounded-2xl border bg-background/70 p-3">
                  <p className="font-semibold text-foreground">{copy.vacancies.source}</p>
                  <p className="mt-1">{filters.source === "all" ? copy.vacancies.all : filters.source === "native" ? "JumysAI" : "HH.kz"}</p>
                </div>
                <div className="rounded-2xl border bg-background/70 p-3">
                  <p className="font-semibold text-foreground">{copy.vacancies.district}</p>
                  <p className="mt-1">{filters.district || copy.vacancies.anyDistrict}</p>
                </div>
                {hasFilters ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      filters.setSearch("");
                      filters.clearDistrict();
                      filters.clearSource();
                    }}
                  >
                    <X data-icon="inline-start" weight="bold" />
                    {copy.common.cancel}
                  </Button>
                ) : null}
              </div>
            </SectionPanel>
          </div>
        </aside>
      </div>
    </>
  );
}

function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <Button type="button" variant="outline" size="sm" className="shrink-0 rounded-full" onClick={onClear}>
      {label}
      <X data-icon="inline-end" weight="bold" />
    </Button>
  );
}
