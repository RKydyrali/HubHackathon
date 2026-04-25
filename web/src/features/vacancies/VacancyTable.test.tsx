// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, test, vi } from "vitest";

import type { Id } from "@/lib/convex-api";
import type { Vacancy } from "@/types/domain";
import { VacancyTable } from "./VacancyTable";

vi.mock("convex/react", () => ({
  useMutation: () => vi.fn(),
}));

const vacancy = {
  _id: "native_1" as Id<"vacancies">,
  _creationTime: 1,
  ownerUserId: "user_1" as Id<"users">,
  companyId: "company_1" as Id<"companies">,
  source: "native",
  sourceId: "",
  status: "published",
  title: "Cook",
  description: "Kitchen role with evening shifts.",
  city: "Aktau",
  salaryMin: 100_000,
  salaryMax: 200_000,
  salaryCurrency: "KZT",
} as Vacancy;

describe("VacancyTable trust badge", () => {
  test("shows compact company trust badge without replacing source badge", () => {
    render(
      <MemoryRouter>
        <VacancyTable
          vacancies={[vacancy]}
          trustByVacancyId={{
            [String(vacancy._id)]: {
              score: 86,
              badgeText: "часто отвечает",
              tone: "success",
              responseRate: 1,
              averageResponseTime: 2 * 60 * 60 * 1000,
              hiresCount: 1,
              complaintsCount: 0,
              dataSufficiency: "sufficient",
            },
          }}
        />
      </MemoryRouter>,
    );

    expect(screen.getAllByText("часто отвечает").length).toBeGreaterThan(0);
    expect(screen.getAllByText("JumysAI").length).toBeGreaterThan(0);
  });
});
