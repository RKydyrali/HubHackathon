import type { Doc } from "../_generated/dataModel";
import type { NotificationType } from "./constants";

/** Mirrors `web/src/lib/product-experience.ts` defaults. */
export type MergedNotificationPreferences = {
  inApp: boolean;
  telegram: boolean;
  newApplications: boolean;
  statusChanges: boolean;
  interviews: boolean;
  aiRecommendations: boolean;
};

export const DEFAULT_NOTIFICATION_PREFERENCES: MergedNotificationPreferences = {
  inApp: true,
  telegram: true,
  newApplications: true,
  statusChanges: true,
  interviews: true,
  aiRecommendations: true,
};

export function mergeNotificationPreferences(
  stored?: Partial<MergedNotificationPreferences> | null,
): MergedNotificationPreferences {
  return { ...DEFAULT_NOTIFICATION_PREFERENCES, ...stored };
}

function perTypeAllowsTelegram(
  type: NotificationType,
  prefs: MergedNotificationPreferences,
): boolean {
  switch (type) {
    case "new_application":
      return prefs.newApplications;
    case "status_change":
      return prefs.statusChanges;
    case "strong_match":
      return prefs.aiRecommendations;
    case "interview_update":
      return prefs.interviews;
    case "custom":
      return true;
  }
}

export function shouldAttemptTelegramDelivery(
  user: Pick<Doc<"users">, "telegramChatId" | "notificationPreferences">,
  type: NotificationType,
): boolean {
  if (!user.telegramChatId?.trim()) {
    return false;
  }
  const prefs = mergeNotificationPreferences(user.notificationPreferences);
  if (!prefs.telegram) {
    return false;
  }
  return perTypeAllowsTelegram(type, prefs);
}
