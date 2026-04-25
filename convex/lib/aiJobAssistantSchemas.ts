import { z } from "zod";

export const aiJobCriteriaSchema = z.object({
  roles: z.array(z.string()).default([]),
  skills: z.array(z.string()).default([]),
  city: z.string().nullable().default(null),
  district: z.string().nullable().default(null),
  schedule: z.string().nullable().default(null),
  workType: z.enum(["full_time", "part_time", "temporary"]).nullable().default(null),
  experienceLevel: z.enum(["none", "junior", "experienced"]).nullable().default(null),
  salaryMin: z.number().int().nonnegative().nullable().default(null),
  urgency: z.enum(["today", "this_week", "flexible"]).nullable().default(null),
  sourcePreference: z.enum(["native", "hh", "any"]).default("any"),
});

export const aiJobAssistantExtractionSchema = z.object({
  intent: z.enum([
    "find_jobs",
    "refine_results",
    "compare_jobs",
    "ask_question",
    "unknown",
  ]),
  knownCriteria: aiJobCriteriaSchema,
  missingSignals: z.array(z.string()),
  nextQuestion: z.string().nullable(),
  shouldShowResults: z.boolean(),
  confidence: z.number().min(0).max(1),
  /** Short tap targets; server normalizes to exactly 4 when clarification is active. */
  quickReplyOptions: z.array(z.string()).max(8).default([]),
});

export const aiJobAssistantDiscussionSchema = z.object({
  answer: z.string().min(1),
});

export type AiJobCriteria = z.infer<typeof aiJobCriteriaSchema>;
export type AiJobAssistantExtraction = z.infer<typeof aiJobAssistantExtractionSchema>;

export type AssistantVacancyLike = {
  source: "native" | "hh";
  title: string;
  description: string;
  city: string;
  district?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string | null;
};

export type AssistantProfileContext = {
  city?: string | null;
  district?: string | null;
  skills: string[];
  bio?: string | null;
  resumeText?: string | null;
};

export type AssistantRankedMatch<TVacancy extends AssistantVacancyLike = AssistantVacancyLike> = {
  vacancy: TVacancy;
  explanation: string[];
  matchScore?: number;
  boost: number;
};

export type AssistantComparisonRow = {
  title: string;
  salary: string;
  district: string;
  schedule: string;
  experience: string;
  source: "native" | "hh";
  applicationFriction: string;
  whyFits: string[];
  risks: string[];
};

const DEFAULT_CITY = "Актау";

export function emptyAiJobCriteria(): AiJobCriteria {
  return {
    roles: [],
    skills: [],
    city: null,
    district: null,
    schedule: null,
    workType: null,
    experienceLevel: null,
    salaryMin: null,
    urgency: null,
    sourcePreference: "any",
  };
}

/**
 * Default clarification chips for the first missing signal (used when the model
 * returns fewer than four or when the keyword fallback path runs without OpenRouter).
 */
export function buildQuickReplyOptionsForSignal(signal: string | undefined): [string, string, string, string] {
  const table: Record<string, [string, string, string, string]> = {
    district: ["12 мкр", "14 мкр", "Центр / приморский", "Не важно — по городу"],
    schedule: ["Утро или день", "Вечер или после учёбы", "Смены, гибко", "Пока не определился(ась)"],
    experienceLevel: [
      "Без опыта, научат",
      "Немного опыта",
      "Опыт есть",
      "Не важно — по условиям",
    ],
    skills: ["Общение и сервис", "Продажи", "Доставка / курьер", "Опишу в сообщении"],
    workType: ["Полная занятость", "Подработка", "Временно / срочно", "Любой формат"],
    salaryMin: ["От 150 000 ₸", "От 200 000 ₸", "От 250 000 ₸", "Сначала варианты, зарплату уточним"],
    urgency: ["Нужно сегодня", "В течение недели", "Можно спокойно искать", "Срок не важен"],
  };
  return (
    table[signal ?? ""] ?? [
      "Да, это важно",
      "Скорее нет",
      "Не уверен(а)",
      "Напишу подробнее ниже",
    ]
  );
}

