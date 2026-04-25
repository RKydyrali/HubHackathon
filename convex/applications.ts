import { ConvexError, v } from "convex/values";

import { internal } from "./_generated/api";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
} from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { requireCurrentUser } from "./lib/auth";
import { recalculateCompanyTrustMetrics } from "./lib/companyTrust";
import {
  assertCanAdminRecoverApplicationStatus,
  assertCanApplyToVacancy,
  assertCanListApplicationsForVacancy,
  assertCanUpdateApplicationStatus,
  assertCanWithdrawApplication,
  assertEmployerOrAdmin,
  assertSeekerOrAdmin,
  assertVacancyAcceptsInAppApplications,
  canAnalyzeScreeningApplication,
} from "./lib/permissions";
import {
  assertApplicationTransition,
  buildNotificationDedupeKey,
  isValidApplicationTransition,
} from "./lib/domain";
import { recordDemoAnalyticsEvent } from "./lib/demoAnalytics";
import { applicationStatusValidator } from "./lib/validators";

async function createApplicationRecord(
  ctx: MutationCtx,
  input: {
    vacancyId: Id<"vacancies">;
    seekerUserId: Id<"users">;
    /** When set (user-facing apply), enforces seeker-or-admin + domain rules. */
    actingUser?: Doc<"users">;
    screeningAnswers?: Array<{ question: string; answer: string }>;
  },
) {
  const vacancy = await ctx.db.get(input.vacancyId);
  if (!vacancy) {
    throw new ConvexError("Vacancy not found");
  }
  if (input.actingUser) {
    assertCanApplyToVacancy(input.actingUser, vacancy);
  } else {
    assertVacancyAcceptsInAppApplications(vacancy);
  }

  const existing = await ctx.db
    .query("applications")
    .withIndex("by_vacancyId", (q) => q.eq("vacancyId", input.vacancyId))
    .collect();

  if (existing.some((application) => application.seekerUserId === input.seekerUserId)) {
    throw new ConvexError("Application already exists");
  }

  const applicationId = await ctx.db.insert("applications", {
    vacancyId: input.vacancyId,
    seekerUserId: input.seekerUserId,
    status: "submitted",
    screeningAnswers: input.screeningAnswers,
  });
  await ctx.db.insert("applicationStatusEvents", {
    applicationId,
    toStatus: "submitted",
    changedAt: Date.now(),
    actorUserId: input.seekerUserId,
  });
  if (vacancy.source === "native" && vacancy.companyId) {
    await recalculateCompanyTrustMetrics(ctx, vacancy.companyId);
  }

  await recordDemoAnalyticsEvent(ctx, {
    kind: "application_submitted",
    vacancyId: input.vacancyId,
    userId: input.seekerUserId,
    metadata: { applicationId: String(applicationId) },
  });

  return { applicationId, vacancy };
}

export const createApplication = mutation({
  args: {
    vacancyId: v.id("vacancies"),
    screeningAnswers: v.optional(
      v.array(
        v.object({
          question: v.string(),
          answer: v.string(),
        }),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    assertSeekerOrAdmin(user);

    const result = await createApplicationRecord(ctx, {
      vacancyId: args.vacancyId,
      seekerUserId: user._id,
      actingUser: user,
      screeningAnswers: args.screeningAnswers,
    });

    const employerUserId = result.vacancy.ownerUserId;
    if (!employerUserId) {
      throw new ConvexError("Invariant: missing vacancy owner");
    }
    await ctx.scheduler.runAfter(0, internal.notifications.handleNewApplication, {
      applicationId: result.applicationId,
      employerUserId,
    });

    if (args.screeningAnswers?.length) {
      await ctx.scheduler.runAfter(0, internal.ai.analyzeScreeningInternal, {
        applicationId: result.applicationId,
      });
    }

    return ctx.db.get(result.applicationId);
  },
});

export const listMyApplications = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx);
    assertSeekerOrAdmin(user);
    return ctx.db
      .query("applications")
      .withIndex("by_seekerUserId", (q) => q.eq("seekerUserId", user._id))
      .collect();
  },
});

