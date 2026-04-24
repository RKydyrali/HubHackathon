import { CheckCircle, Lightning, MapPin, Scales, Sparkle } from "@phosphor-icons/react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

import { Button } from "@/components/shared/Button";
import { SourceBadge } from "@/components/shared/StatusBadge";
import { formatSalary } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { motionPresets } from "@/lib/motion";
import type { Vacancy } from "@/types/domain";

export function AiVacancyResultCard({
  vacancy,
  explanation,
  matchScore,
  selected = false,
  onToggleCompare,
}: {
  vacancy: Vacancy;
  explanation: string[];
  matchScore?: number;
  selected?: boolean;
  onToggleCompare?: () => void;
}) {
  const { copy, locale } = useI18n();
  const isNative = vacancy.source === "native";
  const fastStart = explanation.some((item) => /быстро|без опыта|тез|тәжірибесіз/i.test(item));

  return (
    <motion.article
      className="group surface-card rounded-2xl p-4 transition hover:-translate-y-0.5"
      variants={motionPresets.listItem.variants}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <SourceBadge source={vacancy.source} locale={locale} compact />
            {fastStart ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-1 text-xs font-semibold text-success">
                <Lightning className="size-3.5" weight="bold" />
                {copy.ai.fastStart}
              </span>
            ) : null}
            {matchScore !== undefined ? (
              <span className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold text-muted-foreground">
                <Sparkle className="size-3.5 text-primary" weight="bold" />
                {matchScore}% {locale === "kk" ? "сәйкес" : "совпадение"}
              </span>
            ) : null}
          </div>
          <h3 className="mt-3 font-heading text-lg font-extrabold leading-6 tracking-tight text-foreground">{vacancy.title}</h3>
          <p className="mt-1 text-sm font-semibold text-primary">{formatSalary(vacancy, locale)}</p>
          <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="size-4" weight="bold" />
            {vacancy.city}
            {vacancy.district ? `, ${vacancy.district}` : ""}
          </p>
        </div>
        {onToggleCompare ? (
          <button
            type="button"
            className="flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full border bg-background/80 px-3 text-xs font-semibold text-muted-foreground transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-pressed={selected}
            aria-label={`${copy.ai.compare}: ${vacancy.title}`}
            onClick={onToggleCompare}
          >
            {selected ? <CheckCircle className="size-4 text-success" weight="fill" /> : <Scales className="size-4" weight="bold" />}
            {copy.ai.compare}
          </button>
        ) : null}
      </div>

      <div className="mt-4 rounded-2xl border bg-muted/52 p-3">
        <p className="text-xs font-semibold text-foreground">
          {locale === "kk" ? "Неге сәйкес:" : "Почему подходит:"}
        </p>
        <ul className="mt-2 flex flex-col gap-1 text-sm text-muted-foreground">
          {explanation.map((item) => (
            <li key={item} className="flex gap-2">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary/70" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {isNative ? (
          <Link to={`/vacancies/${vacancy._id}/apply`} aria-label={`${copy.vacancies.applyNative}: ${vacancy.title}`}>
            <Button size="sm">{copy.vacancies.applyNative}</Button>
          </Link>
        ) : vacancy.externalApplyUrl ? (
          <a
            href={vacancy.externalApplyUrl}
            target="_blank"
            rel="noreferrer"
            aria-label={`${copy.vacancies.applyHh}: ${vacancy.title}`}
          >
            <Button size="sm" variant="outline">
              {copy.vacancies.applyHh}
            </Button>
          </a>
        ) : (
          <Link to={`/vacancies/${vacancy._id}`}>
            <Button size="sm" variant="outline">
              {copy.vacancies.details}
            </Button>
          </Link>
        )}
        <Link to={`/vacancies/${vacancy._id}`}>
          <Button size="sm" variant="ghost">
            {copy.vacancies.details}
          </Button>
        </Link>
      </div>
    </motion.article>
  );
}
