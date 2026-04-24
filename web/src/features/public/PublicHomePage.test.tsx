// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { useQuery } from "convex/react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { PublicHomePage } from "./PublicHomePage";

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
}));

const useQueryMock = vi.mocked(useQuery);

describe("PublicHomePage", () => {
  beforeEach(() => {
    useQueryMock.mockReset();
  });

  test("shows native and HH vacancies with distinct apply behavior", () => {
    useQueryMock.mockReturnValue([
      {
        _id: "native_1",
        _creationTime: 1,
        ownerUserId: "employer_1",
        source: "native",
        sourceId: "",
        status: "published",
        title: "Line Cook",
        description: "Kitchen role",
        city: "Aktau",
        salaryMin: 220000,
        salaryMax: 280000,
        salaryCurrency: "KZT",
      },
      {
        _id: "hh_1",
        _creationTime: 2,
        source: "hh",
        sourceId: "hh-1",
        status: "published",
        title: "Hotel Receptionist",
        description: "Front desk role",
        city: "Aktau",
        salaryMin: 260000,
        salaryCurrency: "KZT",
        externalApplyUrl: "https://hh.kz/vacancy/1",
      },
    ] as unknown as ReturnType<typeof useQuery>);

    render(
      <MemoryRouter>
        <PublicHomePage />
      </MemoryRouter>,
    );

    expect(screen.getByText("Line Cook")).toBeInTheDocument();
    expect(screen.getByText("Hotel Receptionist")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Откликнуться в JumysAI/i })).toHaveAttribute(
      "href",
      "/vacancies/native_1/apply",
    );
    expect(screen.getByRole("link", { name: /Открыть на HH/i })).toHaveAttribute(
      "href",
      "https://hh.kz/vacancy/1",
    );
  });
});
