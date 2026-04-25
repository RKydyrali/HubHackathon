import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

import {
  botUserOnboardingRoles,
  botUserUpsertSchema,
} from "../convex/lib/botUserHttpSchema";

const __dirname = dirname(fileURLToPath(import.meta.url));
const usersTsPath = join(__dirname, "../convex/users.ts");

function readUsersSource(): string {
  return readFileSync(usersTsPath, "utf8");
}

function extractSyncCurrentUserArgsBlock(source: string): string {
  const start = source.indexOf("export const syncCurrentUser = mutation({");
  if (start === -1) {
    throw new Error("syncCurrentUser not found in convex/users.ts");
  }
  const fromArgs = source.indexOf("args:", start);
  if (fromArgs === -1) {
    throw new Error("syncCurrentUser: args: not found");
  }
  const openBrace = source.indexOf("{", fromArgs);
  if (openBrace === -1) {
    throw new Error("syncCurrentUser: args { not found");
  }
  let depth = 0;
  for (let i = openBrace; i < source.length; i++) {
    const c = source[i];
    if (c === "{") depth++;
    if (c === "}") {
      depth--;
      if (depth === 0) {
        return source.slice(fromArgs, i + 1);
      }
    }
  }
  throw new Error("syncCurrentUser: could not find end of args block");
}

describe("user role policy surface (regression)", () => {
  test("syncCurrentUser has no client role; does not use userRoleValidator in args", () => {
    const block = extractSyncCurrentUserArgsBlock(readUsersSource());
    expect(block).not.toMatch(/\brole\s*:/);
    expect(block).not.toMatch(/userRoleValidator/);
    expect(block).toMatch(/args:\s*\{\s*\}/);
  });

  test("bot user upsert schema rejects admin role; accepts seeker for new user body", () => {
    const bad = botUserUpsertSchema.safeParse({
      telegramChatId: "123",
      role: "admin",
    });
    expect(bad.success).toBe(false);

    const good = botUserUpsertSchema.safeParse({
      telegramChatId: "123",
      role: "seeker",
    });
    expect(good.success).toBe(true);
  });

  test("integrator allowed roles are onboarding-only and exclude admin", () => {
    expect(botUserOnboardingRoles).toEqual(["seeker", "employer"]);
    expect(botUserOnboardingRoles as readonly string[]).not.toContain("admin");
  });
});
