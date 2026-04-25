import { useAction, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { EmptyState } from "@/components/feedback/EmptyState";
import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { DetailPanel } from "@/components/layout/DetailPanel";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionPanel } from "@/components/layout/SectionPanel";
import { SeekerMatchList } from "@/components/product/SeekerMatchList";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { api, type Id } from "@/lib/convex-api";
import { useI18n } from "@/lib/i18n";
import { VacancyEditor } from "./VacancyEditor";

export function EmployerVacancyDetailPage() {
  const { id } = useParams();
  const { locale } = useI18n();
  const vacancy = useQuery(api.vacancies.getVacancy, id ? { vacancyId: id as Id<"vacancies"> } : "skip");
  const getMatchingSeekers = useAction(api.ai.getMatchingSeekers);
  const [seekerMatches, setSeekerMatches] = useState<Array<{ profile: any; matchScore: number }> | null>(null);
  const [loadingSeekers, setLoadingSeekers] = useState(false);

  useEffect(() => {
    if (!vacancy) return;
    if (vacancy.source !== "native") {
      setSeekerMatches(null);
      return;
    }
    let cancelled = false;
    setLoadingSeekers(true);
    void (async () => {
      try {
        const result = (await getMatchingSeekers({
          vacancyId: vacancy._id as Id<"vacancies">,
          limit: 8,
        })) as Array<{ profile: any; matchScore: number }>;
        if (!cancelled) {
          // Keep only what we render.
          const trimmed = (result ?? [])
            .filter((r) => typeof r?.matchScore === "number" && r.profile)
            .map((r) => ({
              matchScore: r.matchScore,
              profile: {
                _id: String(r.profile._id),
                fullName: r.profile.fullName,
                city: r.profile.city,
                skills: r.profile.skills,
              },
            }));
          setSeekerMatches(trimmed);
        }
      } catch {
        if (!cancelled) setSeekerMatches([]);
      } finally {
        if (!cancelled) setLoadingSeekers(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getMatchingSeekers, vacancy?._id, vacancy?.source]);

  if (vacancy === undefined) return <LoadingSkeleton variant="form" />;

  return (
    <>
      <PageHeader
        title={locale === "kk" ? "Вакансия" : "Вакансия"}
        subtitle={
          locale === "kk"
            ? "Мәтінді, сұрақтарды және жариялау мәртебесін басқарыңыз."
            : "Управляйте текстом, вопросами и статусом публикации."
        }
        action={vacancy ? <StatusBadge status={vacancy.status} locale={locale} /> : null}
      />
      <div className="container-app py-4">
        {vacancy ? (
          <div className="space-y-4">
            <DetailPanel title={vacancy.title}>
              <VacancyEditor vacancy={vacancy} />
            </DetailPanel>
            <SectionPanel
              title={locale === "kk" ? "Үздік кандидаттар" : "Топ кандидатов"}
              subtitle={
                vacancy.source !== "native"
                  ? locale === "kk"
                    ? "Тек JumysAI ішіндегі (native) вакансиялар үшін қолжетімді."
                    : "Доступно только для native-вакансий внутри JumysAI."
                  : locale === "kk"
                    ? "Матч% бойынша осы вакансияға сәйкес кандидаттар."
                    : "Кандидаты по Match% для этой вакансии."
              }
              patterned
            >
              {vacancy.source !== "native" ? (
                <p className="text-sm text-muted-foreground">
                  {locale === "kk"
                    ? "Бұл HH вакансиясы. Мұнда кандидаттарды сәйкестендіру қолжетімсіз."
                    : "Это HH-вакансия. Матчинг кандидатов недоступен."}
                </p>
              ) : loadingSeekers || seekerMatches === null ? (
                <LoadingSkeleton variant="rows" />
              ) : seekerMatches.length ? (
                <SeekerMatchList matches={seekerMatches} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  {locale === "kk"
                    ? "Әзірге дәл сәйкес кандидаттар табылмады."
                    : "Пока не найдено подходящих кандидатов."}
                </p>
              )}
            </SectionPanel>
          </div>
        ) : (
          <EmptyState title={locale === "kk" ? "Вакансия табылмады" : "Вакансия не найдена"} />
        )}
      </div>
    </>
  );
}
