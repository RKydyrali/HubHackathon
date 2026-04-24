import { Bell, Briefcase, ChatCircleText, PaperPlaneTilt } from "@phosphor-icons/react";

import { StatusBadge } from "@/components/shared/StatusBadge";
import { Row } from "@/components/shared/Row";
import { formatRelativeTime } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { Notification } from "@/types/domain";

const typeIcon = {
  new_application: PaperPlaneTilt,
  status_change: Briefcase,
  strong_match: ChatCircleText,
  custom: Bell,
} as const;

export function NotificationRow({ notification }: { notification: Notification }) {
  const { locale } = useI18n();
  const Icon = typeIcon[notification.type] ?? Bell;
  const unread = !notification.readAt;

  return (
    <Row
      title={
        <span className="flex items-center gap-2">
          <span className={cn("grid size-8 place-items-center rounded-md bg-secondary text-primary", unread && "bg-primary text-primary-foreground")}>
            <Icon weight="bold" />
          </span>
          {notification.title}
        </span>
      }
      meta={formatRelativeTime(notification.sentAt ?? notification._creationTime)}
      aside={<StatusBadge status={notification.deliveryStatus} locale={locale} />}
      className={unread ? "bg-primary/5" : undefined}
    >
      {notification.body}
    </Row>
  );
}
