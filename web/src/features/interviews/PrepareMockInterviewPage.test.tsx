// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/react";
import { useAction, useMutation, useQuery } from "convex/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { type Id } from "@/lib/convex-api";

import { PrepareMockInterviewPage } from "./PrepareMockInterviewPage";

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    message: vi.fn(),
  },
}));

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useAction: vi.fn(),
}));

const useQueryMock = vi.mocked(useQuery);
const useMutationMock = vi.mocked(useMutation);
const useActionMock = vi.mocked(useAction);

const vacancyId = "native_1" as Id<"vacancies">;
const sessionId = "mock_session_1" as Id<"mockInterviewSessions">;

const mockVacancy = {
  _id: vacancyId,
  _creationTime: 1,
  ownerUserId: "user_1" as Id<"users">,
  source: "native" as const,
  sourceId: "",
  status: "published" as const,
  title: "Cook",
  description: "Kitchen work",
  city: "Aktau",
  salaryMin: 1,
  salaryMax: 2,
  salaryCurrency: "KZT" as const,
};

function renderPrepare() {
  return render(
    <MemoryRouter initialEntries={[`/prepare/${vacancyId}`]}>
      <Routes>
        <Route path="/prepare/:vacancyId" element={<PrepareMockInterviewPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("PrepareMockInterviewPage", () => {
  beforeEach(() => {
    useQueryMock.mockReset();
    useMutationMock.mockReset();
    useActionMock.mockReset();
    const getOrCreate = vi.fn().mockResolvedValue({ _id: sessionId });
    useMutationMock.mockReturnValue(getOrCreate as never);
    useActionMock.mockReturnValue(
      vi.fn().mockResolvedValue({ ok: true, finalized: false }) as never,
    );
    useQueryMock.mockImplementation(
      ((_q: unknown, args: unknown) => {
        if (args && typeof args === "object" && "vacancyId" in args) {
          return mockVacancy;
        }
        if (args === "skip") {
          return undefined;
        }
        if (args && typeof args === "object" && "sessionId" in args) {
          return {
            _id: sessionId,
            _creationTime: 1,
            vacancyId,
            seekerUserId: "user_seeker" as Id<"users">,
            messages: [],
            status: "in_progress" as const,
            createdAt: 1,
            updatedAt: 1,
          };
        }
        return undefined;
      }) as never,
    );
  });

  test("renders live mock interview area after session boots", async () => {
    renderPrepare();

    expect(await screen.findByRole("heading", { name: "Мок-интервью" })).toBeInTheDocument();
    expect(
      await screen.findByText(/Напишите ответ или задайте уточняющий вопрос/),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Мок-интервью", { selector: "section" })).toBeInTheDocument();
  });
});
