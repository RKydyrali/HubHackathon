export type SalaryInput = {
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string | null;
};

const KZ_TIME_ZONE = "Asia/Aqtau";
const KZ_DATE_LOCALE = "en-KZ";

function formatKztAmount(value: number) {
  return new Intl.NumberFormat("ru-KZ", {
    maximumFractionDigits: 0,
  })
    .format(value)
    .replace(/\u00A0/g, " ");
}

export function formatSalary(salary: SalaryInput, locale: "ru" | "kk" = "ru") {
  const currency = salary.salaryCurrency ?? "KZT";

  if (salary.salaryMin && salary.salaryMax) {
    return `${formatKztAmount(salary.salaryMin)}-${formatKztAmount(salary.salaryMax)} ${currency}`;
  }

  if (salary.salaryMin) {
    return `${locale === "kk" ? "бастап" : "от"} ${formatKztAmount(salary.salaryMin)} ${currency}`;
  }

  if (salary.salaryMax) {
    return `${locale === "kk" ? "дейін" : "до"} ${formatKztAmount(salary.salaryMax)} ${currency}`;
  }

  return locale === "kk" ? "Жалақы келісім бойынша" : "Зарплата по договоренности";
}

/** Table/list cells: return null when there is no numeric salary to show a muted dash instead. */
export function formatSalaryForTableCell(
  salary: SalaryInput,
  locale: "ru" | "kk" = "ru",
): string | null {
  if (salary.salaryMin == null && salary.salaryMax == null) {
    return null;
  }
  return formatSalary(salary, locale);
}

export function formatRelativeTime(timestamp: number) {
  const diffMs = timestamp - Date.now();
  const absMs = Math.abs(diffMs);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (absMs < hour) return rtf.format(Math.round(diffMs / minute), "minute");
  if (absMs < day) return rtf.format(Math.round(diffMs / hour), "hour");
  if (absMs < 7 * day) return rtf.format(Math.round(diffMs / day), "day");

  return formatAbsoluteDate(timestamp);
}

export function formatAbsoluteDate(timestamp: number) {
  return new Intl.DateTimeFormat(KZ_DATE_LOCALE, {
    timeZone: KZ_TIME_ZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

export const EMPTY_STATES = {
  vacancies: "No matching vacancies yet",
  applications: "No applications yet",
  interviews: "No interviews scheduled",
  notifications: "No notifications yet",
  users: "No users found",
} as const;

export function statusLabel(status: string) {
  const labels: Record<string, string> = {
    draft: "Draft",
    published: "Published",
    paused: "Paused",
    archived: "Archived",
    submitted: "Submitted",
    reviewing: "Reviewing",
    shortlisted: "Shortlisted",
    interview: "Interview",
    offer_sent: "Offer sent",
    rejected: "Rejected",
    hired: "Hired",
    withdrawn: "Withdrawn",
    queued: "Queued",
    sent: "Sent",
    failed: "Failed",
    skipped: "Skipped",
    scheduled: "Scheduled",
    completed: "Completed",
    cancelled: "Cancelled",
  };
  return labels[status] ?? status;
}
