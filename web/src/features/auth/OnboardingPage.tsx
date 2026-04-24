import { useMutation } from "convex/react";
import { Briefcase, UserCircle } from "@phosphor-icons/react";
import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { motion } from "framer-motion";

import { Button } from "@/components/shared/Button";
import { BrandMark } from "@/components/shared/BrandMark";
import { LocaleToggle } from "@/components/shared/LocaleToggle";
import { api } from "@/lib/convex-api";
import { useI18n } from "@/lib/i18n";
import { motionPresets } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { useUserRole } from "@/hooks/useUserRole";

type OnboardingRole = "seeker" | "employer";

export function OnboardingPage() {
  const navigate = useNavigate();
  const role = useUserRole();
  const chooseRole = useMutation(api.users.chooseOnboardingRole);
  const [pendingRole, setPendingRole] = useState<OnboardingRole | null>(null);
  const { copy } = useI18n();

  const options = [
    {
      role: "seeker" as const,
      title: copy.auth.seekerTitle,
      body: copy.auth.seekerBody,
      Icon: UserCircle,
      redirectTo: "/dashboard",
    },
    {
      role: "employer" as const,
      title: copy.auth.employerTitle,
      body: copy.auth.employerBody,
      Icon: Briefcase,
      redirectTo: "/employer/dashboard",
    },
  ];

  if (!role.loading && role.value === "seeker") return <Navigate to="/dashboard" replace />;
  if (!role.loading && role.value === "employer") return <Navigate to="/employer/dashboard" replace />;
  if (!role.loading && role.value === "admin") return <Navigate to="/admin" replace />;

  async function selectRole(nextRole: OnboardingRole) {
    const option = options.find((item) => item.role === nextRole)!;
    setPendingRole(nextRole);
    try {
      await chooseRole({ role: nextRole });
      toast.success(option.title);
      navigate(option.redirectTo, { replace: true });
    } finally {
      setPendingRole(null);
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-background p-4 ornament-subtle">
      <motion.section {...motionPresets.page} className="w-full max-w-4xl rounded-[1.75rem] border bg-card p-5 shadow-lift md:p-8">
        <div className="flex items-center justify-between gap-3">
          <BrandMark />
          <LocaleToggle />
        </div>
        <div className="mt-8 max-w-2xl">
          <h1 className="font-heading text-4xl font-extrabold tracking-tight text-foreground">{copy.auth.chooseRoleTitle}</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{copy.auth.chooseRoleBody}</p>
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {options.map((option) => (
            <button
              key={option.role}
              className={cn(
                "min-h-44 rounded-2xl border bg-background/72 p-5 text-left shadow-card transition hover:-translate-y-0.5 hover:border-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60",
                pendingRole === option.role && "border-primary bg-primary/5",
              )}
              disabled={pendingRole !== null}
              onClick={() => void selectRole(option.role)}
              type="button"
            >
              <span className="grid size-12 place-items-center rounded-xl border bg-card text-primary">
                <option.Icon weight="duotone" />
              </span>
              <span className="mt-4 block text-base font-semibold text-foreground">{option.title}</span>
              <span className="mt-2 block text-sm leading-6 text-muted-foreground">{option.body}</span>
            </button>
          ))}
        </div>
        <div className="mt-6">
          <Button variant="ghost" onClick={() => navigate("/")} type="button">
            {copy.auth.backToVacancies}
          </Button>
        </div>
      </motion.section>
    </main>
  );
}
