import {
  type GeneratedVacancyFields,
  NATIVE_CITY_DEFAULT,
  vacancySchema,
  type VacancyFormValues,
} from "./vacancyFormModel";

export type DraftKey =
  | "role"
  | "location"
  | "schedule"
  | "salary"
  | "experience"
  | "responsibilities";

export const DRAFT_KEY_ORDER: DraftKey[] = [
  "role",
  "location",
  "schedule",
  "salary",
  "experience",
  "responsibilities",
];

export function emptyDraft(): Record<DraftKey, string> {
  return {
    role: "",
    location: "",
    schedule: "",
    salary: "",
    experience: "",
    responsibilities: "",
  };
}

const VAGUE_RU_KK_RESP = /^(?:работать|работа|труд(?:иться)?|заниматься|вс[ёе]|дела|и\s+вс[ёе]|помогать|быть|о(?:к|кей)?|хз|незнаю|не\s*знаю(?:\s+чут[ья]\s*чут[ья])?)(?:[.!?…\-–]*)?$/iu;

function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

function isVagueResponsibilities(t: string): boolean {
  const oneLine = t.replace(/\s+/g, " ").trim();
  if (oneLine.length < 1) return true;
  if (VAGUE_RU_KK_RESP.test(oneLine)) return true;
  const wc = wordCount(oneLine);
  if (wc < 2) return true;
  if (oneLine.length < 16) return true;
  if (wc < 3 && oneLine.length < 18) return true;
  return false;
}

function isDraftFieldFilled(key: DraftKey, value: string): boolean {
  const t = value.trim();
  if (key === "salary") {
    return t.length > 0 && (/\d/.test(t) || t.length >= 2);
  }
  if (key === "responsibilities") {
    return !isVagueResponsibilities(t);
  }
  return t.length >= 2;
}

export function getFilledDraftKeys(draft: Record<DraftKey, string>): DraftKey[] {
  return DRAFT_KEY_ORDER.filter((k) => isDraftFieldFilled(k, draft[k] ?? ""));
}

export function getMissingDraftKeys(draft: Record<DraftKey, string>): DraftKey[] {
  return DRAFT_KEY_ORDER.filter((k) => !isDraftFieldFilled(k, draft[k] ?? ""));
}

function mapLabelToKey(head: string, locale: "ru" | "kk"): DraftKey | null {
  const h = head.toLowerCase();
  if (/рол|рөлі|должност|сотруд|қызмет|kім|ищу|нужен|нужн|нужна/i.test(h)) {
    return "role";
  }
  if (
    /район|аудан|орын|орны|локац|lока|city|mикр|мкр|микр|актау|ақтау/i.test(h)
  ) {
    return "location";
  }
  if (/график|кесте|смен|schedule|кешкі|вечер|full/i.test(h)) {
    return "schedule";
  }
  if (/\d|зарплат|жалақы|salary|₸|kzt|тенге|тыс|тыс\./i.test(h)) {
    return "salary";
  }
  if (/опыт|тəж|тәж|experience|junior|middle|senior/i.test(h)) {
    return "experience";
  }
  if (
    /обязанност|требован|міндет|жауап|respons|задач|duty|duties/i.test(
      h,
    ) ||
    (locale === "ru" && /требован/i.test(h)) ||
    (locale === "kk" && /талап/i.test(h))
  ) {
    return "responsibilities";
  }
  return null;
}

/** Merge user message into draft using "Label: value" lines and heuristics. */
export function mergeUserMessageIntoDraft(
  message: string,
  draft: Record<DraftKey, string>,
  locale: "ru" | "kk",
): { next: Record<DraftKey, string>; filledThisTurn: DraftKey[] } {
  const before = new Set(getFilledDraftKeys(draft));
  const next: Record<DraftKey, string> = { ...draft };
  const loose: string[] = [];

  for (const line of message.split(/\n+/)) {
    const t = line.trim();
    if (!t) continue;
    const m = t.match(/^([^:：]{1,48})[:：]\s*([\s\S]+)$/u);
    if (m) {
      const k = mapLabelToKey(m[1]!.trim(), locale);
      if (k) {
        next[k] = [next[k].trim(), m[2]!.trim()].filter(Boolean).join(" ").trim();
        continue;
      }
    }
    loose.push(t);
  }

  if (loose.length) {
    const blob = loose.join("\n");
    if (blob) {
      const miss = getMissingDraftKeys(next);
      const target: DraftKey = !next.role.trim() ? "role" : miss[0] ?? "responsibilities";
      next[target] = [next[target].trim(), blob].filter(Boolean).join("\n\n").trim();
    }
  }

  const after = new Set(getFilledDraftKeys(next));
  const filledThisTurn = DRAFT_KEY_ORDER.filter(
    (k) => !before.has(k) && after.has(k),
  );
  return { next, filledThisTurn };
}

