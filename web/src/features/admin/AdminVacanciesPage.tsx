import { SourceBadge, StatusBadge } from "@/components/shared/StatusBadge";
import { api } from "@/lib/convex-api";
import { formatAbsoluteDate } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import type { VacancySource } from "@/types/domain";
import { AdminTablePage } from "./AdminTables";

export function AdminVacanciesPage() {
  const { copy, locale } = useI18n();

  return (
    <AdminTablePage
      title={copy.nav.vacancies}
      query={api.admin.listVacanciesForAdmin}
      empty={copy.vacancies.noResults}
      columns={[
        { key: "title", header: locale === "kk" ? "Атауы" : "Название", cell: (row) => String(row.title ?? "") },
        {
          key: "source",
          header: copy.vacancies.source,
          cell: (row) => <SourceBadge source={String(row.source ?? "native") as VacancySource} locale={locale} compact />,
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
