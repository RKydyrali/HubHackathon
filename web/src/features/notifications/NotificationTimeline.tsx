import { EmptyState } from "@/components/feedback/EmptyState";
import { useI18n } from "@/lib/i18n";
import type { Notification } from "@/types/domain";
import { NotificationRow } from "./NotificationRow";

export function NotificationTimeline({ notifications }: { notifications: Notification[] }) {
  const { copy } = useI18n();

  if (!notifications.length) {
    return <EmptyState title={copy.common.noNotifications} />;
  }

  return (
    <div className="surface-card overflow-hidden rounded-2xl">
      {notifications.map((notification) => <NotificationRow key={notification._id} notification={notification} />)}
    </div>
  );
}
