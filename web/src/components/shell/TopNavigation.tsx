import { SignOutButton, useUser } from "@clerk/clerk-react";
import { CaretDown, ChatCircleText, GearSix, SignOut, UserCircle } from "@phosphor-icons/react";
import { Link, NavLink, useLocation, useMatch } from "react-router-dom";

import { CommandSearch } from "@/components/shell/CommandSearch";
import { NotificationsMenu } from "@/components/shell/NotificationsMenu";
import { Button } from "@/components/shared/Button";
import { BrandMark } from "@/components/shared/BrandMark";
import { LocaleToggle } from "@/components/shared/LocaleToggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useI18n } from "@/lib/i18n";
import { getTelegramBotUrl } from "@/lib/telegramBotUrl";
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
    | "interviewTrainer";
  end?: boolean;
};

export const topNavByRole: Record<UserRole, NavItem[]> = {
  seeker: [
    { to: "/vacancies", labelKey: "vacancies" },
    { to: "/for-you", labelKey: "forYou" },
    { to: AI_MATCHING_ROOT, labelKey: "aiSearch", end: true },
    { to: "/applications", labelKey: "applications" },
    { to: "/interviews", labelKey: "interviews" },
    { to: "/interview-trainer", labelKey: "interviewTrainer", end: true },
  ],
  employer: [
    { to: AI_MATCHING_ROOT, labelKey: "aiSearch", end: true },
    { to: "/employer/vacancies", labelKey: "vacancies" },
    { to: "/employer/applications", labelKey: "applications" },
    { to: "/employer/interviews", labelKey: "interviews" },
    { to: "/employer/dashboard", labelKey: "dashboard", end: true },
  ],
  admin: [
    { to: "/admin", labelKey: "admin", end: true },
    { to: AI_MATCHING_ROOT, labelKey: "aiSearch", end: true },
    { to: "/admin/users", labelKey: "users" },
    { to: "/admin/vacancies", labelKey: "vacancies" },
    { to: "/admin/applications", labelKey: "applications" },
    { to: "/admin/interviews", labelKey: "interviews" },
    { to: "/admin/notifications", labelKey: "notifications" },
  ],
};

export function TopNavigation({ role }: { role: UserRole }) {
  const { copy } = useI18n();
  const { pathname } = useLocation();
  const vacancyListMatch = useMatch({ path: "/vacancies", end: true });
  const { user } = useUser();
  const telegramBotUrl = getTelegramBotUrl(import.meta.env);
  const name = user?.fullName ?? user?.primaryEmailAddress?.emailAddress ?? copy.settings.account;
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  return (
    <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur">
      <div className="grid min-h-16 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 px-4 md:px-7">
        <BrandMark
          to={role === "employer" ? "/employer/dashboard" : role === "admin" ? "/admin" : AI_MATCHING_ROOT}
          className="shrink-0"
        />
        <div className="mx-auto hidden h-9 w-full max-w-xl md:block">
          {vacancyListMatch ? null : <CommandSearch role={role} />}
        </div>
        <div className="flex items-center justify-end gap-2">
          <QuickActionButtons role={role} telegramBotUrl={telegramBotUrl} />
          <div className="hidden sm:block">
            <LocaleToggle />
          </div>
          <NotificationsMenu role={role} />
          <AccountMenu role={role} name={name} initials={initials || "JA"} imageUrl={user?.imageUrl} />
        </div>
      </div>
      <div className="border-t px-3 md:px-7">
        <div className="no-scrollbar flex items-center gap-6 overflow-x-auto">
          {topNavByRole[role].map((item) => (
            <NavLink
              key={item.labelKey}
              to={item.to}
              end={item.end}
              className={({ isActive }) => {
                const active =
                  item.labelKey === "aiSearch" ? isAiMatchingPath(pathname) : isActive;
                return cn(
                  "relative flex min-h-12 shrink-0 items-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
                  active && "text-primary",
                );
              }}
            >
              {({ isActive }) => {
                const active =
                  item.labelKey === "aiSearch" ? isAiMatchingPath(pathname) : isActive;
                return (
                  <>
                    {copy.nav[item.labelKey]}
                    {active ? <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-primary" /> : null}
                  </>
                );
              }}
            </NavLink>
          ))}
        </div>
      </div>
      {vacancyListMatch ? null : (
        <div className="border-t px-4 py-3 md:hidden">
          <CommandSearch role={role} />
        </div>
      )}
    </header>
  );
}

function QuickActionButtons({ role, telegramBotUrl }: { role: UserRole; telegramBotUrl: string }) {
  const { copy } = useI18n();

  return (
    <div className="flex items-center gap-1.5">
      <Button
        render={
          <a
            href={telegramBotUrl}
            target="_blank"
            rel="noreferrer"
            aria-label={copy.nav.openTelegramBot}
          />
        }
        variant="outline"
        className="h-10 rounded-full px-3"
      >
        <ChatCircleText data-icon="inline-start" weight="bold" />
        <span className="hidden xl:inline">{copy.nav.telegramBot}</span>
      </Button>
      {role === "seeker" ? (
        <Button
          render={<Link to="/profile" aria-label={copy.nav.profile} />}
          variant="ghost"
          className="h-10 rounded-full px-3"
        >
          <UserCircle data-icon="inline-start" weight="bold" />
          <span className="hidden lg:inline">{copy.nav.profile}</span>
        </Button>
      ) : null}
    </div>
  );
}

function AccountMenu({
  role,
  name,
  initials,
  imageUrl,
}: {
  role: UserRole;
  name: string;
  initials: string;
  imageUrl?: string;
}) {
  const { copy } = useI18n();

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="ghost" className="h-10 gap-2 rounded-full px-1.5 pr-2" aria-label={copy.nav.accountMenu} />
        }
      >
        <Avatar className="size-8">
          <AvatarImage src={imageUrl} alt={name} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <CaretDown weight="bold" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <PopoverHeader>
          <PopoverTitle>{name}</PopoverTitle>
          <PopoverDescription>{copy.brand}</PopoverDescription>
        </PopoverHeader>
        <div className="grid gap-1">
          <Link to="/settings">
            <Button variant="ghost" className="w-full justify-start">
              <GearSix data-icon="inline-start" weight="bold" />
              {copy.nav.settings}
            </Button>
          </Link>
          {role === "seeker" ? (
            <Link to="/profile">
              <Button variant="ghost" className="w-full justify-start">
                <UserCircle data-icon="inline-start" weight="bold" />
                {copy.nav.profile}
              </Button>
            </Link>
          ) : null}
          <SignOutButton>
            <Button variant="ghost" className="w-full justify-start text-destructive hover:text-destructive">
              <SignOut data-icon="inline-start" weight="bold" />
              {copy.nav.signOut}
            </Button>
          </SignOutButton>
        </div>
      </PopoverContent>
    </Popover>
  );
}
