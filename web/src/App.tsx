import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
  useParams,
} from "react-router-dom";

import { AppShell } from "@/components/shell/AppShell";
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
import { LoginPage } from "@/features/auth/LoginPage";
import { OnboardingPage } from "@/features/auth/OnboardingPage";
import { EmployerDashboardPage } from "@/features/dashboard/EmployerDashboardPage";
import { SeekerDashboardPage } from "@/features/dashboard/SeekerDashboardPage";
import { InterviewsPage } from "@/features/interviews/InterviewsPage";
import { NotificationsPage } from "@/features/notifications/NotificationsPage";
import { ProfilePage } from "@/features/profile/ProfilePage";
import { PublicHomePage } from "@/features/public/PublicHomePage";
import { ApplyPage } from "@/features/vacancies/ApplyPage";
import { EmployerVacanciesPage } from "@/features/vacancies/EmployerVacanciesPage";
import { EmployerVacancyDetailPage } from "@/features/vacancies/EmployerVacancyDetailPage";
import { VacancyDetailPage } from "@/features/vacancies/VacancyDetailPage";
import { VacancyListPage } from "@/features/vacancies/VacancyListPage";
import { ProtectedRoute } from "@/routing/guards";

const router = createBrowserRouter(
  [
    { path: "/", element: <PublicHomePage /> },
    { path: "/ai-search", element: <AiSearchPage /> },
    { path: "/ai-search/:chatId", element: <AiSearchPage /> },
    { path: "/login/*", element: <LoginPage /> },
    {
      path: "/onboarding",
      element: (
        <ProtectedRoute allowUnassignedRole>
          <OnboardingPage />
        </ProtectedRoute>
      ),
    },
    {
      element: (
        <ProtectedRoute roles={["seeker", "admin"]}>
          <AppShell role="seeker" />
        </ProtectedRoute>
      ),
      children: [
        { path: "/dashboard", element: <SeekerDashboardPage /> },
        { path: "/dashboard/ai-search", element: <AiSearchPage dashboard /> },
        { path: "/dashboard/ai-search/:chatId", element: <AiSearchPage dashboard /> },
        { path: "/vacancies", element: <VacancyListPage /> },
        { path: "/vacancies/:id", element: <VacancyDetailPage /> },
        { path: "/vacancies/:id/apply", element: <ApplyPage /> },
        { path: "/applications", element: <ApplicationsPage /> },
        { path: "/profile", element: <ProfilePage /> },
        { path: "/notifications", element: <NotificationsPage /> },
      ],
    },
    {
      element: (
        <ProtectedRoute roles={["employer", "admin"]}>
          <AppShell role="employer" />
        </ProtectedRoute>
      ),
      children: [
        { path: "/employer/dashboard", element: <EmployerDashboardPage /> },
        { path: "/employer/vacancies", element: <EmployerVacanciesPage /> },
        { path: "/employer/vacancies/:id", element: <EmployerVacancyDetailPage /> },
        { path: "/employer/applications", element: <EmployerApplicationsPage /> },
        { path: "/employer/applications/:id", element: <EmployerApplicationReviewPage /> },
        { path: "/employer/interviews", element: <InterviewsPage /> },
        { path: "/employer/notifications", element: <NotificationsPage /> },
      ],
    },
    {
      element: (
        <ProtectedRoute roles={["admin"]}>
          <AppShell role="admin" />
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
    { path: "/jobs", element: <Navigate to="/vacancies" replace /> },
    { path: "/jobs/:id", element: <LegacyJobRedirect /> },
    { path: "/app/seeker", element: <Navigate to="/dashboard" replace /> },
    { path: "/app/seeker/ai-search", element: <Navigate to="/dashboard/ai-search" replace /> },
    { path: "/app/seeker/jobs", element: <Navigate to="/vacancies" replace /> },
    { path: "/app/seeker/applications", element: <Navigate to="/applications" replace /> },
    { path: "/app/seeker/profile", element: <Navigate to="/profile" replace /> },
    { path: "/app/seeker/notifications", element: <Navigate to="/notifications" replace /> },
    { path: "/app/employer", element: <Navigate to="/employer/dashboard" replace /> },
    { path: "/app/employer/vacancies", element: <Navigate to="/employer/vacancies" replace /> },
    { path: "/app/employer/applicants", element: <Navigate to="/employer/applications" replace /> },
    { path: "/app/employer/notifications", element: <Navigate to="/employer/notifications" replace /> },
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

function LegacyJobRedirect() {
  const { id } = useParams();
  return <Navigate to={`/vacancies/${id}`} replace />;
}
