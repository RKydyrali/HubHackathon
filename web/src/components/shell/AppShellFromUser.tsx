import { useConvexAuth, useQuery } from "convex/react";
import { Navigate } from "react-router-dom";

import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { AppShell } from "@/components/shell/AppShell";
import { api } from "@/lib/convex-api";
import type { UserRole } from "@/types/domain";

export function AppShellFromUser() {
  const convexAuth = useConvexAuth();
  const currentUser = useQuery(api.users.getSelf, convexAuth.isAuthenticated ? {} : "skip");

  if (convexAuth.isLoading || !convexAuth.isAuthenticated) {
    return <LoadingSkeleton variant="page" />;
  }
  if (currentUser === undefined || currentUser === null) {
    return <LoadingSkeleton variant="page" />;
  }
  if (!currentUser.role) {
    return <Navigate to="/onboarding" replace />;
  }

  return <AppShell role={currentUser.role as UserRole} />;
}
