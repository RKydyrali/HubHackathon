import { describe, expect, test } from "vitest";

import { assertSharedSecret } from "../convex/lib/http";

describe("bot shared-secret auth", () => {
  test("accepts the configured secret", () => {
    process.env.BOT_SHARED_SECRET = "secret";
    const request = new Request("https://example.com/bot/vacancies", {
      headers: {
        "x-bot-secret": "secret",
      },
    });

    expect(() => assertSharedSecret(request)).not.toThrow();
  });

  test("rejects the wrong secret", () => {
    process.env.BOT_SHARED_SECRET = "secret";
    const request = new Request("https://example.com/bot/vacancies", {
      headers: {
        "x-bot-secret": "wrong",
      },
    });

    expect(() => assertSharedSecret(request)).toThrow("Unauthorized");
  });
});
