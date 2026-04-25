import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

import type { ExperienceFilter, SalaryBand, VacancySort } from "@/lib/vacancyListUi";
import type { VacancySource } from "@/types/domain";

export type VacancyTag = "all" | "new" | "hot";

function parseSalaryBand(raw: string | null): SalaryBand {
  if (raw === "lt250" || raw === "250500" || raw === "gt500") return raw;
  return "all";
}

function parseExperience(raw: string | null): ExperienceFilter {
  if (raw === "junior" || raw === "mid" || raw === "senior") return raw;
  return "all";
}

function parseSort(raw: string | null): VacancySort {
  return raw === "salaryDesc" ? "salaryDesc" : "newest";
}

function parseSource(raw: string | null): VacancySource | "all" {
  if (raw === "native" || raw === "hh") return raw;
  return "all";
}

function parseTag(raw: string | null): VacancyTag {
  if (raw === "new" || raw === "hot") return raw;
  return "all";
}

/**
 * All vacancy list filters are stored in the URL for shareable state and a single search field
 * in the app header (or public list chrome) bound to the `q` param.
 */
export function useVacancyFilters() {
  const [params, setParams] = useSearchParams();

  const search = params.get("q") ?? "";
  const district = params.get("district") ?? "";
  const source = parseSource(params.get("source"));
  const tag = parseTag(params.get("tag"));
  const salaryBand = parseSalaryBand(params.get("salary"));
  const experience = parseExperience(params.get("exp"));
  const sort = parseSort(params.get("sort"));

  const setParamsPatch = useCallback(
    (patch: {
      search?: string;
      source?: VacancySource | "all";
      district?: string;
      tag?: VacancyTag;
      salaryBand?: SalaryBand;
      experience?: ExperienceFilter;
      sort?: VacancySort;
    }) => {
      const nextParams = new URLSearchParams(params);
      const nextSearch = patch.search !== undefined ? patch.search : search;
      const nextSource = patch.source !== undefined ? patch.source : source;
      const nextDistrict = patch.district !== undefined ? patch.district : district;
      const nextTag = patch.tag !== undefined ? patch.tag : tag;
      const nextSalary = patch.salaryBand !== undefined ? patch.salaryBand : salaryBand;
      const nextExp = patch.experience !== undefined ? patch.experience : experience;
      const nextSort = patch.sort !== undefined ? patch.sort : sort;

      if (nextSearch) nextParams.set("q", nextSearch);
      else nextParams.delete("q");
      if (nextSource !== "all") nextParams.set("source", nextSource);
      else nextParams.delete("source");
      if (nextDistrict) nextParams.set("district", nextDistrict);
      else nextParams.delete("district");
      if (nextTag !== "all") nextParams.set("tag", nextTag);
      else nextParams.delete("tag");
      if (nextSalary !== "all") nextParams.set("salary", nextSalary);
      else nextParams.delete("salary");
      if (nextExp !== "all") nextParams.set("exp", nextExp);
      else nextParams.delete("exp");
      if (nextSort !== "newest") nextParams.set("sort", nextSort);
      else nextParams.delete("sort");

      setParams(nextParams, { replace: true });
    },
    [params, setParams, search, source, district, tag, salaryBand, experience, sort],
  );

  const setSearch = useCallback(
    (value: string) => setParamsPatch({ search: value }),
    [setParamsPatch],
  );

  const setSource = useCallback(
    (value: VacancySource | "all") => setParamsPatch({ source: value }),
    [setParamsPatch],
  );

  const setDistrict = useCallback(
    (value: string) => setParamsPatch({ district: value }),
    [setParamsPatch],
  );

  const setTag = useCallback((value: VacancyTag) => setParamsPatch({ tag: value }), [setParamsPatch]);

  const setSalaryBand = useCallback(
    (value: SalaryBand) => setParamsPatch({ salaryBand: value }),
    [setParamsPatch],
  );

  const setExperience = useCallback(
    (value: ExperienceFilter) => setParamsPatch({ experience: value }),
    [setParamsPatch],
  );

  const setSort = useCallback(
    (value: VacancySort) => setParamsPatch({ sort: value }),
    [setParamsPatch],
  );

  const clearDistrict = useCallback(
    () => setParamsPatch({ district: "" }),
    [setParamsPatch],
  );

  const clearSource = useCallback(
    () => setParamsPatch({ source: "all" }),
    [setParamsPatch],
  );

  const resetAll = useCallback(() => {
    setParams(new URLSearchParams(), { replace: true });
  }, [setParams]);

  return useMemo(
    () => ({
      search,
      setSearch,
      source,
      setSource,
      district,
      setDistrict,
      tag,
      setTag,
      salaryBand,
      setSalaryBand,
      experience,
      setExperience,
      sort,
      setSort,
      clearDistrict,
      clearSource,
      resetAll,
      convexArgs: {
        region: "aktau" as const,
        district: district || undefined,
        source: source === "all" ? undefined : source,
        limit: 50,
      },
    }),
    [
      clearDistrict,
      clearSource,
      district,
      experience,
      resetAll,
      salaryBand,
      search,
      setDistrict,
      setExperience,
      setSalaryBand,
      setSearch,
      setSort,
      setSource,
      setTag,
      sort,
      source,
      tag,
    ],
  );
}
