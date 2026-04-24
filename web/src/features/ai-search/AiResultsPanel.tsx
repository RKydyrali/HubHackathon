import { MagnifyingGlass, Scales } from "@phosphor-icons/react";
import { motion } from "framer-motion";

import { AiPartialResultsNotice } from "@/components/feedback/AiPartialResultsNotice";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Button } from "@/components/shared/Button";
import { useI18n } from "@/lib/i18n";
import { motionPresets } from "@/lib/motion";
import { AiVacancyResultCard } from "./AiVacancyResultCard";
import type { AiMatchGroups } from "./aiSearchTypes";

export function AiResultsPanel({
  matches,
  selectedIds,
  onToggleCompare,
  onCompare,
  onRelaxDistrict,
  onIncludeHh,
}: {
  matches: AiMatchGroups;
  selectedIds: Set<string>;
  onToggleCompare: (vacancyId: string) => void;
  onCompare: () => void;
  onRelaxDistrict: () => void;
  onIncludeHh: () => void;
}) {
  const { copy, locale } = useI18n();
  const hasResults = matches.all.length > 0;

  if (!hasResults) {
    return (
      <EmptyState
        title={copy.vacancies.noResults}
        body={
          locale === "kk"
            ? "Ауданды кеңейтіп, жалақы күтімін жұмсартып немесе HH.kz вакансияларын қосып көріңіз."
            : "Можно расширить район, смягчить ожидание по зарплате или включить вакансии HH.kz."
        }
        action={
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={onRelaxDistrict}>
              {locale === "kk" ? "Ауданды кеңейту" : "Расширить район"}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={onIncludeHh}>
              {locale === "kk" ? "HH қосу" : "Включить HH"}
            </Button>
          </div>
        }
        visual
      />
    );
  }

  return (
    <section className="flex flex-col gap-4" aria-label={locale === "kk" ? "Сәйкес вакансиялар" : "Подходящие вакансии"}>
      <AiPartialResultsNotice />
      <div className="sticky top-24 z-10 rounded-2xl border bg-card/92 p-3 shadow-card backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Scales className="size-4 text-primary" weight="bold" />
            {selectedIds.size >= 2
              ? locale === "kk"
                ? `Салыстыруға таңдалды: ${selectedIds.size}`
                : `Выбрано для сравнения: ${selectedIds.size}`
              : copy.ai.compareNeedsTwo}
          </p>
          <Button type="button" size="sm" onClick={onCompare} disabled={selectedIds.size < 2}>
            {copy.ai.compare}
          </Button>
        </div>
      </div>

      <motion.div {...motionPresets.list} className="grid gap-4">
        <ResultSection
          title={copy.ai.best}
          items={matches.best.length ? matches.best : matches.all.slice(0, 4)}
          selectedIds={selectedIds}
          onToggleCompare={onToggleCompare}
        />
        {matches.nearby.length ? (
          <ResultSection
            title={copy.ai.nearby}
            items={matches.nearby}
            selectedIds={selectedIds}
            onToggleCompare={onToggleCompare}
          />
        ) : null}
        {matches.fastStart.length ? (
          <ResultSection
            title={copy.ai.fastStart}
            items={matches.fastStart}
            selectedIds={selectedIds}
            onToggleCompare={onToggleCompare}
          />
        ) : null}
        {matches.hh.length ? (
          <ResultSection
            title={copy.ai.hh}
            items={matches.hh}
            selectedIds={selectedIds}
            onToggleCompare={onToggleCompare}
          />
        ) : null}
      </motion.div>
    </section>
  );
}

function ResultSection({
  title,
  items,
  selectedIds,
  onToggleCompare,
}: {
  title: string;
  items: AiMatchGroups["all"];
  selectedIds: Set<string>;
  onToggleCompare: (vacancyId: string) => void;
}) {
  return (
    <motion.div className="flex flex-col gap-3" variants={motionPresets.listItem.variants}>
      <h2 className="flex items-center gap-2 font-heading text-lg font-extrabold tracking-tight text-foreground">
        <MagnifyingGlass className="size-4 text-primary" weight="bold" />
        {title}
      </h2>
      <div className="grid gap-3">
        {items.map((item) => (
          <AiVacancyResultCard
            key={item.vacancy._id}
            vacancy={item.vacancy}
            explanation={item.explanation}
            matchScore={item.matchScore}
            selected={selectedIds.has(String(item.vacancy._id))}
            onToggleCompare={() => onToggleCompare(String(item.vacancy._id))}
          />
        ))}
      </div>
    </motion.div>
  );
}
