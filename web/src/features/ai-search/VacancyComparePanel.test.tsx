// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { VacancyComparePanel } from "./VacancyComparePanel";

describe("VacancyComparePanel", () => {
  test("handles missing salary and district without inventing details", () => {
    render(
      <VacancyComparePanel
        rows={[
          {
            title: "Продавец",
            salary: "Не указана",
            district: "12 мкр",
            schedule: "Не указан",
            experience: "Не указано",
            source: "native",
            applicationFriction: "низкая, отклик внутри JumysAI",
            whyFits: ["рядом с вашим районом"],
            risks: ["график не указан"],
          },
          {
            title: "Администратор",
            salary: "260 000 KZT",
            district: "Не указан",
            schedule: "Не указан",
            experience: "Не указано",
            source: "hh",
            applicationFriction: "внешний сайт HH",
            whyFits: ["зарплата указана"],
            risks: ["район не указан"],
          },
        ]}
        summary="Если важнее быстро откликнуться — выберите native вакансию."
      />,
    );

    expect(screen.getAllByText("Не указана")).toHaveLength(1);
    expect(screen.getAllByText("Не указан").length).toBeGreaterThan(1);
    expect(screen.getByText("внешний сайт HH")).toBeInTheDocument();
    expect(screen.getByText(/быстро откликнуться/i)).toBeInTheDocument();
  });
});
