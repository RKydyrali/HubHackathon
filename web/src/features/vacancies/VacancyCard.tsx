import {
  ArrowSquareOut,
  BookmarkSimple,
  CheckCircle,
  MapPin,
  MoneyWavy,
  Sparkle,
} from "@phosphor-icons/react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

import { Button } from "@/components/shared/Button";
import { SourceBadge, StatusBadge } from "@/components/shared/StatusBadge";
import { formatSalary } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { motionPresets } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { Vacancy } from "@/types/domain";

export function VacancyCard({
  vacancy,
  ownerView = false,
  compact = false,
  selectable = false,
  selected = false,
  onToggleCompare,
  explanation,
  matchScore,
  className,
}: {
  vacancy: Vacancy;
  ownerView?: boolean;
  compact?: boolean;
  selectable?: boolean;
  selected?: boolean;
  onToggleCompare?: () => void;
  explanation?: string[];
  matchScore?: number;
  className?: string;
}) {
  const { copy, locale } = useI18n();
  const href = ownerView ? `/employer/vacancies/${vacancy._id}` : `/vacancies/${vacancy._id}`;
  const native = vacancy.source === "native";

  return (
    <motion.article
      {...motionPresets.listItem}
      className={cn(
        "group surface-card rounded-2xl p-4 transition-all hover:-translate-y-0.5 hover:border-primary/30",
        selected && "border-primary bg-primary/5",
        className,
      )}
    >
      <div className="flex items-start gap-4">
        <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
          {native ? <CheckCircle weight="duotone" /> : <ArrowSquareOut weight="duotone" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <SourceBadge source={vacancy.source} locale={locale} compact />
            {!compact ? <StatusBadge status={vacancy.status} locale={locale} /> : null}
            {matchScore !== undefined ? (
              <span className="inline-flex h-7 items-center rounded-full border bg-secondary px-2.5 text-xs font-semibold text-secondary-foreground">
                {matchScore}% {locale === "kk" ? "СЃУ™Р№РєРµСЃ" : "СЃРѕРІРїР°РґРµРЅРёРµ"}
              </span>
            ) : null}
          </div>
          <Link to={href} className="mt-3 block font-heading text-lg font-extrabold leading-6 tracking-tight text-foreground hover:text-primary">
            {vacancy.title}
          </Link>

          <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            <div className="flex items-center gap-2">
              <MapPin data-icon="inline-start" weight="bold" />
              <span>
                {vacancy.city}
                {vacancy.district ? `, ${vacancy.district}` : ""}
              </span>
            </div>
            <div className="flex items-center gap-2 font-semibold text-primary">
              <MoneyWavy data-icon="inline-start" weight="bold" />
              <span>{formatSalary(vacancy, locale)}</span>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className="grid size-10 place-items-center rounded-xl border bg-background/72 text-muted-foreground transition-colors group-hover:border-primary/30 group-hover:text-primary">
            <BookmarkSimple weight="regular" />
          </span>
          {selectable ? (
            <label className="flex min-h-10 cursor-pointer items-center gap-2 rounded-full border bg-background px-3 text-xs font-semibold text-muted-foreground">
              <input
                type="checkbox"
                checked={selected}
                onChange={onToggleCompare}
                aria-label={`${copy.ai.compare}: ${vacancy.title}`}
              />
              {copy.ai.compare}
            </label>
          ) : null}
        </div>
      </div>

      {!compact ? (
        <p className="mt-4 line-clamp-3 text-sm leading-6 text-muted-foreground">{vacancy.description}</p>
      ) : null}

      {explanation?.length ? (
        <div className="mt-4 rounded-2xl border bg-background/70 p-3">
          <p className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <Sparkle data-icon="inline-start" weight="fill" />
            {locale === "kk" ? "РќРµРіРµ СЃУ™Р№РєРµСЃ РєРµР»РµРґС–" : "РџРѕС‡РµРјСѓ РїРѕРґС…РѕРґРёС‚"}
          </p>
          <ul className="mt-2 flex flex-col gap-1 text-sm leading-6 text-muted-foreground">
            {explanation.map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {native && vacancy.status === "published" && !ownerView ? (
          <Link to={`/vacancies/${vacancy._id}/apply`} aria-label={`${copy.vacancies.applyNative}: ${vacancy.title}`}>
            <Button size="sm">{copy.vacancies.applyNative}</Button>
          </Link>
        ) : vacancy.source === "hh" && vacancy.externalApplyUrl && !ownerView ? (
          <a href={vacancy.externalApplyUrl} target="_blank" rel="noreferrer" aria-label={`${copy.vacancies.applyHh}: ${vacancy.title}`}>
            <Button size="sm" variant="outline">
              <ArrowSquareOut data-icon="inline-start" weight="bold" />
              {copy.vacancies.applyHh}
            </Button>
          </a>
        ) : null}
        <Link to={href}>
          <Button size="sm" variant={ownerView ? "default" : "ghost"}>
            {ownerView ? copy.common.save : copy.vacancies.details}
          </Button>
        </Link>
      </div>
    </motion.article>
  );
}
