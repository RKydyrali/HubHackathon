// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useAction, useMutation, useQuery } from "convex/react";

import type { Id } from "@/lib/convex-api";
import type { ApplicantWithProfile } from "@/types/domain";
import { EmployerInterviewScenarioSection } from "./EmployerInterviewScenarioSection";

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    message: vi.fn(),
  },
}));

vi.mock("convex/react", () => ({
  useAction: vi.fn(),
  useMutation: vi.fn(),
  useQuery: vi.fn(),
}));

const useActionMock = vi.mocked(useAction);
const useMutationMock = vi.mocked(useMutation);
const useQueryMock = vi.mocked(useQuery);

const applicationId = "application_1" as Id<"applications">;

const item = {
  application: {
    _id: applicationId,
    _creationTime: 1,
    vacancyId: "vacancy_1" as Id<"vacancies">,
    seekerUserId: "seeker_1" as Id<"users">,
    status: "interview",
  },
  vacancy: null,
  profile: { fullName: "Candidate" },
} as ApplicantWithProfile;

describe("EmployerInterviewScenarioSection", () => {
  const generateDraft = vi.fn();
  const saveDraft = vi.fn();
  const publish = vi.fn();

  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    generateDraft.mockReset();
    saveDraft.mockReset();
    publish.mockReset();
    useQueryMock.mockReset();
    useActionMock.mockReset();
    useMutationMock.mockReset();

    useQueryMock.mockReturnValue(null);
    useActionMock.mockReturnValue(generateDraft as never);
    useMutationMock.mockReturnValueOnce(saveDraft as never).mockReturnValueOnce(publish as never);
    generateDraft.mockResolvedValue({
      ok: true,
      aiFailed: false,
      draft: {
        context: "Scenario context",
        tasks: [{ prompt: "Solve the case" }],
        constraints: ["Use current team"],
        rubric: [{ criterion: "Reasoning", description: "Clear logic", maxScore: 100 }],
      },
    });
    saveDraft.mockResolvedValue({ _id: "scenario_1" });
    publish.mockResolvedValue({ _id: "scenario_1", status: "published" });
  });

  test("shows start scenario only while application is in interview stage", () => {
    render(<EmployerInterviewScenarioSection item={item} />);
    expect(screen.getByRole("button", { name: /start scenario/i })).toBeInTheDocument();

    render(
      <EmployerInterviewScenarioSection
        item={{ ...item, application: { ...item.application, status: "reviewing" } }}
      />,
    );
    expect(screen.getAllByRole("button", { name: /start scenario/i })).toHaveLength(1);
  });

  test("renders generated draft fields and publishes after save", async () => {
    render(<EmployerInterviewScenarioSection item={item} />);

    fireEvent.click(screen.getByRole("button", { name: /start scenario/i }));

    expect(await screen.findByDisplayValue("Scenario context")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Solve the case")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /publish scenario/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /publish scenario/i }));

    await waitFor(() => expect(saveDraft).toHaveBeenCalled());
    await waitFor(() => expect(publish).toHaveBeenCalled());
  });
});
