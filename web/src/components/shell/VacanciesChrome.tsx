import { useAuth } from "@clerk/clerk-react";
import { useConvexAuth } from "convex/react";
import { Outlet } from "react-router-dom";

import { AppShellFromUser } from "@/components/shell/AppShellFromUser";
import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";

/**
 * Public vacancy list/detail URLs: anonymous users see pages without AppShell;
 * signed-in users get role-accurate chrome.
 */
export function VacanciesChrome() {
  const { isLoaded, isSignedIn } = useAuth();
  const convexAuth = useConvexAuth();

  if (!isLoaded) {
    return <LoadingSkeleton variant="page" />;
  }

  if (!isSignedIn) {
    return <Outlet />;
  }

  if (convexAuth.isLoading || !convexAuth.isAuthenticated) {
    return <LoadingSkeleton variant="page" />;
  }

  return <AppShellFromUser />;
}
