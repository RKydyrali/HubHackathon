import { describe, expect, test } from "vitest";

import {
  TELEGRAM_LINK_TOKEN_TTL_MS,
  buildTelegramDeepLink,
  getTelegramLinkRecordStatus,
  hasTelegramLinkConflict,
} from "../convex/lib/telegramLinking";

describe("telegram account linking policy", () => {
  test("builds a Telegram deep link with a one-time start payload", () => {
    expect(buildTelegramDeepLink("https://t.me/JumysAIBot", "abc123")).toBe(
      "https://t.me/JumysAIBot?start=abc123",
    );
    expect(buildTelegramDeepLink("https://t.me/JumysAIBot?foo=bar", "abc123")).toBe(
      "https://t.me/JumysAIBot?foo=bar&start=abc123",
    );
  });

  test("classifies one-time link records before redemption", () => {
    const now = 1_000_000;

    expect(getTelegramLinkRecordStatus({ expiresAt: now + 1 }, now)).toBe("active");
    expect(getTelegramLinkRecordStatus({ expiresAt: now - 1 }, now)).toBe("expired");
    expect(getTelegramLinkRecordStatus({ expiresAt: now + TELEGRAM_LINK_TOKEN_TTL_MS, usedAt: now })).toBe(
      "used",
    );
  });

  test("rejects linking a Telegram chat already attached to another user", () => {
    expect(
      hasTelegramLinkConflict({
        existingTelegramUserId: "user_telegram",
        targetUserId: "user_web",
      }),
    ).toBe(true);

    expect(
      hasTelegramLinkConflict({
        existingTelegramUserId: "user_web",
        targetUserId: "user_web",
      }),
    ).toBe(false);
  });
});
