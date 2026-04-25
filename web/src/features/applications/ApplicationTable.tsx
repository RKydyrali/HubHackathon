import { useCallback, useMemo } from "react";
import { useMutation } from "convex/react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { DataTable, type DataColumn } from "@/components/product/DataTable";
import { Badge } from "@/components/shared/Badge";
import { api, type Id } from "@/lib/convex-api";
import { EMPTY_STATES } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { canWithdrawApplicationStatus } from "@/lib/status";
import { cn } from "@/lib/utils";
import type { ApplicantWithProfile, ApplicationWithVacancy } from "@/types/domain";
import { ApplicationStatusBadge } from "./ApplicationRow";
import { ApplicationStatusTimeline } from "./ApplicationStatusTimeline";

export function ApplicationTable({
  applications,
  employerView = false,
  /** Fewer columns for narrow layout (e.g. employer home); avoids horizontal scroll. */
  dashboardSummary = false,
}: {
  applications: Array<ApplicationWithVacancy | ApplicantWithProfile>;
  employerView?: boolean;
  dashboardSummary?: boolean;
}) {
  const { copy } = useI18n();
  const withdrawApplication = useMutation(api.applications.withdrawApplication);

  const withdraw = useCallback(async (applicationId: Id<"applications">) => {
    await withdrawApplication({ applicationId });
    toast.success(copy.applications.withdrawSuccess);
  }, [copy.applications.withdrawSuccess, withdrawApplication]);

  const columns: DataColumn<ApplicationWithVacancy | ApplicantWithProfile>[] = useMemo(() => {
    const vacancyCol: DataColumn<ApplicationWithVacancy | ApplicantWithProfile> = {
      key: "vacancy",
      header: copy.applications.vacancy,
      className: employerView ? "min-w-0 w-[34%]" : "min-w-0 w-[42%]",
      cell: (item) => {
        const title = item.vacancy?.title ?? copy.vacancies.notFound;
        const city = item.vacancy?.city;
        if (employerView) {
          return (
            <div className="min-w-0">
              <span className="block truncate font-medium text-foreground" title={title}>
                {title}
              </span>
              {city ? <span className="mt-1 block truncate text-xs text-muted-foreground">{city}</span> : null}
            </div>
          );
        }
        const id = item.vacancy?._id;
        if (id) {
          return (
            <div className="min-w-0">
              <Link
                className="block truncate font-medium text-foreground transition-colors hover:text-primary"
                title={title}
                to={`/vacancies/${id}`}
              >
                {title}
              </Link>
              {city ? <span className="mt-1 block truncate text-xs text-muted-foreground">{city}</span> : null}
            </div>
          );
        }
        return (
          <div className="min-w-0">
            <span className="block truncate font-medium text-foreground" title={title}>
              {title}
            </span>
            {city ? <span className="mt-1 block truncate text-xs text-muted-foreground">{city}</span> : null}
          </div>
        );
      },
    };

    if (employerView) {
      if (dashboardSummary) {
        return [
          {
            key: "candidate",
            header: copy.applications.candidate,
            className: "w-[36%] min-w-0",
            cell: (item) => {
              const profile = "profile" in item ? item.profile : null;
              const label = profile?.fullName ?? copy.common.noProfile;
              return (
                <Link
                  className="block truncate font-medium hover:text-primary"
                  title={label}
                  to={`/employer/applications/${item.application._id}`}
                >
                  {label}
                </Link>
              );
            },
          },
          {
            key: "vacancy",
            header: copy.applications.vacancy,
            className: "min-w-0",
            cell: (item) => {
              const title = item.vacancy?.title ?? copy.vacancies.notFound;
              return (
                <span className="block max-w-full truncate font-medium text-foreground" title={title}>
                  {title}
                </span>
              );
            },
          },
          {
            key: "status",
            header: copy.applications.status,
            className: "w-[10rem] whitespace-nowrap text-right",
            cell: (item) => <ApplicationStatusBadge status={item.application.status} className="ml-auto" />,
          },
        ];
      }
      return [
        {
          key: "candidate",
          header: copy.applications.candidate,
          className: "w-[30%] min-w-0",
          cell: (item) => {
            const profile = "profile" in item ? item.profile : null;
            const label = profile?.fullName ?? copy.common.noProfile;
            return (
              <Link
                className="block truncate font-semibold text-foreground underline-offset-4 hover:text-primary hover:underline"
                title={label}
                to={`/employer/applications/${item.application._id}`}
              >
                {label}
              </Link>
            );
          },
        },
        {
          ...vacancyCol,
          className: "w-[30%] min-w-0",
        },
        {
          key: "status",
          header: copy.applications.status,
          className: "w-[10rem] whitespace-nowrap text-right",
          cell: (item) => (
            <div className="ml-auto max-w-[15rem] text-left">
              <ApplicationStatusTimeline status={item.application.status} compact />
            </div>
          ),
        },
        {
          key: "match",
          header: copy.applications.match,
          className: "w-[18%] whitespace-nowrap text-right",
          cell: (item) => <ApplicationMatchBadge score={item.application.aiScore} />,
        },
      ];
    }

    return [
      vacancyCol,
      {
        key: "status",
        header: copy.applications.status,
        className: "w-[17rem] text-right",
        cell: (item) => (
          <div className="ml-auto max-w-[16rem] text-left">
            <ApplicationStatusTimeline status={item.application.status} compact />
          </div>
        ),
      },
      {
        key: "ai",
        header: copy.applications.ai,
        className: "min-w-0 w-[32%]",
        cell: (item) =>
          item.application.aiScore != null ? (
            <span className="font-medium tabular-nums text-foreground">{item.application.aiScore}</span>
          ) : (
            <span className="line-clamp-2 text-muted-foreground">{copy.applications.noSummary}</span>
          ),
      },
      {
        key: "actions",
        header: copy.applications.actions,
        className: "w-[10rem] text-right",
        cell: (item) =>
          canWithdrawApplicationStatus(item.application.status) ? (
            <ConfirmDialog
              label={copy.applications.withdraw}
              title={copy.applications.withdraw}
              body={copy.applications.withdrawWarning}
              onConfirm={() => withdraw(item.application._id as Id<"applications">)}
            />
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          ),
      },
    ];
  }, [copy, dashboardSummary, employerView, withdraw]);

  return (
    <DataTable
      className={cn(
        "overflow-hidden shadow-none",
        dashboardSummary
          ? "rounded-lg border-0 bg-transparent"
          : "rounded-2xl border border-border/70 bg-card shadow-[0_16px_36px_-30px_rgba(15,23,42,0.5)]",
      )}
      tableContainerClassName={employerView ? "overflow-x-clip" : undefined}
      tableClassName={employerView && !dashboardSummary ? "[&_tbody_tr]:hover:bg-primary/[0.035]" : undefined}
      dense={dashboardSummary}
      denseVariant={dashboardSummary ? "tight" : undefined}
      columns={columns}
      data={applications}
      empty={EMPTY_STATES.applications}
      getKey={(item) => String(item.application._id)}
      mobileRow={(item) =>
        employerView ? <EmployerApplicationMobileRow item={item} /> : <SeekerApplicationMobileRow item={item} />
      }
    />
  );
}

