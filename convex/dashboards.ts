import { query } from "./_generated/server";
import { requireCurrentUser } from "./lib/auth";
import { assertEmployerOrAdmin, assertSeekerOrAdmin } from "./lib/permissions";

export const getSeekerSummary = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx);
    assertSeekerOrAdmin(user);
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();
    const applications = await ctx.db
      .query("applications")
      .withIndex("by_seekerUserId", (q) => q.eq("seekerUserId", user._id))
      .collect();
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();

    return {
      profileComplete: Boolean(profile?.fullName && profile.skills.length > 0),
      applicationCount: applications.length,
      activeApplicationCount: applications.filter((application) =>
        ["submitted", "reviewing", "shortlisted", "interview", "offer_sent"].includes(
          application.status,
        ),
      ).length,
      unreadNotificationCount: notifications.filter((notification) => !notification.readAt).length,
      isBotLinked: user.isBotLinked,
      telegramUsername: user.telegramUsername,
    };
  },
});

export const getEmployerSummary = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx);
    assertEmployerOrAdmin(user);
    const vacancies = await ctx.db
      .query("vacancies")
      .withIndex("by_ownerUserId", (q) => q.eq("ownerUserId", user._id))
      .collect();
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();

    let applicantCount = 0;
    let interviewCount = 0;
    for (const vacancy of vacancies) {
      const applications = await ctx.db
        .query("applications")
        .withIndex("by_vacancyId", (q) => q.eq("vacancyId", vacancy._id))
        .collect();
      applicantCount += applications.length;
      interviewCount += applications.filter((application) =>
        ["interview", "offer_sent"].includes(application.status),
      ).length;
    }

    return {
      vacancyCount: vacancies.length,
      publishedVacancyCount: vacancies.filter((vacancy) => vacancy.status === "published").length,
      applicantCount,
      interviewCount,
      unreadNotificationCount: notifications.filter((notification) => !notification.readAt).length,
      isBotLinked: user.isBotLinked,
      telegramUsername: user.telegramUsername,
    };
  },
});

const PIPELINE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/** Demo analytics + interview rows for employer home funnel (7-day window). */
export const getEmployerPipelineFunnel = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx);
    assertEmployerOrAdmin(user);
    const sinceMs = Date.now() - PIPELINE_WINDOW_MS;

    const vacancies = await ctx.db
      .query("vacancies")
      .withIndex("by_ownerUserId", (q) => q.eq("ownerUserId", user._id))
      .collect();

    let views = 0;
    let applicationEvents = 0;

    for (const vacancy of vacancies) {
      const events = await ctx.db
        .query("demoAnalyticsEvents")
        .withIndex("by_vacancyId_and_createdAt", (q) =>
          q.eq("vacancyId", vacancy._id).gte("createdAt", sinceMs),
        )
        .collect();
      for (const event of events) {
        if (event.kind === "vacancy_viewed") {
          views += 1;
        }
        if (event.kind === "application_submitted") {
          applicationEvents += 1;
        }
      }
    }

    const interviewRows = await ctx.db
      .query("interviews")
      .withIndex("by_employerUserId", (q) => q.eq("employerUserId", user._id))
      .collect();
    const interviewsBookedInWindow = interviewRows.filter((row) => row._creationTime >= sinceMs).length;

    return {
      windowDays: 7,
      views,
      applications: applicationEvents,
      interviews: interviewsBookedInWindow,
    };
  },
});
