// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/react";
import { useUser } from "@clerk/clerk-react";
import { useAction, useMutation, useQuery } from "convex/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { I18nProvider } from "@/lib/i18n";
import { SettingsPage } from "./SettingsPage";

vi.mock("@clerk/clerk-react", () => ({
  useUser: vi.fn(),
}));

vi.mock("convex/react", () => ({
  useAction: vi.fn(),
  useMutation: vi.fn(),
  useQuery: vi.fn(),
}));

const useActionMock = vi.mocked(useAction);
const useQueryMock = vi.mocked(useQuery);
const useMutationMock = vi.mocked(useMutation);
const useUserMock = vi.mocked(useUser);

function renderSettings() {
  return render(
    <I18nProvider>
      <SettingsPage />
    </I18nProvider>,
  );
}

describe("SettingsPage Telegram connection", () => {
  beforeEach(() => {
    useUserMock.mockReturnValue({
      user: {
        fullName: "Aruzhan User",
        imageUrl: "",
        primaryEmailAddress: { emailAddress: "aru@example.com" },
      },
    } as ReturnType<typeof useUser>);
    useActionMock.mockReturnValue(
      vi.fn().mockResolvedValue({ url: "https://t.me/JumysAIBot?start=abc123" }) as unknown as ReturnType<
        typeof useAction
      >,
    );
    useMutationMock.mockReturnValue(vi.fn() as unknown as ReturnType<typeof useMutation>);
  });

  test("shows secure connect CTA for unlinked accounts", async () => {
    useQueryMock.mockReturnValue({
      _id: "user_1",
      clerkId: "clerk_1",
      role: "seeker",
      isBotLinked: false,
    });

    renderSettings();

    expect(await screen.findByRole("link", { name: "Подключить Telegram" })).toHaveAttribute(
      "href",
      expect.stringContaining("start="),
    );
  });

  test("shows unlink action for linked accounts", () => {
    useQueryMock.mockReturnValue({
      _id: "user_1",
      clerkId: "clerk_1",
      role: "seeker",
      isBotLinked: true,
      telegramChatId: "123",
      telegramUsername: "aru",
    });

    renderSettings();

    expect(screen.getByText("@aru")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Отключить Telegram" })).toBeInTheDocument();
  });
});
