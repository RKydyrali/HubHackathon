import { useAuth } from "@clerk/clerk-react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { Button } from "@/components/shared/Button";
import { api } from "@/lib/convex-api";
import { AI_MATCHING_ROOT } from "@/routing/navPaths";

type Role = "seeker" | "employer" | "admin";

export function defaultHomeForRole(role: Role): string {
  switch (role) {
    case "employer":
      return "/employer/dashboard";
    case "admin":
      return "/admin";
    default:
      return AI_MATCHING_ROOT;
  }
}

function currentReturnPath(location: ReturnType<typeof useLocation>): string {
  return `${location.pathname}${location.search}`;
}

function parseReturnPath(path: string | undefined): { pathname: string; search: string } | null {
  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return null;
  }

  try {
    const url = new URL(path, "https://jumysai.local");
    if (url.origin !== "https://jumysai.local") {
      return null;
    }
    return { pathname: url.pathname, search: url.search };
  } catch {
    return null;
  }
}

function isPublicVacancyPath(pathname: string): boolean {
  return pathname === "/vacancies" || /^\/vacancies\/[^/]+\/?$/.test(pathname);
}

function isSeekerPath(pathname: string): boolean {
  return (
    pathname === AI_MATCHING_ROOT ||
    pathname.startsWith(`${AI_MATCHING_ROOT}/`) ||
    pathname === "/dashboard" ||
    pathname === "/for-you" ||
    pathname === "/applications" ||
    pathname === "/interviews" ||
    pathname === "/interview-trainer" ||
    pathname === "/profile" ||
    pathname === "/notifications" ||
    pathname.startsWith("/prepare/") ||
    /^\/vacancies\/[^/]+\/apply\/?$/.test(pathname)
  );
}

function isRolePath(role: Role, pathname: string): boolean {
  if (isPublicVacancyPath(pathname) || pathname === "/settings") {
    return true;
  }
  if (role === "seeker") {
    return isSeekerPath(pathname);
  }
  if (role === "employer") {
    return (
      pathname === AI_MATCHING_ROOT ||
      pathname.startsWith(`${AI_MATCHING_ROOT}/`) ||
      pathname.startsWith("/employer/")
    );
  }
  return (
    pathname === AI_MATCHING_ROOT ||
    pathname.startsWith(`${AI_MATCHING_ROOT}/`) ||
    pathname === "/admin" ||
    pathname.startsWith("/admin/")
  );
}

export function resolveReturnPathForRole(role: Role, path: string | undefined): string {
  const parsed = parseReturnPath(path);
  if (!parsed || !isRolePath(role, parsed.pathname)) {
    return defaultHomeForRole(role);
  }
  return `${parsed.pathname}${parsed.search}`;
}

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
  const [userSyncFailed, setUserSyncFailed] = useState(false);

  useEffect(() => {
    if (shouldQueryUser && currentUser === null && !syncStarted.current) {
      syncStarted.current = true;
      setUserSyncFailed(false);
      void syncCurrentUser({})
        .then(() => setUserSyncFailed(false))
        .catch(() => setUserSyncFailed(true));
    }
  }, [currentUser, shouldQueryUser, syncCurrentUser]);

  const handleRetryUserSync = useCallback(() => {
    setUserSyncFailed(false);
    void syncCurrentUser({})
      .then(() => setUserSyncFailed(false))
      .catch(() => setUserSyncFailed(true));
  }, [syncCurrentUser]);

  const canUseRoute = useMemo(() => {
    if (!currentUser?.role || !roles?.length) {
      return true;
    }
    return roles.includes(currentUser.role as Role);
  }, [currentUser, roles]);

  if (!isLoaded) {
    return <LoadingSkeleton variant="page" />;
  }
  if (!isSignedIn) {
    return <Navigate to="/login" replace state={{ from: currentReturnPath(location) }} />;
  }
  if (convexAuth.isLoading || !convexAuth.isAuthenticated) {
    return <LoadingSkeleton variant="page" />;
  }
  if (currentUser === undefined) {
    return <LoadingSkeleton variant="page" />;
  }
  if (currentUser === null) {
    if (userSyncFailed) {
      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-6">
          <p className="max-w-sm text-center text-sm text-muted-foreground">
            We could not connect your account. Check your network and try again.
          </p>
          <Button type="button" onClick={handleRetryUserSync}>
            Retry
          </Button>
        </div>
      );
    }
    return <LoadingSkeleton variant="page" />;
  }
  if (!currentUser.role && !allowUnassignedRole) {
    return <Navigate to="/onboarding" replace state={{ from: currentReturnPath(location) }} />;
  }
  if (shouldQueryProfile && profile === undefined) {
    return <LoadingSkeleton variant="page" />;
  }
  if (!canUseRoute) {
    return <Navigate to={defaultHomeForRole(currentUser.role as Role)} replace />;
  }
  if (requireProfile && currentUser.role === "seeker" && !profile) {
    return <Navigate to="/profile" replace state={{ from: currentReturnPath(location) }} />;
  }

  return <>{children}</>;
}
