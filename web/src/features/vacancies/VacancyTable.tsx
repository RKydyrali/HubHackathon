import { Link } from "react-router-dom";

import { Button } from "@/components/shared/Button";
import { Icon } from "@/components/shared/Icon";
import { SourceBadge, StatusBadge } from "@/components/shared/StatusBadge";
import { Table, type Column } from "@/components/shared/Table";
import { EMPTY_STATES, formatSalary } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import type { Vacancy } from "@/types/domain";

export function VacancyTable({
  vacancies,
  ownerView = false,
}: {
  vacancies: Vacancy[];
  ownerView?: boolean;
}) {
  const { copy, locale } = useI18n();
  const columns: Column<Vacancy>[] = [
    {
      key: "title",
      header: copy.vacancies.title,
      cell: (vacancy) => (
        <div>
          <Link className="font-medium hover:text-primary" to={ownerView ? `/employer/vacancies/${vacancy._id}` : `/vacancies/${vacancy._id}`}>
            {vacancy.title}
          </Link>
          <div className="mt-1 text-xs text-muted-foreground">{vacancy.city}{vacancy.district ? `, ${vacancy.district}` : ""}</div>
        </div>
      ),
    },
    {
      key: "source",
      header: copy.vacancies.source,
      cell: (vacancy) => <SourceBadge source={vacancy.source} locale={locale} compact />,
    },
    {
      key: "status",
      header: "Status",
      cell: (vacancy) => <StatusBadge status={vacancy.status} locale={locale} />,
    },
    { key: "salary", header: copy.vacancies.salary, cell: (vacancy) => formatSalary(vacancy, locale) },
    {
      key: "action",
      header: "",
      className: "text-right",
      cell: (vacancy) =>
        vacancy.source === "hh" && vacancy.externalApplyUrl && !ownerView ? (
          <a href={vacancy.externalApplyUrl} target="_blank" rel="noreferrer">
            <Button variant="outline" size="sm">
              <Icon icon="ExternalLink" data-icon="inline-start" weight="bold" />
              {copy.vacancies.applyHh}
            </Button>
          </a>
        ) : (
          <Link to={ownerView ? `/employer/vacancies/${vacancy._id}` : `/vacancies/${vacancy._id}`}>
            <Button variant="outline" size="sm">{copy.vacancies.details}</Button>
          </Link>
        ),
    },
  ];

  return (
    <Table
      columns={columns}
      data={vacancies}
      empty={EMPTY_STATES.vacancies}
      getKey={(vacancy) => vacancy._id}
    />
  );
}
