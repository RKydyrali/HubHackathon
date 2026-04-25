// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { render, waitFor } from "@testing-library/react";
import { useQuery } from "convex/react";
import { StrictMode } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { type Id } from "@/lib/convex-api";
import { VacancyDetailPage } from "./VacancyDetailPage";

vi.mock("./VacancyDetail", () => ({
  VacancyDetail: () => <div data-testid="vacancy-detail-mock" />,
}));

vi.mock("@/lib/i18n", () => ({
  useI18n: () => ({
    copy: { vacancies: { details: "Details", notFound: "Not found" } },
    locale: "ru" as const,
  }),
}));

const trackDemo = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useMutation: () => trackDemo,
}));

const useQueryMock = vi.mocked(useQuery);

const mockVacancy = {
  _id: "native_1" as Id<"vacancies">,
  _creationTime: 1,
  ownerUserId: "user_1" as Id<"users">,
  source: "native" as const,
  sourceId: "",
  status: "published" as const,
  title: "Cook",
  description: "Kitchen",
  city: "Aktau",
  salaryMin: 1,
  salaryMax: 2,
  salaryCurrency: "KZT" as const,
};

describe("VacancyDetailPage", () => {
  beforeEach(() => {
    useQueryMock.mockReset();
    trackDemo.mockReset();
    trackDemo.mockResolvedValue(undefined);
    useQueryMock.mockReturnValue(mockVacancy);
  });

  test("fires vacancy_viewed once per vacancy under StrictMode (not twice)", async () => {
    render(
      <StrictMode>
        <MemoryRouter initialEntries={["/vacancies/native_1"]}>
          <Routes>
            <Route path="/vacancies/:id" element={<VacancyDetailPage />} />
          </Routes>
        </MemoryRouter>
      </StrictMode>,
    );

    await waitFor(() => {
      expect(trackDemo).toHaveBeenCalledTimes(1);
    });

    expect(trackDemo).toHaveBeenCalledWith({
      kind: "vacancy_viewed",
      vacancyId: mockVacancy._id,
      surface: "vacancy_detail_page",
    });
  });
});
