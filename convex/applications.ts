import { ConvexError, v } from "convex/values";

import { internal } from "./_generated/api";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import {
  assertOwnershipOrAdmin,
  assertRole,
  requireCurrentUser,
} from "./lib/auth";
import {
  assertApplicationTransition,
  buildNotificationDedupeKey,
  canApplyToVacancy,
} from "./lib/domain";
import { applicationStatusValidator } from "./lib/validators";

async function createApplicationRecord(
  ctx: any,
  input: {
    vacancyId: any;
    seekerUserId: any;
    screeningAnswers?: Array<{ question: string; answer: string }>;
  },
) {
  const vacancy = await ctx.db.get(input.vacancyId);
  if (!vacancy) {
    throw new ConvexError("Vacancy not found");
  }
  if (!canApplyToVacancy(vacancy.source, vacancy.status)) {
    throw new ConvexError("This vacancy is not open for in-app applications");
  }

  const existing = await ctx.db
    .query("applications")
    .withIndex("by_vacancyId", (q: any) => q.eq("vacancyId", input.vacancyId))
    .collect();

  if (existing.some((application: any) => application.seekerUserId === input.seekerUserId)) {
    throw new ConvexError("Application already exists");
  }

  const applicationId = await ctx.db.insert("applications", {
    vacancyId: input.vacancyId,
    seekerUserId: input.seekerUserId,
    status: "submitted",
    screeningAnswers: input.screeningAnswers,
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
    assertRole(user, ["seeker", "admin"]);

    const result = await createApplicationRecord(ctx, {
      vacancyId: args.vacancyId,
      seekerUserId: user._id,
      screeningAnswers: args.screeningAnswers,
    });

    await ctx.scheduler.runAfter(0, internal.notifications.handleNewApplication, {
      applicationId: result.applicationId,
      employerUserId: result.vacancy.ownerUserId!,
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
    assertRole(user, ["seeker", "admin"]);
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
    assertRole(user, ["seeker", "admin"]);
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

export const listBySeeker = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx);
    assertRole(user, ["seeker", "admin"]);
    const applications = await ctx.db
      .query("applications")
      .withIndex("by_seekerUserId", (q) => q.eq("seekerUserId", user._id))
      .take(50);

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
    assertRole(user, ["employer", "admin"]);
    const vacancy = await ctx.db.get(args.vacancyId);
    if (!vacancy) {
      throw new ConvexError("Vacancy not found");
    }
    assertOwnershipOrAdmin(user, vacancy.ownerUserId);
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
    assertRole(user, ["employer", "admin"]);
    const vacancy = await ctx.db.get(args.vacancyId);
    if (!vacancy) {
      throw new ConvexError("Vacancy not found");
    }
    assertOwnershipOrAdmin(user, vacancy.ownerUserId);

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
    assertRole(user, ["employer", "admin"]);
    const vacancy = await ctx.db.get(args.vacancyId);
    if (!vacancy) {
      throw new ConvexError("Vacancy not found");
    }
    assertOwnershipOrAdmin(user, vacancy.ownerUserId);

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
    assertRole(user, ["employer", "admin"]);
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
    assertRole(user, ["employer", "admin"]);
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

export const updateApplicationStatus = mutation({
  args: {
    applicationId: v.id("applications"),
    status: applicationStatusValidator,
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    assertRole(user, ["employer", "admin"]);
    const application = await ctx.db.get(args.applicationId);
    if (!application) {
      throw new ConvexError("Application not found");
    }

    const vacancy = await ctx.db.get(application.vacancyId);
    if (!vacancy) {
      throw new ConvexError("Vacancy not found");
    }
    assertOwnershipOrAdmin(user, vacancy.ownerUserId);
    assertApplicationTransition(application.status, args.status);

    await ctx.db.patch(args.applicationId, { status: args.status });
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
    assertRole(user, ["admin"]);
    const application = await ctx.db.get(args.applicationId);
    if (!application) {
      throw new ConvexError("Application not found");
    }
    await ctx.db.patch(args.applicationId, { status: args.status });
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

    await ctx.scheduler.runAfter(0, internal.notifications.handleNewApplication, {
      applicationId: result.applicationId,
      employerUserId: result.vacancy.ownerUserId!,
    });

    if (args.screeningAnswers?.length) {
      await ctx.scheduler.runAfter(0, internal.ai.analyzeScreeningInternal, {
        applicationId: result.applicationId,
      });
    }

    return ctx.db.get(result.applicationId);
  },
});
