import { useQuery } from "convex/react";
import { useParams } from "react-router-dom";

import { EmptyState } from "@/components/feedback/EmptyState";
import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { api, type Id } from "@/lib/convex-api";
import { useI18n } from "@/lib/i18n";
import { HiredApplicationThread } from "./HiredApplicationThread";
import { PostHireNextSteps } from "./PostHireNextSteps";
import { SeekerInterviewScenarioPanel } from "./SeekerInterviewScenarioPanel";

export function SeekerApplicationDetailPage() {
  const { applicationId } = useParams();
  const { locale } = useI18n();
  const data = useQuery(
    api.applications.getByIdForParticipant,
    applicationId ? { applicationId: applicationId as Id<"applications"> } : "skip",
  );

  if (data === undefined) {
    return <LoadingSkeleton variant="page" />;
  }

  if (!data) {
    return (
      <>
        <PageHeader title={locale === "kk" ? "Өтініш" : "Отклик"} />
        <div className="container-app py-6">
          <EmptyState title={locale === "kk" ? "Табылмады" : "Не найдено"} />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={data.vacancy.title}
        subtitle={locale === "kk" ? "Өтініш күйі" : "Статус отклика"}
        action={<StatusBadge status={data.application.status} locale={locale} />}
      />
      <div className="container-app flex max-w-2xl flex-col gap-6 py-6">
        {data.application.status === "interview" ? (
          <SeekerInterviewScenarioPanel applicationId={data.application._id} />
        ) : null}
        {data.application.status === "hired" ? (
          <>
            <section className="rounded-xl border bg-card p-4">
              <HiredApplicationThread applicationId={data.application._id} />
            </section>
            <PostHireNextSteps applicationId={data.application._id} role="seeker" />
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            {locale === "kk"
              ? "Байланыс арналары тек «Қабылданды» күйінде ашылады."
              : "Каналы связи открываются после статуса «Принят / Нанят»."}
          </p>
        )}
      </div>
    </>
  );
}
