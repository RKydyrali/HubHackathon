import { describe, expect, test } from "vitest";

import { getTelegramBotUrl } from "@/lib/telegramBotUrl";

describe("getTelegramBotUrl", () => {
  test("uses the configured Telegram bot URL when present", () => {
    expect(
      getTelegramBotUrl({
        VITE_TELEGRAM_BOT_URL: " https://t.me/custom_bot ",
      }),
    ).toBe("https://t.me/custom_bot");
  });

  test("falls back to the public JumysAI bot URL", () => {
    expect(getTelegramBotUrl({})).toBe("https://t.me/JumysAIBot");
  });
});