export function mergeQuickReplyOptions(
  fromAi: string[] | undefined,
  signal: string | undefined,
  include: boolean,
): string[] {
  if (!include) {
    return [];
  }
  const defaults = buildQuickReplyOptionsForSignal(signal);
  const cleaned = (fromAi ?? [])
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const out: string[] = [];
  for (const o of cleaned) {
    if (!out.includes(o)) {
      out.push(o);
    }
    if (out.length === 4) {
      return out;
    }
  }
  for (const d of defaults) {
    if (!out.includes(d)) {
      out.push(d);
    }
    if (out.length === 4) {
      return out;
    }
  }
  return out.slice(0, 4);
}

export function mergeAiJobCriteria(
  base: AiJobCriteria | null | undefined,
  next: AiJobCriteria | null | undefined,
): AiJobCriteria {
  const fallback = base ?? emptyAiJobCriteria();
  const incoming = next ?? emptyAiJobCriteria();
  return {
    roles: incoming.roles.length ? unique(incoming.roles) : fallback.roles,
    skills: incoming.skills.length ? unique(incoming.skills) : fallback.skills,
    city: incoming.city ?? fallback.city,
    district: incoming.district ?? fallback.district,
    schedule: incoming.schedule ?? fallback.schedule,
    workType: incoming.workType ?? fallback.workType,
    experienceLevel: incoming.experienceLevel ?? fallback.experienceLevel,
    salaryMin: incoming.salaryMin ?? fallback.salaryMin,
    urgency: incoming.urgency ?? fallback.urgency,
    sourcePreference:
      incoming.sourcePreference !== "any"
        ? incoming.sourcePreference
        : fallback.sourcePreference,
  };
}

export function fallbackExtractCriteria(
  text: string,
  previousCriteria?: AiJobCriteria | null,
): AiJobAssistantExtraction {
  const normalized = text.toLowerCase();
  const criteria = mergeAiJobCriteria(previousCriteria, {
    ...emptyAiJobCriteria(),
    roles: detectRoles(normalized),
    skills: detectSkills(normalized),
    city: detectCity(normalized),
    district: detectDistrict(normalized),
    schedule: detectSchedule(normalized),
    workType: detectWorkType(normalized),
    experienceLevel: detectExperience(normalized),
    salaryMin: detectSalary(normalized),
    urgency: detectUrgency(normalized),
    sourcePreference: detectSourcePreference(normalized),
  });

  const missingSignals = prioritizeMissingSignals(criteria);
  const signalCount = countKnownSignals(criteria);
  const shouldShowResults = signalCount >= 2 || normalized.trim().length >= 16;
  const nextQuestion = shouldShowResults ? null : buildNextQuestion(missingSignals[0]);

  return {
    intent: detectIntent(normalized),
    knownCriteria: aiJobCriteriaSchema.parse(criteria),
    missingSignals,
    nextQuestion,
    shouldShowResults,
    confidence: Math.min(0.74, 0.22 + signalCount * 0.13),
    quickReplyOptions: mergeQuickReplyOptions(undefined, missingSignals[0], Boolean(nextQuestion)),
  };
}

export function buildAssistantMatchExplanation(
  vacancy: AssistantVacancyLike,
  criteria: AiJobCriteria,
): string[] {
  const haystack = vacancyText(vacancy);
  const bullets: string[] = [];

  if (
    criteria.district &&
    (sameText(vacancy.district, criteria.district) || haystack.includes(criteria.district))
  ) {
    bullets.push("рядом с вашим районом");
  }

  if (
    criteria.experienceLevel === "none" &&
    /(без опыта|опыт не требуется|обучение|научим)/i.test(haystack)
  ) {
    bullets.push("можно без опыта");
  }

  if (
    criteria.schedule &&
    haystack.includes(criteria.schedule.toLowerCase())
  ) {
    bullets.push(
      criteria.schedule === "вечер"
        ? "подходит вечерний график"
        : `подходит ${criteria.schedule} график`,
    );
  }

  if (criteria.salaryMin && (vacancy.salaryMax ?? vacancy.salaryMin ?? 0) >= criteria.salaryMin) {
    bullets.push("зарплата соответствует ожиданиям");
  }

  if (criteria.urgency === "today" && /(срочно|сегодня|быстро|сразу|старт)/i.test(haystack)) {
    bullets.push("можно начать быстро");
  }

  if (criteria.sourcePreference === "native" && vacancy.source === "native") {
    bullets.push("отклик внутри JumysAI");
  }

  if (!bullets.length) {
    bullets.push("часть условий совпадает с вашим запросом");
  }

  return unique(bullets).slice(0, 4);
}

