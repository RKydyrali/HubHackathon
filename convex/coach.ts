import { ConvexError, v } from "convex/values";

import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { MOCK_INTERVIEW_MAX_MESSAGES_PER_SESSION } from "./lib/constants";
import { requireCurrentUser } from "./lib/auth";
import { assertSeekerOrAdmin, canViewVacancy } from "./lib/permissions";
import { buildStructuredCoach } from "./lib/coach";
import {
  mockInterviewMessageRoleValidator,
} from "./lib/validators";

export const getMyStructuredCoach = query({
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

    const joinedApplications = [];
    for (const application of applications) {
      joinedApplications.push({
        application,
        vacancy: await ctx.db.get(application.vacancyId),
      });
    }

    return buildStructuredCoach({
      profile,
      applications: joinedApplications,
      matches: [],
    });
  },
});

export const getOrCreateActiveMockInterviewSession = mutation({
  args: { vacancyId: v.id("vacancies") },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    assertSeekerOrAdmin(user);
    const vacancy = await ctx.db.get(args.vacancyId);
    if (!vacancy) {
      throw new ConvexError("Vacancy not found");
    }
    if (vacancy.status !== "published") {
      throw new ConvexError("Vacancy is not available");
    }
    const existing = await ctx.db
      .query("mockInterviewSessions")
      .withIndex("by_seekerUserId_and_vacancyId", (q) =>
        q.eq("seekerUserId", user._id).eq("vacancyId", args.vacancyId),
      )
      .collect();
    const active = existing.find((s) => s.status === "in_progress");
    if (active) {
      return active;
    }
    const now = Date.now();
    const sessionId = await ctx.db.insert("mockInterviewSessions", {
      vacancyId: args.vacancyId,
      seekerUserId: user._id,
      messages: [],
      status: "in_progress",
      createdAt: now,
      updatedAt: now,
    });
    const created = await ctx.db.get(sessionId);
    if (!created) {
      throw new ConvexError("Failed to create session");
    }
    return created;
  },
});

export const abandonMockInterviewSession = mutation({
  args: { sessionId: v.id("mockInterviewSessions") },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    assertSeekerOrAdmin(user);
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new ConvexError("Session not found");
    }
    if (session.seekerUserId !== user._id) {
      throw new ConvexError("Forbidden");
    }
    if (session.status !== "in_progress") {
      throw new ConvexError("Session is not active");
    }
    const now = Date.now();
    await ctx.db.patch(args.sessionId, {
      status: "abandoned",
      updatedAt: now,
    });
    return ctx.db.get(args.sessionId);
  },
});

export const getMockInterviewSession = query({
  args: { sessionId: v.id("mockInterviewSessions") },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    assertSeekerOrAdmin(user);
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      return null;
    }
    if (session.seekerUserId !== user._id) {
      throw new ConvexError("Forbidden");
    }
    return session;
  },
});

export const listMyMockInterviewSessions = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx);
    assertSeekerOrAdmin(user);
    const sessions = await ctx.db
      .query("mockInterviewSessions")
      .withIndex("by_seekerUserId_and_updatedAt", (q) =>
        q.eq("seekerUserId", user._id),
      )
      .order("desc")
      .take(40);
    const results = [];
    for (const session of sessions) {
      const vacancyDoc = await ctx.db.get(session.vacancyId);
      const vacancy =
        vacancyDoc && canViewVacancy(user, vacancyDoc) ? vacancyDoc : null;
      results.push({ session, vacancy });
    }
    return results;
  },
});

export const getMockInterviewSessionInternal = internalQuery({
  args: { sessionId: v.id("mockInterviewSessions") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.sessionId);
  },
});

export const appendMockInterviewMessageInternal = internalMutation({
  args: {
    sessionId: v.id("mockInterviewSessions"),
    role: mockInterviewMessageRoleValidator,
    content: v.string(),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new ConvexError("Session not found");
    }
    if (session.status !== "in_progress") {
      throw new ConvexError("Session is not active");
    }
    const len = session.messages.length;
    if (args.role === "user") {
      if (len > MOCK_INTERVIEW_MAX_MESSAGES_PER_SESSION - 2) {
        throw new ConvexError("Interview message limit reached");
      }
    } else if (len >= MOCK_INTERVIEW_MAX_MESSAGES_PER_SESSION) {
      throw new ConvexError("Interview message limit reached");
    }
    const message = {
      role: args.role,
      content: args.content,
      createdAt: args.createdAt,
    };
    await ctx.db.patch(args.sessionId, {
      messages: [...session.messages, message],
      updatedAt: args.createdAt,
    });
    return ctx.db.get(args.sessionId);
  },
});

export const finalizeMockInterviewSessionInternal = internalMutation({
  args: {
    sessionId: v.id("mockInterviewSessions"),
    finalScore: v.number(),
    hiringRecommendation: v.string(),
    strengths: v.array(v.string()),
    improvements: v.array(v.string()),
    debriefSummary: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new ConvexError("Session not found");
    }
    if (session.status !== "in_progress") {
      throw new ConvexError("Session is not active");
    }
    const now = Date.now();
    await ctx.db.patch(args.sessionId, {
      status: "completed",
      finalScore: args.finalScore,
      hiringRecommendation: args.hiringRecommendation,
      strengths: args.strengths,
      improvements: args.improvements,
      debriefSummary: args.debriefSummary,
      updatedAt: now,
    });
    return ctx.db.get(args.sessionId);
  },
});
