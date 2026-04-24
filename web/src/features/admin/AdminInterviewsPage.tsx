import { StatusBadge } from "@/components/shared/StatusBadge";
import { api } from "@/lib/convex-api";
import { formatAbsoluteDate } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { AdminTablePage } from "./AdminTables";

export function AdminInterviewsPage() {
  const { copy, locale } = useI18n();

  return (
    <AdminTablePage
      title={copy.nav.interviews}
      query={api.admin.listInterviewsForAdmin}
      empty={copy.common.noInterviews}
      columns={[
        {
          key: "time",
          header: copy.interviews.scheduledAt,
          cell: (row) =>
            typeof row.scheduledAt === "number"
              ? formatAbsoluteDate(row.scheduledAt)
              : locale === "kk"
                ? "Белгіленбеген"
                : "Не назначено",
        },
        {
          key: "status",
          header: locale === "kk" ? "Мәртебе" : "Статус",
          cell: (row) => <StatusBadge status={String(row.status ?? "")} locale={locale} />,
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
