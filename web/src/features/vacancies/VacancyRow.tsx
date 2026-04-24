import { Link } from "react-router-dom";

import { Button } from "@/components/shared/Button";
import { Icon } from "@/components/shared/Icon";
import { Row } from "@/components/shared/Row";
import { SourceBadge, StatusBadge } from "@/components/shared/StatusBadge";
import { formatSalary } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import type { Vacancy } from "@/types/domain";

export function VacancyRow({ vacancy, ownerView = false }: { vacancy: Vacancy; ownerView?: boolean }) {
  const { copy, locale } = useI18n();
  const href = ownerView ? `/employer/vacancies/${vacancy._id}` : `/vacancies/${vacancy._id}`;
  const meta = `${vacancy.city}${vacancy.district ? `, ${vacancy.district}` : ""} - ${formatSalary(vacancy, locale)}`;

  return (
    <Row
      title={<Link className="hover:text-primary" to={href}>{vacancy.title}</Link>}
      meta={meta}
      aside={<VacancyStatus vacancy={vacancy} />}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="line-clamp-2">{vacancy.description}</span>
        {vacancy.source === "hh" && vacancy.externalApplyUrl ? (
          <a href={vacancy.externalApplyUrl} target="_blank" rel="noreferrer" aria-label={`${copy.vacancies.applyHh}: ${vacancy.title}`}>
            <Button variant="outline" size="sm">
              <Icon icon="ExternalLink" data-icon="inline-start" weight="bold" />
              HH.kz
            </Button>
          </a>
        ) : null}
      </div>
    </Row>
  );
}

export function VacancyStatus({ vacancy }: { vacancy: Vacancy }) {
  const { locale } = useI18n();
  return (
    <div className="flex flex-wrap justify-end gap-1">
      <SourceBadge source={vacancy.source} locale={locale} compact />
      <StatusBadge status={vacancy.status} locale={locale} />
    </div>
  );
}