function ApplicationMatchBadge({ score }: { score?: number | null }) {
  if (score == null) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }

  return (
    <Badge tone="info" className="justify-center tabular-nums">
      {score}%
    </Badge>
  );
}

function SeekerApplicationMobileRow({ item }: { item: ApplicationWithVacancy | ApplicantWithProfile }) {
  const { copy } = useI18n();
  const withdrawApplication = useMutation(api.applications.withdrawApplication);
  const title = item.vacancy?.title ?? copy.vacancies.notFound;
  const href = item.vacancy?._id ? `/vacancies/${item.vacancy._id}` : "/applications";
  const aiValue =
    item.application.aiScore != null ? String(item.application.aiScore) : copy.applications.noSummary;

  return (
    <div className="grid gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            to={href}
            className="block truncate font-medium text-foreground transition-colors hover:text-primary"
            title={title}
          >
            {title}
          </Link>
          {item.vacancy?.city ? (
            <p className="mt-1 truncate text-xs text-muted-foreground">{item.vacancy.city}</p>
          ) : null}
        </div>
        <ApplicationStatusBadge status={item.application.status} className="shrink-0" />
      </div>
      <div className="rounded-xl bg-muted/45 px-3 py-2">
        <p className="text-xs font-medium text-muted-foreground">{copy.applications.ai}</p>
        <p className="mt-1 line-clamp-2 text-sm text-foreground">{aiValue}</p>
      </div>
      <ApplicationStatusTimeline status={item.application.status} />
      {canWithdrawApplicationStatus(item.application.status) ? (
        <ConfirmDialog
          label={copy.applications.withdraw}
          title={copy.applications.withdraw}
          body={copy.applications.withdrawWarning}
          onConfirm={async () => {
            await withdrawApplication({ applicationId: item.application._id as Id<"applications"> });
            toast.success(copy.applications.withdrawSuccess);
          }}
        />
      ) : null}
    </div>
  );
}

function EmployerApplicationMobileRow({ item }: { item: ApplicationWithVacancy | ApplicantWithProfile }) {
  const { copy } = useI18n();
  const profile = "profile" in item ? item.profile : null;
  const candidate = profile?.fullName ?? copy.common.noProfile;
  const vacancy = item.vacancy?.title ?? copy.vacancies.notFound;

  return (
    <Link
      to={`/employer/applications/${item.application._id}`}
      className="block rounded-xl border border-border/70 bg-card p-3.5 transition-colors hover:border-primary/25 hover:bg-muted/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{candidate}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">{vacancy}</p>
        </div>
        <ApplicationMatchBadge score={item.application.aiScore} />
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <ApplicationStatusBadge status={item.application.status} />
        <span className="text-xs font-medium text-primary">{copy.applications.viewApplication}</span>
      </div>
      <ApplicationStatusTimeline status={item.application.status} className="mt-3" />
    </Link>
  );
}
