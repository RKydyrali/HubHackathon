import { ConvexError, v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { requireCurrentUser } from "./lib/auth";

export const createReview = mutation({
  args: {
    applicationId: v.id("applications"),
    targetUserId: v.id("users"),
    rating: v.number(),
    comment: v.optional(v.string()),
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

    const isAllowedReviewer =
      user._id === application.seekerUserId || user._id === vacancy.ownerUserId;
    const targetIsCounterparty =
      args.targetUserId === application.seekerUserId ||
      args.targetUserId === vacancy.ownerUserId;

    if (!isAllowedReviewer || !targetIsCounterparty || args.targetUserId === user._id) {
      throw new ConvexError("Forbidden");
    }

    const reviewId = await ctx.db.insert("reviews", {
      authorUserId: user._id,
      targetUserId: args.targetUserId,
      applicationId: args.applicationId,
      rating: args.rating,
      comment: args.comment,
    });

    return ctx.db.get(reviewId);
  },
});

export const listReviewsForUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const reviews = await ctx.db.query("reviews").collect();
    return reviews.filter((review) => review.targetUserId === args.userId);
  },
});
