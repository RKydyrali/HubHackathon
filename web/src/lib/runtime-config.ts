type RuntimeEnv = Record<string, string | undefined>;

type ReadyConfig = {
  ready: true;
  convexUrl: string;
  clerkPublishableKey: string;
  clerkJwtTemplate: string;
  missing: [];
};

type MissingConfig = {
  ready: false;
  missing: string[];
  convexUrl?: string;
  clerkPublishableKey?: string;
  clerkJwtTemplate?: string;
};

function hasRealClerkKey(value: string | undefined) {
  return Boolean(
    value &&
      value !== "pk_test_replace_me" &&
      (value.startsWith("pk_test_") || value.startsWith("pk_live_")),
  );
}

export function getRuntimeConfig(env: RuntimeEnv): ReadyConfig | MissingConfig {
  const missing: string[] = [];
  const convexUrl = env.VITE_CONVEX_URL;
  const clerkPublishableKey = env.VITE_CLERK_PUBLISHABLE_KEY;
  const clerkJwtTemplate = env.VITE_CLERK_JWT_TEMPLATE ?? "convex";

  if (!convexUrl) {
    missing.push("VITE_CONVEX_URL");
  }
  if (!hasRealClerkKey(clerkPublishableKey)) {
    missing.push("VITE_CLERK_PUBLISHABLE_KEY");
  }

  if (missing.length > 0 || !convexUrl || !clerkPublishableKey) {
    return {
      ready: false,
      missing,
      convexUrl,
      clerkPublishableKey,
      clerkJwtTemplate,
    };
  }

  return {
    ready: true,
    convexUrl,
    clerkPublishableKey,
    clerkJwtTemplate,
    missing: [],
  };
}
