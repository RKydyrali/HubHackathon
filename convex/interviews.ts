import { ConvexError, v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { assertOwnershipOrAdmin, assertRole, requireCurrentUser } from "./lib/auth";
import { interviewStatusValidator } from "./lib/validators";

export const scheduleInterview = mutation({
  args: {
    applicationId: v.id("applications"),
    scheduledAt: v.number(),
    locationOrLink: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    assertRole(user, ["employer", "admin"]);

    const application = await ctx.db.get(args.applicationId);
    if (!application) {
      throw new ConvexError("Application not found");
    }
    if (application.status !== "interview") {
      throw new ConvexError("Application must be in interview status");
    }

    const vacancy = await ctx.db.get(application.vacancyId);
    if (!vacancy) {
      throw new ConvexError("Vacancy not found");
    }
    assertOwnershipOrAdmin(user, vacancy.ownerUserId);

    const interviewId = await ctx.db.insert("interviews", {
      applicationId: args.applicationId,
      vacancyId: application.vacancyId,
      employerUserId: vacancy.ownerUserId!,
      seekerUserId: application.seekerUserId,
      scheduledAt: args.scheduledAt,
      locationOrLink: args.locationOrLink,
      status: "scheduled",
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
    assertRole(user, ["employer", "admin"]);
    const interview = await ctx.db.get(args.interviewId);
    if (!interview) {
      throw new ConvexError("Interview not found");
    }
    assertOwnershipOrAdmin(user, interview.employerUserId);
    await ctx.db.patch(args.interviewId, { status: args.status });
    return ctx.db.get(args.interviewId);
  },
});

export const listForApplication = query({
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
    const isParticipant =
      user.role === "admin" ||
      user._id === application.seekerUserId ||
      user._id === vacancy.ownerUserId;

    if (!isParticipant) {
      throw new ConvexError("Forbidden");
    }

    return ctx.db
      .query("interviews")
      .withIndex("by_applicationId", (q) => q.eq("applicationId", args.applicationId))
      .collect();
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
    const isParticipant =
      user.role === "admin" ||
      user._id === application.seekerUserId ||
      user._id === vacancy.ownerUserId;

    if (!isParticipant) {
      throw new ConvexError("Forbidden");
    }

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
    assertRole(user, ["employer", "admin"]);
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
    assertRole(user, ["seeker", "admin"]);
    return ctx.db
      .query("interviews")
      .withIndex("by_seekerUserId", (q) => q.eq("seekerUserId", user._id))
      .take(50);
  },
});
