// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useMutation } from "convex/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { useUserRole } from "@/hooks/useUserRole";
import { OnboardingPage } from "./OnboardingPage";

vi.mock("convex/react", () => ({
  useMutation: vi.fn(),
}));

vi.mock("@/hooks/useUserRole", () => ({
  useUserRole: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn() },
}));

const useMutationMock = vi.mocked(useMutation);
const useUserRoleMock = vi.mocked(useUserRole);

describe("OnboardingPage", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    useMutationMock.mockReset();
    useUserRoleMock.mockReset();
    useUserRoleMock.mockReturnValue({
      loading: false,
      user: { _id: "user_1", role: undefined },
      value: null,
    } as ReturnType<typeof useUserRole>);
    useMutationMock.mockReturnValue(vi.fn().mockResolvedValue(undefined) as unknown as ReturnType<typeof useMutation>);
  });

  test("returns new seekers to the preserved apply path when it matches their role", async () => {
    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: "/onboarding",
            state: { from: "/vacancies/native_1/apply" },
          },
        ]}
      >
        <Routes>
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/vacancies/:id/apply" element={<div>Apply page</div>} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /ищу работу/i }));

    await waitFor(() => {
      expect(document.body).toHaveTextContent("Apply page");
    });
  });

  test("sends new employers to employer home when preserved intent is seeker-only", async () => {
    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: "/onboarding",
            state: { from: "/vacancies/native_1/apply" },
          },
        ]}
      >
        <Routes>
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/employer/dashboard" element={<div>Employer home</div>} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /нанимаю людей/i }));

    await waitFor(() => {
      expect(document.body).toHaveTextContent("Employer home");
    });
  });
});
