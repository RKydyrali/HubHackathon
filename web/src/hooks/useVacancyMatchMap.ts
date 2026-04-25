import { useAction, useConvexAuth, useQuery } from "convex/react";
import { useEffect, useMemo, useRef, useState } from "react";

import { api, type Doc, type Id } from "@/lib/convex-api";

type MatchRow = { vacancy: Doc<"vacancies">; matchScore: number };

export function useVacancyMatchMap({ limit = 30 }: { limit?: number } = {}) {
  const convexAuth = useConvexAuth();
  const self = useQuery(api.users.getSelf, convexAuth.isAuthenticated ? {} : "skip");
  const getMatchingVacancies = useAction(api.ai.getMatchingVacancies);
  const ranRef = useRef(false);
  const [rows, setRows] = useState<MatchRow[] | null>(null);
  const [loading, setLoading] = useState(false);

  const enabled = convexAuth.isAuthenticated && (self?.role === "seeker" || self?.role === "admin");

  useEffect(() => {
    if (!enabled) {
      ranRef.current = false;
      setRows(null);
      return;
    }
    if (ranRef.current) return;
    ranRef.current = true;
    setLoading(true);
    void (async () => {
      try {
        const result = (await getMatchingVacancies({ limit })) as Array<{
          vacancy: Doc<"vacancies">;
          matchScore: number;
        }>;
        const safe = (result ?? [])
          .filter((r) => r?.vacancy?._id && typeof r.matchScore === "number")
          .map((r) => ({ vacancy: r.vacancy, matchScore: r.matchScore }));
        setRows(safe);
      } catch {
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [enabled, getMatchingVacancies, limit]);

  const matchMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of rows ?? []) {
      if (!r.vacancy?._id) continue;
      map[String(r.vacancy._id)] = Math.max(0, Math.min(100, Math.round(r.matchScore)));
    }
    return map;
  }, [rows]);

  return { enabled, loading, rows, matchMap };
}

