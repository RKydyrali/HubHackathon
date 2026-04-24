import { useQuery } from "convex/react";
import { useParams } from "react-router-dom";

import { EmptyState } from "@/components/feedback/EmptyState";
import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { PageHeader } from "@/components/layout/PageHeader";
import { api, type Id } from "@/lib/convex-api";
import { useI18n } from "@/lib/i18n";
import { VacancyDetail } from "./VacancyDetail";

export function VacancyDetailPage() {
  const { id } = useParams();
  const { copy } = useI18n();
  const vacancy = useQuery(api.vacancies.getVacancy, id ? { vacancyId: id as Id<"vacancies"> } : "skip");

  if (vacancy === undefined) return <LoadingSkeleton variant="page" />;

  return (
    <>
      <PageHeader title={copy.vacancies.details} />
      <div className="container-app py-5">
        {vacancy ? <VacancyDetail vacancy={vacancy} /> : <EmptyState title={copy.vacancies.notFound} />}
      </div>
    </>
  );
}
