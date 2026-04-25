import { ConvexError, v } from "convex/values";

import { internal } from "./_generated/api";
import { internalQuery, mutation, query } from "./_generated/server";
import { requireCurrentUser } from "./lib/auth";
import {
  assertCanScheduleInterviewForApplication,
  assertCanUpdateInterviewAsEmployer,
  assertCanViewInterviewsForApplication,
  assertEmployerOrAdmin,
  assertSeekerOrAdmin,
} from "./lib/permissions";
import { interviewStatusValidator } from "./lib/validators";

export const getInterviewNotificationContext = internalQuery({
  args: { interviewId: v.id("interviews") },
  handler: async (ctx, args) => {
    const interview = await ctx.db.get(args.interviewId);
    if (!interview) {
      return null;
    }
    const vacancy = await ctx.db.get(interview.vacancyId);
    if (!vacancy) {
      return null;
    }
    return { interview, vacancy };
  },
});

export const scheduleInterview = mutation({
  args: {
    applicationId: v.id("applications"),
    scheduledAt: v.number(),
    locationOrLink: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);

    const application = await ctx.db.get(args.applicationId);
    if (!application) {
      throw new ConvexError("Application not found");
    }

    const vacancy = await ctx.db.get(application.vacancyId);
    if (!vacancy) {
      throw new ConvexError("Vacancy not found");
    }
    assertCanScheduleInterviewForApplication(user, application, vacancy);

    const employerUserId = vacancy.ownerUserId;
    if (!employerUserId) {
      throw new ConvexError("Vacancy has no employer owner");
    }

    const interviewId = await ctx.db.insert("interviews", {
      applicationId: args.applicationId,
      vacancyId: application.vacancyId,
      employerUserId,
      seekerUserId: application.seekerUserId,
      scheduledAt: args.scheduledAt,
      locationOrLink: args.locationOrLink,
      status: "scheduled",
    });

    await ctx.scheduler.runAfter(0, internal.notifications.handleInterviewScheduled, {
      interviewId,
    });

    return ctx.db.get(interviewId);
  },
});

export const updateInterviewStatus = mutation({
  args: {
    interviewId: v.id("interviews"),
    status: interviewStatusValidator,
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const interview = await ctx.db.get(args.interviewId);
    if (!interview) {
      throw new ConvexError("Interview not found");
    }
    assertCanUpdateInterviewAsEmployer(user, interview);
    await ctx.db.patch(args.interviewId, { status: args.status });
    await ctx.scheduler.runAfter(0, internal.notifications.handleInterviewStatusUpdated, {
      interviewId: args.interviewId,
      status: args.status,
    });
    return ctx.db.get(args.interviewId);
  },
});

export const listByApplication = query({
  args: { applicationId: v.id("applications") },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const application = await ctx.db.get(args.applicationId);
    if (!application) {
      throw new ConvexError("Application not found");
    }
    const vacancy = await ctx.db.get(application.vacancyId);
    if (!vacancy) {
      throw new ConvexError("Vacancy not found");
    }
    assertCanViewInterviewsForApplication(user, application, vacancy);

    return ctx.db
      .query("interviews")
      .withIndex("by_applicationId", (q) => q.eq("applicationId", args.applicationId))
      .take(50);
  },
});

export const listByOwner = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx);
    assertEmployerOrAdmin(user);
    return ctx.db
      .query("interviews")
      .withIndex("by_employerUserId", (q) => q.eq("employerUserId", user._id))
      .take(50);
  },
});

export const listBySeeker = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx);
    assertSeekerOrAdmin(user);
    return ctx.db
      .query("interviews")
      .withIndex("by_seekerUserId", (q) => q.eq("seekerUserId", user._id))
      .take(50);
  },
});
