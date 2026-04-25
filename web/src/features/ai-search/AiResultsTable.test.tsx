// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, test, vi } from "vitest";

import type { Id } from "@/lib/convex-api";
import { AiResultsTable } from "./AiResultsTable";
import type { AiMatchGroups } from "./aiSearchTypes";

const trackDemo = vi.fn();

vi.mock("convex/react", () => ({
  useMutation: () => trackDemo,
}));

function buildMatches(): AiMatchGroups {
  const nativeVacancy = {
    _id: "native_1" as Id<"vacancies">,
    _creationTime: 1,
    ownerUserId: "employer_1" as Id<"users">,
    source: "native" as const,
    sourceId: "",
    status: "published" as const,
    title: "Native cashier",
    description: "Evening work",
    city: "Aktau",
    district: "12 mkr",
    salaryMin: 180000,
    salaryCurrency: "KZT",
  };
  const hhVacancy = {
    _id: "hh_1" as Id<"vacancies">,
    _creationTime: 2,
    source: "hh" as const,
    sourceId: "hh-1",
    status: "published" as const,
    title: "HH administrator",
    description: "External vacancy",
    city: "Aktau",
    salaryMin: 260000,
    salaryCurrency: "KZT",
    externalApplyUrl: "https://hh.kz/vacancy/1",
  };
  const all = [
    {
      vacancy: nativeVacancy,
      explanation: ["close to district"],
      matchScore: 84,
    },
    {
      vacancy: hhVacancy,
      explanation: ["salary available"],
      matchScore: 72,
    },
  ];
  return {
    best: [all[0]],
    nearby: [all[0]],
    fastStart: [],
    hh: [all[1]],
    all,
    totalCount: all.length,
  };
}

describe("AiResultsTable", () => {
  afterEach(() => {
    cleanup();
    trackDemo.mockClear();
  });

  test("renders native vacancies with in-app apply and HH vacancies with external-only apply", async () => {
    render(
      <MemoryRouter>
        <AiResultsTable
          matches={buildMatches()}
          selectedIds={new Set()}
          onToggleCompare={vi.fn()}
          onCompare={vi.fn()}
          onRelaxDistrict={vi.fn()}
          onIncludeHh={vi.fn()}
        />
      </MemoryRouter>,
    );

    const nativeRow = screen.getAllByText("Native cashier")[0].closest("tr");
    expect(nativeRow).not.toBeNull();
    expect(within(nativeRow!).getByRole("link", { name: /JumysAI|Jumys/i })).toHaveAttribute(
      "href",
      "/vacancies/native_1/apply",
    );

    const hhRow = screen.getAllByText("HH administrator")[0].closest("tr");
    expect(hhRow).not.toBeNull();
    expect(within(hhRow!).queryByRole("link", { name: /JumysAI|Jumys/i })).not.toBeInTheDocument();
    const externalLink = within(hhRow!)
      .getAllByRole("link")
      .find((link) => link.getAttribute("href") === "https://hh.kz/vacancy/1");
    expect(externalLink).toBeDefined();

    fireEvent.click(externalLink!);
    expect(trackDemo).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "external_apply_clicked",
        vacancyId: "hh_1",
        surface: "ai_results_table",
      }),
    );
  });

  test("requires two selected vacancies before comparing", async () => {
    const onCompare = vi.fn();
    render(
      <MemoryRouter>
        <AiResultsTable
          matches={buildMatches()}
          selectedIds={new Set(["native_1"])}
          onToggleCompare={vi.fn()}
          onCompare={onCompare}
          onRelaxDistrict={vi.fn()}
          onIncludeHh={vi.fn()}
        />
      </MemoryRouter>,
    );

    const compare = screen.getByRole("button", { name: /compare|сравн|салыс/i });
    expect(compare).toBeDisabled();
    fireEvent.click(compare);
    expect(onCompare).not.toHaveBeenCalled();
  });
});
