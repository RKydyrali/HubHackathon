import { Plus, Sparkle } from "@phosphor-icons/react";
import { useQuery } from "convex/react";
import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { PageHeader } from "@/components/layout/PageHeader";
import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { Button } from "@/components/shared/Button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, type Id } from "@/lib/convex-api";
import { useI18n } from "@/lib/i18n";
import type { Vacancy } from "@/types/domain";
import { AiVacancyCreateSession } from "./AiVacancyCreateSession";
import { VacancyTable } from "./VacancyTable";

type StatusFilter = "all" | "draft" | "published" | "archived";

export function EmployerVacanciesPage() {
  const rows = useQuery(api.vacancies.listByOwner);
  const { copy } = useI18n();
  const ev = copy.employerVacancies;
  const navigate = useNavigate();
  const [inCreate, setInCreate] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const vacancies = useMemo<Vacancy[]>(
    () => rows?.map((row: { vacancy: Vacancy }) => row.vacancy) ?? [],
    [rows],
  );

  const filtered = useMemo(() => {
    if (statusFilter === "all") return vacancies;
    return vacancies.filter((v) => v.status === statusFilter);
  }, [vacancies, statusFilter]);

  const counts = useMemo(
    () => ({
      published: vacancies.filter((v) => v.status === "published").length,
      draft: vacancies.filter((v) => v.status === "draft").length,
      archived: vacancies.filter((v) => v.status === "archived").length,
    }),
    [vacancies],
  );

  const listSummary = useMemo(() => {
    const p: string[] = [];
    if (counts.published) {
      p.push(ev.listSummaryPub.replace("{{n}}", String(counts.published)));
    }
    if (counts.draft) {
      p.push(ev.listSummaryDraft.replace("{{n}}", String(counts.draft)));
    }
    if (counts.archived) {
      p.push(ev.listSummaryArch.replace("{{n}}", String(counts.archived)));
    }
    return p.join(" · ");
  }, [counts, ev]);

  const onOwnerNavigate = useCallback(
    (v: Vacancy) => {
      navigate(`/employer/vacancies/${v._id as Id<"vacancies">}`);
    },
    [navigate],
  );

  const openCreate = useCallback(() => setInCreate(true), []);

  if (rows === undefined) {
    return <LoadingSkeleton variant="dashboard" />;
  }

  if (inCreate) {
    return (
      <div className="container-app min-w-0 max-w-6xl py-3 md:py-4">
        <AiVacancyCreateSession
          onCancel={() => setInCreate(false)}
          backLabel={vacancies.length > 0 ? ev.backToList : ev.backToHome}
        />
      </div>
    );
  }

  if (vacancies.length === 0) {
    return (
      <div className="container-app py-6 md:py-8">
        <PageHeader compact title={ev.listPageTitle} />
        <div className="mx-auto max-w-md rounded-2xl border border-border/70 bg-card/60 p-6 text-center shadow-sm md:max-w-lg md:p-8">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Sparkle className="size-7" weight="bold" />
          </div>
          <h2 className="mt-4 text-lg font-semibold tracking-tight text-foreground">{ev.heroTitle}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{ev.heroBody}</p>
          <div className="mt-6 flex flex-col items-stretch gap-1.5 sm:items-center">
            <Button onClick={openCreate}>
              <Plus data-icon="start" weight="bold" />
              {ev.createWithAi}
            </Button>
            <p className="text-center text-xs leading-relaxed text-muted-foreground">{ev.createCtaHint}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        compact
        title={ev.listPageTitle}
        subtitle={listSummary}
        action={
          <div className="flex min-w-0 max-w-sm flex-col items-stretch gap-1 sm:items-end">
            <Button onClick={openCreate} className="shrink-0">
              <Plus data-icon="start" weight="bold" />
              {ev.createWithAi}
            </Button>
            <p className="text-right text-xs leading-relaxed text-muted-foreground">{ev.createCtaHint}</p>
          </div>
        }
      />

      <div className="container-app space-y-2 pb-5 pt-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">{ev.filterStatus}</span>
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              if (v === "all" || v === "draft" || v === "published" || v === "archived") {
                setStatusFilter(v);
              }
            }}
          >
            <SelectTrigger size="sm" className="h-8 w-[min(100%,11rem)] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{ev.filterAll}</SelectItem>
              <SelectItem value="published">{ev.filterPublished}</SelectItem>
              <SelectItem value="draft">{ev.filterDraft}</SelectItem>
              <SelectItem value="archived">{ev.filterArchived}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <VacancyTable
          vacancies={filtered}
          ownerView
          employerSlim
          onOwnerRowNavigate={onOwnerNavigate}
        />
      </div>
    </>
  );
}
