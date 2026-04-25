// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, test, vi } from "vitest";

import { TopNavigation } from "./TopNavigation";

vi.mock("@clerk/clerk-react", () => ({
  SignOutButton: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useUser: () => ({
    user: {
      fullName: "Jumys User",
      imageUrl: "",
      primaryEmailAddress: { emailAddress: "user@example.com" },
    },
  }),
}));

vi.mock("convex/react", () => ({
  useQuery: () => [],
}));

vi.mock("@/components/shell/NotificationsMenu", () => ({
  NotificationsMenu: () => <button type="button">Notifications</button>,
}));

vi.mock("@/components/shell/CommandSearch", () => ({
  CommandSearch: () => <div>Command search</div>,
}));

vi.mock("@/lib/telegramBotUrl", () => ({
  getTelegramBotUrl: () => "https://t.me/jumysai_bot",
}));

describe("TopNavigation", () => {
  afterEach(() => {
    cleanup();
  });

  test("keeps profile access for seekers", () => {
    render(
      <MemoryRouter>
        <TopNavigation role="seeker" />
      </MemoryRouter>,
    );

    expect(screen.getAllByRole("link", { name: /профиль/i }).some((link) => link.getAttribute("href") === "/profile")).toBe(true);
  });

  test("does not expose seeker profile dead-end to employer or admin", () => {
    for (const role of ["employer", "admin"] as const) {
      const { unmount } = render(
        <MemoryRouter>
          <TopNavigation role={role} />
        </MemoryRouter>,
      );

      expect(screen.queryByRole("link", { name: /профиль/i })).not.toBeInTheDocument();
      unmount();
    }
  });
});
