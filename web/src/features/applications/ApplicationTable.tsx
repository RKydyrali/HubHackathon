import { Link } from "react-router-dom";

import { Table, type Column } from "@/components/shared/Table";
import { EMPTY_STATES } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import type { ApplicantWithProfile, ApplicationWithVacancy } from "@/types/domain";
import { ApplicationStatusBadge } from "./ApplicationRow";

export function ApplicationTable({
  applications,
  employerView = false,
}: {
  applications: Array<ApplicationWithVacancy | ApplicantWithProfile>;
  employerView?: boolean;
}) {
  const { copy } = useI18n();
  const columns: Column<ApplicationWithVacancy | ApplicantWithProfile>[] = [
    {
      key: "subject",
      header: employerView ? copy.applications.candidate : copy.applications.vacancy,
      cell: (item) => {
        const profile = "profile" in item ? item.profile : null;
        const label = employerView ? profile?.fullName ?? copy.common.noProfile : item.vacancy?.title ?? copy.vacancies.notFound;
        return employerView ? <Link className="font-medium hover:text-primary" to={`/employer/applications/${item.application._id}`}>{label}</Link> : <span className="font-medium">{label}</span>;
      },
    },
    {
      key: "vacancy",
      header: copy.applications.vacancy,
      cell: (item) => item.vacancy?.title ?? copy.vacancies.notFound,
    },
    {
      key: "status",
      header: "Status",
      cell: (item) => <ApplicationStatusBadge status={item.application.status} />,
    },
    {
      key: "score",
      header: copy.applications.ai,
      cell: (item) => item.application.aiScore ? `${item.application.aiScore}` : copy.applications.noSummary,
    },
  ];

  return (
    <Table
      columns={columns}
      data={applications}
      empty={EMPTY_STATES.applications}
      getKey={(item) => item.application._id}
    />
  );
}
