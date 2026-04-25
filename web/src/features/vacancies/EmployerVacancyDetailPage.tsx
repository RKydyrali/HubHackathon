import { useQuery } from "convex/react";
import { Link, useParams } from "react-router-dom";

import { EmptyState } from "@/components/feedback/EmptyState";
import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { DetailPanel } from "@/components/layout/DetailPanel";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionPanel } from "@/components/layout/SectionPanel";
import { SeekerMatchList } from "@/components/product/SeekerMatchList";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { buttonVariants } from "@/components/ui/button";
import { api, type Id } from "@/lib/convex-api";
import { useI18n } from "@/lib/i18n";
import { useVacancySeekerMatches } from "./useVacancySeekerMatches";
import { VacancyEditor } from "./VacancyEditor";

export function EmployerVacancyDetailPage() {
  const { id } = useParams();
  const { locale } = useI18n();
  const vacancy = useQuery(api.vacancies.getVacancy, id ? { vacancyId: id as Id<"vacancies"> } : "skip");
  const seeker = useVacancySeekerMatches(vacancy?._id ? String(vacancy._id) : undefined);

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
            {vacancy.source === "native" ? (
              <SectionPanel
                title={locale === "kk" ? "AI найм көмекшісі" : "AI-ассистент найма"}
                subtitle={
                  locale === "kk"
                    ? "Кандидаттарды сүзу және осы вакансия мәтінін түзету бір чатта."
                    : "Подбор кандидатов и доработка текста этой вакансии в одном чате."
                }
                patterned
              >
                <Link
                  to={`/employer/hiring-assistant?vacancyId=${vacancy._id}`}
                  className={buttonVariants({ variant: "default", size: "sm" })}
                >
                  {locale === "kk" ? "Ассистентті ашу" : "Открыть ассистента"}
                </Link>
              </SectionPanel>
            ) : null}
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
              ) : seeker.loading ? (
                <LoadingSkeleton variant="rows" />
              ) : seeker.matches.length ? (
                <SeekerMatchList matches={seeker.matches} />
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
