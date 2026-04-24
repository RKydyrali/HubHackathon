import { describe, expect, test } from "vitest";

import { getRuntimeConfig } from "@/lib/runtime-config";

describe("runtime config", () => {
  test("treats placeholder Clerk keys as unconfigured", () => {
    const config = getRuntimeConfig({
      VITE_CONVEX_URL: "http://127.0.0.1:3210",
      VITE_CLERK_PUBLISHABLE_KEY: "pk_test_replace_me",
    });

    expect(config.ready).toBe(false);
    expect(config.missing).toContain("VITE_CLERK_PUBLISHABLE_KEY");
  });

  test("accepts Clerk publishable keys with a real test or live prefix", () => {
    const config = getRuntimeConfig({
      VITE_CONVEX_URL: "http://127.0.0.1:3210",
      VITE_CLERK_PUBLISHABLE_KEY: "pk_test_Y2xlcmsuZXhhbXBsZSQ",
    });

    expect(config.ready).toBe(true);
  });

  test("defaults the Clerk JWT template to convex and accepts overrides", () => {
    const defaultConfig = getRuntimeConfig({
      VITE_CONVEX_URL: "http://127.0.0.1:3210",
      VITE_CLERK_PUBLISHABLE_KEY: "pk_test_Y2xlcmsuZXhhbXBsZSQ",
    });
    const overrideConfig = getRuntimeConfig({
      VITE_CONVEX_URL: "http://127.0.0.1:3210",
      VITE_CLERK_PUBLISHABLE_KEY: "pk_test_Y2xlcmsuZXhhbXBsZSQ",
      VITE_CLERK_JWT_TEMPLATE: "jtmp_example",
    });

    expect(defaultConfig.clerkJwtTemplate).toBe("convex");
    expect(overrideConfig.clerkJwtTemplate).toBe("jtmp_example");
  });
});
