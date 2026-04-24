import { useQuery } from "convex/react";

import { EmptyState } from "@/components/feedback/EmptyState";
import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { PageHeader } from "@/components/layout/PageHeader";
import { api } from "@/lib/convex-api";
import { useI18n } from "@/lib/i18n";
import { ApplicationTable } from "./ApplicationTable";

export function ApplicationsPage() {
  const applications = useQuery(api.applications.listBySeeker);
  const { copy } = useI18n();

  return (
    <>
      <PageHeader title={copy.applications.title} />
      <div className="container-app py-5">
        {applications === undefined ? <LoadingSkeleton variant="table" /> : applications.length ? <ApplicationTable applications={applications} /> : <EmptyState title={copy.common.noApplications} />}
      </div>
    </>
  );
}
