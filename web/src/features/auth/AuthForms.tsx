import { SignIn } from "@clerk/clerk-react";

export function AuthForms() {
  return <SignIn routing="path" path="/login" />;
}
