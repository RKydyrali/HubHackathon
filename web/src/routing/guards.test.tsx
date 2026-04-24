// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { useAuth } from "@clerk/clerk-react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { render } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { ProtectedRoute } from "./guards";

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
});
