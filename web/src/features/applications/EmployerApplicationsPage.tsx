import { UsersThree } from "@phosphor-icons/react";
import { useQuery } from "convex/react";
import { Link } from "react-router-dom";

import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { PageHeader } from "@/components/layout/PageHeader";
import { AiAdvisoryNotice } from "@/components/product/AiTrust";
import { buttonVariants } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { api } from "@/lib/convex-api";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { AI_MATCHING_ROOT } from "@/routing/navPaths";
import { ApplicationTable } from "./ApplicationTable";

export function EmployerApplicationsPage() {
  const applications = useQuery(api.applications.listByOwner);
  const { copy } = useI18n();
  const hasApplications = Boolean(applications?.length);

  return (
    <>
      <PageHeader
        title={copy.applications.title}
        subtitle={copy.applications.employerSubtitle}
        action={
          hasApplications ? (
            <>
              <Link
                to="/employer/vacancies"
                className={cn(buttonVariants({ size: "default", variant: "outline" }), "min-h-11 rounded-full")}
              >
                {copy.applications.createVacancy}
              </Link>
              <Link
                to={AI_MATCHING_ROOT}
                className={cn(buttonVariants({ size: "default" }), "min-h-11 rounded-full")}
              >
                {copy.applications.discoverCandidatesAi}
              </Link>
            </>
          ) : null
        }
      />
      <div className="container-app flex flex-1 flex-col py-6">
        {applications === undefined ? (
          <LoadingSkeleton variant="table" />
        ) : applications.length > 0 ? (
          <section className="flex flex-col gap-3" aria-labelledby="applications-table-title">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 id="applications-table-title" className="text-sm font-semibold text-foreground">
                  {copy.applications.otherApplications}
                </h2>
                <p className="text-xs text-muted-foreground">{copy.applications.employerAiHint}</p>
              </div>
              <span className="w-fit rounded-full border border-border/70 bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
                {applications.length} {copy.applications.title.toLowerCase()}
              </span>
            </div>
            <AiAdvisoryNotice title={copy.applications.advisoryTitle} body={copy.applications.employerAiHint} />
            <ApplicationTable applications={applications} employerView />
          </section>
        ) : (
          <div
            className="flex flex-1 flex-col items-center justify-center py-12 md:py-20"
            role="status"
            aria-live="polite"
          >
            <Empty className="max-w-sm border-0 bg-transparent p-0">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <UsersThree weight="duotone" className="size-4" aria-hidden />
                </EmptyMedia>
                <EmptyTitle className="text-sm font-medium text-foreground">{copy.applications.employerEmptyTitle}</EmptyTitle>
                <EmptyDescription className="text-balance text-muted-foreground">
                  {copy.applications.employerEmptyBody}
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent className="flex flex-col items-stretch gap-3 sm:items-center">
                <Link
                  to="/employer/vacancies"
                  className={cn(buttonVariants({ size: "default" }), "min-h-11 w-full min-w-0 sm:w-auto")}
                >
                  {copy.applications.createVacancy}
                </Link>
                <Link
                  to={AI_MATCHING_ROOT}
                  className="text-center text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
                >
                  {copy.applications.discoverCandidatesAi}
                </Link>
                <p className="max-w-[22rem] text-center text-xs text-muted-foreground">{copy.applications.employerAiHint}</p>
              </EmptyContent>
            </Empty>
          </div>
        )}
      </div>
    </>
  );
}