export const listMyApplicationsWithVacancies = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx);
    assertSeekerOrAdmin(user);
    const applications = await ctx.db
      .query("applications")
      .withIndex("by_seekerUserId", (q) => q.eq("seekerUserId", user._id))
      .collect();

    const results = [];
    for (const application of applications) {
      const vacancy = await ctx.db.get(application.vacancyId);
      results.push({ application, vacancy });
    }
    return results;
  },
});

export const getByIdForParticipant = query({
  args: { applicationId: v.id("applications") },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const application = await ctx.db.get(args.applicationId);
    if (!application) {
      return null;
    }
    const vacancy = await ctx.db.get(application.vacancyId);
    if (!vacancy) {
      return null;
    }
    if (!canAnalyzeScreeningApplication(user, application, vacancy)) {
      return null;
    }
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", application.seekerUserId))
      .unique();
    return { application, vacancy, profile };
  },
});

export const listBySeeker = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx);
    assertSeekerOrAdmin(user);
    const applications = await ctx.db
      .query("applications")
      .withIndex("by_seekerUserId", (q) => q.eq("seekerUserId", user._id))
      .order("desc")
      .take(50);

    const results = [];
    for (const application of applications) {
      const vacancy = await ctx.db.get(application.vacancyId);
      results.push({ application, vacancy });
    }
    return results;
  },
});

export const listForBotByTelegramChatId = internalQuery({
  args: {
    telegramChatId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_telegramChatId", (q) => q.eq("telegramChatId", args.telegramChatId))
      .unique();
    if (!user || !user.isBotLinked) {
      return null;
    }

    const applications = await ctx.db
      .query("applications")
      .withIndex("by_seekerUserId", (q) => q.eq("seekerUserId", user._id))
      .order("desc")
      .take(Math.min(args.limit ?? 5, 10));

    const results = [];
    for (const application of applications) {
      const vacancy = await ctx.db.get(application.vacancyId);
      results.push({ application, vacancy });
    }
    return results;
  },
});

export const listVacancyApplications = query({
  args: { vacancyId: v.id("vacancies") },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    assertEmployerOrAdmin(user);
    const vacancy = await ctx.db.get(args.vacancyId);
    if (!vacancy) {
      throw new ConvexError("Vacancy not found");
    }
    assertCanListApplicationsForVacancy(user, vacancy);
    return ctx.db
      .query("applications")
      .withIndex("by_vacancyId", (q) => q.eq("vacancyId", args.vacancyId))
      .collect();
  },
});

export const listVacancyApplicationsWithProfiles = query({
  args: { vacancyId: v.id("vacancies") },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    assertEmployerOrAdmin(user);
    const vacancy = await ctx.db.get(args.vacancyId);
    if (!vacancy) {
      throw new ConvexError("Vacancy not found");
    }
    assertCanListApplicationsForVacancy(user, vacancy);

    const applications = await ctx.db
      .query("applications")
      .withIndex("by_vacancyId", (q) => q.eq("vacancyId", args.vacancyId))
      .collect();

    const results = [];
    for (const application of applications) {
      const profile = await ctx.db
        .query("profiles")
        .withIndex("by_userId", (q) => q.eq("userId", application.seekerUserId))
        .unique();
      results.push({ application, vacancy, profile });
    }
    return results;
  },
});