export function compareVacanciesForAssistant(
  vacancies: AssistantVacancyLike[],
  criteria: AiJobCriteria,
): { rows: AssistantComparisonRow[]; summary: string } {
  const rows = vacancies.slice(0, 3).map((vacancy) => {
    const haystack = vacancyText(vacancy);
    const schedule = detectSchedule(haystack) ?? "Не указан";
    const experience = /(без опыта|опыт не требуется|обучение|научим)/i.test(haystack)
      ? "Можно без опыта"
      : "Не указано";

    const risks = [
      !vacancy.salaryMin && !vacancy.salaryMax ? "зарплата не указана" : null,
      !vacancy.district ? "район не указан" : null,
      schedule === "Не указан" ? "график не указан" : null,
      experience === "Не указано" ? "требования к опыту не указаны" : null,
    ].filter((item): item is string => Boolean(item));

    return {
      title: vacancy.title,
      salary: formatAssistantSalary(vacancy),
      district: vacancy.district || "Не указан",
      schedule,
      experience,
      source: vacancy.source,
      applicationFriction:
        vacancy.source === "native"
          ? "низкая, отклик внутри JumysAI"
          : "внешний сайт HH",
      whyFits: buildAssistantMatchExplanation(vacancy, criteria),
      risks,
    };
  });

  const native = rows.find((row) => row.source === "native");
  const highestSalary = rows
    .map((row, index) => ({ row, index, salary: vacancies[index]?.salaryMax ?? vacancies[index]?.salaryMin ?? 0 }))
    .sort((a, b) => b.salary - a.salary)[0];

  const summary = native
    ? `Если важнее быстро откликнуться — выберите ${native.title}. ${
        highestSalary?.salary
          ? `Если важнее зарплата — проверьте ${highestSalary.row.title}, но учтите условия отклика.`
          : "По зарплате данных мало, лучше уточнить у работодателя."
      }`
    : "Сравните условия и отклик: по части вакансий данных может не хватать, поэтому лучше открыть детали перед решением.";

  return { rows, summary };
}

export function inferChatTitle(criteria: AiJobCriteria, fallbackText: string): string {
  if (criteria.urgency === "today") return "Работа на сегодня";
  if (criteria.district) return `Работа рядом с ${criteria.district}`;
  if (criteria.schedule) return `Работа: ${criteria.schedule}`;
  const firstRole = criteria.roles[0];
  if (firstRole) return `Подбор: ${firstRole}`;
  return fallbackText.trim().slice(0, 42) || "Новый подбор";
}

export function criteriaToSearchText(criteria: AiJobCriteria): string {
  return [
    ...criteria.roles,
    ...criteria.skills,
    criteria.city,
    criteria.district,
    criteria.schedule,
    criteria.workType === "part_time" ? "подработка" : null,
    criteria.workType === "temporary" ? "временная" : null,
    criteria.experienceLevel === "none" ? "без опыта" : null,
    criteria.urgency === "today" ? "срочно сегодня" : null,
  ]
    .filter(Boolean)
    .join(" ");
}

export function summarizeProfileContext(profile: AssistantProfileContext | null | undefined): string[] {
  if (!profile) return [];
  return unique([
    profile.city ?? "",
    profile.district ?? "",
    ...profile.skills.slice(0, 5),
  ]).slice(0, 7);
}

export function profileContextToSearchText(profile: AssistantProfileContext | null | undefined): string {
  if (!profile) return "";
  return [
    profile.city,
    profile.district,
    ...profile.skills,
    profile.bio,
    profile.resumeText,
  ]
    .filter(Boolean)
    .join(" ");
}

export function applyProfileContextToMatches<TVacancy extends AssistantVacancyLike>(
  matches: Array<AssistantRankedMatch<TVacancy>>,
  criteria: AiJobCriteria,
  profile: AssistantProfileContext | null | undefined,
): Array<AssistantRankedMatch<TVacancy>> {
  if (!profile) {
    return matches;
  }

  return matches
    .map((match) => {
      const text = vacancyText(match.vacancy);
      const criteriaBoost = criteriaSignalBoost(match.vacancy, criteria, text);
      const { boost: profileBoost, explanations } = profileSignalBoost(profile, match.vacancy, text);
      return {
        ...match,
        boost: match.boost + criteriaBoost + profileBoost,
        explanation: unique([...match.explanation, ...explanations]).slice(0, 5),
      };
    })
    .sort((a, b) => combinedMatchScore(b) - combinedMatchScore(a));
}

