import { useAuth } from "@clerk/clerk-react";
import {
  ArrowSquareOut,
  ChatCircleText,
  LinkSimple,
  MapPin,
  MicrophoneStage,
  MoneyWavy,
  Question,
  ShareNetwork,
} from "@phosphor-icons/react";
import { useMutation, useQuery } from "convex/react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { SectionPanel } from "@/components/layout/SectionPanel";
import { AiAdvisoryNotice } from "@/components/product/AiTrust";
import { DetailAside } from "@/components/product/DetailAside";
import { VacancyShareSheet } from "@/components/product/VacancyShareSheet";
import { Button } from "@/components/shared/Button";
import { CompanyTrustBadge } from "@/components/shared/CompanyTrustBadge";
import { SourceBadge, StatusBadge } from "@/components/shared/StatusBadge";
import { formatSalary } from "@/lib/format";
import { api } from "@/lib/convex-api";
import { demoAnalyticsApplyUrlMetadata } from "@/lib/demoAnalyticsClient";
import { useI18n } from "@/lib/i18n";
import { getSourceMeta } from "@/lib/status-ui";
import { AI_MATCHING_ROOT } from "@/routing/navPaths";
import type { Vacancy } from "@/types/domain";

export function VacancyDetail({ vacancy }: { vacancy: Vacancy }) {
  const { isSignedIn } = useAuth();
  const { copy, locale } = useI18n();
  const currentUser = useQuery(api.users.getSelf, isSignedIn ? {} : "skip");
  const trust = useQuery(api.companyTrust.getVacancyTrust, { vacancyId: vacancy._id });
  const trackDemo = useMutation(api.demoAnalytics.track);
  const showPrepareInterview =
    isSignedIn &&
    currentUser?.role === "seeker" &&
    vacancy.status === "published";
  const discussPath = `${AI_MATCHING_ROOT}?q=${encodeURIComponent(`${vacancy.title}: ${vacancy.description.slice(0, 160)}`)}`;
  const canApplyNative = vacancy.source === "native" && vacancy.status === "published";
  const nativeApplyPath = `/vacancies/${vacancy._id}/apply`;
  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/vacancies/${vacancy._id}` : "";
  const sourceMeta = getSourceMeta(vacancy.source, locale);

  const nativeAction = !canApplyNative ? null : !isSignedIn ? (
    <Link to="/login" state={{ from: nativeApplyPath }}>
      <Button>{`${copy.nav.signIn}: ${copy.vacancies.applyNative}`}</Button>
    </Link>
  ) : currentUser?.role === "seeker" ? (
    <Link to={nativeApplyPath}>
      <Button>{copy.vacancies.applyNative}</Button>
    </Link>
  ) : currentUser?.role === "employer" ? (
    <Link to="/employer/vacancies">
      <Button variant="outline">{copy.dashboard.employerHome.manageVacancies}</Button>
    </Link>
  ) : currentUser?.role === "admin" ? (
    <Link to="/admin/vacancies">
      <Button variant="outline">{locale === "kk" ? "Вакансияларды тексеру" : "Проверить вакансии"}</Button>
    </Link>
  ) : null;

  const action = nativeAction ? (
    nativeAction
  ) : vacancy.source === "hh" && vacancy.externalApplyUrl ? (
    <a
      href={vacancy.externalApplyUrl}
      target="_blank"
      rel="noreferrer"
      onClick={() => {
        void trackDemo({
          kind: "external_apply_clicked",
          vacancyId: vacancy._id,
          surface: "vacancy_detail",
          metadata: demoAnalyticsApplyUrlMetadata(vacancy.externalApplyUrl),
        });
      }}
    >
      <Button>
        <ArrowSquareOut data-icon="inline-start" weight="bold" />
        {copy.vacancies.applyHh}
      </Button>
    </a>
  ) : null;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
      <SectionPanel title={vacancy.title} subtitle={sourceMeta.actionHint} action={action}>
        <div className="flex flex-wrap gap-2">
          <SourceBadge source={vacancy.source} locale={locale} />
          <StatusBadge status={vacancy.status} locale={locale} />
          <CompanyTrustBadge trust={trust} />
          {vacancy.district ? <span className="rounded-full border bg-secondary px-2 py-1 text-xs font-medium">{vacancy.district}</span> : null}
        </div>
        <dl className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border bg-background p-4">
            <dt className="flex items-center gap-2 text-sm text-muted-foreground">
              <MoneyWavy weight="bold" />
              {copy.vacancies.salary}
            </dt>
            <dd className="mt-2 font-semibold text-primary">{formatSalary(vacancy, locale)}</dd>
          </div>
          <div className="rounded-lg border bg-background p-4">
            <dt className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin weight="bold" />
              {copy.city}
            </dt>
            <dd className="mt-2 font-semibold text-foreground">
              {vacancy.city}
              {vacancy.district ? `, ${vacancy.district}` : ""}
            </dd>
          </div>
        </dl>
        <p className="mt-6 whitespace-pre-wrap text-base leading-8 text-muted-foreground">{vacancy.description}</p>
      </SectionPanel>

      <div className="flex flex-col gap-4">
        <DetailAside title={copy.vacancies.details} subtitle={sourceMeta.actionHint}>
          <div className="grid gap-3">
            <div className="flex items-center justify-between gap-3 border-b pb-3 text-sm">
              <span className="text-muted-foreground">{copy.vacancies.source}</span>
              <SourceBadge source={vacancy.source} locale={locale} compact />
            </div>
            <div className="flex items-center justify-between gap-3 border-b pb-3 text-sm">
              <span className="text-muted-foreground">Trust Score</span>
              <CompanyTrustBadge trust={trust} />
            </div>
            <div className="flex items-center justify-between gap-3 border-b pb-3 text-sm">
              <span className="text-muted-foreground">Status</span>
              <StatusBadge status={vacancy.status} locale={locale} />
            </div>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">{copy.vacancies.salary}</span>
              <span className="font-medium">{formatSalary(vacancy, locale)}</span>
            </div>
            {action ? <div className="pt-3">{action}</div> : null}
            {shareUrl ? (
              <div className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    if (typeof window === "undefined") return;
                    void navigator.clipboard
                      .writeText(shareUrl)
                      .then(() => toast.success(copy.common.linkCopied))
                      .catch(() => toast.error(copy.common.copyFailed));
                  }}
                >
                  <LinkSimple data-icon="inline-start" weight="bold" />
                  {copy.common.copyLink}
                </Button>
                <VacancyShareSheet
                  title={vacancy.title}
                  url={shareUrl}
                  trigger={
                    <Button type="button" variant="outline" className="mt-2 w-full">
                      <ShareNetwork data-icon="inline-start" weight="bold" />
                      {copy.vacancies.shareVacancy}
                    </Button>
                  }
                />
              </div>
            ) : null}
          </div>
        </DetailAside>
        {vacancy.screeningQuestions?.length ? (
          <SectionPanel title={copy.vacancies.screening}>
            <div className="flex flex-col gap-3">
              {vacancy.screeningQuestions.map((question) => (
                <div key={question} className="flex gap-3 rounded-lg border bg-background p-3 text-sm leading-6">
                  <Question className="mt-1 shrink-0 text-primary" weight="bold" />
                  <span>{question}</span>
                </div>
              ))}
            </div>
          </SectionPanel>
        ) : null}
        {showPrepareInterview ? (
          <SectionPanel title={copy.mockInterview.pageTitle} subtitle={copy.mockInterview.pageSubtitle} patterned>
            <Link to={`/prepare/${vacancy._id}`}>
              <Button variant="outline">
                <MicrophoneStage data-icon="inline-start" weight="bold" />
                {copy.mockInterview.prepareCta}
              </Button>
            </Link>
          </SectionPanel>
        ) : null}
        <SectionPanel title={copy.vacancies.discussAi} subtitle={copy.applications.advisory} patterned>
          <AiAdvisoryNotice className="mb-3" />
          <Link to={isSignedIn ? discussPath : "/login"} state={isSignedIn ? undefined : { from: discussPath }}>
            <Button variant="outline">
              <ChatCircleText data-icon="inline-start" weight="bold" />
              {copy.vacancies.discussAi}
            </Button>
          </Link>
        </SectionPanel>
      </div>
    </div>
  );
}
