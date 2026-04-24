import { Plus } from "@phosphor-icons/react";
import { useQuery } from "convex/react";
import { useMemo, useState } from "react";

import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { DetailPanel } from "@/components/layout/DetailPanel";
import { MetricTile } from "@/components/layout/SectionPanel";
import { PageHeader } from "@/components/layout/PageHeader";
import { SplitPane } from "@/components/layout/SplitPane";
import { Button } from "@/components/shared/Button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { api } from "@/lib/convex-api";
import { useI18n } from "@/lib/i18n";
import { VacancyEditor } from "./VacancyEditor";
import { VacancyRow } from "./VacancyRow";
import { VacancyTable } from "./VacancyTable";

export function EmployerVacanciesPage() {
  const rows = useQuery(api.vacancies.listByOwner);
  const [creating, setCreating] = useState(false);
  const { copy, locale } = useI18n();
  const vacancies = useMemo(() => rows?.map((row) => row.vacancy) ?? [], [rows]);
  const selected = vacancies[0] ?? null;

  const counts = useMemo(
    () => ({
      published: vacancies.filter((vacancy) => vacancy.status === "published").length,
      draft: vacancies.filter((vacancy) => vacancy.status === "draft").length,
      archived: vacancies.filter((vacancy) => vacancy.status === "archived").length,
      applicants: rows?.reduce((sum, row) => sum + row.applicantCount, 0) ?? 0,
    }),
    [rows, vacancies],
  );

  if (rows === undefined) return <LoadingSkeleton variant="dashboard" />;

  return (
    <>
      <PageHeader
        title={locale === "kk" ? "Вакансияларды басқару" : "Управление вакансиями"}
        subtitle={
          locale === "kk"
            ? "Жобалар, жарияланған вакансиялар және архив бір жерде."
            : "Черновики, публикации и архив в одном спокойном рабочем месте."
        }
        action={
          <Button onClick={() => setCreating(true)}>
            <Plus data-icon="start" weight="bold" />
            {locale === "kk" ? "Вакансия құру" : "Создать вакансию"}
          </Button>
        }
      />
      <div className="container-app grid gap-3 py-5 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile label={copy.dashboard.activeVacancies} value={counts.published} />
        <MetricTile label={locale === "kk" ? "Жобалар" : "Черновики"} value={counts.draft} />
        <MetricTile label={locale === "kk" ? "Архив" : "Архив"} value={counts.archived} />
        <MetricTile label={copy.dashboard.newApplications} value={counts.applicants} />
      </div>
      <SplitPane
        left={
          <div className="container-app pb-5 md:pt-0">
            <div className="hidden md:block">
              <VacancyTable vacancies={vacancies} ownerView />
            </div>
            <div className="grid gap-2 md:hidden">
              {vacancies.map((vacancy) => (
                <div key={vacancy._id} className="surface-card rounded-2xl">
                  <div className="border-b px-3 py-2">
                    <StatusBadge status={vacancy.status} locale={locale} />
                  </div>
                  <VacancyRow vacancy={vacancy} ownerView />
                </div>
              ))}
            </div>
          </div>
        }
        right={
          <DetailPanel
            title={
              creating
                ? locale === "kk"
                  ? "Жаңа вакансия"
                  : "Новая вакансия"
                : selected?.title ?? (locale === "kk" ? "Вакансия" : "Вакансия")
            }
          >
            <VacancyEditor vacancy={creating ? null : selected} onCreated={() => setCreating(false)} />
          </DetailPanel>
        }
      />
      <div className="container-app pb-5 md:hidden">
        <DetailPanel
          title={
            creating
              ? locale === "kk"
                ? "Жаңа вакансия"
                : "Новая вакансия"
              : selected?.title ?? (locale === "kk" ? "Вакансия" : "Вакансия")
          }
        >
          <VacancyEditor vacancy={creating ? null : selected} onCreated={() => setCreating(false)} />
        </DetailPanel>
      </div>
    </>
  );
}
