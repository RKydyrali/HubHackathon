import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import type { VacancySource } from "@/types/domain";

export function useVacancyFilters() {
  const [params, setParams] = useSearchParams();
  const [search, setSearchState] = useState(params.get("q") ?? "");
  const [source, setSourceState] = useState<VacancySource | "all">(
    (params.get("source") as VacancySource | "all" | null) ?? "all",
  );
  const [district, setDistrictState] = useState(params.get("district") ?? "");

  const updateParams = useCallback((next: { search?: string; source?: VacancySource | "all"; district?: string }) => {
    const nextParams = new URLSearchParams(params);
    const nextSearch = next.search ?? search;
    const nextSource = next.source ?? source;
    const nextDistrict = next.district ?? district;
    if (nextSearch) nextParams.set("q", nextSearch);
    else nextParams.delete("q");
    if (nextSource && nextSource !== "all") nextParams.set("source", nextSource);
    else nextParams.delete("source");
    if (nextDistrict) nextParams.set("district", nextDistrict);
    else nextParams.delete("district");
    setParams(nextParams, { replace: true });
  }, [district, params, search, setParams, source]);

  const setSearch = useCallback((value: string) => {
    setSearchState(value);
    updateParams({ search: value });
  }, [updateParams]);

  const setSource = useCallback((value: VacancySource | "all") => {
    setSourceState(value);
    updateParams({ source: value });
  }, [updateParams]);

  const setDistrict = useCallback((value: string) => {
    setDistrictState(value);
    updateParams({ district: value });
  }, [updateParams]);

  return useMemo(
    () => ({
      search,
      setSearch,
      source,
      setSource,
      district,
      setDistrict,
      clearDistrict: () => setDistrict(""),
      clearSource: () => setSource("all"),
      convexArgs: {
        district: district || undefined,
        source: source === "all" ? undefined : source,
        limit: 50,
      },
    }),
    [district, search, setDistrict, setSearch, setSource, source],
  );
}
