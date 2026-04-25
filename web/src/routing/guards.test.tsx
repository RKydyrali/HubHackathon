// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { useAuth } from "@clerk/clerk-react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { ProtectedRoute, resolveReturnPathForRole } from "./guards";

vi.mock("@clerk/clerk-react", () => ({
  useAuth: vi.fn(),
}));

vi.mock("convex/react", () => ({
  useConvexAuth: vi.fn(),
  useMutation: vi.fn(),
  useQuery: vi.fn(),
}));

const useAuthMock = vi.mocked(useAuth);
const useConvexAuthMock = vi.mocked(useConvexAuth);
const useQueryMock = vi.mocked(useQuery);
const useMutationMock = vi.mocked(useMutation);

describe("ProtectedRoute", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    useQueryMock.mockReset();
    useMutationMock.mockReset();
    useConvexAuthMock.mockReset();
    useAuthMock.mockReset();
    useMutationMock.mockReturnValue(vi.fn() as unknown as ReturnType<typeof useMutation>);
    useConvexAuthMock.mockReturnValue({
      isLoading: false,
      isAuthenticated: false,
    });
  });

  test("does not request the profile query before sign-in", () => {
    useAuthMock.mockReturnValue({
      isLoaded: true,
      isSignedIn: false,
    } as ReturnType<typeof useAuth>);

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute roles={["seeker"]}>
                <div>Dashboard</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div>Login</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(useQueryMock.mock.calls[1]?.[1]).toBe("skip");
  });

  test("shows retry when syncCurrentUser fails with no user in Convex", async () => {
    const syncCurrentUser = vi.fn().mockRejectedValue(new Error("sync failed"));
    useMutationMock.mockReturnValue(syncCurrentUser as unknown as ReturnType<typeof useMutation>);
    useAuthMock.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
    } as ReturnType<typeof useAuth>);
    useConvexAuthMock.mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
    });
    useQueryMock.mockReturnValue(null);

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute roles={["seeker"]}>
                <div>Dashboard</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div>Login</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(syncCurrentUser).toHaveBeenCalled();
    await waitFor(() => {
      expect(
        screen.getByText(/We could not connect your account/i),
      ).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });

  test("does not sync the user until Convex auth is authenticated", async () => {
    const syncCurrentUser = vi.fn();
    useMutationMock.mockReturnValue(syncCurrentUser as unknown as ReturnType<typeof useMutation>);
    useAuthMock.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
    } as ReturnType<typeof useAuth>);
    useConvexAuthMock.mockReturnValue({
      isLoading: true,
      isAuthenticated: false,
    });
    useQueryMock.mockReturnValue(null);

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute roles={["seeker"]}>
                <div>Dashboard</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div>Login</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(syncCurrentUser).not.toHaveBeenCalled();
  });

  test("redirects signed-in users without a role to onboarding", () => {
    useAuthMock.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
    } as ReturnType<typeof useAuth>);
    useConvexAuthMock.mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
    });
    useQueryMock.mockReturnValue({
      _id: "user_1",
      _creationTime: 1,
      clerkId: "clerk_1",
      isBotLinked: false,
    });

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute roles={["seeker"]}>
                <div>Dashboard</div>
              </ProtectedRoute>
            }
          />
          <Route path="/onboarding" element={<div>Onboarding</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(document.body).toHaveTextContent("Onboarding");
    expect(document.body).not.toHaveTextContent("Dashboard");
  });

  test("preserves search params when sending unassigned users to onboarding", () => {
    useAuthMock.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
    } as ReturnType<typeof useAuth>);
    useConvexAuthMock.mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
    });
    useQueryMock.mockReturnValue({
      _id: "user_1",
      _creationTime: 1,
      clerkId: "clerk_1",
      isBotLinked: false,
    });

    function OnboardingState() {
      const location = useLocation();
      const from = (location.state as { from?: string } | null)?.from;
      return <div>Onboarding from {from}</div>;
    }

    render(
      <MemoryRouter initialEntries={["/ai-search?q=evening"]}>
        <Routes>
          <Route
            path="/ai-search"
            element={
              <ProtectedRoute roles={["seeker"]}>
                <div>AI</div>
              </ProtectedRoute>
            }
          />
          <Route path="/onboarding" element={<OnboardingState />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(document.body).toHaveTextContent("Onboarding from /ai-search?q=evening");
  });

  test("preserves the original path when redirecting seekers without a profile", () => {
    useAuthMock.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
    } as ReturnType<typeof useAuth>);
    useConvexAuthMock.mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
    });
    useQueryMock
      .mockReturnValueOnce({
        _id: "user_seeker",
        _creationTime: 1,
        clerkId: "clerk_seeker",
        isBotLinked: false,
        role: "seeker",
      })
      .mockReturnValueOnce(null);

    function ProfileState() {
      const location = useLocation();
      const from = (location.state as { from?: string } | null)?.from;
      return <div>Profile from {from}</div>;
    }

    render(
      <MemoryRouter initialEntries={["/for-you"]}>
        <Routes>
          <Route
            path="/for-you"
            element={
              <ProtectedRoute roles={["seeker"]} requireProfile>
                <div>For you</div>
              </ProtectedRoute>
            }
          />
          <Route path="/profile" element={<ProfileState />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(document.body).toHaveTextContent("Profile from /for-you");
  });

  test("redirects admin away from seeker-only route to /admin", () => {
    useAuthMock.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
    } as ReturnType<typeof useAuth>);
    useConvexAuthMock.mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
    });
    useQueryMock.mockReturnValue({
      _id: "user_admin",
      _creationTime: 1,
      clerkId: "clerk_admin",
      isBotLinked: false,
      role: "admin",
    });

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute roles={["seeker"]}>
                <div>Dashboard</div>
              </ProtectedRoute>
            }
          />
          <Route path="/admin" element={<div>Admin home</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(document.body).toHaveTextContent("Admin home");
    expect(document.body).not.toHaveTextContent("Dashboard");
  });

  test("redirects employer away from seeker-only route to employer dashboard", () => {
    useAuthMock.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
    } as ReturnType<typeof useAuth>);
    useConvexAuthMock.mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
    });
    useQueryMock.mockReturnValue({
      _id: "user_emp",
      _creationTime: 1,
      clerkId: "clerk_emp",
      isBotLinked: false,
      role: "employer",
    });

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute roles={["seeker"]}>
                <div>Dashboard</div>
              </ProtectedRoute>
            }
          />
          <Route path="/employer/dashboard" element={<div>Employer home</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(document.body).toHaveTextContent("Employer home");
    expect(document.body).not.toHaveTextContent("Dashboard");
  });
});

