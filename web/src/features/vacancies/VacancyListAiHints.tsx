import { Sparkle } from "@phosphor-icons/react";
import { Link } from "react-router-dom";

import { buttonVariants } from "@/components/ui/button";
import type { SalaryBand } from "@/lib/vacancyListUi";
import { cn } from "@/lib/utils";

type VacancyCopy = ReturnType<typeof import("@/lib/i18n").getCopy>;

export type VacancyListHintsInput = {
  resultCount: number;
  hasDistrict: boolean;
  hasSearch: boolean;
  salaryBand: SalaryBand;
  sort: "newest" | "salaryDesc";
};

/**
 * Heuristic, client-side “AI-style” nudges derived from the current filter state and result size.
 * Not a call to a language model; keeps UX helpful without hardcoded static paragraphs in the page.
 */
export function buildVacancyListHints(
  { resultCount, hasDistrict, hasSearch, salaryBand, sort }: VacancyListHintsInput,
  copy: VacancyCopy,
): string[] {
  const hints: string[] = [];
  if (resultCount > 6 && !hasDistrict) {
    hints.push(copy.vacancies.hintNarrowDistrict);
  }
  if (resultCount > 0 && !hasSearch && resultCount < 4) {
    hints.push(copy.vacancies.hintAddSearch);
  }
  if (salaryBand === "all" && sort === "newest" && resultCount > 5) {
    hints.push(copy.vacancies.hintSortBySalary);
  }
  return hints.slice(0, 2);
}

type VacancyListAiHintsProps = {
  hints: string[];
  onTryAiHref?: string;
  className?: string;
} & { copy: VacancyCopy };

export function VacancyListAiHints({ hints, onTryAiHref, copy, className }: VacancyListAiHintsProps) {
  if (hints.length === 0) return null;

  return (
    <div
      className={cn(
        "rounded-xl border border-primary/20 bg-primary/[0.04] px-4 py-3 text-sm",
        className,
      )}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
            <Sparkle className="size-3.5" weight="fill" />
            {copy.vacancies.aiHintsTitle}
          </p>
          <ul className="mt-2 list-inside list-disc space-y-1.5 text-muted-foreground">
            {hints.map((h) => (
              <li key={h} className="leading-relaxed [text-wrap:balance]">
                {h}
              </li>
            ))}
          </ul>
        </div>
        {onTryAiHref ? (
          <Link
            to={onTryAiHref}
            className={cn(buttonVariants({ size: "sm" }), "h-8 shrink-0")}
          >
            {copy.vacancies.hintTryAi}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
