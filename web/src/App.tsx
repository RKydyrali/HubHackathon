import { useAuth } from "@clerk/clerk-react";
import { useQuery } from "convex/react";
import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
  useLocation,
  useParams,
} from "react-router-dom";

import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { AppShellFromUser } from "@/components/shell/AppShellFromUser";
import { VacanciesChrome } from "@/components/shell/VacanciesChrome";
import { AdminApplicationsPage } from "@/features/admin/AdminApplicationsPage";
import { AdminInterviewsPage } from "@/features/admin/AdminInterviewsPage";
import { AdminNotificationsPage } from "@/features/admin/AdminNotificationsPage";
import { AdminOverviewPage } from "@/features/admin/AdminOverviewPage";
import { AdminUsersPage } from "@/features/admin/AdminUsersPage";
import { AdminVacanciesPage } from "@/features/admin/AdminVacanciesPage";
import { AiSearchPage } from "@/features/ai-search/AiSearchPage";
import { EmployerApplicationReviewPage } from "@/features/applications/EmployerApplicationReviewPage";
import { EmployerApplicationsPage } from "@/features/applications/EmployerApplicationsPage";
import { ApplicationsPage } from "@/features/applications/ApplicationsPage";
import { SeekerApplicationDetailPage } from "@/features/applications/SeekerApplicationDetailPage";
import { LoginPage } from "@/features/auth/LoginPage";
import { OnboardingPage } from "@/features/auth/OnboardingPage";
import { EmployerDashboardPage } from "@/features/dashboard/EmployerDashboardPage";
import { InterviewsPage } from "@/features/interviews/InterviewsPage";
import { PrepareMockInterviewPage } from "@/features/interviews/PrepareMockInterviewPage";
import { SeekerInterviewsPage } from "@/features/interviews/SeekerInterviewsPage";
import { InterviewTrainerPage } from "@/features/interview-trainer/InterviewTrainerPage";
import { NotificationsPage } from "@/features/notifications/NotificationsPage";
import { ProfilePage } from "@/features/profile/ProfilePage";
import { PublicWelcomePage } from "@/features/public/PublicWelcomePage";
import { SettingsPage } from "@/features/settings/SettingsPage";
import { ApplyPage } from "@/features/vacancies/ApplyPage";
import { EmployerVacanciesPage } from "@/features/vacancies/EmployerVacanciesPage";
import { EmployerVacancyDetailPage } from "@/features/vacancies/EmployerVacancyDetailPage";
import { HiringAssistantPage } from "@/features/hiring-assistant/HiringAssistantPage";
import { ForYouPage } from "@/features/vacancies/ForYouPage";
import { VacancyDetailPage } from "@/features/vacancies/VacancyDetailPage";
import { VacancyListPage } from "@/features/vacancies/VacancyListPage";
import { api } from "@/lib/convex-api";
import { ProtectedRoute } from "@/routing/guards";
import { AI_MATCHING_ROOT } from "@/routing/navPaths";

