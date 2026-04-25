import { z } from "zod";

import { DEFAULT_CITY } from "./constants";

export const MIN_RESUME_PROFILE_TEXT_LENGTH = 80;
export const MAX_RESUME_PROFILE_TEXT_LENGTH = 12000;

export const resumeProfileDraftSchema = z.object({
  fullName: z.string(),
  city: z.string(),
  district: z.union([z.string(), z.null()]),
  skills: z.array(z.string()),
  bio: z.string(),
  resumeText: z.string(),
});

export type ResumeProfileDraft = z.infer<typeof resumeProfileDraftSchema>;

const skillPatterns: Array<{ label: string; patterns: RegExp[] }> = [
  { label: "CRM", patterns: [/\bcrm\b/i, /битрикс/i, /amo\s?crm/i] },
  { label: "Excel", patterns: [/\bexcel\b/i, /эксель/i, /таблиц/i] },
  { label: "продажи", patterns: [/продаж/i, /касс/i, /консульт/i] },
  { label: "клиентский сервис", patterns: [/клиент/i, /сервис/i, /администратор/i] },
  { label: "документы", patterns: [/документ/i, /отчет/i, /отчёт/i] },
  { label: "английский", patterns: [/английск/i, /\benglish\b/i] },
  { label: "казахский", patterns: [/казахск/i, /қазақ/i] },
  { label: "русский", patterns: [/русск/i] },
  { label: "водитель", patterns: [/водител/i, /права/i, /категори[ия]/i] },
  { label: "React", patterns: [/\breact\b/i] },
  { label: "TypeScript", patterns: [/\btypescript\b/i, /\bts\b/i] },
  { label: "JavaScript", patterns: [/\bjavascript\b/i, /\bjs\b/i] },
];

function cleanText(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function normalizeResumeText(resumeText: string): string {
  return resumeText.trim().slice(0, MAX_RESUME_PROFILE_TEXT_LENGTH);
}

function pushUnique(values: string[], value: string) {
  const cleaned = cleanText(value);
  if (!cleaned) return;
  if (values.some((item) => item.toLocaleLowerCase() === cleaned.toLocaleLowerCase())) return;
  values.push(cleaned);
}

function normalizeSkills(values: unknown): string[] {
  const source = Array.isArray(values) ? values : [];
  const skills: string[] = [];
  for (const value of source) {
    pushUnique(skills, String(value));
  }
  return skills.slice(0, 16);
}

function inferDistrict(text: string): string | null {
  const microdistrict = text.match(/(\d{1,2})\s*(?:мкр|микрорайон|шағын аудан)/i);
  if (microdistrict?.[1]) {
    return `${microdistrict[1]} мкр`;
  }
  if (/центр|орталық/i.test(text)) {
    return "центр";
  }
  return null;
}

function inferFullName(text: string): string {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const blocked = /резюме|curriculum|навык|skills|опыт|тел|phone|email|@|город|актау|мкр/i;
  for (const line of lines.slice(0, 8)) {
    const compact = line.replace(/[.,;:]/g, " ").replace(/\s+/g, " ").trim();
    const words = compact.split(" ").filter(Boolean);
    if (compact.length < 5 || compact.length > 80) continue;
    if (blocked.test(compact) || /\d/.test(compact)) continue;
    if (words.length >= 2 && words.length <= 4) {
      return compact;
    }
  }
  return "";
}

function inferSkills(text: string): string[] {
  const skills: string[] = [];
  const explicitLine = text.match(/(?:навыки|skills|умею|стек)\s*[:—-]\s*([^\n]+)/i)?.[1];
  if (explicitLine) {
    for (const value of explicitLine.split(/[,;•|/]+/)) {
      pushUnique(skills, value);
    }
  }
  for (const item of skillPatterns) {
    if (item.patterns.some((pattern) => pattern.test(text))) {
      pushUnique(skills, item.label);
    }
  }
  return skills.slice(0, 16);
}

function inferBio(text: string): string {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => line !== inferFullName(text));
  const joined = lines.join(" ");
  return joined.slice(0, 320).trim();
}

export function normalizeResumeProfileDraft(
  value: Partial<ResumeProfileDraft>,
  rawResumeText: string,
): ResumeProfileDraft {
  const resumeText = normalizeResumeText(rawResumeText);
  const fullName = cleanText(value.fullName);
  const city = cleanText(value.city) || DEFAULT_CITY;
  const district = cleanText(value.district) || null;
  const bio = cleanText(value.bio);
  const skills = normalizeSkills(value.skills);

  return resumeProfileDraftSchema.parse({
    fullName,
    city,
    district,
    skills,
    bio,
    resumeText,
  });
}

export function fallbackExtractResumeProfileDraft(
  rawResumeText: string,
): ResumeProfileDraft {
  const resumeText = normalizeResumeText(rawResumeText);
  return normalizeResumeProfileDraft(
    {
      fullName: inferFullName(resumeText),
      city: DEFAULT_CITY,
      district: inferDistrict(resumeText),
      skills: inferSkills(resumeText),
      bio: inferBio(resumeText),
      resumeText,
    },
    resumeText,
  );
}
