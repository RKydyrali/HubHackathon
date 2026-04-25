import { useMutation, useQuery } from "convex/react";

import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { PageHeader } from "@/components/layout/PageHeader";
import { api } from "@/lib/convex-api";
import { useI18n } from "@/lib/i18n";
import { NotificationTimeline } from "./NotificationTimeline";

export function NotificationsPage() {
  const notifications = useQuery(api.notifications.listMyNotifications);
  const markAllRead = useMutation(api.notifications.markAllNotificationsRead);
  const { copy } = useI18n();

  return (
    <>
      <PageHeader
        title={copy.notifications.title}
        action={
          <ConfirmDialog
            label={copy.notifications.markAllRead}
            title={copy.notifications.markAllRead}
            body={copy.notifications.markAllReadWarning}
            variant="default"
            onConfirm={async () => {
              await markAllRead({});
            }}
          />
        }
      />
      <div className="container-app py-5">
        {notifications === undefined ? <LoadingSkeleton variant="rows" /> : <NotificationTimeline notifications={notifications} />}
      </div>
    </>
  );
}
