import { StatusBadge } from "@/components/shared/StatusBadge";
import { api } from "@/lib/convex-api";
import { formatAbsoluteDate } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { AdminTablePage } from "./AdminTables";

export function AdminUsersPage() {
  const { copy, locale } = useI18n();

  return (
    <AdminTablePage
      title={copy.nav.users}
      query={api.admin.listUsersForAdmin}
      empty={locale === "kk" ? "Пайдаланушы табылмады" : "Пользователи не найдены"}
      columns={[
        { key: "id", header: "ID", cell: (row) => String(row._id).slice(0, 10) },
        {
          key: "role",
          header: locale === "kk" ? "Рөл" : "Роль",
          cell: (row) => (
            <span className="rounded-full border bg-secondary px-2 py-1 text-xs font-semibold">
              {String(row.role ?? "unassigned")}
            </span>
          ),
        },
        {
          key: "telegram",
          header: "Telegram",
          cell: (row) => (
            <StatusBadge status={row.isBotLinked ? "sent" : "failed"} locale={locale} />
          ),
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
