import { z } from "zod";

import type { Vacancy } from "@/types/domain";

export const optionalNumber = z.preprocess(
  (value) => (value === "" || value === undefined ? undefined : Number(value)),
  z.number().optional(),
);

export const vacancySchema = z.object({
  title: z.string().min(2, "Укажите название вакансии"),
  description: z.string().min(10, "Добавьте понятное описание"),
  district: z.string().optional(),
  salaryMin: optionalNumber,
  salaryMax: optionalNumber,
  screeningQuestionsText: z.string().optional(),
});

export type VacancyFormInput = z.input<typeof vacancySchema>;
export type VacancyFormValues = z.output<typeof vacancySchema>;

export const NATIVE_CITY_DEFAULT = "Aktau" as const;
export const NATIVE_CURRENCY_DEFAULT = "KZT" as const;

export type GeneratedVacancyFields = {
  title?: string;
  description?: string;
  city?: string;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string | null;
};

export function toDefaultValues(vacancy?: Vacancy | null): VacancyFormInput {
  return {
    title: vacancy?.title ?? "",
    description: vacancy?.description ?? "",
    district: vacancy?.district ?? "",
    salaryMin: vacancy?.salaryMin,
    salaryMax: vacancy?.salaryMax,
    screeningQuestionsText: vacancy?.screeningQuestions?.join("\n") ?? "",
  };
}

export function parseQuestions(value?: string): string[] {
  return (value ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

/** Payload for `api.vacancies.createNativeVacancy`. */
export function buildCreateNativePayload(values: {
  title: string;
  description: string;
  district?: string;
  salaryMin?: number;
  salaryMax?: number;
}) {
  return {
    title: values.title,
    description: values.description,
    city: NATIVE_CITY_DEFAULT,
    district: values.district || undefined,
    salaryMin: values.salaryMin || undefined,
    salaryMax: values.salaryMax || undefined,
    salaryCurrency: NATIVE_CURRENCY_DEFAULT,
  };
}
