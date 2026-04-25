import type { Locale } from "@/lib/i18n";
import { ALLOWED_TRANSITIONS, type ApplicationStatus } from "@/lib/status";
import type { VacancySource } from "@/types/domain";

export type StatusTone = "default" | "success" | "warning" | "danger" | "muted" | "info";

type StatusMeta = {
  label: string;
  tone: StatusTone;
  description?: string;
};

export type ApplicationTimelineStepState = "done" | "current" | "upcoming" | "terminal";

export type ApplicationTimelineStep = {
  status: ApplicationStatus;
  label: string;
  tone: StatusTone;
  state: ApplicationTimelineStepState;
};

const statusMeta = {
  submitted: {
    tone: "muted",
    ru: "Отправлено",
    kk: "Жіберілді",
  },
  reviewing: {
    tone: "warning",
    ru: "На рассмотрении",
    kk: "Қаралып жатыр",
  },
  shortlisted: {
    tone: "info",
    ru: "Шорт-лист",
    kk: "Қысқа тізім",
  },
  interview: {
    tone: "info",
    ru: "Интервью",
    kk: "Сұхбат",
  },
  offer_sent: {
    tone: "success",
    ru: "Оффер",
    kk: "Ұсыныс",
  },
  hired: {
    tone: "success",
    ru: "Принят",
    kk: "Қабылданды",
  },
  rejected: {
    tone: "danger",
    ru: "Отказ",
    kk: "Бас тартылды",
  },
  withdrawn: {
    tone: "muted",
    ru: "Отозван",
    kk: "Кері алынды",
  },
  draft: {
    tone: "muted",
    ru: "Черновик",
    kk: "Жоба",
  },
  published: {
    tone: "success",
    ru: "Опубликовано",
    kk: "Жарияланған",
  },
  paused: {
    tone: "warning",
    ru: "На паузе",
    kk: "Кідірісте",
  },
  archived: {
    tone: "danger",
    ru: "В архиве",
    kk: "Архивте",
  },
  queued: {
    tone: "warning",
    ru: "В очереди",
    kk: "Кезекте",
  },
  sent: {
    tone: "success",
    ru: "Отправлено",
    kk: "Жіберілді",
  },
  failed: {
    tone: "danger",
    ru: "Ошибка",
    kk: "Қате",
  },
  skipped: {
    tone: "muted",
    ru: "Без Telegram",
    kk: "Telegram жоқ",
  },
  scheduled: {
    tone: "info",
    ru: "Назначено",
    kk: "Белгіленді",
  },
  completed: {
    tone: "success",
    ru: "Завершено",
    kk: "Аяқталды",
  },
  cancelled: {
    tone: "danger",
    ru: "Отменено",
    kk: "Болдырылмады",
  },
  read: {
    tone: "muted",
    ru: "Прочитано",
    kk: "Оқылды",
  },
  unread: {
    tone: "default",
    ru: "Новое",
    kk: "Жаңа",
  },
} satisfies Record<string, { tone: StatusTone; ru: string; kk: string }>;

export function getStatusMeta(status: string, locale: Locale = "ru"): StatusMeta {
  const meta = statusMeta[status as keyof typeof statusMeta];
  if (!meta) {
    return { label: status, tone: "muted" };
  }
  return {
    label: meta[locale],
    tone: meta.tone,
  };
}

const sourceMeta = {
  native: {
    ru: {
      label: "JumysAI",
      fullLabel: "Вакансия JumysAI",
      helper: "Отклик внутри сервиса",
      actionHint: "Отклик и статус будут в JumysAI.",
    },
    kk: {
      label: "JumysAI",
      fullLabel: "JumysAI вакансиясы",
      helper: "Өтініш сервис ішінде",
      actionHint: "Өтініш пен мәртебе JumysAI ішінде болады.",
    },
  },
  hh: {
    ru: {
      label: "HH.kz",
      fullLabel: "Внешняя вакансия HH.kz",
      helper: "Отклик на внешнем сайте",
      actionHint: "Отклик продолжится на сайте HH.kz.",
    },
    kk: {
      label: "HH.kz",
      fullLabel: "HH.kz сыртқы вакансиясы",
      helper: "Өтініш сыртқы сайтта",
      actionHint: "Өтініш HH.kz сайтында жалғасады.",
    },
  },
} satisfies Record<
  VacancySource,
  Record<Locale, { label: string; fullLabel: string; helper: string; actionHint: string }>
>;

export function getSourceMeta(source: VacancySource, locale: Locale = "ru") {
  return sourceMeta[source][locale];
}

const primaryApplicationFlow: ApplicationStatus[] = [
  "submitted",
  "reviewing",
  "shortlisted",
  "interview",
  "offer_sent",
];

const terminalApplicationStatuses = new Set<ApplicationStatus>([
  "hired",
  "rejected",
  "withdrawn",
]);

export function getApplicationTimeline(status: ApplicationStatus, locale: Locale = "ru") {
  const isTerminal = terminalApplicationStatuses.has(status);
  const flow = isTerminal ? [...primaryApplicationFlow, status] : primaryApplicationFlow;
  const currentIndex = flow.indexOf(status);
  const safeCurrentIndex = currentIndex >= 0 ? currentIndex : 0;

  const steps: ApplicationTimelineStep[] = flow.map((stepStatus, index) => {
    const meta = getStatusMeta(stepStatus, locale);
    const state: ApplicationTimelineStepState =
      isTerminal && stepStatus === status
        ? "terminal"
        : index < safeCurrentIndex
          ? "done"
          : index === safeCurrentIndex
            ? "current"
            : "upcoming";
    return {
      status: stepStatus,
      label: meta.label,
      tone: meta.tone,
      state,
    };
  });

  const current =
    steps.find((step) => step.status === status) ??
    ({
      status,
      ...getStatusMeta(status, locale),
      state: isTerminal ? "terminal" : "current",
    } satisfies ApplicationTimelineStep);

  return {
    steps,
    current,
    isTerminal,
    nextActions: ALLOWED_TRANSITIONS[status].map((nextStatus) => ({
      status: nextStatus,
      ...getStatusMeta(nextStatus, locale),
    })),
  };
}
