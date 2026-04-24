import { ArrowSquareOut, ChatCircleText, MapPin, MoneyWavy, Question } from "@phosphor-icons/react";
import { Link } from "react-router-dom";

import { SectionPanel } from "@/components/layout/SectionPanel";
import { Button } from "@/components/shared/Button";
import { SourceBadge, StatusBadge } from "@/components/shared/StatusBadge";
import { formatSalary } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import type { Vacancy } from "@/types/domain";

export function VacancyDetail({ vacancy }: { vacancy: Vacancy }) {
  const { copy, locale } = useI18n();
  const canApplyNative = vacancy.source === "native" && vacancy.status === "published";

  const action = canApplyNative ? (
    <Link to={`/vacancies/${vacancy._id}/apply`}>
      <Button>{copy.vacancies.applyNative}</Button>
    </Link>
  ) : vacancy.source === "hh" && vacancy.externalApplyUrl ? (
    <a href={vacancy.externalApplyUrl} target="_blank" rel="noreferrer">
      <Button>
        <ArrowSquareOut data-icon="inline-start" weight="bold" />
        {copy.vacancies.applyHh}
      </Button>
    </a>
  ) : null;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      <SectionPanel title={vacancy.title} subtitle={vacancy.source === "hh" ? copy.vacancies.externalOnly : copy.vacancies.nativeHelper} action={action}>
        <div className="flex flex-wrap gap-2">
          <SourceBadge source={vacancy.source} locale={locale} />
          <StatusBadge status={vacancy.status} locale={locale} />
          {vacancy.district ? <span className="rounded-full border bg-secondary px-2 py-1 text-xs font-medium">{vacancy.district}</span> : null}
        </div>
        <dl className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border bg-background/70 p-4">
            <dt className="flex items-center gap-2 text-sm text-muted-foreground">
              <MoneyWavy weight="bold" />
              {copy.vacancies.salary}
            </dt>
            <dd className="mt-2 font-semibold text-primary">{formatSalary(vacancy, locale)}</dd>
          </div>
          <div className="rounded-2xl border bg-background/70 p-4">
            <dt className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin weight="bold" />
              {copy.city}
            </dt>
            <dd className="mt-2 font-semibold text-foreground">
              {vacancy.city}
              {vacancy.district ? `, ${vacancy.district}` : ""}
            </dd>
          </div>
        </dl>
        <p className="mt-6 whitespace-pre-wrap text-base leading-8 text-muted-foreground">{vacancy.description}</p>
      </SectionPanel>

      <div className="flex flex-col gap-4">
        {vacancy.screeningQuestions?.length ? (
          <SectionPanel title={copy.vacancies.screening}>
            <div className="flex flex-col gap-3">
              {vacancy.screeningQuestions.map((question) => (
                <div key={question} className="flex gap-3 rounded-2xl border bg-background/70 p-3 text-sm leading-6">
                  <Question className="mt-1 shrink-0 text-primary" weight="bold" />
                  <span>{question}</span>
                </div>
              ))}
            </div>
          </SectionPanel>
        ) : null}
        <SectionPanel title={copy.vacancies.discussAi} subtitle={copy.applications.advisory} patterned>
          <Link to={`/ai-search?q=${encodeURIComponent(`${vacancy.title}: ${vacancy.description.slice(0, 160)}`)}`}>
            <Button variant="outline">
              <ChatCircleText data-icon="inline-start" weight="bold" />
              {copy.vacancies.discussAi}
            </Button>
          </Link>
        </SectionPanel>
      </div>
    </div>
  );
}
