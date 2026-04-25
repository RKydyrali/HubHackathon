import { X } from "@phosphor-icons/react";
import { useMutation } from "convex/react";
import { useMemo, useState } from "react";

import { Button } from "@/components/shared/Button";
import { api } from "@/lib/convex-api";
import { shouldShowOnboardingHint } from "@/lib/product-experience";

const LOCAL_PREFIX = "jumysai.dismissedHint.";

export function OnboardingHint({
  hintId,
  title,
  body,
  action,
  hasRelevantData,
  dismissedHints,
  persist = "convex",
}: {
  hintId: string;
  title: string;
  body: string;
  action?: React.ReactNode;
  hasRelevantData: boolean;
  dismissedHints?: Record<string, number> | null;
  persist?: "convex" | "local";
}) {
  const dismissHint = useMutation(api.users.dismissHint);
  const [dismissedLocally, setDismissedLocally] = useState(() =>
    persist === "local" && typeof window !== "undefined"
      ? window.localStorage.getItem(`${LOCAL_PREFIX}${hintId}`) !== null
      : false,
  );
  const shouldShow = useMemo(
    () =>
      shouldShowOnboardingHint({
        hintId,
        hasRelevantData: hasRelevantData || dismissedLocally,
        dismissedHints,
      }),
    [dismissedHints, dismissedLocally, hasRelevantData, hintId],
  );

  if (!shouldShow) return null;

  function dismiss() {
    setDismissedLocally(true);
    if (persist === "local" && typeof window !== "undefined") {
      window.localStorage.setItem(`${LOCAL_PREFIX}${hintId}`, String(Date.now()));
      return;
    }
    void dismissHint({ hintId });
  }

  return (
    <section className="rounded-lg border border-primary/20 bg-primary/5 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{body}</p>
          {action ? <div className="mt-3 flex flex-wrap gap-2">{action}</div> : null}
        </div>
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Dismiss hint" onClick={dismiss}>
          <X weight="bold" />
        </Button>
      </div>
    </section>
  );
}
