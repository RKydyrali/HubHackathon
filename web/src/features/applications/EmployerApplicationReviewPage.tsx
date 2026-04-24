import { useQuery } from "convex/react";
import { useParams } from "react-router-dom";

import { EmptyState } from "@/components/feedback/EmptyState";
import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { PageHeader } from "@/components/layout/PageHeader";
import { SplitPane } from "@/components/layout/SplitPane";
import { api } from "@/lib/convex-api";
import { useI18n } from "@/lib/i18n";
import { ApplicationRow } from "./ApplicationRow";
import { ReviewPanel } from "./ReviewPanel";

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
            <div className="container-app grid gap-2 py-5">
              {applications.map((item) => (
                <ApplicationRow key={item.application._id} item={item} employerView />
              ))}
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
