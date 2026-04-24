import { useQuery } from "convex/react";
import { useParams } from "react-router-dom";

import { EmptyState } from "@/components/feedback/EmptyState";
import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { DetailPanel } from "@/components/layout/DetailPanel";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { api, type Id } from "@/lib/convex-api";
import { useI18n } from "@/lib/i18n";
import { VacancyEditor } from "./VacancyEditor";

export function EmployerVacancyDetailPage() {
  const { id } = useParams();
  const { locale } = useI18n();
  const vacancy = useQuery(api.vacancies.getVacancy, id ? { vacancyId: id as Id<"vacancies"> } : "skip");

  if (vacancy === undefined) return <LoadingSkeleton variant="form" />;

  return (
    <>
      <PageHeader
        title={locale === "kk" ? "Вакансия" : "Вакансия"}
        subtitle={
          locale === "kk"
            ? "Мәтінді, сұрақтарды және жариялау мәртебесін басқарыңыз."
            : "Управляйте текстом, вопросами и статусом публикации."
        }
        action={vacancy ? <StatusBadge status={vacancy.status} locale={locale} /> : null}
      />
      <div className="container-app py-4">
        {vacancy ? (
          <DetailPanel title={vacancy.title}>
            <VacancyEditor vacancy={vacancy} />
          </DetailPanel>
        ) : (
          <EmptyState title={locale === "kk" ? "Вакансия табылмады" : "Вакансия не найдена"} />
        )}
      </div>
    </>
  );
}
