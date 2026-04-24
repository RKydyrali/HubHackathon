import { StatusBadge } from "@/components/shared/StatusBadge";
import { api } from "@/lib/convex-api";
import { formatAbsoluteDate } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { AdminTablePage } from "./AdminTables";

export function AdminNotificationsPage() {
  const { copy, locale } = useI18n();

  return (
    <AdminTablePage
      title={copy.nav.notifications}
      query={api.admin.listNotificationsForAdmin}
      empty={copy.common.noNotifications}
      columns={[
        { key: "title", header: locale === "kk" ? "Тақырып" : "Тема", cell: (row) => String(row.title ?? "") },
        {
          key: "delivery",
          header: locale === "kk" ? "Жеткізу" : "Доставка",
          cell: (row) => <StatusBadge status={String(row.deliveryStatus ?? "")} locale={locale} />,
        },
        {
          key: "created",
          header: locale === "kk" ? "Құрылған" : "Создано",
          cell: (row) => formatAbsoluteDate(row._creationTime),
        },
      ]}
    />
  );
}
