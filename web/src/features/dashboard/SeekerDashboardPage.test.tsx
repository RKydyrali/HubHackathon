// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/react";
import { useQuery } from "convex/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { api } from "@/lib/convex-api";
import { SeekerDashboardPage } from "./SeekerDashboardPage";

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
}));

const useQueryMock = vi.mocked(useQuery);

describe("SeekerDashboardPage", () => {
  beforeEach(() => {
    useQueryMock.mockReset();
    const mockedRefs = [
      api.users.getSelf,
      api.vacancies.listPublic,
      api.applications.listBySeeker,
      api.aiJobAssistant.listChats,
    ];
    expect(mockedRefs).toHaveLength(4);
    useQueryMock
      .mockReturnValueOnce({ role: "seeker" })
      .mockReturnValueOnce({
        profileComplete: true,
        unreadNotificationCount: 1,
        isBotLinked: false,
      })
      .mockReturnValueOnce([])
      .mockReturnValueOnce([])
      .mockReturnValueOnce([])
      .mockReturnValueOnce([]);
  });

  test("renders localized status rows and empty operational sections", () => {
    render(
      <MemoryRouter>
        <SeekerDashboardPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Спокойный центр поиска" })).toBeInTheDocument();
    expect(screen.getByText("Профиль заполнен")).toBeInTheDocument();
    expect(screen.getByText("Нет вакансий по этим фильтрам")).toBeInTheDocument();
    expect(screen.getByText("Откликов пока нет")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Продолжить подбор" })).toBeInTheDocument();
  });
});