export const listByVacancy = query({
  args: { vacancyId: v.id("vacancies") },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    assertEmployerOrAdmin(user);
    const vacancy = await ctx.db.get(args.vacancyId);
    if (!vacancy) {
      throw new ConvexError("Vacancy not found");
    }
    assertCanListApplicationsForVacancy(user, vacancy);

    const applications = await ctx.db
      .query("applications")
      .withIndex("by_vacancyId", (q) => q.eq("vacancyId", args.vacancyId))
      .take(50);

    const results = [];
    for (const application of applications) {
      const profile = await ctx.db
        .query("profiles")
        .withIndex("by_userId", (q) => q.eq("userId", application.seekerUserId))
        .unique();
      results.push({ application, vacancy, profile });
    }
    return results;
  },
});

export const listMyOwnedApplicationsWithProfiles = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx);
    assertEmployerOrAdmin(user);
    const vacancies = await ctx.db
      .query("vacancies")
      .withIndex("by_ownerUserId", (q) => q.eq("ownerUserId", user._id))
      .collect();

    const results = [];
    for (const vacancy of vacancies) {
      const applications = await ctx.db
        .query("applications")
        .withIndex("by_vacancyId", (q) => q.eq("vacancyId", vacancy._id))
        .collect();
      for (const application of applications) {
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", application.seekerUserId))
          .unique();
        results.push({ application, vacancy, profile });
      }
    }
    return results;
  },
});

export const listByOwner = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx);
    assertEmployerOrAdmin(user);
    const vacancies = await ctx.db
      .query("vacancies")
      .withIndex("by_ownerUserId", (q) => q.eq("ownerUserId", user._id))
      .take(50);

    const results = [];
    for (const vacancy of vacancies) {
      const applications = await ctx.db
        .query("applications")
        .withIndex("by_vacancyId", (q) => q.eq("vacancyId", vacancy._id))
        .take(50);
      for (const application of applications) {
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", application.seekerUserId))
          .unique();
        results.push({ application, vacancy, profile });
      }
    }
    return results;
  },
});

export const withdrawApplication = mutation({
  args: { applicationId: v.id("applications") },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const application = await ctx.db.get(args.applicationId);
    if (!application) {
      throw new ConvexError("Application not found");
    }
    const vacancy = await ctx.db.get(application.vacancyId);
    assertCanWithdrawApplication(user, application);
    if (!isValidApplicationTransition(application.status, "withdrawn")) {
      throw new ConvexError("Application cannot be withdrawn in its current status");
    }
    await ctx.db.patch(args.applicationId, { status: "withdrawn" });
    await ctx.db.insert("applicationStatusEvents", {
      applicationId: args.applicationId,
      fromStatus: application.status,
      toStatus: "withdrawn",
      changedAt: Date.now(),
      actorUserId: user._id,
    });
    if (vacancy?.source === "native" && vacancy.companyId) {
      await recalculateCompanyTrustMetrics(ctx, vacancy.companyId);
    }
    await ctx.scheduler.runAfter(0, internal.notifications.handleStatusChange, {
      applicationId: args.applicationId,
      seekerUserId: application.seekerUserId,
      status: "withdrawn",
      dedupeKey: buildNotificationDedupeKey({
        type: "status_change",
        recipientUserId: String(application.seekerUserId),
        entityId: String(args.applicationId),
        secondaryId: "withdrawn",
      }),
    });
    return ctx.db.get(args.applicationId);
  },
});

export const updateApplicationStatus = mutation({
  args: {
    applicationId: v.id("applications"),
    status: applicationStatusValidator,
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    assertEmployerOrAdmin(user);
    const application = await ctx.db.get(args.applicationId);
    if (!application) {
      throw new ConvexError("Application not found");
    }

    const vacancy = await ctx.db.get(application.vacancyId);
    if (!vacancy) {
      throw new ConvexError("Vacancy not found");
    }
    assertCanUpdateApplicationStatus(user, vacancy);
    if (args.status === "withdrawn") {
      throw new ConvexError("Use withdrawApplication for seeker withdrawals");
    }
    assertApplicationTransition(application.status, args.status);

    await ctx.db.patch(args.applicationId, { status: args.status });
    await ctx.db.insert("applicationStatusEvents", {
      applicationId: args.applicationId,
      fromStatus: application.status,
      toStatus: args.status,
      changedAt: Date.now(),
      actorUserId: user._id,
    });
    if (vacancy.source === "native" && vacancy.companyId) {
      await recalculateCompanyTrustMetrics(ctx, vacancy.companyId);
    }
    await ctx.scheduler.runAfter(0, internal.notifications.handleStatusChange, {
      applicationId: args.applicationId,
      seekerUserId: application.seekerUserId,
      status: args.status,
      dedupeKey: buildNotificationDedupeKey({
        type: "status_change",
        recipientUserId: String(application.seekerUserId),
        entityId: String(args.applicationId),
        secondaryId: args.status,
      }),
    });

    return ctx.db.get(args.applicationId);
  },
});

