// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, test, vi } from "vitest";

import type { Id } from "@/lib/convex-api";
import { VacancyCard } from "./VacancyCard";

vi.mock("convex/react", () => ({
  useMutation: () => vi.fn(),
}));

describe("VacancyCard", () => {
  test("keeps native applications in-app and HH applications external", () => {
    render(
      <MemoryRouter>
        <div>
          <VacancyCard
            vacancy={{
              _id: "native_1" as Id<"vacancies">,
              _creationTime: 1,
              ownerUserId: "employer_1" as Id<"users">,
              source: "native",
              sourceId: "",
              status: "published",
              title: "Бариста",
              description: "Работа у моря, можно без опыта.",
              city: "Актау",
              district: "12 мкр",
              salaryMin: 180000,
              salaryCurrency: "KZT",
            }}
          />
          <VacancyCard
            vacancy={{
              _id: "hh_1" as Id<"vacancies">,
              _creationTime: 1,
              source: "hh",
              sourceId: "hh-1",
              status: "published",
              title: "Администратор",
              description: "Вакансия партнера на HH.kz.",
              city: "Актау",
              salaryMin: 260000,
              salaryCurrency: "KZT",
              externalApplyUrl: "https://hh.kz/vacancy/1",
            }}
          />
        </div>
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: /откликнуться в jumysai/i })).toHaveAttribute(
      "href",
      "/vacancies/native_1/apply",
    );
    expect(screen.getByRole("link", { name: /открыть на hh/i })).toHaveAttribute(
      "href",
      "https://hh.kz/vacancy/1",
    );
  });
});
