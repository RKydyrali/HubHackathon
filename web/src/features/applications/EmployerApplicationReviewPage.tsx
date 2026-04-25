import { useQuery } from "convex/react";
import { useParams } from "react-router-dom";

import { EmptyState } from "@/components/feedback/EmptyState";
import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { PageHeader } from "@/components/layout/PageHeader";
import { SplitPane } from "@/components/layout/SplitPane";
import { ApplicationAiAnalysisCard } from "@/features/applications/ApplicationAiAnalysisCard";
import { EmployerApplicationInboxItem } from "@/features/applications/EmployerApplicationInboxItem";
import { ReviewPanel } from "@/features/applications/ReviewPanel";
import { api } from "@/lib/convex-api";
import { useI18n } from "@/lib/i18n";

export function EmployerApplicationReviewPage() {
  const { id } = useParams();
  const applications = useQuery(api.applications.listByOwner);
  const selected = applications?.find((item) => item.application._id === id);
  const { copy, locale } = useI18n();

  if (applications === undefined) return <LoadingSkeleton variant="page" />;

  return (
    <>
      <PageHeader
        title={copy.applications.reviewTitle}
        subtitle={
          locale === "kk"
            ? "AI кеңесін көмекші белгі ретінде қарап, шешімді өзіңіз қабылдаңыз."
            : "Используйте AI как вспомогательную подсказку, а решение оставляйте человеку."
        }
      />
      {selected ? (
        <SplitPane
          left={
            <div className="min-w-0 md:min-h-0 md:max-h-[calc(100dvh-9rem)] md:overflow-y-auto md:pr-1">
              <div className="container-app flex flex-col gap-6 py-5">
                {applications.length > 1 ? (
                  <div>
                    <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {copy.applications.otherApplications}
                    </h2>
                    <ul className="grid gap-2">
                      {applications.map((item) => (
                        <li key={item.application._id}>
                          <EmployerApplicationInboxItem
                            item={item}
                            selected={item.application._id === id}
                          />
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <ApplicationAiAnalysisCard item={selected} />
              </div>
            </div>
          }
          right={<ReviewPanel item={selected} />}
        />
      ) : (
        <div className="container-app py-5">
          <EmptyState title={locale === "kk" ? "Өтініш табылмады" : "Отклик не найден"} />
        </div>
      )}
      {selected ? (
        <div className="container-app py-5 md:hidden">
          <ReviewPanel item={selected} />
        </div>
      ) : null}
    </>
  );
}
