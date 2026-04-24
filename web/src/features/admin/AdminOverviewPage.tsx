import { Link } from "react-router-dom";

import { PageHeader } from "@/components/layout/PageHeader";
import { SectionPanel } from "@/components/layout/SectionPanel";
import { Table, type Column } from "@/components/shared/Table";
import { useI18n } from "@/lib/i18n";

const links = [
  { key: "users", href: "/admin/users" },
  { key: "vacancies", href: "/admin/vacancies" },
  { key: "applications", href: "/admin/applications" },
  { key: "interviews", href: "/admin/interviews" },
  { key: "notifications", href: "/admin/notifications" },
] as const;

export function AdminOverviewPage() {
  const { copy, locale } = useI18n();
  const columns: Column<(typeof links)[number]>[] = [
    {
      key: "section",
      header: locale === "kk" ? "Бөлім" : "Раздел",
      cell: (item) => (
        <Link className="font-semibold text-foreground hover:text-primary" to={item.href}>
          {copy.nav[item.key]}
        </Link>
      ),
    },
    {
      key: "purpose",
      header: locale === "kk" ? "Мақсаты" : "Назначение",
      cell: (item) =>
        locale === "kk"
          ? `${copy.nav[item.key]} бойынша операциялық бақылау`
          : `Операционный контроль: ${copy.nav[item.key]}`,
    },
  ];

  return (
    <>
      <PageHeader title={copy.admin.overview} subtitle={copy.admin.denseSubtitle} />
      <div className="container-app py-5">
        <SectionPanel patterned>
          <Table
            columns={columns}
            data={links}
            empty={locale === "kk" ? "Әкімші бөлімдері жоқ" : "Нет административных разделов"}
            getKey={(item) => item.href}
          />
        </SectionPanel>
      </div>
    </>
  );
}
