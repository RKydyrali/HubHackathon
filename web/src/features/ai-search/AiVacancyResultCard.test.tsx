// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, test } from "vitest";

import type { Id } from "@/lib/convex-api";
import { AiVacancyResultCard } from "./AiVacancyResultCard";

describe("AiVacancyResultCard", () => {
  afterEach(() => cleanup());

  test("renders native vacancies with in-app apply CTA", () => {
    render(
      <MemoryRouter>
        <AiVacancyResultCard
          vacancy={{
            _id: "native_1" as Id<"vacancies">,
            _creationTime: 1,
            ownerUserId: "employer_1" as Id<"users">,
            source: "native",
            sourceId: "",
            status: "published",
            title: "Бариста",
            description: "Можно без опыта",
            city: "Актау",
            district: "12 мкр",
            salaryMin: 180000,
            salaryCurrency: "KZT",
          }}
          explanation={["можно без опыта"]}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: /откликнуться/i })).toHaveAttribute(
      "href",
      "/vacancies/native_1/apply",
    );
  });

  test("renders HH vacancies with external-only CTA", () => {
    render(
      <MemoryRouter>
        <AiVacancyResultCard
          vacancy={{
            _id: "hh_1" as Id<"vacancies">,
            _creationTime: 1,
            source: "hh",
            sourceId: "hh-1",
            status: "published",
            title: "Администратор",
            description: "Вакансия HH",
            city: "Актау",
            salaryMin: 260000,
            salaryCurrency: "KZT",
            externalApplyUrl: "https://hh.kz/vacancy/1",
          }}
          explanation={["есть зарплата"]}
        />
      </MemoryRouter>,
    );

    expect(screen.queryByRole("link", { name: /откликнуться/i })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /открыть на hh/i })).toHaveAttribute(
      "href",
      "https://hh.kz/vacancy/1",
    );
  });
});
