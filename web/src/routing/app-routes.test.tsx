// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { matchPath } from "react-router-dom";
import { describe, expect, test } from "vitest";

import { defaultHomeForRole } from "./guards";
import { AI_MATCHING_ROOT, isAiMatchingPath } from "./navPaths";

/**
 * Static segment `apply` must not be absorbed by `:id`.
 * App keeps `/vacancies/:id/apply` on the seeker branch only; list/detail stay on VacanciesChrome.
 */
describe("vacancy route patterns", () => {
  test("apply pattern matches only three-segment paths", () => {
    expect(matchPath("/vacancies/:id/apply", "/vacancies/native_1/apply")).not.toBeNull();
    expect(matchPath("/vacancies/:id/apply", "/vacancies/native_1")).toBeNull();
  });

  test("detail pattern matches two-segment paths under vacancies", () => {
    expect(matchPath("/vacancies/:id", "/vacancies/native_1")).not.toBeNull();
    expect(matchPath("/vacancies/:id", "/vacancies/native_1/apply")).toBeNull();
  });

  test("prepare pattern is distinct from vacancies detail", () => {
    expect(matchPath("/prepare/:vacancyId", "/prepare/abc123")).not.toBeNull();
    expect(matchPath("/prepare/:vacancyId", "/vacancies/abc123")).toBeNull();
  });
});

describe("public home and AI route patterns", () => {
  test("keeps signed-in AI matching on /ai-search instead of the guest root", () => {
    expect(AI_MATCHING_ROOT).toBe("/ai-search");
    expect(isAiMatchingPath("/")).toBe(false);
    expect(isAiMatchingPath("/ai-search")).toBe(true);
    expect(isAiMatchingPath("/ai-search/chat_1")).toBe(true);
  });

  test("routes seeker home to AI matching while employer and admin keep role homes", () => {
    expect(defaultHomeForRole("seeker")).toBe("/ai-search");
    expect(defaultHomeForRole("employer")).toBe("/employer/dashboard");
    expect(defaultHomeForRole("admin")).toBe("/admin");
  });
});
