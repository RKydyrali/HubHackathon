import { EmptyState } from "@/components/feedback/EmptyState";
import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { api } from "@/lib/convex-api";
import { useI18n } from "@/lib/i18n";
import { useQuery } from "convex/react";
import type { UserRole } from "@/types/domain";
import type { Notification } from "@/types/domain";
import { NotificationRow } from "./NotificationRow";

export function NotificationTimeline({
  notifications,
  role,
}: {
  notifications: Notification[];
  role?: UserRole;
}) {
  const { copy } = useI18n();
  const currentUser = useQuery(api.users.getSelf, role ? "skip" : {});
  const effectiveRole = role ?? currentUser?.role;

  if (!effectiveRole) {
    return <LoadingSkeleton variant="rows" />;
  }

  if (!notifications.length) {
    return <EmptyState title={copy.common.noNotifications} />;
  }

  return (
    <div className="surface-card overflow-hidden rounded-2xl">
      {notifications.map((notification) => (
        <NotificationRow key={notification._id} notification={notification} role={effectiveRole} />
      ))}
    </div>
  );
}
