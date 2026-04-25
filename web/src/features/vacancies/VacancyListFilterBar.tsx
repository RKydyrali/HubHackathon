import { Funnel, SortAscending } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VacancyListQuerySearch } from "@/features/vacancies/VacancyListQuerySearch";
import { useI18n } from "@/lib/i18n";
import type { ExperienceFilter, SalaryBand, VacancySort } from "@/lib/vacancyListUi";
import type { VacancySource } from "@/types/domain";
import { cn } from "@/lib/utils";

import { LocationCombobox } from "./LocationCombobox";

const filterW =
  "h-8 min-w-0 max-w-36 flex-[1_1_7.5rem] basis-[7.5rem] justify-between gap-1 rounded-lg border-border/70 bg-background px-2 text-xs font-medium shadow-none sm:max-w-none sm:shrink-0 sm:basis-[8.25rem]";
const moreBtn = "h-8 shrink-0 gap-1 rounded-lg border-border/70 bg-background px-2.5 text-xs font-medium shadow-none";
const sortTrigger =
  "h-8 w-40 min-w-0 shrink-0 justify-between gap-1.5 rounded-lg border-border/70 bg-background px-2.5 text-xs font-medium shadow-none";

type VacancyListFilterBarProps = {
  district: string;
  setDistrict: (v: string) => void;
  tag: "all" | "new" | "hot";
  setTag: (v: "all" | "new" | "hot") => void;
  salaryBand: SalaryBand;
  setSalaryBand: (v: SalaryBand) => void;
  experience: ExperienceFilter;
  setExperience: (v: ExperienceFilter) => void;
  source: VacancySource | "all";
  setSource: (v: VacancySource | "all") => void;
  sort: VacancySort;
  setSort: (v: VacancySort) => void;
  onReset: () => void;
  showReset: boolean;
  className?: string;
};