export function buildCreateRawText(
  draft: Record<DraftKey, string>,
  locale: "ru" | "kk",
): string {
  if (locale === "kk") {
    const parts: string[] = [];
    if (draft.role.trim()) parts.push(`Рөлі: ${draft.role.trim()}`);
    if (draft.location.trim()) parts.push(`Аудан / орны: ${draft.location.trim()}`);
    if (draft.schedule.trim()) parts.push(`Кесте: ${draft.schedule.trim()}`);
    if (draft.salary.trim()) parts.push(`Жалақы: ${draft.salary.trim()}`);
    if (draft.experience.trim()) parts.push(`Тәжірибе: ${draft.experience.trim()}`);
    if (draft.responsibilities.trim()) parts.push(`Міндеттер: ${draft.responsibilities.trim()}`);
    return parts.join("\n\n");
  }
  const parts: string[] = [];
  if (draft.role.trim()) parts.push(`Роль: ${draft.role.trim()}`);
  if (draft.location.trim()) parts.push(`Район / локация: ${draft.location.trim()}`);
  if (draft.schedule.trim()) parts.push(`График: ${draft.schedule.trim()}`);
  if (draft.salary.trim()) parts.push(`Зарплата: ${draft.salary.trim()}`);
  if (draft.experience.trim()) parts.push(`Опыт: ${draft.experience.trim()}`);
  if (draft.responsibilities.trim()) parts.push(`Обязанности: ${draft.responsibilities.trim()}`);
  return parts.join("\n\n");
}

export function buildStructuredDescriptionFallback(
  draft: Record<DraftKey, string>,
  locale: "ru" | "kk",
): string {
  return buildCreateRawText(draft, locale).trim();
}

export function reconcileDraftWithGenerated(
  draft: Record<DraftKey, string>,
  g: GeneratedVacancyFields,
): Record<DraftKey, string> {
  const next = { ...draft };
  if (!next.role.trim() && g.title?.trim()) {
    next.role = g.title.trim();
  }
  if (!next.salary.trim() && (g.salaryMin != null || g.salaryMax != null)) {
    const a = g.salaryMin != null ? String(g.salaryMin) : "";
    const b = g.salaryMax != null ? String(g.salaryMax) : "";
    if (a || b) next.salary = a && b ? `от ${a} до ${b} KZT` : a || b;
  }
  if (!next.location.trim() && g.city?.trim() && g.city !== NATIVE_CITY_DEFAULT) {
    next.location = g.city.trim();
  }
  return next;
}

export function buildSubmitCandidate(
  draft: Record<DraftKey, string>,
  lastValid: GeneratedVacancyFields | null,
  locale: "ru" | "kk",
):
  | { ok: true; values: VacancyFormValues; source: "ai" | "structured" }
  | { ok: false; error: string } {
  const district = draft.location.trim() || undefined;
  if (lastValid?.title?.trim() && (lastValid.description?.trim().length ?? 0) >= 10) {
    const parsed = vacancySchema.safeParse({
      title: lastValid.title,
      description: lastValid.description,
      district,
      salaryMin: lastValid.salaryMin ?? undefined,
      salaryMax: lastValid.salaryMax ?? undefined,
      screeningQuestionsText: "",
    });
    if (parsed.success) {
      return { ok: true, values: parsed.data, source: "ai" };
    }
  }
  const title = (lastValid?.title?.trim() || draft.role.trim() || "").slice(0, 200);
  let fromDraft = buildStructuredDescriptionFallback(draft, locale);
  if (fromDraft.length < 10) {
    fromDraft = [fromDraft, `Город: ${NATIVE_CITY_DEFAULT}.`].filter(Boolean).join("\n");
  }
  if (fromDraft.length < 10) {
    fromDraft = `${fromDraft}\n${locale === "kk" ? "Сипаттама нақтылауға болады." : "Описание можно уточнить в карточке."}`.trim();
  }
  const description = (fromDraft.length >= 10
    ? fromDraft
    : [lastValid?.description?.trim(), fromDraft].filter(Boolean).join("\n\n").trim()) || title;
  const parsed2 = vacancySchema.safeParse({
    title: title.length >= 2 ? title : locale === "kk" ? "Хабарландыру" : "Вакансия",
    description: description.length >= 10 ? description : fromDraft,
    district,
    salaryMin: lastValid?.salaryMin ?? undefined,
    salaryMax: lastValid?.salaryMax ?? undefined,
    screeningQuestionsText: "",
  });
  if (parsed2.success) {
    return { ok: true, values: parsed2.data, source: "structured" };
  }
  const first = parsed2.error.issues[0]?.message ?? "validation";
  return { ok: false, error: first };
}

export function canCreateNativeDraft(
  draft: Record<DraftKey, string>,
  lastValid: GeneratedVacancyFields | null,
  locale: "ru" | "kk",
): boolean {
  return buildSubmitCandidate(draft, lastValid, locale).ok;
}

export { vacancySchema };
