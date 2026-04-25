import { describe, expect, test } from "vitest";

import type { Doc } from "../convex/_generated/dataModel";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  mergeNotificationPreferences,
  shouldAttemptTelegramDelivery,
} from "../convex/lib/notificationPreferences";

function userStub(
  overrides: Partial<Pick<Doc<"users">, "telegramChatId" | "notificationPreferences">>,
): Pick<Doc<"users">, "telegramChatId" | "notificationPreferences"> {
  return {
    telegramChatId: "123",
    notificationPreferences: undefined,
    ...overrides,
  };
}

describe("mergeNotificationPreferences", () => {
  test("fills defaults", () => {
    expect(mergeNotificationPreferences(null)).toEqual(DEFAULT_NOTIFICATION_PREFERENCES);
  });

  test("merges partial", () => {
    expect(
      mergeNotificationPreferences({
        telegram: false,
        newApplications: false,
      }),
    ).toMatchObject({
      telegram: false,
      newApplications: false,
      inApp: true,
    });
  });
});

describe("shouldAttemptTelegramDelivery", () => {
  test("requires chat id, global telegram, and per-type flag", () => {
    expect(
      shouldAttemptTelegramDelivery(userStub({ telegramChatId: undefined }), "new_application"),
    ).toBe(false);
    expect(
      shouldAttemptTelegramDelivery(
        userStub({ notificationPreferences: { telegram: false } as any }),
        "new_application",
      ),
    ).toBe(false);
    expect(
      shouldAttemptTelegramDelivery(
        userStub({
          notificationPreferences: { newApplications: false } as any,
        }),
        "new_application",
      ),
    ).toBe(false);
    expect(shouldAttemptTelegramDelivery(userStub({}), "new_application")).toBe(true);
  });

  test("custom type uses only global telegram", () => {
    expect(
      shouldAttemptTelegramDelivery(
        userStub({
          notificationPreferences: { aiRecommendations: false } as any,
        }),
        "custom",
      ),
    ).toBe(true);
  });
});
