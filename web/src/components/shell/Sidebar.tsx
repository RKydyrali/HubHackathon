import { NavLink } from "react-router-dom";

import { BrandMark } from "@/components/shared/BrandMark";
import { Icon, type IconName } from "@/components/shared/Icon";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/domain";

type NavItem = {
  to: string;
  labelKey: "dashboard" | "vacancies" | "applications" | "profile" | "notifications" | "interviews" | "users" | "admin" | "aiSearch";
  icon: IconName;
  end?: boolean;
};

export const navByRole: Record<UserRole, NavItem[]> = {
  seeker: [
    { to: "/dashboard", labelKey: "dashboard", icon: "House", end: true },
    { to: "/dashboard/ai-search", labelKey: "aiSearch", icon: "Sparkle" },
    { to: "/vacancies", labelKey: "vacancies", icon: "Briefcase" },
    { to: "/applications", labelKey: "applications", icon: "FileText" },
    { to: "/profile", labelKey: "profile", icon: "UserCircle" },
    { to: "/notifications", labelKey: "notifications", icon: "Bell" },
  ],
  employer: [
    { to: "/employer/dashboard", labelKey: "dashboard", icon: "House", end: true },
    { to: "/employer/vacancies", labelKey: "vacancies", icon: "Briefcase" },
    { to: "/employer/applications", labelKey: "applications", icon: "Users" },
    { to: "/employer/interviews", labelKey: "interviews", icon: "Calendar" },
    { to: "/employer/notifications", labelKey: "notifications", icon: "Bell" },
  ],
  admin: [
    { to: "/admin", labelKey: "admin", icon: "House", end: true },
    { to: "/admin/users", labelKey: "users", icon: "Users" },
    { to: "/admin/vacancies", labelKey: "vacancies", icon: "Briefcase" },
    { to: "/admin/applications", labelKey: "applications", icon: "FileText" },
    { to: "/admin/interviews", labelKey: "interviews", icon: "Calendar" },
    { to: "/admin/notifications", labelKey: "notifications", icon: "Bell" },
  ],
};

export function Sidebar({ role }: { role: UserRole }) {
  const { copy } = useI18n();

  return (
    <aside className="fixed inset-y-0 left-0 hidden w-[17.5rem] border-r bg-sidebar/94 backdrop-blur-xl md:block">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-72 opacity-55 ornament-subtle" />
      <div className="relative border-b px-6 py-6">
        <BrandMark />
      </div>
      <nav className="relative flex flex-col gap-1.5 p-4">
        {navByRole[role].map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                "group flex min-h-11 items-center gap-3 rounded-xl px-3.5 py-2 text-sm font-semibold transition-all",
                isActive
                  ? "bg-primary text-primary-foreground shadow-[0_14px_34px_rgba(217,75,22,0.2)]"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )
            }
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
        <p className="mt-2 text-xs leading-5 text-muted-foreground">{copy.ai.emptyPrompt}</p>
      </div>
    </aside>
  );
}
