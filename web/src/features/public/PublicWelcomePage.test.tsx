// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { useQuery } from "convex/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { getCopy, I18nProvider } from "@/lib/i18n";
import type { Id } from "@/lib/convex-api";
import { PublicWelcomePage } from "./PublicWelcomePage";

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
}));

const useQueryMock = vi.mocked(useQuery);
const guideStorageKey = "jumysai.publicGuide.dismissed";

beforeEach(() => {
  class IntersectionObserverMock {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
    takeRecords = vi.fn(() => []);
  }
  vi.stubGlobal("IntersectionObserver", IntersectionObserverMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const nativeVacancy = {
  _id: "native_1" as Id<"vacancies">,
  _creationTime: 1,
  ownerUserId: "user_1" as Id<"users">,
  source: "native" as const,
  sourceId: "",
  status: "published" as const,
  title: "Официант на вечер",
  description: "Смены рядом с домом, можно без опыта.",
  city: "Актау",
  district: "12 мкр",
  salaryMin: 180000,
  salaryMax: 240000,
  salaryCurrency: "KZT" as const,
};

function renderPage() {
  return render(
    <MemoryRouter>
      <I18nProvider>
        <PublicWelcomePage />
      </I18nProvider>
    </MemoryRouter>,
  );
}

describe("PublicWelcomePage", () => {
  beforeEach(() => {
    localStorage.clear();
    useQueryMock.mockReset();
  });

  test("shows the three primary guest entry points with clear destinations", () => {
    useQueryMock.mockReturnValue([nativeVacancy]);

    renderPage();

    expect(screen.getAllByRole("link", { name: /смотреть вакансии/i })[0]).toHaveAttribute(
      "href",
      "/vacancies",
    );
    expect(screen.getAllByRole("link", { name: /найти с ai/i })[0]).toHaveAttribute("href", "/login");
    expect(screen.getAllByRole("link", { name: /работодателям/i })[0]).toHaveAttribute(
      "href",
      "/login",
    );
  });

  test("renders a live public vacancy preview from Convex data", () => {
    useQueryMock.mockReturnValue([nativeVacancy]);

    renderPage();

    expect(screen.getByText("Официант на вечер")).toBeInTheDocument();
    expect(screen.getByText("12 мкр")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /открыть вакансию/i })).toHaveAttribute(
      "href",
      "/vacancies/native_1",
    );
  });

  test("uses a meaningful loading state while public vacancies are loading", () => {
    useQueryMock.mockReturnValue(undefined);

    renderPage();

    expect(screen.getByText(/загружаем вакансии/i)).toBeInTheDocument();
  });

  test("uses a helpful empty state when there are no public vacancies", () => {
    useQueryMock.mockReturnValue([]);

    renderPage();

    expect(screen.getByText(/вакансии скоро появятся/i)).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /смотреть все вакансии/i })[0]).toHaveAttribute(
      "href",
      "/vacancies",
    );
  });

  test("shows the first-visit guide with the first localized step", () => {
    useQueryMock.mockReturnValue([nativeVacancy]);
    const guide = getCopy("ru").publicHome.guide;

    renderPage();

    expect(screen.getByRole("region", { name: guide.ariaLabel })).toBeInTheDocument();
    expect(screen.getByText(guide.steps[0])).toBeInTheDocument();
    expect(screen.getByRole("button", { name: guide.next })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: guide.skip })).toBeInTheDocument();
  });

  test("advances the first-visit guide through localized steps", () => {
    useQueryMock.mockReturnValue([nativeVacancy]);
    const guide = getCopy("ru").publicHome.guide;

    renderPage();

    fireEvent.click(screen.getByRole("button", { name: guide.next }));
    expect(screen.getByText(guide.steps[1])).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: guide.next }));
    expect(screen.getByText(guide.steps[2])).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: guide.next }));
    expect(screen.getByText(guide.steps[3])).toBeInTheDocument();
    expect(screen.getByRole("button", { name: guide.done })).toBeInTheDocument();
  });

  test("skips and persists dismissal of the first-visit guide", () => {
    useQueryMock.mockReturnValue([nativeVacancy]);
    const guide = getCopy("ru").publicHome.guide;

    renderPage();

    fireEvent.click(screen.getByRole("button", { name: guide.skip }));

    expect(screen.queryByRole("region", { name: guide.ariaLabel })).not.toBeInTheDocument();
    expect(localStorage.getItem(guideStorageKey)).toBe("true");
  });

  test("completes and persists dismissal of the first-visit guide", () => {
    useQueryMock.mockReturnValue([nativeVacancy]);
    const guide = getCopy("ru").publicHome.guide;

    renderPage();

    fireEvent.click(screen.getByRole("button", { name: guide.next }));
    fireEvent.click(screen.getByRole("button", { name: guide.next }));
    fireEvent.click(screen.getByRole("button", { name: guide.next }));
    fireEvent.click(screen.getByRole("button", { name: guide.done }));

    expect(screen.queryByRole("region", { name: guide.ariaLabel })).not.toBeInTheDocument();
    expect(localStorage.getItem(guideStorageKey)).toBe("true");
  });

  test("does not render the first-visit guide after dismissal", () => {
    useQueryMock.mockReturnValue([nativeVacancy]);
    const guide = getCopy("ru").publicHome.guide;
    localStorage.setItem(guideStorageKey, "true");

    renderPage();

    expect(screen.queryByRole("region", { name: guide.ariaLabel })).not.toBeInTheDocument();
  });
});
