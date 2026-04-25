import { describe, expect, test } from "vitest";
import { z, ZodError } from "zod";

import {
  assertSharedSecret,
  botErrorResponse,
  BotSharedSecretNotConfiguredError,
} from "../convex/lib/http";

describe("bot shared-secret auth", () => {
  const prev = process.env.BOT_SHARED_SECRET;

  test("accepts the configured secret", () => {
    process.env.BOT_SHARED_SECRET = "secret";
    const request = new Request("https://example.com/v1/bot/vacancies", {
      headers: {
        "x-bot-secret": "secret",
      },
    });

    expect(() => assertSharedSecret(request)).not.toThrow();
  });

  test("rejects the wrong secret", () => {
    process.env.BOT_SHARED_SECRET = "secret";
    const request = new Request("https://example.com/v1/bot/vacancies", {
      headers: {
        "x-bot-secret": "wrong",
      },
    });

    expect(() => assertSharedSecret(request)).toThrow("Unauthorized");
  });

  test("path is not part of auth (legacy /bot/* still works with secret)", () => {
    process.env.BOT_SHARED_SECRET = "secret";
    const request = new Request("https://example.com/bot/vacancies", {
      headers: { "x-bot-secret": "secret" },
    });
    expect(() => assertSharedSecret(request)).not.toThrow();
  });

  test("throws when BOT_SHARED_SECRET is missing", () => {
    delete process.env.BOT_SHARED_SECRET;
    const request = new Request("https://example.com/v1/bot/vacancies", {
      headers: { "x-bot-secret": "x" },
    });
    expect(() => assertSharedSecret(request)).toThrow(BotSharedSecretNotConfiguredError);
  });

  test.afterAll(() => {
    if (prev === undefined) {
      delete process.env.BOT_SHARED_SECRET;
    } else {
      process.env.BOT_SHARED_SECRET = prev;
    }
  });
});

describe("botErrorResponse", () => {
  test("maps missing shared secret to 500 with generic message", () => {
    const res = botErrorResponse(new BotSharedSecretNotConfiguredError());
    expect(res.status).toBe(500);
    return res.json().then((body) => {
      expect(body).toEqual({ error: "Internal server error" });
    });
  });

  test("maps wrong secret to 401", () => {
    const res = botErrorResponse(new Error("Unauthorized"));
    expect(res.status).toBe(401);
    return res.json().then((body) => {
      expect(body).toEqual({ error: "Unauthorized" });
    });
  });

  test("maps ZodError to 400 with structured issues", () => {
    const schema = z.object({ a: z.string() });
    let err: ZodError;
    try {
      schema.parse({});
    } catch (e) {
      err = e as ZodError;
    }
    const res = botErrorResponse(err!);
    expect(res.status).toBe(400);
    return res.json().then((body) => {
      expect(body).toMatchObject({ error: "Validation failed" });
      expect(Array.isArray((body as { issues: unknown }).issues)).toBe(true);
      const issues = (body as { issues: { path: unknown[]; message: string; code: string }[] })
        .issues;
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]).toMatchObject({ path: ["a"], code: "invalid_type" });
    });
  });

  test("maps invalid JSON to 400", () => {
    const res = botErrorResponse(new Error("Invalid JSON"));
    expect(res.status).toBe(400);
    return res.json().then((body) => {
      expect(body).toEqual({ error: "Invalid JSON" });
    });
  });
});
