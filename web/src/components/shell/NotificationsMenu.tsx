import { Bell } from "@phosphor-icons/react";
import { useQuery } from "convex/react";
import { Link } from "react-router-dom";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { api } from "@/lib/convex-api";
import { formatRelativeTime } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/domain";

const notificationsPath: Record<Exclude<UserRole, "unassigned">, string> = {
  seeker: "/notifications",
  employer: "/employer/notifications",
  admin: "/admin/notifications",
};

export function NotificationsMenu({ role }: { role: UserRole }) {
  return <NotificationsMenuInner seeAllHref={notificationsPath[role]} />;
}

function NotificationsMenuInner({ seeAllHref }: { seeAllHref: string }) {
  const notifications = useQuery(api.notifications.listMyNotifications, {});
  const { copy } = useI18n();
  const preview = (notifications ?? []).slice(0, 8);
  const unreadCount =
    notifications === undefined
      ? 0
      : notifications.filter((notification) => !notification.readAt).length;

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="relative shrink-0"
            aria-label={copy.nav.notifications}
          />
        }
      >
        <Bell weight="regular" className="size-[1.1rem]" />
        {unreadCount > 0 ? (
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground tabular-nums">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[min(22rem,calc(100vw-2rem))] gap-0 overflow-hidden p-0 shadow-md ring-1 ring-border/50"
      >
        <PopoverHeader className="border-b border-border/50 px-3 py-2.5">
          <PopoverTitle className="text-sm">{copy.nav.notifications}</PopoverTitle>
        </PopoverHeader>
        <div className="max-h-[min(20rem,55vh)] overflow-y-auto">
          {notifications === undefined ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">{copy.common.loading}</p>
          ) : preview.length ? (
            preview.map((notification) => (
              <div
                key={notification._id}
                className={cn(
                  "border-b border-border/40 px-3 py-2.5 last:border-b-0",
                  !notification.readAt && "bg-primary/[0.04]",
                )}
              >
                <p className="text-sm font-medium leading-snug text-foreground">{notification.title}</p>
                {notification.body ? (
                  <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-muted-foreground">
                    {notification.body}
                  </p>
                ) : null}
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {formatRelativeTime(notification.sentAt ?? notification._creationTime)}
                </p>
              </div>
            ))
          ) : (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">{copy.common.noNotifications}</p>
          )}
        </div>
        <div className="border-t border-border/50 p-2">
          <Link
            to={seeAllHref}
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "w-full justify-center text-xs",
            )}
          >
            {copy.notifications.seeAll}
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
