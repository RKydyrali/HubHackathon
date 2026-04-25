import type { Vacancy } from "@/types/domain";

export type SalaryBand = "all" | "lt250" | "250500" | "gt500";
export type ExperienceFilter = "all" | "junior" | "mid" | "senior";
export type VacancySort = "newest" | "salaryDesc";

const NEW_MS = 5 * 24 * 60 * 60 * 1000;

const JUNIOR_RX =
  /без опыта|нет опыта|junior|стажер|intern|стажёр|начинающ|тағылым|тәжірибесіз|студент|trainee/i;
const SENIOR_RX =
  /senior|lead|principal|руковод|5\+|5\s*лет|әкімші|бас маман|жетекші|team lead|head of/i;
const MID_RX = /middle|1\s*[-–]?\s*3|2\s*[-–]?\s*4|опыт работы|жұмыс тәжірибесі|әдістемелік тәжірибе/i;

function stableHash(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Deterministic preview score for list rows (replace with real profile match when available). */
export function vacancyListMatchPreview(vacancyId: string): number {
  const h = stableHash(vacancyId);
  return 58 + (h % 34);
}

export function vacancyIsNew(vacancy: Vacancy, now = Date.now()): boolean {
  return now - vacancy._creationTime < NEW_MS;
}

export function vacancyIsHot(vacancy: Vacancy): boolean {
  const maxSal = vacancy.salaryMax ?? vacancy.salaryMin ?? 0;
  if (maxSal >= 400_000) return true;
  return stableHash(vacancy._id) % 11 === 0;
}

export function vacancySalaryReferenceKzt(vacancy: Vacancy): number {
  const max = vacancy.salaryMax ?? 0;
  const min = vacancy.salaryMin ?? 0;
  if (max && min) return (max + min) / 2;
  return max || min || 0;
}

export function vacancyMatchesSalaryBand(vacancy: Vacancy, band: SalaryBand): boolean {
  if (band === "all") return true;
  const ref = vacancySalaryReferenceKzt(vacancy);
  if (!ref) return true;
  if (band === "lt250") return ref < 250_000;
  if (band === "250500") return ref >= 250_000 && ref < 500_000;
  return ref >= 500_000;
}

export function vacancyMatchesExperience(vacancy: Vacancy, level: ExperienceFilter): boolean {
  if (level === "all") return true;
  const text = `${vacancy.title} ${vacancy.description}`;
  const j = JUNIOR_RX.test(text);
  const s = SENIOR_RX.test(text);
  const m = MID_RX.test(text);
  if (level === "junior") return j && !s;
  if (level === "senior") return s;
  return !s && (m || (!j && /опыт работы|жұмыс тәжірибесі|2\+|мидл|middle/i.test(text)));
}

export function sortVacancies(list: readonly Vacancy[], sort: VacancySort): Vacancy[] {
  const out = [...list];
  if (sort === "newest") {
    out.sort((a, b) => b._creationTime - a._creationTime);
  } else {
    out.sort(
      (a, b) =>
        (b.salaryMax ?? b.salaryMin ?? 0) - (a.salaryMax ?? a.salaryMin ?? 0),
    );
  }
  return out;
}

export function vacancyCompanyLabel(vacancy: Vacancy, locale: "ru" | "kk"): string {
  if (vacancy.source === "hh") return "HH.kz";
  return locale === "kk" ? "Тікелей жұмыс беруші" : "Прямой работодатель";
}
