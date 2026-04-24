import type { Locale } from "@/lib/i18n";
import type { VacancySource } from "@/types/domain";

export type StatusTone = "default" | "success" | "warning" | "danger" | "muted" | "info";

type StatusMeta = {
  label: string;
  tone: StatusTone;
  description?: string;
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
  interview: {
    tone: "info",
    ru: "Интервью",
    kk: "Сұхбат",
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
      helper: "Отклик внутри сервиса",
    },
    kk: {
      label: "JumysAI",
      helper: "Өтініш сервис ішінде",
    },
  },
  hh: {
    ru: {
      label: "HH.kz",
      helper: "Отклик на внешнем сайте",
    },
    kk: {
      label: "HH.kz",
      helper: "Өтініш сыртқы сайтта",
    },
  },
} satisfies Record<VacancySource, Record<Locale, { label: string; helper: string }>>;

export function getSourceMeta(source: VacancySource, locale: Locale = "ru") {
  return sourceMeta[source][locale];
}
