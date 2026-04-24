import { Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { Briefcase, Calendar, Users } from "@phosphor-icons/react";
import { motion } from "framer-motion";

import { EmptyState } from "@/components/feedback/EmptyState";
import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { PageHeader } from "@/components/layout/PageHeader";
import { MetricTile, SectionPanel } from "@/components/layout/SectionPanel";
import { Button } from "@/components/shared/Button";
import { api } from "@/lib/convex-api";
import { EMPTY_STATES } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { motionPresets } from "@/lib/motion";
import { ApplicationTable } from "@/features/applications/ApplicationTable";
import { InterviewTimeline } from "@/features/interviews/InterviewTimeline";
import { NotificationTimeline } from "@/features/notifications/NotificationTimeline";
import { VacancyTable } from "@/features/vacancies/VacancyTable";

export function EmployerDashboardPage() {
  const summary = useQuery(api.dashboards.getEmployerSummary);
  const vacancyRows = useQuery(api.vacancies.listByOwner);
  const applications = useQuery(api.applications.listByOwner);
  const interviews = useQuery(api.interviews.listByOwner);
  const notifications = useQuery(api.notifications.listMyNotifications);
  const { copy } = useI18n();

  if (summary === undefined || vacancyRows === undefined || applications === undefined || interviews === undefined || notifications === undefined) {
    return <LoadingSkeleton variant="dashboard" />;
  }

  const vacancies = vacancyRows.map((row) => row.vacancy);

  return (
    <>
      <PageHeader
        title={copy.dashboard.employerTitle}
        action={<Link to="/employer/vacancies"><Button>{copy.publicHome.employerCta}</Button></Link>}
      />
      <div className="container-app flex flex-col gap-5 py-5">
        <motion.div {...motionPresets.list} className="grid gap-3 md:grid-cols-3">
          <MetricTile label={copy.dashboard.activeVacancies} value={summary.publishedVacancyCount} icon={<Briefcase weight="duotone" />} />
          <MetricTile label={copy.dashboard.newApplications} value={summary.applicantCount} icon={<Users weight="duotone" />} />
          <MetricTile label={copy.dashboard.upcomingInterviews} value={summary.interviewCount} icon={<Calendar weight="duotone" />} />
        </motion.div>
        <SectionPanel title={copy.dashboard.activeVacancies}>
          {vacancies.length ? <VacancyTable vacancies={vacancies} ownerView /> : <EmptyState title={EMPTY_STATES.vacancies} />}
        </SectionPanel>
        <section className="grid gap-4 xl:grid-cols-2">
          <SectionPanel title={copy.dashboard.newApplications}>
            {applications.length ? <ApplicationTable applications={applications} employerView /> : <EmptyState title={copy.common.noApplications} />}
          </SectionPanel>
          <SectionPanel title={copy.dashboard.upcomingInterviews}>
            {interviews.length ? <InterviewTimeline interviews={interviews} /> : <EmptyState title={copy.common.noInterviews} />}
          </SectionPanel>
        </section>
        <SectionPanel title={copy.notifications.title}>
          <NotificationTimeline notifications={notifications.slice(0, 5)} />
        </SectionPanel>
      </div>
    </>
  );
}
