import { describe, expect, test } from "vitest";

import { shouldDiscussLoadedVacancies } from "./AiJobAssistant";

describe("shouldDiscussLoadedVacancies", () => {
  test("routes questions about already loaded matches to vacancy discussion", () => {
    expect(shouldDiscussLoadedVacancies("Какая из этих вакансий лучше без опыта?", 3, null)).toBe(true);
    expect(shouldDiscussLoadedVacancies("Где зарплата выше?", 2, null)).toBe(true);
  });

  test("keeps fresh searches and active clarifications in the search flow", () => {
    expect(shouldDiscussLoadedVacancies("Найди работу бариста вечером", 3, null)).toBe(false);
    expect(shouldDiscussLoadedVacancies("12 мкр", 3, "В каком районе удобно?")).toBe(false);
    expect(shouldDiscussLoadedVacancies("Какая лучше?", 0, null)).toBe(false);
  });
});
