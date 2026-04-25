import {
  ArrowSquareOut,
  BookmarkSimple,
  CheckCircle,
  MapPin,
  MoneyWavy,
} from "@phosphor-icons/react";
import { useMutation } from "convex/react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

import { AiExplainabilityList } from "@/components/product/AiTrust";
import { MatchMeter } from "@/components/product/MatchMeter";
import { Button } from "@/components/shared/Button";
import { SourceBadge, StatusBadge } from "@/components/shared/StatusBadge";
import { api } from "@/lib/convex-api";
import { demoAnalyticsApplyUrlMetadata } from "@/lib/demoAnalyticsClient";
import { formatSalary } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { motionPresets } from "@/lib/motion";
import { getSourceMeta } from "@/lib/status-ui";
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
  const trackDemo = useMutation(api.demoAnalytics.track);
  const href = ownerView ? `/employer/vacancies/${vacancy._id}` : `/vacancies/${vacancy._id}`;
  const native = vacancy.source === "native";
  const sourceMeta = getSourceMeta(vacancy.source, locale);

  return (
    <motion.article
      {...motionPresets.listItem}
      className={cn(
        "group rounded-lg border bg-card p-4 transition-colors hover:border-primary/30 hover:bg-muted/30",
        selected && "border-primary bg-primary/5",
        className,
      )}
    >
      <div className="flex items-start gap-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          {native ? <CheckCircle weight="duotone" /> : <ArrowSquareOut weight="duotone" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <SourceBadge source={vacancy.source} locale={locale} />
            {!compact ? <StatusBadge status={vacancy.status} locale={locale} /> : null}
          </div>
          <Link
            to={href}
            className="mt-2 block font-heading text-base font-semibold leading-6 tracking-tight text-foreground hover:text-primary"
          >
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
            <div className="flex items-center gap-2 font-medium text-foreground">
              <MoneyWavy data-icon="inline-start" weight="bold" />
              <span>{formatSalary(vacancy, locale)}</span>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          {matchScore !== undefined ? <MatchMeter value={matchScore} className="hidden w-36 sm:flex" /> : null}
          <span className="grid size-9 place-items-center rounded-lg border bg-background text-muted-foreground transition-colors group-hover:border-primary/30 group-hover:text-primary">
            <BookmarkSimple weight="regular" />
          </span>
          {selectable ? (
            <label className="flex min-h-10 cursor-pointer items-center gap-2 rounded-full border bg-background px-3 text-xs font-medium text-muted-foreground">
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

      {explanation?.length ? <AiExplainabilityList factors={explanation} className="mt-4" /> : null}
      {!ownerView ? (
        <p className="mt-3 text-xs leading-5 text-muted-foreground">{sourceMeta.actionHint}</p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {native && vacancy.status === "published" && !ownerView ? (
          <Link to={`/vacancies/${vacancy._id}/apply`} aria-label={`${copy.vacancies.applyNative}: ${vacancy.title}`}>
            <Button size="sm">{copy.vacancies.applyNative}</Button>
          </Link>
        ) : vacancy.source === "hh" && vacancy.externalApplyUrl && !ownerView ? (
          <a
            href={vacancy.externalApplyUrl}
            target="_blank"
            rel="noreferrer"
            aria-label={`${copy.vacancies.applyHh}: ${vacancy.title}`}
            onClick={() => {
              void trackDemo({
                kind: "external_apply_clicked",
                vacancyId: vacancy._id,
                surface: "vacancy_card",
                metadata: demoAnalyticsApplyUrlMetadata(vacancy.externalApplyUrl),
              });
            }}
          >
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
