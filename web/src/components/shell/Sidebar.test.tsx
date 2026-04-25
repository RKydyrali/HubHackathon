// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, test } from "vitest";

import { getCopy, supportedLocales } from "@/lib/i18n";
import { AI_MATCHING_ROOT, isAiMatchingPath } from "@/routing/navPaths";
import { navByRole } from "./Sidebar";
import { topNavByRole } from "./TopNavigation";
import { Sidebar } from "./Sidebar";

describe("Sidebar", () => {
  test("renders employer operations navigation", () => {
    render(
      <MemoryRouter>
        <Sidebar role="employer" />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "Главная" })).toHaveAttribute("href", "/employer/dashboard");
    expect(screen.getByRole("link", { name: "AI-подбор" })).toHaveAttribute("href", AI_MATCHING_ROOT);
    expect(screen.getByRole("link", { name: "Вакансии" })).toHaveAttribute("href", "/employer/vacancies");
    expect(screen.getByRole("link", { name: "Отклики" })).toHaveAttribute("href", "/employer/applications");
    expect(screen.getByRole("link", { name: "Интервью" })).toHaveAttribute("href", "/employer/interviews");
  });

  test("keeps employer AI search available across shell navigation", () => {
    expect(navByRole.employer.some((item) => item.to === AI_MATCHING_ROOT && item.labelKey === "aiSearch")).toBe(true);
    expect(topNavByRole.employer.some((item) => item.to === AI_MATCHING_ROOT && item.labelKey === "aiSearch")).toBe(true);
  });

  test("makes admin AI access explicit in navigation", () => {
    expect(navByRole.admin.some((item) => item.to === AI_MATCHING_ROOT && item.labelKey === "aiSearch")).toBe(true);
    expect(topNavByRole.admin.some((item) => item.to === AI_MATCHING_ROOT && item.labelKey === "aiSearch")).toBe(true);
  });

  test("includes only standalone seeker product pages", () => {
    const seekerPaths = navByRole.seeker.map((item) => item.to);

    expect(seekerPaths).toContain("/interview-trainer");
    expect(seekerPaths).not.toContain("/prepare/:vacancyId");
    expect(seekerPaths).not.toContain("/vacancies/:id/apply");
  });

  test("does not expose nested employer detail flows in menus", () => {
    const allMenuPaths = [
      ...Object.values(navByRole).flatMap((items) => items.map((item) => item.to)),
      ...Object.values(topNavByRole).flatMap((items) => items.map((item) => item.to)),
    ];

    expect(allMenuPaths).not.toContain("/employer/applications/:id");
    expect(allMenuPaths).not.toContain("/employer/vacancies/:id");
    expect(allMenuPaths).not.toContain("/vacancies/:id/apply");
  });

  test("ships localized labels for every menu item", () => {
    const allLabelKeys = new Set([
      ...Object.values(navByRole).flatMap((items) => items.map((item) => item.labelKey)),
      ...Object.values(topNavByRole).flatMap((items) => items.map((item) => item.labelKey)),
    ]);

    for (const locale of supportedLocales) {
      const navCopy = getCopy(locale).nav;
      for (const labelKey of allLabelKeys) {
        expect(navCopy[labelKey]).toEqual(expect.any(String));
        expect(navCopy[labelKey].length).toBeGreaterThan(0);
      }
    }
  });

  test("uses shared AI path matching for AI root and chat routes", () => {
    expect(isAiMatchingPath("/")).toBe(false);
    expect(isAiMatchingPath(AI_MATCHING_ROOT)).toBe(true);
    expect(isAiMatchingPath("/ai-search/chat-123")).toBe(true);
    expect(isAiMatchingPath("/employer/dashboard")).toBe(false);
  });

  test("keeps mobile primary slots stable and moves extra seeker items to overflow", () => {
    expect(navByRole.seeker.slice(0, 4).map((item) => item.to)).toEqual([
      "/vacancies",
      "/for-you",
      AI_MATCHING_ROOT,
      "/applications",
    ]);
    expect(navByRole.seeker.slice(4).map((item) => item.to)).toContain("/interview-trainer");
  });
});
