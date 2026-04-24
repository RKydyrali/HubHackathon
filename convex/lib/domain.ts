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
  submitted: ["reviewing"],
  reviewing: ["interview", "rejected"],
  interview: ["hired", "rejected"],
  rejected: [],
  hired: [],
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
    throw new Error(`Invalid application transition: ${from} -> ${to}`);
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

export function isVisibleVacancy(status: VacancyStatus): boolean {
  return status === "published";
}

export function isSelectableOnboardingRole(role: string): boolean {
  return role === "seeker" || role === "employer";
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
