// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useMutation, useQuery } from "convex/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type { Id } from "@/lib/convex-api";
import { SeekerInterviewScenarioPanel } from "./SeekerInterviewScenarioPanel";

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    message: vi.fn(),
  },
}));

vi.mock("convex/react", () => ({
  useMutation: vi.fn(),
  useQuery: vi.fn(),
}));

const useQueryMock = vi.mocked(useQuery);
const useMutationMock = vi.mocked(useMutation);
const applicationId = "application_1" as Id<"applications">;

describe("SeekerInterviewScenarioPanel", () => {
  const submit = vi.fn();

  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    submit.mockReset();
    useQueryMock.mockReset();
    useMutationMock.mockReset();
    useMutationMock.mockReturnValue(submit as never);
    submit.mockResolvedValue({ _id: "submission_2", attemptNumber: 2 });
    useQueryMock.mockReturnValue({
      scenario: {
        _id: "scenario_1",
        status: "published",
        context: "Plan a service recovery for a delayed customer order.",
        tasks: [{ prompt: "Write the customer response and internal action plan." }],
        constraints: ["Use a 20,000 KZT service budget."],
        rubric: [{ criterion: "Practicality", description: "Can be implemented today.", maxScore: 100 }],
      },
      latestSubmission: {
        _id: "submission_1",
        attemptNumber: 1,
        status: "evaluated",
        answers: [{ taskIndex: 0, answer: "Previous answer", links: [] }],
        evaluation: {
          overallScore: 74,
          criterionScores: [
            {
              criterion: "Practicality",
              score: 74,
              maxScore: 100,
              evidence: "Includes direct customer reply.",
            },
          ],
          riskNotes: ["Needs clearer internal owner."],
          recommendation: "Good base for follow-up.",
        },
      },
      submissions: [],
    });
  });

  test("renders published scenario and allows resubmission", async () => {
    render(<SeekerInterviewScenarioPanel applicationId={applicationId} />);

    expect(screen.getByText(/service recovery/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /AI assessment/i })).toBeInTheDocument();
    expect(screen.getByText("74%")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /resubmit solution/i })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/answer for task 1/i), {
      target: { value: "Updated answer with owner and timeline." },
    });
    fireEvent.click(screen.getByRole("button", { name: /resubmit solution/i }));

    await waitFor(() => expect(submit).toHaveBeenCalled());
  });
});
