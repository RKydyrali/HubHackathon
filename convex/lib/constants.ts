export const DEFAULT_CITY = "Aktau";
export const DEFAULT_MATCH_LIMIT = 10;
export const MATCH_NOTIFICATION_THRESHOLD = 85;
export const EMBEDDING_DIMENSION = 1536;

export const USER_ROLES = ["seeker", "employer", "admin"] as const;
export const VACANCY_SOURCES = ["native", "hh"] as const;
export const VACANCY_STATUSES = ["draft", "published", "paused", "archived"] as const;
export const APPLICATION_STATUSES = [
  "submitted",
  "reviewing",
  "shortlisted",
  "interview",
  "offer_sent",
  "rejected",
  "hired",
  "withdrawn",
] as const;
export const NOTIFICATION_DELIVERY_STATUSES = [
  "queued",
  "sent",
  "failed",
  "skipped",
] as const;
export const NOTIFICATION_TYPES = [
  "new_application",
  "status_change",
  "strong_match",
  "interview_update",
  "custom",
] as const;
export const INTERVIEW_STATUSES = [
  "scheduled",
  "completed",
  "cancelled",
] as const;

export type UserRole = (typeof USER_ROLES)[number];
export type VacancySource = (typeof VACANCY_SOURCES)[number];
export type VacancyStatus = (typeof VACANCY_STATUSES)[number];
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];
export type NotificationDeliveryStatus =
  (typeof NOTIFICATION_DELIVERY_STATUSES)[number];
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
export type InterviewStatus = (typeof INTERVIEW_STATUSES)[number];

/** Mock interview: production limits (see convex/lib/mockInterviewHardening.ts). */
export const MOCK_INTERVIEW_MAX_USER_MESSAGE_CHARS = 8000;
export const MOCK_INTERVIEW_MAX_MESSAGES_PER_SESSION = 100;
export const MOCK_INTERVIEW_MAX_DEBRIEF_TRANSCRIPT_CHARS = 28000;
export const MOCK_INTERVIEW_MIN_USER_MESSAGES_TO_FINALIZE = 1;
