import { getCopy, type Locale } from "@/lib/i18n";
import type { UserRole } from "@/types/domain";

export type NotificationPreferences = {
  inApp: boolean;
  telegram: boolean;
  newApplications: boolean;
  statusChanges: boolean;
  interviews: boolean;
  aiRecommendations: boolean;
};

export type CommandSearchGroupKind = "vacancies" | "applications" | "applicants" | "users";

export type CommandSearchGroup = {
  kind: CommandSearchGroupKind;
  label: string;
};

export type ProductFlowStep = {
  title: string;
  body: string;
  href: string;
};

export type EmployerFirstRunAction = {
  kind: "manual" | "ai";
  title: string;
  body: string;
  href: string;
};

type NotificationType =
  | "new_application"
  | "status_change"
  | "strong_match"
  | "interview_update"
  | "custom";

type NotificationActionInput = {
  type: NotificationType;
  dedupeKey: string;
  action?: {
    labelKey: string;
    href: string;
  };
  payload?: {
    applicationId?: string;
    vacancyId?: string;
    interviewId?: string;
  };
};

type NotificationActionLabelKey =
  | "openApplication"
  | "openApplications"
  | "openApplicationStatus"
  | "openMatch"
  | "openInterview";

export type NotificationAction = {
  label: string;
  href: string;
};

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  inApp: true,
  telegram: true,
  newApplications: true,
  statusChanges: true,
  interviews: true,
  aiRecommendations: true,
};

export const FIRST_TIME_HINT_IDS = {
  seekerProfileStart: "seeker.profile.start",
  seekerApplicationsEmpty: "seeker.applications.empty",
  seekerAiFirst: "seeker.ai.first",
  employerVacanciesEmpty: "employer.vacancies.empty",
  employerApplicantsFirst: "employer.applicants.first",
  adminOverviewFirst: "admin.overview.first",
} as const;

export type FirstTimeHintId = (typeof FIRST_TIME_HINT_IDS)[keyof typeof FIRST_TIME_HINT_IDS];

export function mergeNotificationPreferences(
  preferences?: Partial<NotificationPreferences> | null,
): NotificationPreferences {
  return {
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    ...(preferences ?? {}),
  };
}

export function getCommandSearchGroupsForRole(role: UserRole, locale: Locale = "ru"): CommandSearchGroup[] {
  const labels = getCopy(locale).commandSearch.groups;
  switch (role) {
    case "employer":
      return [
        { kind: "vacancies", label: labels.vacancies },
        { kind: "applicants", label: labels.applicants },
      ];
    case "admin":
      return [
        { kind: "users", label: labels.users },
        { kind: "vacancies", label: labels.vacancies },
        { kind: "applications", label: labels.applications },
      ];
    default:
      return [
        { kind: "vacancies", label: labels.vacancies },
        { kind: "applications", label: labels.applications },
      ];
  }
}

export function shouldShowOnboardingHint({
  hintId,
  hasRelevantData,
  dismissedHints,
}: {
  hintId: string;
  hasRelevantData: boolean;
  dismissedHints?: Record<string, number> | null;
}) {
  if (hasRelevantData) return false;
  return !dismissedHints?.[hintId];
}

export function getSeekerFirstRunSteps(locale: Locale = "ru"): ProductFlowStep[] {
  if (locale === "kk") {
    return [
      {
        title: "Профильді толықтырыңыз",
        body: "Дағды, қала және қысқа резюме сәйкестікті нақтырақ етеді.",
        href: "/profile",
      },
      {
        title: "Сәйкестіктерді ашыңыз",
        body: "Профиль бойынша ұсыныстарды қарап, JumysAI және HH.kz көздерін салыстырыңыз.",
        href: "/for-you",
      },
      {
        title: "Өтініш жіберіңіз",
        body: "JumysAI вакансиясына өтініш іште жіберіледі, HH.kz сыртқы сайтта ашылады.",
        href: "/vacancies",
      },
      {
        title: "Сұхбатқа дайындалыңыз",
        body: "Тренажер мен мок-сұхбат жауапты алдын ала пысықтауға көмектеседі.",
        href: "/interview-trainer",
      },
    ];
  }

  return [
    {
      title: "Заполните профиль",
      body: "Навыки, город и короткое резюме делают совпадения точнее.",
      href: "/profile",
    },
    {
      title: "Откройте совпадения",
      body: "Посмотрите рекомендации по профилю и сравните источники JumysAI и HH.kz.",
      href: "/for-you",
    },
    {
      title: "Откликнитесь",
      body: "В JumysAI отклик останется внутри сервиса, HH.kz откроется на внешнем сайте.",
      href: "/vacancies",
    },
    {
      title: "Подготовьтесь к интервью",
      body: "Тренажёр и мок-интервью помогут отрепетировать ответы до разговора.",
      href: "/interview-trainer",
    },
  ];
}

