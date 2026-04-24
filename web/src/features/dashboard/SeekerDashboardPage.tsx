import { Link } from "react-router-dom";
import { useState } from "react";
import { useQuery } from "convex/react";
import { Bell, ChatCircleText, CheckCircle, TelegramLogo, UserCircle } from "@phosphor-icons/react";
import { motion } from "framer-motion";

import { EmptyState } from "@/components/feedback/EmptyState";
import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { PageHeader } from "@/components/layout/PageHeader";
import { MetricTile, SectionPanel } from "@/components/layout/SectionPanel";
import { Button } from "@/components/shared/Button";
import { Textarea } from "@/components/ui/textarea";
import { AiChatHistorySidebar } from "@/features/ai-search/AiChatHistorySidebar";
import { ApplicationTable } from "@/features/applications/ApplicationTable";
import { NotificationTimeline } from "@/features/notifications/NotificationTimeline";
import { VacancyCard } from "@/features/vacancies/VacancyCard";
import { api } from "@/lib/convex-api";
import { useI18n } from "@/lib/i18n";
import { motionPresets } from "@/lib/motion";

export function SeekerDashboardPage() {
  const user = useQuery(api.users.getSelf);
  const summary = useQuery(api.dashboards.getSeekerSummary);
  const applications = useQuery(api.applications.listBySeeker);
  const vacancies = useQuery(api.vacancies.listPublic, { limit: 8 });
  const notifications = useQuery(api.notifications.listMyNotifications);
  const aiChats = useQuery(api.aiJobAssistant.listChats);
  const { copy } = useI18n();

  if (summary === undefined || applications === undefined || vacancies === undefined || notifications === undefined || aiChats === undefined) {
    return <LoadingSkeleton variant="dashboard" />;
  }

  const lastChat = aiChats[0];

  return (
    <>
      <PageHeader title={copy.dashboard.seekerTitle} subtitle={user?.role ? copy.nav.dashboard : undefined} />
      <div className="container-app flex flex-col gap-5 py-5">
        <motion.div {...motionPresets.list} className="grid gap-3 md:grid-cols-3">
          <MetricTile
            label={copy.profile.title}
            value={summary.profileComplete ? copy.dashboard.profileComplete : copy.dashboard.profileMissing}
            tone={summary.profileComplete ? "success" : "warning"}
            icon={<UserCircle weight="duotone" />}
          />
          <MetricTile
            label={copy.dashboard.unread}
            value={summary.unreadNotificationCount}
            icon={<Bell weight="duotone" />}
          />
          <MetricTile
            label="Telegram"
            value={summary.isBotLinked ? copy.dashboard.telegramLinked : copy.dashboard.telegramMissing}
            tone={summary.isBotLinked ? "success" : "warning"}
            icon={<TelegramLogo weight="duotone" />}
          />
        </motion.div>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <SectionPanel
            title={copy.dashboard.nextStep}
            subtitle={
              lastChat
                ? `${lastChat.title} - ${lastChat.matchedVacancyIds?.length ?? 0}`
                : copy.ai.emptyPrompt
            }
            action={
              <Link to={lastChat ? `/dashboard/ai-search/${lastChat._id}` : "/dashboard/ai-search"}>
                <Button>
                  <ChatCircleText data-icon="inline-start" weight="bold" />
                  {lastChat ? copy.dashboard.continueAi : copy.dashboard.startAi}
                </Button>
              </Link>
            }
            patterned
          >
            <QuickAiRequest />
          </SectionPanel>
          <AiChatHistorySidebar chats={aiChats} basePath="/dashboard/ai-search" />
        </section>

        <SectionPanel
          title={copy.vacancies.title}
          subtitle={copy.vacancies.subtitle}
          action={<Link to="/vacancies"><Button variant="outline" size="sm">{copy.nav.vacancies}</Button></Link>}
        >
          {vacancies.length ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {vacancies.slice(0, 4).map((vacancy) => <VacancyCard key={vacancy._id} vacancy={vacancy} compact />)}
            </div>
          ) : (
            <EmptyState title={copy.vacancies.noResults} />
          )}
        </SectionPanel>

        <section className="grid gap-4 xl:grid-cols-2">
          <SectionPanel title={copy.applications.title}>
            {applications.length ? <ApplicationTable applications={applications} /> : <EmptyState title={copy.common.noApplications} />}
          </SectionPanel>
          <SectionPanel title={copy.notifications.title}>
            <NotificationTimeline notifications={notifications.slice(0, 5)} />
          </SectionPanel>
        </section>
      </div>
    </>
  );
}

function QuickAiRequest() {
  const [value, setValue] = useState("");
  const { copy } = useI18n();
  const params = value.trim() ? `?q=${encodeURIComponent(value.trim())}` : "";
  return (
    <div className="flex flex-col gap-3">
      <Textarea
        className="min-h-32 rounded-2xl bg-background/80 text-sm leading-6"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={copy.dashboard.quickPlaceholder}
        aria-label={copy.dashboard.quickRequest}
      />
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <CheckCircle weight="fill" />
          {copy.ai.privacy}
        </p>
        <Link to={`/dashboard/ai-search${params}`}>
          <Button size="sm">{copy.ai.send}</Button>
        </Link>
      </div>
    </div>
  );
}
