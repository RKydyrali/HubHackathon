import type { ApplicationStatus } from "./constants";

const STATUS_RU: Record<ApplicationStatus, string> = {
  submitted: "Отправлено",
  reviewing: "На рассмотрении",
  shortlisted: "В шорт-листе",
  interview: "Собеседование",
  offer_sent: "Предложение о работе",
  rejected: "Отклонено",
  hired: "Принят(а)",
  withdrawn: "Отозвано",
};

export function ruNewApplicationTitle(): string {
  return "Новый отклик";
}

export function ruNewApplicationBody(vacancyTitle: string): string {
  return `Поступил новый отклик на вакансию «${vacancyTitle}».`;
}

export function ruStatusChangeTitle(): string {
  return "Статус отклика обновлён";
}

export function ruStatusChangeBody(status: ApplicationStatus): string {
  return `Ваш отклик переведён в статус: «${STATUS_RU[status]}».`;
}

export function ruStrongMatchVacancyTitle(): string {
  return "Сильное совпадение";
}

export function ruStrongMatchVacancyBody(
  title: string,
  city: string,
  score: number,
): string {
  return `Вакансия «${title}» (${city}) — ${score}% совпадение с вашим профилем.`;
}

export function ruStrongMatchSeekerForEmployerTitle(): string {
  return "Подходящий кандидат";
}

export function ruStrongMatchSeekerForEmployerBody(
  fullName: string,
  title: string,
  score: number,
): string {
  return `«${fullName}» — ${score}% совпадение с вакансией «${title}».`;
}

export function ruInterviewScheduledTitle(): string {
  return "Собеседование назначено";
}

export function ruInterviewScheduledBody(
  vacancyTitle: string,
  when: string,
  locationOrLink?: string,
): string {
  let s = `Вакансия «${vacancyTitle}».\nДата и время: ${when}`;
  if (locationOrLink?.trim()) {
    s += `\nСсылка или место: ${locationOrLink.trim()}`;
  }
  return s;
}

export function ruInterviewCompletedTitle(): string {
  return "Собеседование завершено";
}

export function ruInterviewCompletedBody(vacancyTitle: string): string {
  return `Собеседование по вакансии «${vacancyTitle}» отмечено как завершённое.`;
}

export function ruInterviewCancelledTitle(): string {
  return "Собеседование отменено";
}

export function ruInterviewCancelledBody(vacancyTitle: string): string {
  return `Собеседование по вакансии «${vacancyTitle}» отменено работодателем.`;
}

export function formatRuDateTimeAqtau(ts: number): string {
  return new Date(ts).toLocaleString("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Aqtau",
  });
}
