import { Calendar } from "@phosphor-icons/react";
import { useQuery } from "convex/react";
import { Link } from "react-router-dom";

import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { PageHeader } from "@/components/layout/PageHeader";
import { buttonVariants } from "@/components/ui/button";
import { api } from "@/lib/convex-api";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { InterviewTable } from "./InterviewTable";

export function InterviewsPage() {
  const interviews = useQuery(api.interviews.listByOwner);
  const { copy } = useI18n();

  return (
    <>
      <PageHeader title={copy.interviews.title} />
      <div className="container-app flex flex-1 flex-col py-5">
        {interviews === undefined ? (
          <LoadingSkeleton variant="table" />
        ) : interviews.length ? (
          <InterviewTable interviews={interviews} />
        ) : (
          <div
            className="flex flex-1 flex-col items-center justify-center py-9 md:py-10"
            role="status"
            aria-live="polite"
          >
            <div className="mx-auto w-full max-w-md space-y-4 text-center">
              <Calendar
                weight="duotone"
                className="mx-auto size-5 shrink-0 text-muted-foreground"
                aria-hidden
              />
              <h2 className="text-base font-medium text-foreground">
                {copy.interviews.employerEmptyTitle}
              </h2>
              <p className="text-balance text-sm text-muted-foreground">
                {copy.interviews.employerEmptyBody}
              </p>
              <div className="flex flex-col items-stretch gap-3 pt-1 sm:items-center">
                <Link
                  to="/employer/vacancies"
                  className={cn(
                    buttonVariants({ size: "default" }),
                    "min-h-11 w-full min-w-0 sm:w-auto",
                  )}
                >
                  {copy.applications.createVacancy}
                </Link>
                <Link
                  to="/employer/applications"
                  className="text-center text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
                >
                  {copy.interviews.employerViewApplicationsLink}
                </Link>
                <p className="text-pretty text-xs leading-relaxed text-muted-foreground">
                  {copy.interviews.employerEmptyAiHint}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
