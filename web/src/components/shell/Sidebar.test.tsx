// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, test } from "vitest";

import { Sidebar } from "./Sidebar";

describe("Sidebar", () => {
  test("renders employer operations navigation", () => {
    render(
      <MemoryRouter>
        <Sidebar role="employer" />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "Главная" })).toHaveAttribute("href", "/employer/dashboard");
    expect(screen.getByRole("link", { name: "Вакансии" })).toHaveAttribute("href", "/employer/vacancies");
    expect(screen.getByRole("link", { name: "Отклики" })).toHaveAttribute("href", "/employer/applications");
    expect(screen.getByRole("link", { name: "Интервью" })).toHaveAttribute("href", "/employer/interviews");
  });
});