export function formatAssistantSalary(vacancy: Pick<AssistantVacancyLike, "salaryMin" | "salaryMax" | "salaryCurrency">): string {
  const currency = vacancy.salaryCurrency ?? "KZT";
  if (vacancy.salaryMin && vacancy.salaryMax) {
    return `${formatAmount(vacancy.salaryMin)}-${formatAmount(vacancy.salaryMax)} ${currency}`;
  }
  if (vacancy.salaryMin) return `${formatAmount(vacancy.salaryMin)} ${currency}`;
  if (vacancy.salaryMax) return `до ${formatAmount(vacancy.salaryMax)} ${currency}`;
  return "Не указана";
}

function combinedMatchScore(match: AssistantRankedMatch): number {
  return (match.matchScore ?? 0) + match.boost;
}

function criteriaSignalBoost(
  vacancy: AssistantVacancyLike,
  criteria: AiJobCriteria,
  text: string,
): number {
  let boost = 0;
  for (const role of criteria.roles) {
    if (text.includes(role.toLowerCase())) boost += 34;
  }
  for (const skill of criteria.skills) {
    if (text.includes(skill.toLowerCase())) boost += 18;
  }
  if (criteria.district && (sameText(vacancy.district, criteria.district) || text.includes(criteria.district.toLowerCase()))) {
    boost += 32;
  }
  if (criteria.city && sameText(vacancy.city, criteria.city)) {
    boost += 8;
  }
  return boost;
}

function profileSignalBoost(
  profile: AssistantProfileContext,
  vacancy: AssistantVacancyLike,
  text: string,
): { boost: number; explanations: string[] } {
  let boost = 0;
  const explanations: string[] = [];

  if (profile.district && (sameText(vacancy.district, profile.district) || text.includes(profile.district.toLowerCase()))) {
    boost += 10;
    explanations.push("профиль: подходит район");
  } else if (profile.city && sameText(vacancy.city, profile.city)) {
    boost += 4;
  }

  for (const skill of profile.skills.slice(0, 8)) {
    if (skill && text.includes(skill.toLowerCase())) {
      boost += 8;
      explanations.push(`профиль: навык ${skill}`);
    }
  }

  const profileText = [profile.bio ?? "", profile.resumeText ?? ""].join(" ").toLowerCase();
  const titleWords = vacancy.title
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= 4);
  if (titleWords.some((word) => profileText.includes(word))) {
    boost += 6;
    explanations.push("профиль: опыт близок к роли");
  }

  return { boost, explanations };
}

function detectIntent(text: string): AiJobAssistantExtraction["intent"] {
  if (/сравни|лучше|первые две|между/i.test(text)) return "compare_jobs";
  if (/покажи|убери|только|спокойнее|где|какая/i.test(text)) return "refine_results";
  if (/работ|ваканси|подработ|ищу|нужн/i.test(text)) return "find_jobs";
  return "unknown";
}

function detectCity(text: string): string | null {
  if (/актау|aktau/i.test(text)) return DEFAULT_CITY;
  return null;
}

function detectDistrict(text: string): string | null {
  const microdistrict = text.match(/(\d{1,2})\s*(?:мкр|мк-р|микрорайон)/i);
  if (microdistrict?.[1]) return `${microdistrict[1]} мкр`;
  if (/центр|центре|центральн/i.test(text)) return "центр";
  if (/приморск/i.test(text)) return "приморский";
  if (/шыгыс|шығыс/i.test(text)) return "Шыгыс";
  return null;
}

function detectSchedule(text: string): string | null {
  if (/вечер|после учеб|после учёб|вечером/i.test(text)) return "вечер";
  if (/ноч|ночью|ночная/i.test(text)) return "ночной";
  if (/утро|утром|дневн|днем|днём/i.test(text)) return "дневной";
  if (/5\/2|пять два/i.test(text)) return "5/2";
  if (/смен/i.test(text)) return "сменный";
  return null;
}

function detectWorkType(text: string): AiJobCriteria["workType"] {
  if (/подработ|частич|после учеб|после учёб/i.test(text)) return "part_time";
  if (/времен|сезон|на сегодня|сегодня/i.test(text)) return "temporary";
  if (/полный|полная|full/i.test(text)) return "full_time";
  return null;
}

