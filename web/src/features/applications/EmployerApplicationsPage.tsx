import { useQuery } from "convex/react";

import { EmptyState } from "@/components/feedback/EmptyState";
import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { PageHeader } from "@/components/layout/PageHeader";
import { api } from "@/lib/convex-api";
import { useI18n } from "@/lib/i18n";
import { ApplicationTable } from "./ApplicationTable";

export function EmployerApplicationsPage() {
  const applications = useQuery(api.applications.listByOwner);
  const { copy, locale } = useI18n();

  return (
    <>
      <PageHeader
        title={copy.applications.title}
        subtitle={
          locale === "kk"
            ? "Кандидаттарды мәртебе, вакансия және AI кеңесі арқылы қараңыз."
            : "Смотрите кандидатов с понятным статусом, вакансией и AI-подсказкой."
        }
      />
      <div className="container-app py-5">
        {applications === undefined ? (
          <LoadingSkeleton variant="table" />
        ) : applications.length ? (
          <ApplicationTable applications={applications} employerView />
        ) : (
          <EmptyState title={copy.common.noApplications} />
        )}
      </div>
    </>
  );
}