export function VacancyListFilterBar({
  district,
  setDistrict,
  tag,
  setTag,
  salaryBand,
  setSalaryBand,
  experience,
  setExperience,
  source,
  setSource,
  sort,
  setSort,
  onReset,
  showReset,
  className,
}: VacancyListFilterBarProps) {
  const { copy } = useI18n();

  return (
    <div
      className={cn(
        "border-b border-border/60 bg-card/50 backdrop-blur-sm",
        "px-4 py-2.5 md:px-7 md:py-3",
        className,
      )}
    >
      <div className="container-app max-w-6xl min-w-0">
        <div
          className={cn(
            "flex w-full min-w-0 flex-col gap-2.5",
            "min-[1280px]:min-h-9 min-[1280px]:flex-row min-[1280px]:items-center min-[1280px]:gap-2 min-[1280px]:pt-0",
          )}
        >
          <div className="min-w-0 min-[1280px]:min-w-[18rem] min-[1280px]:max-w-lg min-[1280px]:shrink-0 min-[1280px]:flex-[1.1_1_20rem]">
            <VacancyListQuerySearch
              className="h-8 w-full min-w-0 rounded-lg border-border/70 shadow-none md:h-8"
            />
          </div>

          <div
            className="flex w-full min-w-0 flex-1 flex-wrap content-start items-center gap-1.5 min-[1280px]:min-w-0"
          >
            <LocationCombobox
              id="vacancy-filter-location"
              value={district}
              onChange={setDistrict}
              label={copy.vacancies.filterLabelLocation}
              anyLabel={copy.vacancies.locationLabelAny}
              showLabel={false}
            />

            <div className="flex shrink-0 items-center gap-1">
              <Button
                type="button"
                variant={tag === "new" ? "secondary" : "outline"}
                className={cn("h-8 rounded-lg px-2.5 text-xs font-medium shadow-none", tag === "new" && "border-primary/20")}
                onClick={() => setTag(tag === "new" ? "all" : "new")}
                aria-pressed={tag === "new"}
              >
                {copy.vacancies.badgeNew}
              </Button>
              <Button
                type="button"
                variant={tag === "hot" ? "secondary" : "outline"}
                className={cn("h-8 rounded-lg px-2.5 text-xs font-medium shadow-none", tag === "hot" && "border-primary/20")}
                onClick={() => setTag(tag === "hot" ? "all" : "hot")}
                aria-pressed={tag === "hot"}
              >
                {copy.vacancies.badgeHot}
              </Button>
            </div>

            <Select value={salaryBand} onValueChange={(value) => setSalaryBand(value as SalaryBand)}>
              <SelectTrigger
                id="vacancy-filter-salary"
                className={filterW}
                size="default"
                aria-label={copy.vacancies.filterLabelSalary}
              >
                <SelectValue>
                  {salaryBand === "all"
                    ? copy.vacancies.salaryLabelAny
                    : salaryBand === "lt250"
                      ? copy.vacancies.salaryLt250
                      : salaryBand === "250500"
                        ? copy.vacancies.salary250500
                        : copy.vacancies.salaryGt500}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">{copy.vacancies.salaryLabelAny}</SelectItem>
                  <SelectItem value="lt250">{copy.vacancies.salaryLt250}</SelectItem>
                  <SelectItem value="250500">{copy.vacancies.salary250500}</SelectItem>
                  <SelectItem value="gt500">{copy.vacancies.salaryGt500}</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>

            <Select value={experience} onValueChange={(value) => setExperience(value as ExperienceFilter)}>
              <SelectTrigger
                id="vacancy-filter-experience"
                className={filterW}
                size="default"
                aria-label={copy.vacancies.filterLabelEmployment}
              >
                <SelectValue>
                  {experience === "all"
                    ? copy.vacancies.employmentLabelAny
                    : experience === "junior"
                      ? copy.vacancies.expJunior
                      : experience === "mid"
                        ? copy.vacancies.expMid
                        : copy.vacancies.expSenior}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">{copy.vacancies.employmentLabelAny}</SelectItem>
                  <SelectItem value="junior">{copy.vacancies.expJunior}</SelectItem>
                  <SelectItem value="mid">{copy.vacancies.expMid}</SelectItem>
                  <SelectItem value="senior">{copy.vacancies.expSenior}</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>

            <Select value={source} onValueChange={(value) => setSource(value as VacancySource | "all")}>
              <SelectTrigger
                id="vacancy-filter-source"
                className={filterW}
                size="default"
                aria-label={copy.vacancies.filterLabelSource}
              >
                <SelectValue>
                  {source === "all"
                    ? copy.vacancies.sourceLabelAny
                    : source === "native"
                      ? "JumysAI"
                      : "HH.kz"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">{copy.vacancies.sourceLabelAny}</SelectItem>
                  <SelectItem value="native">JumysAI</SelectItem>
                  <SelectItem value="hh">HH.kz</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger
                render={
                  <Button
                    type="button"
                    variant="outline"
                    className={moreBtn}
                    aria-label={copy.vacancies.moreFilters}
                  />
                }
              >
                <Funnel weight="bold" className="size-3.5 shrink-0 opacity-80" />
                <span className="hidden min-[480px]:inline">{copy.vacancies.moreFilters}</span>
                <span className="min-[480px]:hidden" aria-hidden>
                  +
                </span>
              </PopoverTrigger>
              <PopoverContent className="w-72" align="start" sideOffset={6}>
                <PopoverHeader>
                  <PopoverTitle className="text-sm">{copy.vacancies.moreFilters}</PopoverTitle>
                  <PopoverDescription className="text-xs font-normal text-muted-foreground">
                    {copy.vacancies.moreFiltersEmpty}
                  </PopoverDescription>
                </PopoverHeader>
              </PopoverContent>
            </Popover>
          </div>

          <div
            className={cn(
              "flex w-full min-w-0 flex-wrap items-center justify-end gap-1.5",
              "border-t border-border/40 pt-2 min-[1280px]:w-auto min-[1280px]:shrink-0 min-[1280px]:content-end min-[1280px]:border-0 min-[1280px]:pt-0",
            )}
          >
            {showReset ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 shrink-0 px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                onClick={onReset}
              >
                {copy.vacancies.resetFilters}
              </Button>
            ) : null}

            <Select value={sort} onValueChange={(value) => setSort(value as VacancySort)}>
              <SelectTrigger
                id="vacancy-filter-sort"
                className={sortTrigger}
                size="default"
                aria-label={copy.vacancies.filterLabelSort}
              >
                <SortAscending weight="bold" className="size-3.5 shrink-0 text-muted-foreground" />
                <SelectValue>
                  {sort === "newest" ? copy.vacancies.sortNewest : copy.vacancies.sortSalary}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="newest">{copy.vacancies.sortNewest}</SelectItem>
                  <SelectItem value="salaryDesc">{copy.vacancies.sortSalary}</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}