export const adminRecoverApplicationStatus = mutation({
  args: {
    applicationId: v.id("applications"),
    status: applicationStatusValidator,
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    assertCanAdminRecoverApplicationStatus(user);
    const application = await ctx.db.get(args.applicationId);
    if (!application) {
      throw new ConvexError("Application not found");
    }
    const vacancy = await ctx.db.get(application.vacancyId);
    await ctx.db.patch(args.applicationId, { status: args.status });
    await ctx.db.insert("applicationStatusEvents", {
      applicationId: args.applicationId,
      fromStatus: application.status,
      toStatus: args.status,
      changedAt: Date.now(),
      actorUserId: user._id,
    });
    if (vacancy?.source === "native" && vacancy.companyId) {
      await recalculateCompanyTrustMetrics(ctx, vacancy.companyId);
    }
    return ctx.db.get(args.applicationId);
  },
});

export const getForAnalysis = internalQuery({
  args: { applicationId: v.id("applications") },
  handler: async (ctx, args) => {
    const application = await ctx.db.get(args.applicationId);
    if (!application) {
      throw new ConvexError("Application not found");
    }
    const vacancy = await ctx.db.get(application.vacancyId);
    if (!vacancy) {
      throw new ConvexError("Vacancy not found");
    }
    return { application, vacancy };
  },
});

export const getNotificationContextForApplication = internalQuery({
  args: { applicationId: v.id("applications") },
  handler: async (ctx, args) => {
    const application = await ctx.db.get(args.applicationId);
    if (!application) {
      return null;
    }
    const vacancy = await ctx.db.get(application.vacancyId);
    if (!vacancy) {
      return null;
    }
    return { vacancyTitle: vacancy.title };
  },
});

export const saveScreeningAnalysis = internalMutation({
  args: {
    applicationId: v.id("applications"),
    aiScore: v.number(),
    aiSummary: v.string(),
  },
  handler: async (ctx, args) => {
    const application = await ctx.db.get(args.applicationId);
    if (!application) {
      throw new ConvexError("Application not found");
    }
    await ctx.db.patch(args.applicationId, {
      aiScore: args.aiScore,
      aiSummary: args.aiSummary,
    });
    return ctx.db.get(args.applicationId);
  },
});

export const createFromBot = internalMutation({
  args: {
    vacancyId: v.id("vacancies"),
    seekerUserId: v.id("users"),
    screeningAnswers: v.optional(
      v.array(
        v.object({
          question: v.string(),
          answer: v.string(),
        }),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const result = await createApplicationRecord(ctx, args);

    const employerUserId = result.vacancy.ownerUserId;
    if (!employerUserId) {
      throw new ConvexError("Invariant: missing vacancy owner");
    }
    await ctx.scheduler.runAfter(0, internal.notifications.handleNewApplication, {
      applicationId: result.applicationId,
      employerUserId,
    });

    if (args.screeningAnswers?.length) {
      await ctx.scheduler.runAfter(0, internal.ai.analyzeScreeningInternal, {
        applicationId: result.applicationId,
      });
    }

    return ctx.db.get(result.applicationId);
  },
});
