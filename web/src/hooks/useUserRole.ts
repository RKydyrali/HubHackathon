import { useConvexAuth, useQuery } from "convex/react";

import { api } from "@/lib/convex-api";
import type { UserRole } from "@/types/domain";

export function useUserRole() {
  const convexAuth = useConvexAuth();
  const user = useQuery(api.users.getSelf, convexAuth.isAuthenticated ? {} : "skip");

  return {
    loading: convexAuth.isLoading || (convexAuth.isAuthenticated && user === undefined),
    user,
    value: (user?.role ?? null) as UserRole | null,
  };
}
