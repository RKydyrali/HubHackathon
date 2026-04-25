import { ArrowSquareOut, FunnelSimple, Scales } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation } from "convex/react";
import type { ReactNode } from "react";

import { ActionEmptyState } from "@/components/product/ActionEmptyState";
import { DataTable, type DataColumn } from "@/components/product/DataTable";
import { DataToolbar } from "@/components/product/DataToolbar";
import { MatchMeter } from "@/components/product/MatchMeter";
import { Button } from "@/components/shared/Button";
import { SourceBadge, StatusBadge } from "@/components/shared/StatusBadge";
import { Checkbox } from "@/components/ui/checkbox";
import { api } from "@/lib/convex-api";
import { demoAnalyticsApplyUrlMetadata } from "@/lib/demoAnalyticsClient";
import { formatSalary } from "@/lib/format";
import { useI18n, type Locale } from "@/lib/i18n";
import type { Vacancy } from "@/types/domain";
import type { AiMatchGroups, AiVacancyMatch } from "./aiSearchTypes";

type ResultTag = "best" | "nearby" | "fastStart" | "hh";
type SourceFilter = "all" | "native" | "hh";

const tableCopy = {
  ru: {
    title: "Подходящие вакансии",
    search: "Поиск в результатах",
    match: "Совпадение",
    why: "Почему подходит",
    action: "Действие",
    compareShort: "Сравнить",
    selected: "Выбрано",
    sourceAll: "Все",
    noResultsTitle: "Нет вакансий по этим критериям",
    relaxDistrict: "Расширить район",
    includeHh: "Включить HH",
    best: "Лучшее",
    nearby: "Рядом",
    fastStart: "Быстрый старт",
    hh: "HH",
  },
  kk: {
    title: "Сәйкес вакансиялар",
    search: "Нәтижеден іздеу",
    match: "Сәйкестік",
    why: "Неге сәйкес",
    action: "Әрекет",
    compareShort: "Салыстыру",
    selected: "Таңдалды",
    sourceAll: "Барлығы",
    noResultsTitle: "Бұл критерийлер бойынша вакансия жоқ",
    relaxDistrict: "Ауданды кеңейту",
    includeHh: "HH қосу",
    best: "Ең жақсы",
    nearby: "Жақын",
    fastStart: "Тез бастау",
    hh: "HH",
  },
} as const;

export function AiResultsTable({
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
  const text = tableCopy[locale];
  const [search, setSearch] = useState("");
  const [source, setSource] = useState<SourceFilter>("all");

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return matches.all.filter((item) => {
      const vacancy = item.vacancy;
      const sourceMatches = source === "all" || vacancy.source === source;
      const queryMatches =
        !query ||
        [vacancy.title, vacancy.city, vacancy.district ?? "", vacancy.description]
          .join(" ")
          .toLowerCase()
          .includes(query);
      return sourceMatches && queryMatches;
    });
  }, [matches.all, search, source]);

  const columns: DataColumn<AiVacancyMatch>[] = [
    {
      key: "compare",
      header: <span className="sr-only">{copy.ai.compare}</span>,
      className: "w-12",
      cell: (item) => (
        <Checkbox
          checked={selectedIds.has(String(item.vacancy._id))}
          onCheckedChange={() => onToggleCompare(String(item.vacancy._id))}
          aria-label={`${copy.ai.compare}: ${item.vacancy.title}`}
          onClick={(event) => event.stopPropagation()}
        />
      ),
    },
    {
      key: "vacancy",
      header: copy.vacancies.title,
      cell: (item) => (
        <div className="min-w-0">
          <Link className="font-medium text-foreground hover:text-primary" to={`/vacancies/${item.vacancy._id}`}>
            {item.vacancy.title}
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <SourceBadge source={item.vacancy.source} locale={locale} compact />
            <StatusBadge status={item.vacancy.status} locale={locale} />
            {resultTags(item, matches).map((tag) => (
              <span key={tag} className="rounded-full border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {text[tag]}
              </span>
            ))}
          </div>
        </div>
      ),
    },
    {
      key: "location",
      header: copy.vacancies.district,
      cell: (item) => locationLabel(item.vacancy),
    },
    {
      key: "salary",
      header: copy.vacancies.salary,
      cell: (item) => formatSalary(item.vacancy, locale),
    },
    {
      key: "match",
      header: text.match,
      cell: (item) =>
        item.matchScore === undefined ? (
          <span className="text-sm text-muted-foreground">{copy.common.empty}</span>
        ) : (
          <MatchMeter value={item.matchScore} className="min-w-36" label={`${text.match}: ${item.vacancy.title}`} />
        ),
    },
    {
      key: "why",
      header: text.why,
      cell: (item) => (
        <span className="line-clamp-2 text-sm text-muted-foreground">
          {item.explanation.filter(Boolean).slice(0, 2).join(" / ")}
        </span>
      ),
    },
    {
      key: "action",
      header: text.action,
      className: "text-right",
      cell: (item) => <VacancyAction vacancy={item.vacancy} />,
    },
  ];

  return (
    <section className="rounded-lg border bg-card" aria-label={text.title}>
      <DataToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={text.search}
        filters={
          <>
            <SourceFilterButton active={source === "all"} onClick={() => setSource("all")}>
              <FunnelSimple data-icon="inline-start" weight="bold" />
              {text.sourceAll}
            </SourceFilterButton>
            <SourceFilterButton active={source === "native"} onClick={() => setSource("native")}>
              JumysAI
            </SourceFilterButton>
            <SourceFilterButton active={source === "hh"} onClick={() => setSource("hh")}>
              HH
            </SourceFilterButton>
          </>
        }
        actions={
          <Button type="button" size="sm" onClick={onCompare} disabled={selectedIds.size < 2}>
            <Scales data-icon="inline-start" weight="bold" />
            {text.compareShort}
            {selectedIds.size ? <span className="tabular-nums">({selectedIds.size})</span> : null}
          </Button>
        }
      />
      <div className="px-4 py-3 text-sm text-muted-foreground">
        {text.selected}: <span className="font-medium tabular-nums text-foreground">{selectedIds.size}</span> /{" "}
        <span className="tabular-nums">{matches.totalCount}</span>
      </div>
      <DataTable
        columns={columns}
        data={rows}
        getKey={(item) => String(item.vacancy._id)}
        empty={
          <ActionEmptyState
            title={text.noResultsTitle}
            body={copy.ai.partial}
            action={
              <Button type="button" size="sm" variant="outline" onClick={onRelaxDistrict}>
                {text.relaxDistrict}
              </Button>
            }
            secondaryAction={
              <Button type="button" size="sm" variant="outline" onClick={onIncludeHh}>
                {text.includeHh}
              </Button>
            }
          />
        }
        mobileRow={(item) => (
          <MobileResultRow
            item={item}
            matches={matches}
            selected={selectedIds.has(String(item.vacancy._id))}
            onToggleCompare={() => onToggleCompare(String(item.vacancy._id))}
            locale={locale}
          />
        )}
        className="rounded-none border-x-0 border-b-0"
      />
    </section>
  );
}

function SourceFilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button type="button" size="sm" variant={active ? "secondary" : "ghost"} onClick={onClick}>
      {children}
    </Button>
  );
}

function MobileResultRow({
  item,
  matches,
  selected,
  onToggleCompare,
  locale,
}: {
  item: AiVacancyMatch;
  matches: AiMatchGroups;
  selected: boolean;
  onToggleCompare: () => void;
  locale: Locale;
}) {
  const { copy } = useI18n();
  const text = tableCopy[locale];

  return (
    <div className="grid gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link className="font-medium text-foreground hover:text-primary" to={`/vacancies/${item.vacancy._id}`}>
            {item.vacancy.title}
          </Link>
          <p className="mt-1 text-sm text-muted-foreground">{locationLabel(item.vacancy)}</p>
        </div>
        <Checkbox checked={selected} onCheckedChange={onToggleCompare} aria-label={`${copy.ai.compare}: ${item.vacancy.title}`} />
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <SourceBadge source={item.vacancy.source} locale={locale} compact />
        <StatusBadge status={item.vacancy.status} locale={locale} />
        {resultTags(item, matches).map((tag) => (
          <span key={tag} className="rounded-full border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {text[tag]}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm font-medium">{formatSalary(item.vacancy, locale)}</span>
        {item.matchScore !== undefined ? <MatchMeter value={item.matchScore} className="w-36" /> : null}
      </div>
      {item.explanation.length ? (
        <p className="text-sm text-muted-foreground">{item.explanation.filter(Boolean).slice(0, 2).join(" / ")}</p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <VacancyAction vacancy={item.vacancy} />
        <Link to={`/vacancies/${item.vacancy._id}`}>
          <Button type="button" size="sm" variant="ghost">
            {copy.vacancies.details}
          </Button>
        </Link>
      </div>
    </div>
  );
}

function VacancyAction({ vacancy }: { vacancy: Vacancy }) {
  const { copy } = useI18n();
  const trackDemo = useMutation(api.demoAnalytics.track);

  if (vacancy.source === "native") {
    return (
      <Link to={`/vacancies/${vacancy._id}/apply`} aria-label={`${copy.vacancies.applyNative}: ${vacancy.title}`}>
        <Button type="button" size="sm">
          {copy.vacancies.applyNative}
        </Button>
      </Link>
    );
  }

  if (vacancy.externalApplyUrl) {
    return (
      <a
        href={vacancy.externalApplyUrl}
        target="_blank"
        rel="noreferrer"
        aria-label={`${copy.vacancies.applyHh}: ${vacancy.title}`}
        onClick={() => {
          void trackDemo({
            kind: "external_apply_clicked",
            vacancyId: vacancy._id,
            surface: "ai_results_table",
            metadata: demoAnalyticsApplyUrlMetadata(vacancy.externalApplyUrl),
          });
        }}
      >
        <Button type="button" size="sm" variant="outline">
          <ArrowSquareOut data-icon="inline-start" weight="bold" />
          {copy.vacancies.applyHh}
        </Button>
      </a>
    );
  }

  return (
    <Link to={`/vacancies/${vacancy._id}`} aria-label={`${copy.vacancies.details}: ${vacancy.title}`}>
      <Button type="button" size="sm" variant="outline">
        {copy.vacancies.details}
      </Button>
    </Link>
  );
}

function locationLabel(vacancy: Vacancy) {
  return [vacancy.city, vacancy.district].filter(Boolean).join(", ");
}

function resultTags(item: AiVacancyMatch, matches: AiMatchGroups): ResultTag[] {
  const id = String(item.vacancy._id);
  const tags: ResultTag[] = [];
  if (matches.best.some((match) => String(match.vacancy._id) === id)) tags.push("best");
  if (matches.nearby.some((match) => String(match.vacancy._id) === id)) tags.push("nearby");
  if (matches.fastStart.some((match) => String(match.vacancy._id) === id)) tags.push("fastStart");
  if (matches.hh.some((match) => String(match.vacancy._id) === id)) tags.push("hh");
  return tags;
}
