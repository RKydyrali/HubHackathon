import { describe, expect, test } from "vitest";

import {
  applyProfileContextToMatches,
  buildAssistantMatchExplanation,
  compareVacanciesForAssistant,
  fallbackExtractCriteria,
  summarizeProfileContext,
} from "../convex/lib/aiJobAssistantSchemas";

describe("AI job assistant fallback criteria", () => {
  test("extracts useful local search criteria without OpenRouter", () => {
    const result = fallbackExtractCriteria(
      "Я студент, живу в 12 мкр, могу работать вечером, опыта нет.",
    );

    expect(result.intent).toBe("find_jobs");
    expect(result.knownCriteria.district).toBe("12 мкр");
    expect(result.knownCriteria.schedule).toBe("вечер");
    expect(result.knownCriteria.experienceLevel).toBe("none");
    expect(result.knownCriteria.sourcePreference).toBe("any");
    expect(result.shouldShowResults).toBe(true);
  });
});

describe("AI job assistant explanations and comparison", () => {
  test("builds honest explanation bullets from criteria and vacancy text", () => {
    const explanation = buildAssistantMatchExplanation(
      {
        source: "native",
        title: "Бариста вечерняя смена",
        description: "Можно без опыта, обучение на месте.",
        city: "Актау",
        district: "12 мкр",
        salaryMin: 180000,
        salaryMax: undefined,
        salaryCurrency: "KZT",
      },
      fallbackExtractCriteria("без опыта вечером 12 мкр").knownCriteria,
    );

    expect(explanation).toContain("рядом с вашим районом");
    expect(explanation).toContain("можно без опыта");
    expect(explanation).toContain("подходит вечерний график");
  });

  test("compares native and HH vacancies without inventing missing fields", () => {
    const comparison = compareVacanciesForAssistant(
      [
        {
          source: "native",
          title: "Продавец",
          description: "Консультации покупателей",
          city: "Актау",
          district: "12 мкр",
          salaryMin: undefined,
          salaryMax: undefined,
          salaryCurrency: "KZT",
        },
        {
          source: "hh",
          title: "Администратор",
          description: "Работа в офисе",
          city: "Актау",
          district: undefined,
          salaryMin: 260000,
          salaryMax: undefined,
          salaryCurrency: "KZT",
        },
      ],
      fallbackExtractCriteria("рядом с 12 мкр").knownCriteria,
    );

    expect(comparison.rows[0]?.applicationFriction).toBe("низкая, отклик внутри JumysAI");
    expect(comparison.rows[1]?.applicationFriction).toBe("внешний сайт HH");
    expect(comparison.rows[0]?.salary).toBe("Не указана");
    expect(comparison.rows[1]?.district).toBe("Не указан");
  });
});

describe("AI job assistant profile context", () => {
  test("boosts profile-aligned matches without hiding explicit user criteria", () => {
    const criteria = {
      ...fallbackExtractCriteria("РёС‰Сѓ Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂР° РІ С†РµРЅС‚СЂРµ").knownCriteria,
      roles: ["Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂ"],
      district: "Р¦РµРЅС‚СЂ",
    };
    const ranked = applyProfileContextToMatches(
      [
        {
          vacancy: {
            source: "native",
            title: "Frontend developer",
            description: "React TypeScript dashboard work",
            city: "РђРєС‚Р°Сѓ",
            district: "12 РјРєСЂ",
            salaryMin: 400000,
            salaryMax: undefined,
            salaryCurrency: "KZT",
          },
          explanation: [],
          boost: 1,
        },
        {
          vacancy: {
            source: "hh",
            title: "РђРґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂ РѕС„РёСЃР°",
            description: "Р”РѕРєСѓРјРµРЅС‚С‹ Рё РєР»РёРµРЅС‚С‹ РІ С†РµРЅС‚СЂРµ",
            city: "РђРєС‚Р°Сѓ",
            district: "Р¦РµРЅС‚СЂ",
            salaryMin: 260000,
            salaryMax: undefined,
            salaryCurrency: "KZT",
          },
          explanation: [],
          boost: 1,
        },
      ],
      criteria,
      {
        city: "РђРєС‚Р°Сѓ",
        district: "12 РјРєСЂ",
        skills: ["React", "TypeScript"],
        bio: "Frontend developer",
        resumeText: "React TypeScript dashboards",
      },
    );

    expect(ranked.map((item) => item.vacancy.title)).toEqual([
      "РђРґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂ РѕС„РёСЃР°",
      "Frontend developer",
    ]);
    expect(ranked[1]?.explanation).toContain("РїСЂРѕС„РёР»СЊ: РЅР°РІС‹Рє React");
  });

  test("summarizes usable profile context for the UI", () => {
    expect(
      summarizeProfileContext({
        city: "РђРєС‚Р°Сѓ",
        district: "12 РјРєСЂ",
        skills: ["React", "TypeScript", "Sales"],
        bio: "Frontend developer",
        resumeText: "",
      }),
    ).toEqual(["РђРєС‚Р°Сѓ", "12 РјРєСЂ", "React", "TypeScript", "Sales"]);
  });
});
