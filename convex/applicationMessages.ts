/**
 * In-product thread between employer and seeker for a single application.
 * API contract: list returns chronological messages; send appends one row.
 * Future: read receipts, attachments, moderation, push fan-out.
 */
import { ConvexError, v } from "convex/values";

import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { requireCurrentUser } from "./lib/auth";
import { recalculateCompanyTrustMetrics } from "./lib/companyTrust";
import { assertCanAccessHiredApplicationMessaging } from "./lib/permissions";

async function loadApplicationBundle(ctx: QueryCtx | MutationCtx, applicationId: Id<"applications">) {
  const application = await ctx.db.get(applicationId);
  if (!application) {
    return null;
  }
  const vacancy = await ctx.db.get(application.vacancyId);
  if (!vacancy) {
    return null;
  }
  return { application, vacancy };
}

export const listByApplication = query({
  args: { applicationId: v.id("applications") },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const bundle = await loadApplicationBundle(ctx, args.applicationId);
    if (!bundle) {
      return [];
    }
    if (bundle.application.status !== "hired") {
      return [];
    }
    assertCanAccessHiredApplicationMessaging(user, bundle.application, bundle.vacancy);
    return ctx.db
      .query("applicationMessages")
      .withIndex("by_applicationId", (q) => q.eq("applicationId", args.applicationId))
      .order("asc")
      .take(200);
  },
});

export const send = mutation({
  args: {
    applicationId: v.id("applications"),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const bundle = await loadApplicationBundle(ctx, args.applicationId);
    if (!bundle) {
      throw new ConvexError("Application not found");
    }
    assertCanAccessHiredApplicationMessaging(user, bundle.application, bundle.vacancy);
    if (bundle.application.status !== "hired") {
      throw new ConvexError("Messaging unlocks only after Hired");
    }
    const body = args.body.trim();
    if (!body) {
      throw new ConvexError("Message is empty");
    }
    if (body.length > 8000) {
      throw new ConvexError("Message too long");
    }
    const seekerUserId = bundle.application.seekerUserId;
    const employerUserId = bundle.vacancy.ownerUserId;
    if (!employerUserId) {
      throw new ConvexError("Vacancy owner missing");
    }
    const recipientUserId: Id<"users"> =
      user._id === seekerUserId ? employerUserId : seekerUserId;
    if (user._id !== seekerUserId && user._id !== employerUserId) {
      throw new ConvexError("Forbidden");
    }
    const existingMessages = await ctx.db
      .query("applicationMessages")
      .withIndex("by_applicationId", (q) => q.eq("applicationId", args.applicationId))
      .take(100);
    const isFirstEmployerMessage =
      user._id === employerUserId &&
      !existingMessages.some((message) => message.senderUserId === employerUserId);
    const now = Date.now();
    const messageId = await ctx.db.insert("applicationMessages", {
      applicationId: args.applicationId,
      senderUserId: user._id,
      recipientUserId,
      body,
      createdAt: now,
    });
    if (isFirstEmployerMessage && bundle.vacancy.source === "native" && bundle.vacancy.companyId) {
      await recalculateCompanyTrustMetrics(ctx, bundle.vacancy.companyId);
    }
    return messageId;
  },
});
