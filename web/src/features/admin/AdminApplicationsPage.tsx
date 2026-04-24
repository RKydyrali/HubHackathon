import { useMutation } from "convex/react";

import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { api, type Id } from "@/lib/convex-api";
import { formatAbsoluteDate } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import type { ApplicationStatus } from "@/lib/status";
import { AdminTablePage, type AdminRow } from "./AdminTables";

const recoveryStatus: ApplicationStatus = "reviewing";

export function AdminApplicationsPage() {
  const recover = useMutation(api.applications.adminRecoverApplicationStatus);
  const { copy, locale } = useI18n();

  return (
    <AdminTablePage
      title={copy.nav.applications}
      query={api.admin.listApplicationsForAdmin}
      empty={copy.common.noApplications}
      columns={[
        { key: "id", header: "ID", cell: (row) => String(row._id).slice(0, 10) },
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
        {
          key: "recover",
          header: copy.admin.recover,
          cell: (row: AdminRow) => (
            <ConfirmDialog
              label={copy.admin.recover}
              title={copy.admin.confirm}
              body={
                locale === "kk"
                  ? "Өтініш мәртебесі reviewing күйіне қалпына келтіріледі."
                  : "Статус отклика будет восстановлен в reviewing."
              }
              onConfirm={() =>
                void recover({
                  applicationId: row._id as Id<"applications">,
                  status: recoveryStatus,
                })
              }
            />
          ),
        },
      ]}
    />
  );
}
