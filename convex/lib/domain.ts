import { ConvexError } from "convex/values";

import {
  APPLICATION_STATUSES,
  MATCH_NOTIFICATION_THRESHOLD,
  type ApplicationStatus,
  type NotificationType,
  type VacancySource,
  type VacancyStatus,
} from "./constants";

export const allowedApplicationTransitions: Record<
  ApplicationStatus,
  ApplicationStatus[]
> = {
  submitted: ["reviewing", "withdrawn"],
  reviewing: ["shortlisted", "interview", "rejected", "withdrawn"],
  shortlisted: ["interview", "rejected", "withdrawn"],
  interview: ["offer_sent", "hired", "rejected"],
  offer_sent: ["hired", "rejected"],
  rejected: [],
  hired: [],
  withdrawn: [],
};

export function isValidApplicationTransition(
  from: ApplicationStatus,
  to: ApplicationStatus,
): boolean {
  if (!APPLICATION_STATUSES.includes(from) || !APPLICATION_STATUSES.includes(to)) {
    return false;
  }
  return allowedApplicationTransitions[from].includes(to);
}

export function assertApplicationTransition(
  from: ApplicationStatus,
  to: ApplicationStatus,
): void {
  if (!isValidApplicationTransition(from, to)) {
    throw new ConvexError(`Invalid application transition: ${from} -> ${to}`);
  }
}

export function isMutableVacancy(source: VacancySource): boolean {
  return source === "native";
}

export function canApplyToVacancy(
  source: VacancySource,
  status: VacancyStatus,
): boolean {
  return source === "native" && status === "published";
}

/** In-app apply is allowed only for published native vacancies with an employer owner. */
export function vacancyAcceptsInAppApplications(vacancy: {
  source: VacancySource;
  status: VacancyStatus;
  ownerUserId?: string | undefined;
}): boolean {
  return (
    canApplyToVacancy(vacancy.source, vacancy.status) &&
    vacancy.ownerUserId !== undefined
  );
}

export function isVisibleVacancy(status: VacancyStatus): boolean {
  return status === "published";
}

export function isSelectableOnboardingRole(role: string): boolean {
  return role === "seeker" || role === "employer";
}

const AKTau_REGION_ALIASES = new Set(["aktau", "актау", "ақтау", "aqtau"]);

/** True if `city` refers to Aktau / Актау (handles HH vs native spelling). */
export function vacancyMatchesAktauRegion(city: string): boolean {
  const key = city.trim().toLowerCase().replace(/[`']/g, "");
  return AKTau_REGION_ALIASES.has(key);
}

export function filterPublicVacancies<
  T extends {
    status: VacancyStatus;
    city: string;
    district?: string | undefined;
    source: VacancySource;
  },
>(
  vacancies: readonly T[],
  filters: {
    city?: string;
    district?: string;
    source?: VacancySource;
    limit?: number;
    region?: "aktau";
  },
): T[] {
  const limit = Math.min(filters.limit ?? 20, 50);
  return vacancies
    .filter((vacancy) => isVisibleVacancy(vacancy.status))
    .filter((vacancy) =>
      filters.region === "aktau"
        ? vacancyMatchesAktauRegion(vacancy.city)
        : filters.city
          ? vacancy.city === filters.city
          : true,
    )
    .filter((vacancy) => (filters.district ? vacancy.district === filters.district : true))
    .filter((vacancy) => (filters.source ? vacancy.source === filters.source : true))
    .slice(0, limit);
}

export function buildNotificationDedupeKey(input: {
  type: NotificationType;
  recipientUserId: string;
  entityId: string;
  secondaryId?: string;
}): string {
  const pieces = [
    input.type,
    input.recipientUserId,
    input.entityId,
    input.secondaryId ?? "base",
  ];
  return pieces.join(":");
}

export function normalizeMatchScore(rawScore: number): number {
  const normalized = Math.round(((rawScore + 1) / 2) * 100);
  return Math.max(0, Math.min(100, normalized));
}

export function isStrongMatch(matchScore: number): boolean {
  return matchScore >= MATCH_NOTIFICATION_THRESHOLD;
}
