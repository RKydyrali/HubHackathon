import {
  Bell,
  Briefcase,
  Calendar,
  ChatCircleText,
  PaperPlaneTilt,
} from "@phosphor-icons/react";
import { Link } from "react-router-dom";

import { StatusBadge } from "@/components/shared/StatusBadge";
import { Row } from "@/components/shared/Row";
import { formatRelativeTime } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { getNotificationAction } from "@/lib/product-experience";
import { cn } from "@/lib/utils";
import type { Notification, UserRole } from "@/types/domain";

const typeIcon = {
  new_application: PaperPlaneTilt,
  status_change: Briefcase,
  strong_match: ChatCircleText,
  interview_update: Calendar,
  custom: Bell,
} as const;

export function NotificationRow({
  notification,
  role,
}: {
  notification: Notification;
  role: UserRole;
}) {
  const { locale } = useI18n();
  const Icon = typeIcon[notification.type] ?? Bell;
  const unread = !notification.readAt;
  const action = getNotificationAction(notification, role, locale);
  const row = (
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
      className={cn(unread && "bg-primary/5", action && "hover:border-primary/20")}
    >
      <span>{notification.body}</span>
      {action ? (
        <span className="mt-2 block text-xs font-semibold text-primary">
          {action.label}
        </span>
      ) : null}
    </Row>
  );

  return action ? (
    <Link to={action.href} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {row}
    </Link>
  ) : (
    row
  );
}
