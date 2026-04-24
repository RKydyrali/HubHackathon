import { useAuth } from "@clerk/clerk-react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { api } from "@/lib/convex-api";

type Role = "seeker" | "employer" | "admin";

export function ProtectedRoute({
  children,
  roles,
  requireProfile = false,
  allowUnassignedRole = false,
}: {
  children: ReactNode;
  roles?: Role[];
  requireProfile?: boolean;
  allowUnassignedRole?: boolean;
}) {
  const location = useLocation();
  const { isLoaded, isSignedIn } = useAuth();
  const convexAuth = useConvexAuth();
  const syncCurrentUser = useMutation(api.users.syncCurrentUser);
  const shouldQueryUser = isLoaded && Boolean(isSignedIn) && convexAuth.isAuthenticated;
  const currentUser = useQuery(api.users.getSelf, shouldQueryUser ? {} : "skip");
  const shouldQueryProfile =
    shouldQueryUser && requireProfile && currentUser?.role === "seeker";
  const profile = useQuery(api.profiles.getMyProfile, shouldQueryProfile ? {} : "skip");
  const syncStarted = useRef(false);

  useEffect(() => {
    if (shouldQueryUser && currentUser === null && !syncStarted.current) {
      syncStarted.current = true;
      void syncCurrentUser({});
    }
  }, [currentUser, shouldQueryUser, syncCurrentUser]);

  const canUseRoute = useMemo(() => {
    if (!currentUser?.role || !roles?.length) {
      return true;
    }
    return roles.includes(currentUser.role as Role) || currentUser.role === "admin";
  }, [currentUser, roles]);

  if (!isLoaded) {
    return <LoadingSkeleton variant="page" />;
  }
  if (!isSignedIn) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (convexAuth.isLoading || !convexAuth.isAuthenticated) {
    return <LoadingSkeleton variant="page" />;
  }
  if (currentUser === undefined || currentUser === null) {
    return <LoadingSkeleton variant="page" />;
  }
  if (!currentUser.role && !allowUnassignedRole) {
    return <Navigate to="/onboarding" replace state={{ from: location.pathname }} />;
  }
  if (shouldQueryProfile && profile === undefined) {
    return <LoadingSkeleton variant="page" />;
  }
  if (!canUseRoute) {
    return <Navigate to={currentUser.role === "employer" ? "/employer/dashboard" : "/dashboard"} replace />;
  }
  if (requireProfile && currentUser.role === "seeker" && !profile) {
    return <Navigate to="/profile" replace />;
  }

  return <>{children}</>;
}
