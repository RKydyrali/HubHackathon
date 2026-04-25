import { Link } from "react-router-dom";

import { StatusBadge } from "@/components/shared/StatusBadge";
import { Row } from "@/components/shared/Row";
import { useI18n } from "@/lib/i18n";
import type { ApplicantWithProfile, ApplicationWithVacancy } from "@/types/domain";

export function ApplicationRow({
  item,
  employerView = false,
}: {
  item: ApplicationWithVacancy | ApplicantWithProfile;
  employerView?: boolean;
}) {
  const { copy } = useI18n();
  const profile = "profile" in item ? item.profile : null;
  const title = employerView ? profile?.fullName ?? copy.common.noProfile : item.vacancy?.title ?? copy.vacancies.notFound;
  const detailHref = employerView ? `/employer/applications/${item.application._id}` : "/applications";

  return (
    <Row
      title={<Link className="hover:text-primary" to={detailHref}>{title}</Link>}
      meta={employerView ? item.vacancy?.title : item.vacancy?.city}
      aside={<ApplicationStatusBadge status={item.application.status} />}
    >
      {item.application.aiSummary ?? copy.applications.noSummary}
    </Row>
  );
}

export function ApplicationStatusBadge({ status, className }: { status: string; className?: string }) {
  const { locale } = useI18n();
  return <StatusBadge status={status} locale={locale} className={className} />;
}
