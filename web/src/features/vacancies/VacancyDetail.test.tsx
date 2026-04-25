// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { useAuth } from "@clerk/clerk-react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useQuery } from "convex/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type { Id } from "@/lib/convex-api";
import type { Vacancy } from "@/types/domain";
import { VacancyDetail } from "./VacancyDetail";

vi.mock("@clerk/clerk-react", () => ({
  useAuth: vi.fn(),
}));

const trackDemo = vi.fn();

vi.mock("convex/react", () => ({
  useMutation: () => trackDemo,
  useQuery: vi.fn(),
}));

const useAuthMock = vi.mocked(useAuth);
const useQueryMock = vi.mocked(useQuery);

function mockVacancyDetailQueries(self: unknown, trust: unknown = null) {
  useQueryMock.mockImplementation(((_ref: unknown, args: unknown) => {
    if (args === "skip") return undefined;
    if (args && typeof args === "object" && "vacancyId" in args) return trust;
    return self;
  }) as typeof useQuery);
}

const nativeVacancy = {
  _id: "native_1" as Id<"vacancies">,
  _creationTime: 1,
  ownerUserId: "user_1" as Id<"users">,
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

function LoginState() {
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  return <div>Login from {from}</div>;
}

describe("VacancyDetail role-aware actions", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    useAuthMock.mockReset();
    useQueryMock.mockReset();
    trackDemo.mockReset();
    trackDemo.mockResolvedValue(undefined);
  });

  test("sends anonymous users to login while preserving apply intent", () => {
    useAuthMock.mockReturnValue({ isSignedIn: false } as ReturnType<typeof useAuth>);
    mockVacancyDetailQueries(undefined);

    render(
      <MemoryRouter initialEntries={["/vacancies/native_1"]}>
        <Routes>
          <Route path="/vacancies/:id" element={<VacancyDetail vacancy={nativeVacancy} />} />
          <Route path="/login" element={<LoginState />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getAllByRole("link", { name: /отклик|войти/i })[0]);

    expect(document.body).toHaveTextContent("Login from /vacancies/native_1/apply");
  });

  test("shows native apply only to signed-in seekers", () => {
    useAuthMock.mockReturnValue({ isSignedIn: true } as ReturnType<typeof useAuth>);
    mockVacancyDetailQueries({ role: "seeker" });

    render(
      <MemoryRouter>
        <VacancyDetail vacancy={nativeVacancy} />
      </MemoryRouter>,
    );

    expect(screen.getAllByRole("link", { name: /откликнуться в jumysai/i })[0]).toHaveAttribute(
      "href",
      "/vacancies/native_1/apply",
    );
  });

  test("shows employers a relevant alternative instead of apply", () => {
    useAuthMock.mockReturnValue({ isSignedIn: true } as ReturnType<typeof useAuth>);
    mockVacancyDetailQueries({ role: "employer" });

    render(
      <MemoryRouter>
        <VacancyDetail vacancy={nativeVacancy} />
      </MemoryRouter>,
    );

    expect(screen.queryByRole("link", { name: /откликнуться в jumysai/i })).not.toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /управлять вакансиями/i })[0]).toHaveAttribute(
      "href",
      "/employer/vacancies",
    );
  });

  test("keeps HH external apply available", () => {
    useAuthMock.mockReturnValue({ isSignedIn: true } as ReturnType<typeof useAuth>);
    mockVacancyDetailQueries(
      { role: "employer" },
      {
        score: null,
        badgeText: "внешняя вакансия",
        tone: "muted",
        responseRate: null,
        averageResponseTime: null,
        hiresCount: 0,
        complaintsCount: 0,
        dataSufficiency: "external",
      },
    );

    render(
      <MemoryRouter>
        <VacancyDetail
          vacancy={{
            ...nativeVacancy,
            _id: "hh_1" as Id<"vacancies">,
            source: "hh",
            externalApplyUrl: "https://hh.kz/vacancy/1",
          } as Vacancy}
        />
      </MemoryRouter>,
    );

    expect(screen.getAllByRole("link", { name: /открыть на hh/i })[0]).toHaveAttribute(
      "href",
      "https://hh.kz/vacancy/1",
    );
  });

  test("shows compact company trust badge near vacancy metadata", () => {
    useAuthMock.mockReturnValue({ isSignedIn: true } as ReturnType<typeof useAuth>);
    mockVacancyDetailQueries(
      { role: "seeker" },
      {
        score: 91,
        badgeText: "часто отвечает",
        tone: "success",
        responseRate: 1,
        averageResponseTime: 2 * 60 * 60 * 1000,
        hiresCount: 1,
        complaintsCount: 0,
        dataSufficiency: "sufficient",
      },
    );

    render(
      <MemoryRouter>
        <VacancyDetail vacancy={nativeVacancy} />
      </MemoryRouter>,
    );

    expect(screen.getAllByText("часто отвечает").length).toBeGreaterThan(0);
  });
});
