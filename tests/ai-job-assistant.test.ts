import { afterEach, describe, expect, test, vi } from "vitest";
import { z } from "zod";

import {
  applyProfileContextToMatches,
  buildAssistantMatchExplanation,
  buildQuickReplyOptionsForSignal,
  compareVacanciesForAssistant,
  fallbackExtractCriteria,
  mergeQuickReplyOptions,
  summarizeProfileContext,
} from "../convex/lib/aiJobAssistantSchemas";
import { requestStructuredJson } from "../convex/lib/openrouter";
import { buildAiJobCriteriaPrompt } from "../convex/lib/prompts";

const originalOpenRouterApiKey = process.env.OPENROUTER_API_KEY;

afterEach(() => {
  vi.restoreAllMocks();
  if (originalOpenRouterApiKey === undefined) {
    delete process.env.OPENROUTER_API_KEY;
  } else {
    process.env.OPENROUTER_API_KEY = originalOpenRouterApiKey;
  }
});

describe("AI job assistant quick replies", () => {
  test("merges to exactly four options and pads from defaults", () => {
    const a = mergeQuickReplyOptions(["Только вечер"], "schedule", true);
    expect(a).toHaveLength(4);
    expect(a[0]).toBe("Только вечер");
  });

  test("exposes four defaults for known missing signals", () => {
    expect(buildQuickReplyOptionsForSignal("district")).toHaveLength(4);
  });
});

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

describe("AI job assistant prompt builders", () => {
  test("criteria prompt carries recent chat and profile context without mixing it into the latest user message", () => {
    const prompt = buildAiJobCriteriaPrompt({
      message: "А какие рядом с 12 мкр можно без опыта?",
      previousCriteriaJson: JSON.stringify(fallbackExtractCriteria("ищу бариста").knownCriteria),
      followUpTurns: 2,
      recentMessages: [
        { role: "user", content: "Ищу работу после учебы" },
        { role: "assistant", content: "В каком районе Актау вам удобнее работать?" },
      ],
      profileSummary: ["Актау", "12 мкр", "продажи"],
      visibleVacancies: [
        { title: "Бариста", district: "12 мкр", salary: "180 000 KZT", source: "native" },
      ],
    } as Parameters<typeof buildAiJobCriteriaPrompt>[0] & {
      recentMessages: Array<{ role: "user" | "assistant"; content: string }>;
      profileSummary: string[];
      visibleVacancies: Array<{ title: string; district: string; salary: string; source: string }>;
    });

    expect(prompt).toContain("Recent chat context:");
    expect(prompt).toContain("Profile summary:");
    expect(prompt).toContain("Visible matched vacancies:");
    expect(prompt).toContain("Output Russian; use Kazakh only if the user writes primarily in Kazakh.");
    expect(prompt).toContain("Do not invent city, district, salary, employer, schedule, or vacancy details");
  });

  test("OpenRouter structured requests separate system instructions from user data", async () => {
    process.env.OPENROUTER_API_KEY = "test-key";
    let requestBody: unknown;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: RequestInit) => {
        requestBody = JSON.parse(String(init.body));
        return new Response(
          JSON.stringify({ choices: [{ message: { content: JSON.stringify({ ok: true }) } }] }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }),
    );

    await requestStructuredJson(
      "shape_test",
      "Latest user text",
      z.object({ ok: z.boolean() }),
      { systemPrompt: "Stable system rules" } as Parameters<typeof requestStructuredJson>[3] & {
        systemPrompt: string;
      },
    );

    expect(requestBody).toMatchObject({
      messages: [
        { role: "system", content: "Stable system rules" },
        { role: "user", content: "Latest user text" },
      ],
    });
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
      ...fallbackExtractCriteria("ищу администратора в центре").knownCriteria,
      roles: ["администратор"],
      district: "центр",
    };
    const ranked = applyProfileContextToMatches(
      [
        {
          vacancy: {
            source: "native",
            title: "Frontend developer",
            description: "React TypeScript dashboard work",
            city: "Актау",
            district: "12 мкр",
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
            title: "Администратор офиса",
            description: "Документы и клиенты в центре",
            city: "Актау",
            district: "центр",
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
        city: "Актау",
        district: "12 мкр",
        skills: ["React", "TypeScript"],
        bio: "Frontend developer",
        resumeText: "React TypeScript dashboards",
      },
    );

    expect(ranked.map((item) => item.vacancy.title)).toEqual([
      "Администратор офиса",
      "Frontend developer",
    ]);
    expect(ranked[1]?.explanation).toContain("профиль: навык React");
  });

  test("summarizes usable profile context for the UI", () => {
    expect(
      summarizeProfileContext({
        city: "Актау",
        district: "12 мкр",
        skills: ["React", "TypeScript", "Sales"],
        bio: "Frontend developer",
        resumeText: "",
      }),
    ).toEqual(["Актау", "12 мкр", "React", "TypeScript", "Sales"]);
  });
});