const router = createBrowserRouter(
  [
    { path: "/login/*", element: <LoginPage /> },
    { path: "/", element: <RootRoute /> },
    {
      path: "/onboarding",
      element: (
        <ProtectedRoute allowUnassignedRole>
          <OnboardingPage />
        </ProtectedRoute>
      ),
    },
    /* Public vacancy URLs: anonymous = no shell; signed-in = AppShellFromUser (see VacanciesChrome). */
    {
      element: <VacanciesChrome />,
      children: [
        { path: "/vacancies", element: <VacancyListPage /> },
        { path: "/vacancies/:id", element: <VacancyDetailPage /> },
      ],
    },
    {
      element: (
        <ProtectedRoute roles={["seeker", "employer", "admin"]}>
          <AppShellFromUser />
        </ProtectedRoute>
      ),
      children: [
        { path: AI_MATCHING_ROOT, element: <AiSearchPage /> },
        { path: "/ai-search/:chatId", element: <AiSearchPage /> },
        { path: "/settings", element: <SettingsPage /> },
      ],
    },
    {
      element: (
        <ProtectedRoute roles={["seeker"]} requireProfile>
          <AppShellFromUser />
        </ProtectedRoute>
      ),
      children: [
        { path: "/for-you", element: <ForYouPage /> },
      ],
    },
    {
      element: (
        <ProtectedRoute roles={["seeker"]}>
          <AppShellFromUser />
        </ProtectedRoute>
      ),
      children: [
        { path: "/dashboard", element: <Navigate to={AI_MATCHING_ROOT} replace /> },
        { path: "/prepare/:vacancyId", element: <PrepareMockInterviewPage /> },
        { path: "/interview-trainer", element: <InterviewTrainerPage /> },
        /* More specific than /vacancies/:id on VacanciesChrome; keep first within this group. */
        { path: "/vacancies/:id/apply", element: <ApplyPage /> },
        { path: "/applications", element: <ApplicationsPage /> },
        { path: "/applications/:applicationId", element: <SeekerApplicationDetailPage /> },
        { path: "/interviews", element: <SeekerInterviewsPage /> },
        { path: "/profile", element: <ProfilePage /> },
        { path: "/notifications", element: <NotificationsPage /> },
      ],
    },
    {
      element: (
        <ProtectedRoute roles={["employer"]}>
          <AppShellFromUser />
        </ProtectedRoute>
      ),
      children: [
        { path: "/employer/dashboard", element: <EmployerDashboardPage /> },
        { path: "/employer/vacancies", element: <EmployerVacanciesPage /> },
        { path: "/employer/vacancies/:id", element: <EmployerVacancyDetailPage /> },
        { path: "/employer/hiring-assistant", element: <HiringAssistantPage /> },
        { path: "/employer/hiring-assistant/:chatId", element: <HiringAssistantPage /> },
        { path: "/employer/applications", element: <EmployerApplicationsPage /> },
        { path: "/employer/applications/:id", element: <EmployerApplicationReviewPage /> },
        { path: "/employer/interviews", element: <InterviewsPage /> },
        { path: "/employer/notifications", element: <NotificationsPage /> },
      ],
    },
    {
      element: (
        <ProtectedRoute roles={["admin"]}>
          <AppShellFromUser />
        </ProtectedRoute>
      ),
      children: [
        { path: "/admin", element: <AdminOverviewPage /> },
        { path: "/admin/users", element: <AdminUsersPage /> },
        { path: "/admin/vacancies", element: <AdminVacanciesPage /> },
        { path: "/admin/applications", element: <AdminApplicationsPage /> },
        { path: "/admin/interviews", element: <AdminInterviewsPage /> },
        { path: "/admin/notifications", element: <AdminNotificationsPage /> },
      ],
    },
    { path: "/dashboard/ai-search", element: <LegacyAiSearchRedirect /> },
    { path: "/dashboard/ai-search/:chatId", element: <DashboardAiSearchRedirect /> },
    { path: "/jobs", element: <Navigate to="/vacancies" replace /> },
    { path: "/jobs/:id", element: <LegacyJobRedirect /> },
    { path: "*", element: <Navigate to="/" replace /> },
  ],
  {
    future: {
      v7_relativeSplatPath: true,
    },
  },
);

export default function App() {
  return <RouterProvider router={router} future={{ v7_startTransition: true }} />;
}

function LegacyAiSearchRedirect() {
  const { search } = useLocation();
  return <Navigate to={{ pathname: AI_MATCHING_ROOT, search }} replace />;
}

function LegacyJobRedirect() {
  const { id } = useParams();
  return <Navigate to={`/vacancies/${id}`} replace />;
}

function DashboardAiSearchRedirect() {
  const { chatId } = useParams();
  return <Navigate to={`/ai-search/${chatId}`} replace />;
}

function RootRoute() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return <LoadingSkeleton variant="page" />;
  }

  if (!isSignedIn) {
    return <PublicWelcomePage />;
  }

  return (
    <ProtectedRoute roles={["seeker", "employer", "admin"]}>
      <RoleHomeRedirect />
    </ProtectedRoute>
  );
}

function RoleHomeRedirect() {
  const currentUser = useQuery(api.users.getSelf, {});

  if (currentUser === undefined || currentUser === null) {
    return <LoadingSkeleton variant="page" />;
  }

  if (currentUser.role === "employer") {
    return <Navigate to="/employer/dashboard" replace />;
  }
  if (currentUser.role === "admin") {
    return <Navigate to="/admin" replace />;
  }

  return <Navigate to={AI_MATCHING_ROOT} replace />;
}
