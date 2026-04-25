import { Link } from "react-router-dom";

import { useI18n } from "@/lib/i18n";
import { useVacancyMatchMap } from "@/hooks/useVacancyMatchMap";
import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { PageHeader } from "@/components/layout/PageHeader";
import { AiAdvisoryNotice } from "@/components/product/AiTrust";
import { Button } from "@/components/shared/Button";
import { VacancyTable } from "@/features/vacancies/VacancyTable";
import { getSeekerFirstRunSteps } from "@/lib/product-experience";

export function ForYouPage() {
  const { copy, locale } = useI18n();
  const { loading, rows, matchMap } = useVacancyMatchMap({ limit: 20 });
  const firstRunSteps = getSeekerFirstRunSteps(locale);

  const vacancies = (rows ?? [])
    .sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0))
    .slice(0, 12)
    .map((r) => r.vacancy);

  return (
    <>
      <PageHeader
        title={locale === "kk" ? "Сізге арналған" : "Для вас"}
        subtitle={
          locale === "kk"
            ? "Профиль бойынша ең сәйкес вакансиялар (Match%)."
            : "Самые подходящие вакансии по вашему профилю (Match%)."
        }
      />
      <main className="container-app max-w-6xl py-4 pb-10 sm:py-6">
        {loading || rows === null ? (
          <LoadingSkeleton variant="table" />
        ) : vacancies.length ? (
          <div className="grid gap-4">
            <AiAdvisoryNotice title={copy.applications.advisoryTitle} body={copy.applications.advisory} />
            <VacancyTable vacancies={vacancies} ownerView={false} matchMap={matchMap} />
          </div>
        ) : (
          <div className="rounded-2xl border bg-card p-6 shadow-sm">
            <div className="max-w-2xl">
              <p className="font-heading text-xl font-semibold tracking-tight text-foreground">
                {locale === "kk" ? "Ұсыныстар профильден басталады" : "Рекомендации начинаются с профиля"}
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {locale === "kk"
                  ? "Әзірге ұсыныс жоқ. Профильді толықтырып, содан кейін сәйкестіктерді, өтінішті және сұхбат дайындығын бір ағыммен өтіңіз."
                  : "Пока нет рекомендаций. Заполните профиль, затем переходите к совпадениям, отклику и подготовке к интервью в одном потоке."}
              </p>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-4">
              {firstRunSteps.map((step, index) => (
                <Link
                  key={step.href}
                  to={step.href}
                  className="rounded-xl border bg-background p-4 transition-colors hover:border-primary/30 hover:bg-muted/30"
                >
                  <span className="text-xs font-semibold text-primary">{index + 1}</span>
                  <p className="mt-2 text-sm font-semibold text-foreground">{step.title}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{step.body}</p>
                </Link>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link to="/profile" className="inline-flex">
                <Button type="button">{copy.profile.title}</Button>
              </Link>
              <Link to="/vacancies" className="inline-flex">
                <Button type="button" variant="outline">{copy.applications.findVacancies}</Button>
              </Link>
            </div>
          </div>
        )}
      </main>
    </>
  );
}

