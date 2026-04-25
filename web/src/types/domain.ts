import type { Doc, Id } from "@/lib/convex-api";
import type { ApplicationStatus } from "@/lib/status";

export type UserRole = "seeker" | "employer" | "admin";
export type VacancySource = "native" | "hh";
export type VacancyStatus = "draft" | "published" | "paused" | "archived";

export type Vacancy = Doc<"vacancies">;
export type Profile = Doc<"profiles">;
export type Application = Doc<"applications"> & { status: ApplicationStatus };
export type Interview = Doc<"interviews">;
export type Notification = Doc<"notifications">;

export type CompanyTrust = {
  score: number | null;
  badgeText: string;
  tone: "success" | "warning" | "muted";
  responseRate: number | null;
  averageResponseTime: number | null;
  hiresCount: number;
  complaintsCount: number;
  dataSufficiency: "external" | "none" | "low" | "sufficient";
};

export type ApplicationWithVacancy = {
  application: Application;
  vacancy: Vacancy | null;
};

export type ApplicantWithProfile = ApplicationWithVacancy & {
  profile: Profile | null;
};

export type VacancyWithApplicantCount = {
  vacancy: Vacancy;
  applicantCount: number;
};

export type VacancyId = Id<"vacancies">;
export type ApplicationId = Id<"applications">;
