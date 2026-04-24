import { describe, expect, test } from "vitest";

import { hasHhVacancyChanged, normalizeHhVacancy } from "../convex/lib/hh";

describe("HH normalization", () => {
  test("normalizes HH vacancies into the lean Convex shape", () => {
    const normalized = normalizeHhVacancy({
      id: "123",
      name: "Повар",
      alternate_url: "https://hh.ru/vacancy/123",
      area: { name: "Aktau" },
      salary: { from: 120000, to: 180000, currency: "KZT" },
      snippet: {
        responsibility: "Готовить блюда",
        requirement: "Опыт от 1 года",
      },
    });

    expect(normalized).toEqual({
      source: "hh",
      sourceId: "123",
      title: "Повар",
      description: "Готовить блюда\n\nОпыт от 1 года",
      city: "Aktau",
      salaryMin: 120000,
      salaryMax: 180000,
      salaryCurrency: "KZT",
      externalApplyUrl: "https://hh.ru/vacancy/123",
    });
  });

  test("detects changed HH records conservatively", () => {
    const next = normalizeHhVacancy({
      id: "123",
      name: "Повар",
      alternate_url: "https://hh.ru/vacancy/123",
      area: { name: "Aktau" },
      salary: { from: 120000, to: 180000, currency: "KZT" },
      snippet: {
        responsibility: "Готовить блюда",
        requirement: "Опыт от 1 года",
      },
    });

    expect(hasHhVacancyChanged(null, next)).toBe(true);
    expect(
      hasHhVacancyChanged(
        {
          title: "Повар",
          description: "Готовить блюда\n\nОпыт от 1 года",
          city: "Aktau",
          salaryMin: 120000,
          salaryMax: 180000,
          salaryCurrency: "KZT",
          externalApplyUrl: "https://hh.ru/vacancy/123",
        },
        next,
      ),
    ).toBe(false);
    expect(
      hasHhVacancyChanged(
        {
          title: "Повар",
          description: "Другое описание",
          city: "Aktau",
          salaryMin: 120000,
          salaryMax: 180000,
          salaryCurrency: "KZT",
          externalApplyUrl: "https://hh.ru/vacancy/123",
        },
        next,
      ),
    ).toBe(true);
  });
});
