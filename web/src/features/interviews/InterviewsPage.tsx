import { useQuery } from "convex/react";

import { EmptyState } from "@/components/feedback/EmptyState";
import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { PageHeader } from "@/components/layout/PageHeader";
import { api } from "@/lib/convex-api";
import { useI18n } from "@/lib/i18n";
import { InterviewTable } from "./InterviewTable";

export function InterviewsPage() {
  const interviews = useQuery(api.interviews.listByOwner);
  const { copy } = useI18n();

  return (
    <>
      <PageHeader title={copy.interviews.title} />
      <div className="container-app py-5">
        {interviews === undefined ? <LoadingSkeleton variant="table" /> : interviews.length ? <InterviewTable interviews={interviews} /> : <EmptyState title={copy.common.noInterviews} />}
      </div>
    </>
  );
}
