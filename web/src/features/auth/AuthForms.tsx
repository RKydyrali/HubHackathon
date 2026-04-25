import { SignIn } from "@clerk/clerk-react";
import { useLocation } from "react-router-dom";

function buildRedirectUrl(from: string | undefined): string | undefined {
  if (!from) return undefined;
  if (from.startsWith("http://") || from.startsWith("https://")) return from;
  if (from.startsWith("/")) return `${window.location.origin}${from}`;
  return undefined;
}

export function AuthForms() {
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  const redirectUrl = buildRedirectUrl(from);

  return (
    <SignIn
      routing="path"
      path="/login"
      {...(redirectUrl
        ? { forceRedirectUrl: redirectUrl }
        : { fallbackRedirectUrl: `${window.location.origin}/` })}
    />
  );
}
