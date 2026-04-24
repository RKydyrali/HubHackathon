import { query } from "./_generated/server";
import { assertRole, requireCurrentUser } from "./lib/auth";

export const getSeekerSummary = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx);
    assertRole(user, ["seeker", "admin"]);
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
        ["submitted", "reviewing", "interview"].includes(application.status),
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
    assertRole(user, ["employer", "admin"]);
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
      interviewCount += applications.filter(
        (application) => application.status === "interview",
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
