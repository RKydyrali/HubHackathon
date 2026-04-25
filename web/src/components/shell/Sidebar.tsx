import { NavLink, useLocation } from "react-router-dom";

import { BrandMark } from "@/components/shared/BrandMark";
import { Icon, type IconName } from "@/components/shared/Icon";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { AI_MATCHING_ROOT, isAiMatchingPath } from "@/routing/navPaths";
import type { UserRole } from "@/types/domain";

type NavItem = {
  to: string;
  labelKey:
    | "dashboard"
    | "vacancies"
    | "applications"
    | "profile"
    | "notifications"
    | "interviews"
    | "users"
    | "admin"
    | "aiSearch"
    | "forYou"
    | "interviewTrainer"
    | "hiringAssistant";
  icon: IconName;
  end?: boolean;
};

export const navByRole: Record<UserRole, NavItem[]> = {
  seeker: [
    { to: "/vacancies", labelKey: "vacancies", icon: "Briefcase" },
    { to: "/for-you", labelKey: "forYou", icon: "Sparkle" },
    { to: AI_MATCHING_ROOT, labelKey: "aiSearch", icon: "Sparkle", end: true },
    { to: "/applications", labelKey: "applications", icon: "FileText" },
    { to: "/interviews", labelKey: "interviews", icon: "Calendar" },
    { to: "/interview-trainer", labelKey: "interviewTrainer", icon: "ListChecks", end: true },
    { to: "/profile", labelKey: "profile", icon: "UserCircle" },
    { to: "/notifications", labelKey: "notifications", icon: "Bell" },
  ],
  employer: [
    { to: "/employer/dashboard", labelKey: "dashboard", icon: "House", end: true },
    { to: "/employer/ai-hiring", labelKey: "hiringAssistant", icon: "MagnifyingGlass" },
    { to: "/employer/vacancies", labelKey: "vacancies", icon: "Briefcase" },
    { to: "/employer/applications", labelKey: "applications", icon: "Users" },
    { to: "/employer/interviews", labelKey: "interviews", icon: "Calendar" },
    { to: "/employer/notifications", labelKey: "notifications", icon: "Bell" },
  ],
  admin: [
    { to: "/admin", labelKey: "admin", icon: "House", end: true },
    { to: AI_MATCHING_ROOT, labelKey: "aiSearch", icon: "Sparkle", end: true },
    { to: "/admin/users", labelKey: "users", icon: "Users" },
    { to: "/admin/vacancies", labelKey: "vacancies", icon: "Briefcase" },
    { to: "/admin/applications", labelKey: "applications", icon: "FileText" },
    { to: "/admin/interviews", labelKey: "interviews", icon: "Calendar" },
    { to: "/admin/notifications", labelKey: "notifications", icon: "Bell" },
  ],
};

export function Sidebar({ role }: { role: UserRole }) {
  const { copy } = useI18n();
  const { pathname } = useLocation();
  const brandTo =
    role === "employer" ? "/employer/dashboard" : role === "admin" ? "/admin" : AI_MATCHING_ROOT;
  const nextStepHint =
    role === "seeker"
      ? copy.sidebar.nextStepHintSeeker
      : role === "employer"
        ? copy.sidebar.nextStepHintEmployer
        : copy.sidebar.nextStepHintAdmin;

  return (
    <aside className="fixed inset-y-0 left-0 hidden w-[17.5rem] border-r bg-sidebar/94 backdrop-blur-xl md:block">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-72 opacity-55 ornament-subtle" />
      <div className="relative border-b px-6 py-6">
        <BrandMark to={brandTo} />
      </div>
      <nav className="relative flex flex-col gap-1.5 p-4">
        {navByRole[role].map((item) => (
          <NavLink
            key={item.labelKey}
            to={item.to}
            end={item.end}
            className={({ isActive }) => {
              const active =
                item.labelKey === "aiSearch" ? isAiMatchingPath(pathname) : isActive;
              return cn(
                "group flex min-h-11 items-center gap-3 rounded-xl px-3.5 py-2 text-sm font-semibold transition-all",
                active
                  ? "bg-primary text-primary-foreground shadow-[0_14px_34px_rgba(217,75,22,0.2)]"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              );
            }}
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-background/70 text-primary transition-colors group-aria-[current=page]:bg-primary-foreground/15 group-aria-[current=page]:text-primary-foreground">
              <Icon icon={item.icon} data-icon="inline-start" weight="bold" />
            </span>
            {copy.nav[item.labelKey]}
          </NavLink>
        ))}
      </nav>
      <div className="relative mx-4 mt-3 rounded-2xl border bg-background/72 p-4 shadow-card">
        <p className="text-sm font-semibold text-foreground">{copy.dashboard.nextStep}</p>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">{nextStepHint}</p>
      </div>
    </aside>
  );
}