describe("resolveReturnPathForRole", () => {
  test("keeps seeker apply intent after onboarding", () => {
    expect(resolveReturnPathForRole("seeker", "/vacancies/native_1/apply")).toBe("/vacancies/native_1/apply");
  });

  test("sends employers away from seeker-only apply intent", () => {
    expect(resolveReturnPathForRole("employer", "/vacancies/native_1/apply")).toBe("/employer/dashboard");
  });

  test("keeps public vacancy detail intent for every role", () => {
    expect(resolveReturnPathForRole("admin", "/vacancies/native_1?source=share")).toBe("/vacancies/native_1?source=share");
  });

  test("keeps shared AI matching return paths for every role", () => {
    expect(resolveReturnPathForRole("seeker", "/ai-search?q=barista")).toBe("/ai-search?q=barista");
    expect(resolveReturnPathForRole("employer", "/ai-search/chat_1")).toBe("/ai-search/chat_1");
    expect(resolveReturnPathForRole("admin", "/ai-search")).toBe("/ai-search");
  });

  test("keeps seeker interview trainer intent after onboarding", () => {
    expect(resolveReturnPathForRole("seeker", "/interview-trainer")).toBe("/interview-trainer");
    expect(resolveReturnPathForRole("employer", "/interview-trainer")).toBe("/employer/dashboard");
  });

  test("rejects unsafe or unknown return paths", () => {
    expect(resolveReturnPathForRole("seeker", "https://evil.test/vacancies/native_1")).toBe("/ai-search");
    expect(resolveReturnPathForRole("admin", "/totally-unknown")).toBe("/admin");
  });
});
