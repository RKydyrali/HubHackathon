import { useId, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { motion } from "framer-motion";

import { EmptyState } from "@/components/feedback/EmptyState";
import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { SectionPanel } from "@/components/layout/SectionPanel";
import { AiAdvisoryNotice } from "@/components/product/AiTrust";
import { Button } from "@/components/shared/Button";
import { api } from "@/lib/convex-api";
import { type Locale, useI18n } from "@/lib/i18n";
import { motionPresets } from "@/lib/motion";
import { getEmployerFirstRunActions } from "@/lib/product-experience";
import { cn } from "@/lib/utils";
import { ApplicationTable } from "@/features/applications/ApplicationTable";
import { InterviewTimeline } from "@/features/interviews/InterviewTimeline";
import { NotificationTimeline } from "@/features/notifications/NotificationTimeline";
import type { ApplicationWithVacancy } from "@/types/domain";

const MS_PER_DAY = 86400000;

function startOfLocalDayMs(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function buildDailyApplicationCounts(rows: ApplicationWithVacancy[], referenceMs: number): number[] {
  const counts = [0, 0, 0, 0, 0, 0, 0];
  const todayStart = startOfLocalDayMs(new Date(referenceMs));
  for (const row of rows) {
    const dayStart = startOfLocalDayMs(new Date(row.application._creationTime));
    const dayOffset = Math.round((todayStart - dayStart) / MS_PER_DAY);
    if (dayOffset >= 0 && dayOffset <= 6) {
      counts[6 - dayOffset] += 1;
    }
  }
  return counts;
}

function weekdayShortLabels(nowMs: number, locale: Locale): string[] {
  const dtf = new Intl.DateTimeFormat(locale === "kk" ? "kk-KZ" : "ru-RU", { weekday: "short" });
  const todayStart = startOfLocalDayMs(new Date(nowMs));
  return Array.from({ length: 7 }, (_, i) => {
    const t = todayStart - (6 - i) * MS_PER_DAY;
    return dtf.format(new Date(t)).replace(/\.$/, "");
  });
}

function ApplicationsTrendChart({
  data,
  nowMs,
  locale,
  yAxisLabel,
  className,
}: {
  data: number[];
  nowMs: number;
  locale: Locale;
  yAxisLabel: string;
  className?: string;
}) {
  const gradId = `tfill-${useId().replace(/:/g, "")}`;
  const max = Math.max(1, ...data);
  const total = data.reduce((a, b) => a + b, 0);
  const w = 400;
  const h = 120;
  const marginL = 34;
  const marginR = 8;
  const marginT = 10;
  const marginB = 28;
  const innerW = w - marginL - marginR;
  const innerH = h - marginT - marginB;
  const n = data.length;
  const points = data.map((v, i) => {
    const x = marginL + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
    const y = marginT + innerH - (v / max) * innerH;
    return { x, y, v };
  });
  const linePts = points.map((p) => `${p.x},${p.y}`).join(" ");
  const areaPathD =
    points.length > 0
      ? (() => {
          const first = points[0];
          const last = points[points.length - 1];
          const baseY = marginT + innerH;
          return `M ${first.x} ${baseY} L ${points.map((p) => `${p.x} ${p.y}`).join(" L ")} L ${last.x} ${baseY} Z`;
        })()
      : "";
  const dayLabels = weekdayShortLabels(nowMs, locale);
  const isToday = (i: number) => i === n - 1;
  return (
    <div className={cn("w-full", className)}>
      <div className="mb-1 flex items-end justify-between gap-2 pl-0.5">
        <p className="text-[11px] text-muted-foreground">
          {yAxisLabel}
          {total > 0 ? <span className="text-foreground/90">: {total}</span> : null}
        </p>
        <p className="text-[10px] tabular-nums text-muted-foreground">
          0 – {max}
        </p>
      </div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="h-[128px] w-full max-w-full"
        style={{ minHeight: 128 }}
        role="img"
        aria-hidden
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.2" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map((t) => {
          const y = marginT + innerH * (1 - t);
          return (
            <line
              key={t}
              x1={marginL}
              x2={w - marginR}
              y1={y}
              y2={y}
              stroke="hsl(var(--border))"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
        {areaPathD ? <path d={areaPathD} fill={`url(#${gradId})`} /> : null}
        <polyline
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth={2.25}
          strokeLinejoin="round"
          strokeLinecap="round"
          points={linePts}
        />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={p.v > 0 ? 3.5 : 2}
            fill="hsl(var(--background))"
            stroke="hsl(var(--primary))"
            strokeWidth={1.5}
          />
        ))}
        {dayLabels.map((label, i) => {
          const x = marginL + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
          return (
            <text
              key={`${i}-${label}`}
              x={x}
              y={h - 6}
              textAnchor="middle"
              fill="hsl(var(--muted-foreground))"
              style={{ fontSize: 9, fontWeight: 500 }}
            >
              {isToday(i) ? `• ${label}` : label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

function FunnelStep({
  label,
  value,
  max,
  barClassName,
}: {
  label: string;
  value: number;
  max: number;
  barClassName: string;
}) {
  const rawPct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const displayPct = value === 0 ? 0 : Math.min(100, Math.max(rawPct, 14));
  return (
    <div className="space-y-2">
      <div className="flex justify-between gap-2 text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums font-semibold text-foreground">{value}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-muted/80">
        <div
          className={cn("h-full rounded-full shadow-sm transition-[width] duration-300", barClassName)}
          style={{ width: `${displayPct}%` }}
        />
      </div>
    </div>
  );
}

export function EmployerDashboardPage() {
  const summary = useQuery(api.dashboards.getEmployerSummary);
  const applications = useQuery(api.applications.listByOwner);
  const interviews = useQuery(api.interviews.listByOwner);
  const notifications = useQuery(api.notifications.listMyNotifications);
  const { copy, locale } = useI18n();

  const isActivated =
    summary !== undefined &&
    applications !== undefined &&
    interviews !== undefined &&
    (summary.publishedVacancyCount > 0 || applications.length > 0 || interviews.length > 0);

  const pipeline = useQuery(api.dashboards.getEmployerPipelineFunnel, isActivated ? {} : "skip");

  // eslint-disable-next-line react-hooks/purity -- dashboard wall clock for relative windows
  const nowMs = Date.now();

  const dailyCounts = useMemo(() => {
    if (!applications) {
      return [0, 0, 0, 0, 0, 0, 0];
    }
    return buildDailyApplicationCounts(applications, nowMs);
  }, [applications, nowMs]);

  const upcomingInterviewsList = useMemo(() => {
    if (!interviews) {
      return [];
    }
    return [...interviews]
      .filter((i) => i.status === "scheduled" && i.scheduledAt >= nowMs)
      .sort((a, b) => a.scheduledAt - b.scheduledAt)
      .slice(0, 8);
  }, [interviews, nowMs]);

  const recentApplications = useMemo(() => {
    if (!applications) {
      return [];
    }
    return [...applications]
      .sort((a, b) => b.application._creationTime - a.application._creationTime)
      .slice(0, 8);
  }, [applications]);

  const funnelMax = pipeline
    ? Math.max(1, pipeline.views, pipeline.applications, pipeline.interviews)
    : 1;

  if (
    summary === undefined ||
    applications === undefined ||
    interviews === undefined ||
    notifications === undefined
  ) {
    return <LoadingSkeleton variant="dashboard" />;
  }

  const eh = copy.dashboard.employerHome;
  const firstRunActions = getEmployerFirstRunActions(locale);
  const sevenDaysAgo = nowMs - 7 * MS_PER_DAY;
  const applications7d = applications.filter((row) => row.application._creationTime >= sevenDaysAgo).length;

  const startOfToday = startOfLocalDayMs(new Date(nowMs));
  const upcomingInterviewCount = interviews.filter(
    (i) => i.status === "scheduled" && i.scheduledAt >= startOfToday,
  ).length;

  if (!isActivated) {
    return (
      <div className="container-app flex flex-col items-center py-10 md:py-14">
        <motion.section
          {...motionPresets.card}
          className="w-full max-w-3xl rounded-2xl border border-border/60 bg-card/50 px-6 py-8 shadow-sm md:px-8 md:py-10"
        >
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              {eh.onboardingTitle}
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{eh.onboardingBody}</p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground/90">
              {locale === "kk"
                ? "Демо үшін бір қысқа вакансия жеткілікті: жарияланған соң осында өтініштер, сұхбат және воронка шығады."
                : "Для демо достаточно одной короткой вакансии: после публикации здесь появятся отклики, интервью и воронка."}
            </p>
          </div>
          {summary.vacancyCount > 0 && summary.publishedVacancyCount === 0 ? (
            <p className="mt-4 text-center text-sm text-foreground/80">{eh.draftHint}</p>
          ) : null}
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {firstRunActions.map((action) => (
              <Link
                key={action.kind}
                to={action.href}
                className="rounded-xl border bg-background p-4 text-left transition-colors hover:border-primary/35 hover:bg-muted/30"
              >
                <p className="font-semibold text-foreground">{action.title}</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{action.body}</p>
              </Link>
            ))}
          </div>
          <AiAdvisoryNotice
            title={copy.applications.advisoryTitle}
            body={eh.aiHint}
            className="mt-5 text-left"
          />
        </motion.section>
      </div>
    );
  }

  return (
    <div className="container-app flex flex-col gap-8 py-6 md:py-8">
      <header className="flex flex-col gap-4 border-b border-border/50 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-2">
          <h1 className="font-heading text-xl font-semibold tracking-tight text-foreground md:text-2xl">
            {copy.dashboard.employerTitle}
          </h1>
          <p className="max-w-xl text-sm leading-6 text-muted-foreground">{eh.heroSubtitleActive}</p>
          <p className="max-w-xl text-xs leading-5 text-muted-foreground/90">
            {eh.aiHint} {copy.applications.advisory}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Link to="/employer/vacancies">
            <Button>{eh.primaryCta}</Button>
          </Link>
          <Link to="/employer/vacancies">
            <Button variant="outline">{eh.manageVacancies}</Button>
          </Link>
        </div>
      </header>

      <motion.section {...motionPresets.list} className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-border/50 border-l-4 border-l-primary/70 bg-card/30 px-4 py-3 shadow-none">
          <p className="text-sm text-muted-foreground">{eh.kpiPublished}</p>
          <p className="mt-1 font-heading text-2xl font-semibold tabular-nums text-foreground">
            {summary.publishedVacancyCount}
          </p>
        </div>
        <div className="rounded-lg border border-border/50 border-l-4 border-l-sky-500/50 bg-card/30 px-4 py-3 shadow-none">
          <p className="text-sm text-muted-foreground">{eh.kpiApplications7d}</p>
          <p className="mt-1 font-heading text-2xl font-semibold tabular-nums text-foreground">
            {applications7d}
          </p>
        </div>
        <div className="rounded-lg border border-border/50 border-l-4 border-l-violet-500/50 bg-card/30 px-4 py-3 shadow-none">
          <p className="text-sm text-muted-foreground">{eh.kpiUpcomingInterviews}</p>
          <p className="mt-1 font-heading text-2xl font-semibold tabular-nums text-foreground">
            {upcomingInterviewCount}
          </p>
        </div>
      </motion.section>

      <div className="grid gap-4 lg:grid-cols-2">
        <motion.section
          {...motionPresets.card}
          className="rounded-xl border border-border/50 bg-card/30 p-4 shadow-none"
        >
          <h2 className="font-heading text-base font-semibold tracking-tight text-foreground">{eh.trendTitle}</h2>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{eh.trendCaption}</p>
          <div className="mt-3 w-full">
            <ApplicationsTrendChart
              data={dailyCounts}
              nowMs={nowMs}
              locale={locale}
              yAxisLabel={eh.trendTotalPeriod}
            />
          </div>
        </motion.section>

        <motion.section
          {...motionPresets.card}
          className="rounded-xl border border-border/50 bg-card/30 p-4 shadow-none"
        >
          <h2 className="font-heading text-base font-semibold tracking-tight text-foreground">{eh.funnelTitle}</h2>
          {pipeline === undefined ? (
            <p className="mt-4 text-sm text-muted-foreground">…</p>
          ) : (
            <>
              <div className="mt-4 space-y-5">
                <FunnelStep
                  label={eh.funnelViews}
                  value={pipeline.views}
                  max={funnelMax}
                  barClassName="bg-sky-500/90 dark:bg-sky-400/85"
                />
                <FunnelStep
                  label={eh.funnelApplications}
                  value={pipeline.applications}
                  max={funnelMax}
                  barClassName="bg-primary/90"
                />
                <FunnelStep
                  label={eh.funnelInterviews}
                  value={pipeline.interviews}
                  max={funnelMax}
                  barClassName="bg-violet-500/90 dark:bg-violet-400/85"
                />
              </div>
              {pipeline.views === 0 ? (
                <p className="mt-3 text-xs leading-5 text-muted-foreground">{eh.funnelViewsNote}</p>
              ) : null}
            </>
          )}
        </motion.section>
      </div>

      <section className="grid gap-4 items-stretch xl:grid-cols-2">
        <SectionPanel
          title={eh.recentApplications}
          action={
            <Link
              className="text-sm text-primary underline-offset-4 hover:underline"
              to="/employer/applications"
            >
              {eh.viewAllApplications}
            </Link>
          }
        >
          {recentApplications.length ? (
            <ApplicationTable applications={recentApplications} employerView dashboardSummary />
          ) : (
            <EmptyState title={copy.common.noApplications} />
          )}
        </SectionPanel>
        <SectionPanel
          title={eh.nextInterviews}
          action={
            <Link
              className="text-sm text-primary underline-offset-4 hover:underline"
              to="/employer/interviews"
            >
              {eh.viewAllInterviews}
            </Link>
          }
        >
          {upcomingInterviewsList.length ? (
            <InterviewTimeline interviews={upcomingInterviewsList} />
          ) : (
            <EmptyState title={copy.common.noInterviews} />
          )}
        </SectionPanel>
      </section>

      {notifications.length > 0 ? (
        <SectionPanel title={copy.notifications.title}>
          <div className="max-h-64 overflow-y-auto">
            <NotificationTimeline notifications={notifications.slice(0, 5)} />
          </div>
        </SectionPanel>
      ) : null}
    </div>
  );
}
