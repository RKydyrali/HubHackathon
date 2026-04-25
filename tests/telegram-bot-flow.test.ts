import { describe, expect, test } from "vitest";

import {
  linkedMenuLabels,
  menuActionFromText,
  parseStartPayload,
  unlinkedMenuLabels,
} from "../telegram-bot/src/bot";

describe("telegram bot account states", () => {
  test("parses one-time /start deep-link payloads", () => {
    expect(parseStartPayload("/start secure-token_123")).toBe("secure-token_123");
    expect(parseStartPayload("/start")).toBeNull();
    expect(parseStartPayload("/settings")).toBeNull();
  });

  test("has separate unlinked and linked menus", () => {
    expect(unlinkedMenuLabels()).toContain("Подключить Telegram");
    expect(unlinkedMenuLabels()).not.toContain("Мои отклики");

    expect(linkedMenuLabels()).toEqual([
      "Вакансии",
      "Мои отклики",
      "Уведомления",
      "Настройки",
    ]);
  });

  test("maps high-level menu labels to bot actions", () => {
    expect(menuActionFromText("Вакансии")).toEqual({ type: "jobs" });
    expect(menuActionFromText("Мои отклики")).toEqual({ type: "applications" });
    expect(menuActionFromText("Уведомления")).toEqual({ type: "notifications" });
    expect(menuActionFromText("Настройки")).toEqual({ type: "settings" });
    expect(menuActionFromText("unknown")).toBeNull();
  });
});
