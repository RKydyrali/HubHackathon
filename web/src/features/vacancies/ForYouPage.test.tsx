// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { useVacancyMatchMap } from "@/hooks/useVacancyMatchMap";
import { ForYouPage } from "./ForYouPage";

vi.mock("@/hooks/useVacancyMatchMap", () => ({
  useVacancyMatchMap: vi.fn(),
}));

vi.mock("@/features/vacancies/VacancyTable", () => ({
  VacancyTable: () => <div>Vacancy table</div>,
}));

const useVacancyMatchMapMock = vi.mocked(useVacancyMatchMap);

describe("ForYouPage", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    useVacancyMatchMapMock.mockReset();
  });

  test("gives seekers without recommendations a clear path to complete their profile", () => {
    useVacancyMatchMapMock.mockReturnValue({
      enabled: true,
      loading: false,
      rows: [],
      matchMap: {},
    });

    render(
      <MemoryRouter>
        <ForYouPage />
      </MemoryRouter>,
    );

    expect(screen.getAllByText(/заполните профиль/i).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link").some((link) => link.getAttribute("href") === "/for-you")).toBe(true);
    expect(screen.getAllByRole("link").some((link) => link.getAttribute("href") === "/interview-trainer")).toBe(
      true,
    );
    expect(screen.getAllByRole("link").some((link) => link.getAttribute("href") === "/profile")).toBe(true);
  });
});
