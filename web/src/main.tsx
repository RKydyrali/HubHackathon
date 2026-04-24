import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";
import { StrictMode, useCallback, useMemo } from "react";
import { createRoot } from "react-dom/client";

import App from "@/App";
import { I18nProvider } from "@/lib/i18n";
import { getRuntimeConfig } from "@/lib/runtime-config";

import "./index.css";

const config = getRuntimeConfig(import.meta.env);
const root = createRoot(document.getElementById("root")!);

if (!config.ready) {
  root.render(
    <StrictMode>
      <MissingConfigScreen missing={config.missing} />
    </StrictMode>,
  );
} else {
  const convex = new ConvexReactClient(config.convexUrl);
  const useConvexAuthFromClerk = createUseConvexAuthFromClerk(config.clerkJwtTemplate);

  root.render(
    <StrictMode>
      <ClerkProvider publishableKey={config.clerkPublishableKey}>
        <ConvexProviderWithAuth client={convex} useAuth={useConvexAuthFromClerk}>
          <I18nProvider>
            <App />
          </I18nProvider>
        </ConvexProviderWithAuth>
      </ClerkProvider>
    </StrictMode>,
  );
}

function createUseConvexAuthFromClerk(template: string) {
  return function useConvexAuthFromClerk() {
    const { isLoaded, isSignedIn, getToken } = useAuth();
    const fetchAccessToken = useCallback(
      async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
        try {
          return await getToken({
            template,
            skipCache: forceRefreshToken,
          });
        } catch {
          return null;
        }
      },
      [getToken],
    );

    return useMemo(
      () => ({
        isLoading: !isLoaded,
        isAuthenticated: isSignedIn ?? false,
        fetchAccessToken,
      }),
      [fetchAccessToken, isLoaded, isSignedIn],
    );
  };
}

function MissingConfigScreen({ missing }: { missing: string[] }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-background p-4 ornament-subtle">
      <section className="w-full max-w-xl rounded-lg border bg-card p-5 shadow-card">
        <p className="text-sm font-semibold text-primary">JumysAI setup</p>
        <h1 className="mt-2 text-xl font-semibold text-foreground">
          Frontend environment is not ready
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Add real values in <code>web/.env.local</code>, then restart the Vite dev server.
          Clerk rejects placeholder publishable keys before the app can mount.
        </p>
        <div className="mt-5 rounded-lg border bg-muted p-4 font-mono text-sm">
          {missing.map((item) => (
            <div key={item}>{item}=</div>
          ))}
        </div>
      </section>
    </main>
  );
}