function detectExperience(text: string): AiJobCriteria["experienceLevel"] {
  if (/без опыта|опыта нет|нет опыта|науч/i.test(text)) return "none";
  if (/начинающ|студент|junior/i.test(text)) return "junior";
  if (/опыт|работал|работала|стаж/i.test(text)) return "experienced";
  return null;
}

function detectUrgency(text: string): AiJobCriteria["urgency"] {
  if (/сегодня|срочно|прямо сейчас|на сегодня/i.test(text)) return "today";
  if (/недел|скоро/i.test(text)) return "this_week";
  return null;
}

function detectSourcePreference(text: string): AiJobCriteria["sourcePreference"] {
  if (/только\s+native|только\s+jumys|внутри/i.test(text)) return "native";
  if (/только\s+hh|headhunter/i.test(text)) return "hh";
  return "any";
}

function detectSalary(text: string): number | null {
  const salary = text.match(/(\d{2,3})(?:\s?к|k|000)/i);
  if (!salary?.[1]) return null;
  const value = Number(salary[1]);
  return Number.isFinite(value) ? value * 1000 : null;
}

function detectSkills(text: string): string[] {
  const skills = [
    /обща/i.test(text) ? "общение" : null,
    /продаж/i.test(text) ? "продажи" : null,
    /бариста|кофе/i.test(text) ? "бариста" : null,
    /достав/i.test(text) ? "доставка" : null,
    /стричь|стриж/i.test(text) ? "стрижки" : null,
    /кафе|ресторан/i.test(text) ? "кафе" : null,
  ];
  return unique(skills.filter((item): item is string => Boolean(item)));
}

function detectRoles(text: string): string[] {
  const roles = [
    /бариста/i.test(text) ? "бариста" : null,
    /продав/i.test(text) ? "продавец" : null,
    /администратор/i.test(text) ? "администратор" : null,
    /официант/i.test(text) ? "официант" : null,
    /курьер|достав/i.test(text) ? "курьер" : null,
    /салон|стричь|стриж/i.test(text) ? "мастер салона" : null,
  ];
  return unique(roles.filter((item): item is string => Boolean(item)));
}

function prioritizeMissingSignals(criteria: AiJobCriteria): string[] {
  return [
    criteria.district ? null : "district",
    criteria.schedule ? null : "schedule",
    criteria.experienceLevel ? null : "experienceLevel",
    criteria.skills.length || criteria.roles.length ? null : "skills",
    criteria.workType ? null : "workType",
    criteria.salaryMin ? null : "salaryMin",
    criteria.urgency ? null : "urgency",
  ].filter((item): item is string => Boolean(item));
}

function buildNextQuestion(signal?: string): string | null {
  const questions: Record<string, string> = {
    district: "В каком районе Актау вам удобнее работать?",
    schedule: "Какой график вам подходит: утро, день, вечер или смены?",
    experienceLevel: "Есть ли опыт в кафе, продажах, доставке или можно без опыта?",
    skills: "Что у вас лучше всего получается на работе или учебе?",
    workType: "Ищете полную занятость, подработку или временную работу?",
    salaryMin: "Какая минимальная зарплата для вас комфортна?",
    urgency: "Нужно начать сегодня или можно искать спокойно?",
  };
  return signal ? questions[signal] ?? null : null;
}

function countKnownSignals(criteria: AiJobCriteria): number {
  return [
    criteria.roles.length > 0,
    criteria.skills.length > 0,
    criteria.city,
    criteria.district,
    criteria.schedule,
    criteria.workType,
    criteria.experienceLevel,
    criteria.salaryMin,
    criteria.urgency,
    criteria.sourcePreference !== "any",
  ].filter(Boolean).length;
}

function vacancyText(vacancy: AssistantVacancyLike): string {
  return [
    vacancy.title,
    vacancy.description,
    vacancy.city,
    vacancy.district ?? "",
  ]
    .join(" ")
    .toLowerCase();
}

function sameText(a: string | null | undefined, b: string | null | undefined): boolean {
  return Boolean(a && b && a.toLowerCase() === b.toLowerCase());
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function formatAmount(value: number): string {
  return new Intl.NumberFormat("ru-KZ", { maximumFractionDigits: 0 })
    .format(value)
    .replace(/\u00A0/g, " ");
}
