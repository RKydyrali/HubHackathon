import { useAction, useQuery } from "convex/react";
import { useEffect, useMemo, useState } from "react";

import { api, type Id } from "@/lib/convex-api";

type SeekerMatch = {
  matchScore: number;
  profile: {
    _id: string;
    fullName?: string;
    city?: string;
    skills?: string[];
  };
};

type ActionMatchRow = {
  matchScore: number;
  profile: {
    _id: string;
    fullName?: string;
    city?: string;
    skills?: string[];
  };
};

export function useVacancySeekerMatches(vacancyId?: string) {
  const vacancy = useQuery(
    api.vacancies.getVacancy,
    vacancyId ? { vacancyId: vacancyId as Id<"vacancies"> } : "skip",
  );
  const getMatchingSeekers = useAction(api.ai.getMatchingSeekers);
  const [matches, setMatches] = useState<SeekerMatch[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!vacancy) {
      setMatches(null);
      setLoading(false);
      return;
    }
    if (vacancy.source !== "native") {
      setMatches([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setMatches(null);
    void (async () => {
      try {
        const result = (await getMatchingSeekers({
          vacancyId: vacancy._id as Id<"vacancies">,
          limit: 8,
        })) as ActionMatchRow[];
        if (cancelled) return;
        const trimmed = (result ?? [])
          .filter((r) => typeof r?.matchScore === "number" && r.profile)
          .map((r) => ({
            matchScore: r.matchScore,
            profile: {
              _id: String(r.profile._id),
              fullName: r.profile.fullName,
              city: r.profile.city,
              skills: r.profile.skills,
            },
          }));
        setMatches(trimmed);
      } catch {
        if (!cancelled) setMatches([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getMatchingSeekers, vacancy?._id, vacancy?.source]);

  const unavailable = useMemo(() => Boolean(vacancy && vacancy.source !== "native"), [vacancy]);
  return {
    vacancy,
    loading,
    unavailable,
    matches: matches ?? [],
  };
}

