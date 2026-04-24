import { SignOutButton, useUser } from "@clerk/clerk-react";
import { Bell, ChatCircleText, Heart, MapPin, SignOut } from "@phosphor-icons/react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/shared/Badge";
import { BrandMark } from "@/components/shared/BrandMark";
import { Button } from "@/components/shared/Button";
import { LocaleToggle } from "@/components/shared/LocaleToggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useI18n } from "@/lib/i18n";
import type { UserRole } from "@/types/domain";

export function TopBar({ role }: { role: UserRole }) {
  const { user } = useUser();
  const { copy } = useI18n();
  const name = user?.fullName ?? user?.primaryEmailAddress?.emailAddress ?? "User";
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <div className="sticky top-0 z-20 border-b bg-background/84 px-4 backdrop-blur-xl">
      <div className="flex min-h-[4.25rem] items-center justify-between gap-3">
        <div className="min-w-0 md:hidden">
          <BrandMark compact />
        </div>
        <div className="hidden min-w-0 items-center gap-3 md:flex">
          <Button variant="outline" size="sm" className="rounded-full">
            <MapPin data-icon="inline-start" weight="bold" />
            {copy.city}
          </Button>
          <Badge tone="info" className="capitalize">
            {role}
          </Badge>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <LocaleToggle />
          <Button variant="ghost" size="icon-sm" aria-label={copy.nav.vacancies}>
            <Heart weight="regular" />
          </Button>
          <Link to={role === "seeker" ? "/dashboard/ai-search" : "/ai-search"}>
            <Button variant="ghost" size="icon-sm" aria-label={copy.nav.aiSearch}>
              <ChatCircleText weight="regular" />
            </Button>
          </Link>
          <Link to={role === "employer" ? "/employer/notifications" : role === "admin" ? "/admin/notifications" : "/notifications"}>
            <Button variant="ghost" size="icon-sm" aria-label={copy.nav.notifications}>
              <Bell weight="regular" />
            </Button>
          </Link>
          <div className="hidden items-center gap-2 rounded-full border bg-card/72 py-1 pl-1 pr-2 shadow-sm sm:flex">
            <Avatar className="size-9">
              <AvatarImage src={user?.imageUrl} alt={name} />
              <AvatarFallback>{initials || "JA"}</AvatarFallback>
            </Avatar>
            <span className="max-w-32 truncate text-sm font-semibold">{name}</span>
          </div>
          <SignOutButton>
            <Button variant="outline" size="sm" aria-label={copy.nav.signOut}>
              <SignOut data-icon="inline-start" weight="bold" />
              <span className="hidden lg:inline">{copy.nav.signOut}</span>
            </Button>
          </SignOutButton>
        </div>
      </div>
    </div>
  );
}
