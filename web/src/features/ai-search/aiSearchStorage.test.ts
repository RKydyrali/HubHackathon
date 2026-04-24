// @vitest-environment jsdom

import { describe, expect, test } from "vitest";

import {
  clearTemporaryAssistantState,
  loadTemporaryAssistantState,
  saveTemporaryAssistantState,
} from "./aiSearchStorage";

describe("temporary AI assistant storage", () => {
  test("persists unauthenticated chat state locally", () => {
    clearTemporaryAssistantState();

    saveTemporaryAssistantState({
      messages: [{ role: "user", content: "Работа вечером 12 мкр" }],
      criteria: {
        roles: [],
        skills: [],
        city: "Актау",
        district: "12 мкр",
        schedule: "вечер",
        workType: null,
        experienceLevel: null,
        salaryMin: null,
        urgency: null,
        sourcePreference: "any",
      },
      matchedVacancyIds: ["vacancy_1"],
    });

    expect(loadTemporaryAssistantState()?.criteria.district).toBe("12 мкр");
    expect(loadTemporaryAssistantState()?.matchedVacancyIds).toEqual(["vacancy_1"]);
  });
});