export function getEmployerFirstRunActions(locale: Locale = "ru"): EmployerFirstRunAction[] {
  if (locale === "kk") {
    return [
      {
        kind: "manual",
        title: "Қолмен құру",
        body: "Дайын деректеріңіз болса, вакансияны редактор арқылы ашыңыз.",
        href: "/employer/vacancies?mode=manual",
      },
      {
        kind: "ai",
        title: "AI көмегімен құру",
        body: "Рөл, аудан, жалақы және талапты қарапайым мәтінмен жазыңыз.",
        href: "/employer/vacancies?mode=ai",
      },
    ];
  }

  return [
    {
      kind: "manual",
      title: "Создать вручную",
      body: "Если описание уже готово, откройте редактор вакансии.",
      href: "/employer/vacancies?mode=manual",
    },
    {
      kind: "ai",
      title: "Создать с AI",
      body: "Опишите роль, район, зарплату и требования обычным текстом.",
      href: "/employer/vacancies?mode=ai",
    },
  ];
}

function getNotificationEntityId(dedupeKey: string): string | null {
  const [, , entityId] = dedupeKey.split(":");
  return entityId || null;
}

export function getNotificationAction(
  notification: NotificationActionInput,
  role: UserRole,
  locale: Locale = "ru",
): NotificationAction | null {
  const labels = getCopy(locale).notificationActions;
  if (notification.action && isSafeAppHref(notification.action.href)) {
    return {
      label: resolveNotificationActionLabel(notification.action.labelKey, labels),
      href: notification.action.href,
    };
  }

  switch (notification.type) {
    case "new_application": {
      const applicationId = notification.payload?.applicationId ?? getNotificationEntityId(notification.dedupeKey);
      if (!applicationId) return null;
      return {
        label: role === "employer" ? labels.openApplication : labels.openApplications,
        href: role === "employer" ? `/employer/applications/${applicationId}` : `/applications?applicationId=${applicationId}`,
      };
    }
    case "status_change": {
      const applicationId = notification.payload?.applicationId ?? getNotificationEntityId(notification.dedupeKey);
      if (!applicationId) return null;
      return {
        label: labels.openApplicationStatus,
        href: role === "employer" ? `/employer/applications/${applicationId}` : `/applications?applicationId=${applicationId}`,
      };
    }
    case "strong_match": {
      const vacancyId = notification.payload?.vacancyId ?? getNotificationEntityId(notification.dedupeKey);
      if (!vacancyId) return null;
      return {
        label: labels.openMatch,
        href: role === "employer" ? `/employer/vacancies/${vacancyId}` : `/for-you?vacancyId=${vacancyId}`,
      };
    }
    case "interview_update": {
      const interviewId = notification.payload?.interviewId ?? getNotificationEntityId(notification.dedupeKey);
      if (!interviewId) return null;
      return {
        label: labels.openInterview,
        href: role === "employer" ? `/employer/interviews?interviewId=${interviewId}` : `/interviews?interviewId=${interviewId}`,
      };
    }
    default:
      return null;
  }
}

function isSafeAppHref(href: string) {
  return href.startsWith("/") && !href.startsWith("//");
}

function resolveNotificationActionLabel(
  labelKey: string,
  labels: Record<NotificationActionLabelKey, string>,
) {
  return labelKey in labels
    ? labels[labelKey as NotificationActionLabelKey]
    : labels.openApplication;
}
